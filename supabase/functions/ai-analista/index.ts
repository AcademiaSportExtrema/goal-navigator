import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function triggerAnaliseEmailDispatch(params: {
  supabaseUrl: string;
  serviceKey: string;
  empresaId: string;
}) {
  const response = await fetch(`${params.supabaseUrl}/functions/v1/send-analise-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.serviceKey}`,
    },
    body: JSON.stringify({
      empresa_id: params.empresaId,
      _internal: true,
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.error || `HTTP ${response.status}`;
    if (response.status === 400 || response.status === 429) {
      console.log("Automatic analysis email skipped:", message);
      return;
    }

    console.error("Automatic analysis email failed:", message);
    return;
  }

  console.log("Automatic analysis email dispatched:", payload?.message || "ok");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // Verify admin role
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("empresa_id, role")
      .eq("user_id", user.id)
      .single();

    if (!userRole) throw new Error("No role found");
    if (userRole.role !== "admin" && userRole.role !== "super_admin") {
      throw new Error("Only admins can use the AI Analyst");
    }

    const empresaId = userRole.empresa_id;
    const body = await req.json().catch(() => ({}));
    const uploadId = body.upload_id || null;
    const triggerEmail = body.trigger_email === true;

    // Current month
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
      .eq("empresa_id", empresaId)
      .single();

    // Fetch consultoras ativas
    const { data: consultoras } = await supabase
      .from("consultoras")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("ativo", true);

    // Fetch metas por consultora
    let metasConsultoras: any[] = [];
    if (metaMensal) {
      const { data } = await supabase
        .from("metas_consultoras")
        .select("*, consultoras(*)")
        .eq("meta_mensal_id", metaMensal.id);
      metasConsultoras = data || [];
    }

    // Fetch lancamentos do mês
    const { data: lancamentos } = await supabase
      .from("lancamentos")
      .select("*")
      .eq("entra_meta", true)
      .eq("mes_competencia", mesAtual);

    const vendas = lancamentos || [];
    const totalVendido = vendas.reduce((acc: number, l: any) => acc + (Number(l.valor) || 0), 0);
    const metaTotal = metaMensal ? Number(metaMensal.meta_total) : 0;
    const percentualGeral = metaTotal > 0 ? (totalVendido / metaTotal) * 100 : 0;

    // Fetch commission levels
    let niveisComissao: any[] = [];
    if (metaMensal) {
      const { data } = await supabase
        .from("comissao_niveis")
        .select("*")
        .eq("meta_mensal_id", metaMensal.id)
        .order("nivel");
      niveisComissao = data || [];
    }

    // Build per-consultora data
    const porConsultora: Record<string, { nome: string; valor: number; qtd: number }> = {};
    for (const l of vendas) {
      const chave = l.consultora_chave || "Não identificado";
      if (!porConsultora[chave]) porConsultora[chave] = { nome: chave, valor: 0, qtd: 0 };
      porConsultora[chave].valor += Number(l.valor) || 0;
      porConsultora[chave].qtd++;
    }

    const ranking = Object.values(porConsultora)
      .map((c) => {
        const mc = metasConsultoras.find((m: any) => m.consultoras?.nome === c.nome);
        const metaIndividual = mc && metaMensal ? Number(metaMensal.meta_total) * Number(mc.percentual) : 0;
        const pct = metaIndividual > 0 ? (c.valor / metaIndividual) * 100 : 0;
        const ticketMedio = c.qtd > 0 ? c.valor / c.qtd : 0;
        const falta = Math.max(0, metaIndividual - c.valor);

        let nivel = 1;
        for (const n of niveisComissao) {
          if (pct >= Number(n.de_percent) * 100 && pct <= Number(n.ate_percent) * 100) {
            nivel = n.nivel;
          }
        }

        return {
          nome: c.nome,
          vendido: c.valor,
          meta: metaIndividual,
          percentual: pct,
          qtdVendas: c.qtd,
          ticketMedio,
          falta,
          nivel,
        };
      })
      .sort((a, b) => b.vendido - a.vendido);

    const rankingText = ranking
      .map(
        (c, i) =>
          `${i + 1}. ${c.nome}: R$${c.vendido.toFixed(2)} vendido (${c.percentual.toFixed(1)}% da meta R$${c.meta.toFixed(2)}), ${c.qtdVendas} vendas, ticket médio R$${c.ticketMedio.toFixed(2)}, falta R$${c.falta.toFixed(2)}`
      )
      .join("\n");

    // Projeção
    const vendaDiaria = diaAtual > 0 ? totalVendido / diaAtual : 0;
    const projecaoMes = vendaDiaria * diasNoMes;

    const systemPrompt = `Você é um analista de performance comercial especializado em academias e negócios fitness. Seu nome é Analista IA.
Gere um relatório executivo em português brasileiro, direto e com dados concretos. Use emojis moderadamente. Responda em markdown.

DADOS DO MÊS (${mesAtual}):
- Meta total da empresa: R$${metaTotal.toFixed(2)}
- Total vendido: R$${totalVendido.toFixed(2)}
- % atingido: ${percentualGeral.toFixed(1)}%
- Dia atual: ${diaAtual} de ${diasNoMes} (${diasRestantes} dias restantes)
- Venda média diária: R$${vendaDiaria.toFixed(2)}
- Projeção para o mês: R$${projecaoMes.toFixed(2)}
- Total de consultoras ativas: ${consultoras?.length || 0}

RANKING DE CONSULTORAS:
${rankingText || "Nenhuma venda registrada"}

Gere o relatório com estas seções:
1. **RESUMO DO MÊS**: meta total, vendido, % atingido, projeção com base no ritmo atual, gap para meta
2. **RANKING DE CONSULTORAS**: Use obrigatoriamente uma tabela markdown com as colunas: | Consultora | Vendas | % Meta | Ticket Médio | Status |. Use emojis para status: 🌟 Excepcional (>100%), ✅ No Caminho (70-100%), ⚠️ Atenção (50-70%), 🔴 Crítico (<50%). Depois da tabela, faça breves comentários sobre destaques e quem precisa de atenção.
3. **PLANO DE AÇÃO**: ações prioritárias e concretas para atingir a meta, baseadas nos dados reais. Inclua sugestões específicas por consultora quando relevante.

Limite sua resposta a no máximo 500 palavras.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Non-streaming call to save the result
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Gere o relatório executivo do mês com base nos dados fornecidos." },
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
        return new Response(JSON.stringify({ error: "Créditos insuficientes para o Analista IA." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, t);
      return new Response(JSON.stringify({ error: "Erro ao consultar o Analista IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // We stream to the client AND collect the full text to save
    const reader = aiResponse.body!.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let fullContent = "";

    const stream = new ReadableStream({
      async start(controller) {
        let textBuffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            // Forward chunk to client
            controller.enqueue(value);
            // Parse for saving
            textBuffer += chunk;
            let newlineIndex: number;
            while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
              let line = textBuffer.slice(0, newlineIndex);
              textBuffer = textBuffer.slice(newlineIndex + 1);
              if (line.endsWith("\r")) line = line.slice(0, -1);
              if (!line.startsWith("data: ")) continue;
              const jsonStr = line.slice(6).trim();
              if (jsonStr === "[DONE]") continue;
              try {
                const parsed = JSON.parse(jsonStr);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) fullContent += content;
              } catch { /* partial */ }
            }
          }
          // Flush remaining
          if (textBuffer.trim()) {
            for (let raw of textBuffer.split("\n")) {
              if (!raw || !raw.startsWith("data: ")) continue;
              const jsonStr = raw.slice(6).trim();
              if (jsonStr === "[DONE]") continue;
              try {
                const parsed = JSON.parse(jsonStr);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) fullContent += content;
              } catch { /* ignore */ }
            }
          }

          // Save analysis to DB using service role (bypass RLS)
          if (fullContent) {
            const { error: saveError } = await supabaseAdmin.from("analise_ia").upsert(
              {
                empresa_id: empresaId,
                mes_referencia: mesAtual,
                conteudo: fullContent,
                upload_id: uploadId,
                created_at: new Date().toISOString(),
              },
              { onConflict: "empresa_id,mes_referencia" }
            );

            if (saveError) {
              console.error("Failed to save analysis:", saveError);
            } else if (triggerEmail) {
              await triggerAnaliseEmailDispatch({
                supabaseUrl,
                serviceKey,
                empresaId,
              });
            }
          }

          controller.close();
        } catch (e) {
          console.error("Stream error:", e);
          controller.error(e);
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-analista error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
