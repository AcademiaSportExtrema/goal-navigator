import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function markdownToHtml(md: string): string {
  let html = md;

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3 style="margin:16px 0 8px;color:#1a1a2e;font-size:16px;">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 style="margin:20px 0 10px;color:#1a1a2e;font-size:18px;">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 style="margin:24px 0 12px;color:#1a1a2e;font-size:22px;">$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Markdown tables → HTML tables
  const tableRegex = /(\|.+\|[\r\n]+\|[\s:|-]+\|[\r\n]+((\|.+\|[\r\n]*)+))/g;
  html = html.replace(tableRegex, (_match) => {
    const lines = _match.trim().split('\n').filter(l => l.trim());
    if (lines.length < 3) return _match;

    const headerCells = lines[0].split('|').filter(c => c.trim()).map(c => c.trim());
    const dataLines = lines.slice(2);

    let table = '<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">';
    table += '<thead><tr style="background:#f0f4f8;">';
    for (const cell of headerCells) {
      table += `<th style="border:1px solid #e2e8f0;padding:8px 12px;text-align:left;font-weight:600;color:#1a1a2e;">${cell}</th>`;
    }
    table += '</tr></thead><tbody>';

    for (const line of dataLines) {
      const cells = line.split('|').filter(c => c.trim()).map(c => c.trim());
      table += '<tr>';
      for (const cell of cells) {
        let bgColor = '';
        if (cell.includes('🌟')) bgColor = 'background:#fef9c3;';
        else if (cell.includes('✅')) bgColor = 'background:#dcfce7;';
        else if (cell.includes('⚠️')) bgColor = 'background:#fef3c7;';
        else if (cell.includes('🔴')) bgColor = 'background:#fee2e2;';
        table += `<td style="border:1px solid #e2e8f0;padding:8px 12px;${bgColor}">${cell}</td>`;
      }
      table += '</tr>';
    }
    table += '</tbody></table>';
    return table;
  });

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li style="margin:4px 0;">$1</li>');
  html = html.replace(/(<li[^>]*>.*<\/li>\n?)+/g, (m) => `<ul style="padding-left:20px;margin:8px 0;">${m}</ul>`);

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li style="margin:4px 0;">$1</li>');

  // Line breaks
  html = html.replace(/\n\n/g, '<br/><br/>');
  html = html.replace(/\n/g, '<br/>');

  return html;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Load Resend API key from environment secrets (never from DB)
    const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";

    // Load display settings (domain/name) from system_settings — these are not secrets
    let fromDomain = "metashub.com.br";
    let fromName = "MetasHub";

    const { data: settings } = await supabaseAdmin
      .from("system_settings")
      .select("key, value")
      .in("key", ["resend_from_domain", "resend_from_name"]);

    if (settings) {
      for (const s of settings) {
        if (s.key === "resend_from_domain") fromDomain = s.value;
        if (s.key === "resend_from_name") fromName = s.value;
      }
    }

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY não configurada. Configure em Integrações." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth check - accept both direct calls (with auth header) and internal calls (with empresa_id in body)
    const authHeader = req.headers.get("Authorization");
    const body = await req.json().catch(() => ({}));
    let empresaId = body.empresa_id;

    // If called with auth header, validate user is admin
    if (authHeader && !body._internal) {
      const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await supabaseUser.auth.getUser();
      if (!user) {
        return new Response(JSON.stringify({ error: "Não autorizado" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: role } = await supabaseAdmin.from("user_roles").select("empresa_id, role").eq("user_id", user.id).single();
      if (!role || (role.role !== "admin" && role.role !== "super_admin")) {
        return new Response(JSON.stringify({ error: "Apenas admins podem enviar emails" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      empresaId = role.empresa_id;
    }

    if (!empresaId) {
      return new Response(JSON.stringify({ error: "empresa_id é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch latest analysis
    const { data: analise } = await supabaseAdmin
      .from("analise_ia")
      .select("conteudo, mes_referencia, created_at")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!analise) {
      return new Response(JSON.stringify({ error: "Nenhuma análise encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduplication: prevent sending the same analysis email within 5 minutes
    const dedupKey = `email_sent_${empresaId}_${analise.mes_referencia}`;
    const { data: lastSent } = await supabaseAdmin
      .from("system_settings")
      .select("value")
      .eq("key", dedupKey)
      .single();

    if (lastSent) {
      const lastSentAt = new Date(lastSent.value).getTime();
      const now = Date.now();
      if (now - lastSentAt < 5 * 60 * 1000) {
        return new Response(JSON.stringify({
          error: "Email já enviado recentemente para esta análise. Aguarde 5 minutos.",
          skipped: true,
        }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch active recipients
    const { data: destinatarios } = await supabaseAdmin
      .from("analise_email_config")
      .select("email")
      .eq("empresa_id", empresaId)
      .eq("ativo", true);

    if (!destinatarios || destinatarios.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum destinatário configurado" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch empresa name
    const { data: empresa } = await supabaseAdmin
      .from("empresas")
      .select("nome")
      .eq("id", empresaId)
      .single();

    const empresaNome = empresa?.nome || "Empresa";
    const mesRef = analise.mes_referencia;
    const htmlContent = markdownToHtml(analise.conteudo);

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:640px;margin:0 auto;padding:24px;">
    <div style="background:#1a1a2e;color:#fff;padding:20px 24px;border-radius:12px 12px 0 0;">
      <h1 style="margin:0;font-size:20px;">📊 Relatório de Performance — ${mesRef}</h1>
      <p style="margin:6px 0 0;opacity:0.8;font-size:14px;">${empresaNome}</p>
    </div>
    <div style="background:#ffffff;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;line-height:1.6;color:#334155;font-size:14px;">
      ${htmlContent}
    </div>
    <p style="text-align:center;margin-top:16px;font-size:12px;color:#94a3b8;">
      Gerado automaticamente pelo MetasHub · Analista IA
    </p>
  </div>
</body>
</html>`;

    const emails = destinatarios.map(d => d.email);
    const fromEmail = `relatorios@${fromDomain}`;

    // Send via Resend
    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: emails,
        subject: `📊 Relatório de Performance — ${mesRef} | ${empresaNome}`,
        html: emailHtml,
      }),
    });

    if (!resendResp.ok) {
      const errText = await resendResp.text();
      console.error("Resend error:", resendResp.status, errText);
      return new Response(JSON.stringify({ error: "Erro ao enviar email via Resend", details: errText }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendData = await resendResp.json();

    // Record send timestamp for deduplication
    await supabaseAdmin.from("system_settings").upsert(
      { key: dedupKey, value: new Date().toISOString() },
      { onConflict: "key" }
    );

    return new Response(JSON.stringify({
      success: true,
      message: `Email enviado para ${emails.length} destinatário(s)`,
      resend_id: resendData.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("send-analise-email error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
