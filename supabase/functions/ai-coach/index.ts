import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { consultora_id, pergunta } = await req.json();
    if (!consultora_id) throw new Error("consultora_id is required");

    // Validate user belongs to same empresa
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("empresa_id, consultora_id")
      .eq("user_id", user.id)
      .single();

    if (!userRole) throw new Error("No role found");

    // Fetch consultora
    const { data: consultora } = await supabase
      .from("consultoras")
      .select("*")
      .eq("id", consultora_id)
      .eq("empresa_id", userRole.empresa_id)
      .single();

    if (!consultora) throw new Error("Consultora not found");

    // Fetch current month data
    const now = new Date();
    const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const diasNoMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const diaAtual = now.getDate();
    const diasRestantes = diasNoMes - diaAtual;

    // Fetch meta mensal
    const { data: metaMensal } = await supabase
      .from("metas_mensais")
      .select("*")
      .eq("mes_referencia", mesAtual)
      .eq("empresa_id", userRole.empresa_id)
      .single();

    let metaIndividual = 0;
    let minhaMeta: any = null;

    if (metaMensal) {
      const { data: mc } = await supabase
        .from("metas_consultoras")
        .select("*")
        .eq("meta_mensal_id", metaMensal.id)
        .eq("consultora_id", consultora_id)
        .single();
      minhaMeta = mc;
      if (mc) metaIndividual = Number(metaMensal.meta_total) * Number(mc.percentual);
    }

    // Fetch lancamentos
    const { data: lancamentos } = await supabase
      .from("lancamentos")
      .select("*")
      .eq("entra_meta", true)
      .eq("mes_competencia", mesAtual)
      .eq("consultora_chave", consultora.nome);

    const vendas = lancamentos || [];
    const totalVendido = vendas.reduce((acc: number, l: any) => acc + (Number(l.valor) || 0), 0);
    const qtdVendas = vendas.length;
    const ticketMedio = qtdVendas > 0 ? totalVendido / qtdVendas : 0;
    const percentualAtingido = metaIndividual > 0 ? (totalVendido / metaIndividual) * 100 : 0;

    // Product breakdown
    const porProduto: Record<string, { count: number; total: number }> = {};
    for (const v of vendas) {
      const prod = v.produto || v.plano || "Outros";
      if (!porProduto[prod]) porProduto[prod] = { count: 0, total: 0 };
      porProduto[prod].count++;
      porProduto[prod].total += Number(v.valor) || 0;
    }
    const produtoBreakdown = Object.entries(porProduto)
      .map(([nome, d]) => `- ${nome}: ${d.count} vendas, R$${d.total.toFixed(2)} (ticket médio R$${(d.total / d.count).toFixed(2)})`)
      .join("\n");

    // Commission levels
    let nivelAtual = 1;
    let comissaoPercent = 0;
    let proximoNivel: any = null;

    if (metaMensal) {
      const { data: niveis } = await supabase
        .from("comissao_niveis")
        .select("*")
        .eq("meta_mensal_id", metaMensal.id)
        .order("nivel");

      if (niveis) {
        for (const n of niveis) {
          if (percentualAtingido >= Number(n.de_percent) * 100 && percentualAtingido <= Number(n.ate_percent) * 100) {
            nivelAtual = n.nivel;
            comissaoPercent = Number(n.comissao_percent);
          }
        }
        const proxIdx = niveis.findIndex((n: any) => n.nivel === nivelAtual + 1);
        if (proxIdx !== -1) proximoNivel = niveis[proxIdx];
      }
    }

    const faltaParaMeta = Math.max(0, metaIndividual - totalVendido);
    const faltaParaProxNivel = proximoNivel
      ? Math.max(0, Number(proximoNivel.de_percent) * metaIndividual - totalVendido)
      : null;

    // Fetch commercial guidelines
    const { data: diretrizes } = await supabase
      .from("coach_diretrizes")
      .select("tipo, texto")
      .eq("empresa_id", userRole.empresa_id)
      .eq("ativo", true);

    let politicaComercial = "";
    if (diretrizes && diretrizes.length > 0) {
      const permitidas = diretrizes.filter((d: any) => d.tipo === "permitido").map((d: any) => `- ${d.texto}`);
      const proibidas = diretrizes.filter((d: any) => d.tipo === "proibido").map((d: any) => `- ${d.texto}`);
      politicaComercial = `\n\nPOLÍTICA COMERCIAL DA EMPRESA (OBRIGATÓRIO SEGUIR):`;
      if (permitidas.length > 0) politicaComercial += `\nVOCÊ PODE sugerir:\n${permitidas.join("\n")}`;
      if (proibidas.length > 0) politicaComercial += `\nVOCÊ NÃO PODE sugerir:\n${proibidas.join("\n")}`;
      politicaComercial += `\nIMPORTANTE: Nunca sugira estratégias comerciais fora desta política. Siga rigorosamente as restrições acima.`;
    } else {
      politicaComercial = `\n\nPOLÍTICA COMERCIAL: Não há diretrizes comerciais cadastradas. Use apenas dicas genéricas de abordagem e motivação sem mencionar ofertas, descontos ou condições comerciais específicas.`;
    }

    const contextPrompt = `Você é um coach de vendas especializado em academias e negócios fitness. Seu nome é Coach IA.
Fale de forma direta, motivadora, com dados concretos. Use emojis moderadamente. Responda em português brasileiro.
Limite sua resposta a no máximo 300 palavras.

DADOS DA CONSULTORA:
- Nome: ${consultora.nome}
- Mês: ${mesAtual}
- Dia atual: ${diaAtual} de ${diasNoMes} (${diasRestantes} dias restantes)
- Meta individual: R$${metaIndividual.toFixed(2)}
- Total vendido: R$${totalVendido.toFixed(2)}
- Percentual atingido: ${percentualAtingido.toFixed(1)}%
- Falta para meta: R$${faltaParaMeta.toFixed(2)}
- Quantidade de vendas: ${qtdVendas}
- Ticket médio: R$${ticketMedio.toFixed(2)}
- Nível de comissão atual: ${nivelAtual} (${(comissaoPercent * 100).toFixed(1)}%)
${faltaParaProxNivel !== null ? `- Falta R$${faltaParaProxNivel.toFixed(2)} para subir ao nível ${nivelAtual + 1} (${(Number(proximoNivel.comissao_percent) * 100).toFixed(1)}% comissão)` : "- Já está no nível máximo de comissão"}
${diasRestantes > 0 ? `- Precisa vender R$${(faltaParaMeta / diasRestantes).toFixed(2)}/dia para atingir a meta` : ""}

VENDAS POR PRODUTO/PLANO:
${produtoBreakdown || "Nenhuma venda registrada"}${politicaComercial}`;

    const userMessage = pergunta || "Analise minha performance e me dê dicas práticas de como atingir minha meta de vendas.";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: contextPrompt },
          { role: "user", content: userMessage },
        ],
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes para o Coach IA." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, t);
      return new Response(JSON.stringify({ error: "Erro ao consultar o Coach IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-coach error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
