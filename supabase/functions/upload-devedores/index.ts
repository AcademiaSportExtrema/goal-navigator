import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ── Normalização de cabeçalhos ──────────────────────────────────────

function normalizeHeader(h: string): string {
  return h
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[°º]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const COLUMN_ALIASES: Record<string, string[]> = {
  nome:            ['nome', 'cliente', 'nome cliente', 'nome do cliente', 'aluno', 'nome aluno'],
  cod_empresa:     ['cod empresa', 'codigo empresa', 'cod emp'],
  contrato:        ['contrato', 'n contrato', 'no contrato', 'numero contrato', 'nro contrato', 'num contrato'],
  codigo_parcela:  ['codigo parcela', 'cod parcela', 'codigo da parcela'],
  parcela:         ['parcela', 'num parcela', 'numero parcela'],
  data_vencimento: ['dt vencimento parcela', 'data vencimento parcela', 'dt vencimento', 'data vencimento', 'data de vencimento', 'vencimento'],
  valor_parcela:   ['vlr parcela', 'valor parcela', 'vlr da parcela', 'valor da parcela', 'valor'],
  convenio:        ['convenio cobranca', 'convenio', 'convênio cobrança', 'convenio de cobranca'],
  empresa:         ['empresa', 'unidade'],
  consultor:       ['consultor', 'consultora', 'resp venda', 'responsavel venda', 'vendedor'],
  em_remessa:      ['em remessa', 'remessa'],
};

function buildHeaderMap(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const original of headers) {
    const norm = normalizeHeader(original);
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (map[field]) continue;
      if (aliases.some(a => a === norm)) {
        map[field] = original;
        break;
      }
    }
  }
  return map;
}

function parseDate(val: any): string | null {
  if (!val || val === '-' || val === '') return null;
  if (typeof val === 'number') {
    const date = new Date((val - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  if (typeof val === 'string') {
    const parts = val.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  return null;
}

function parseValor(val: any): number {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const str = String(val).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
  return parseFloat(str) || 0;
}

// ── Handler principal ───────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Validar JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verificar role admin
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    const { data: isSuperAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'super_admin' });
    if (!isAdmin && !isSuperAdmin) {
      return new Response(JSON.stringify({ error: 'Acesso restrito a administradores' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Derivar empresa_id do servidor (nunca confiar no cliente)
    const { data: empresa_id } = await supabase.rpc('get_user_empresa_id', { _user_id: user.id });
    if (!empresa_id) {
      return new Response(JSON.stringify({ error: 'Empresa não encontrada' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { arquivo_path, arquivo_nome } = await req.json();

    if (!arquivo_path) {
      return new Response(JSON.stringify({ error: 'arquivo_path é obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Download do arquivo
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('uploads')
      .download(arquivo_path);

    if (downloadError) throw downloadError;

    const XLSX = await import('npm:xlsx@0.18.5');

    const arrayBuffer = await fileData.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Converter para JSON pulando a 1ª linha (título do relatório)
    // range: 1 faz o cabeçalho começar na 2ª linha (0-indexed)
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    // Detectar se a 1ª linha é um título (verificar se a 2ª linha tem mais colunas preenchidas)
    const firstRowJson = XLSX.utils.sheet_to_json(worksheet, { defval: null, range: 0 }) as Record<string, any>[];
    const secondRowJson = XLSX.utils.sheet_to_json(worksheet, { defval: null, range: 1 }) as Record<string, any>[];

    // Heurística: se a 2ª interpretação tem mais colunas mapeáveis, pular a 1ª linha
    const firstHeaders = firstRowJson.length > 0 ? Object.keys(firstRowJson[0]) : [];
    const secondHeaders = secondRowJson.length > 0 ? Object.keys(secondRowJson[0]) : [];

    const firstMap = buildHeaderMap(firstHeaders);
    const secondMap = buildHeaderMap(secondHeaders);

    const firstMatches = Object.keys(firstMap).length;
    const secondMatches = Object.keys(secondMap).length;

    const jsonData = secondMatches > firstMatches ? secondRowJson : firstRowJson;
    const headerMap = secondMatches > firstMatches ? secondMap : firstMap;
    const headers = secondMatches > firstMatches ? secondHeaders : firstHeaders;

    console.log('Cabeçalhos encontrados:', headers);
    console.log('Mapeamento construído:', headerMap);
    console.log(`Linhas a processar: ${jsonData.length}`);

    const col = (field: string) => headerMap[field] || '';

    // Substituir: deletar registros anteriores da mesma empresa
    const { error: deleteError } = await supabase
      .from('devedores_parcelas')
      .delete()
      .eq('empresa_id', empresa_id);

    if (deleteError) {
      console.error('Erro ao limpar registros anteriores:', deleteError);
      throw deleteError;
    }

    // Inserir novos registros em batch
    let importados = 0;
    let erros: { linha: number; erro: string }[] = [];
    const batchSize = 500;
    const rows: any[] = [];

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];

      try {
        const nome = row[col('nome')] || null;
        const consultor = row[col('consultor')] || null;

        // Pular linhas completamente vazias
        if (!nome && !consultor && !row[col('contrato')]) continue;

        rows.push({
          empresa_id,
          nome: nome ? String(nome).trim() : null,
          data_vencimento: parseDate(row[col('data_vencimento')]),
          valor_parcela: parseValor(row[col('valor_parcela')]),
          consultor: consultor ? String(consultor).trim() : null,
          contrato: row[col('contrato')] ? String(row[col('contrato')]).trim() : null,
          codigo_parcela: row[col('codigo_parcela')] ? String(row[col('codigo_parcela')]).trim() : null,
          parcela: row[col('parcela')] ? String(row[col('parcela')]).trim() : null,
          cod_empresa: row[col('cod_empresa')] ? String(row[col('cod_empresa')]).trim() : null,
          convenio: row[col('convenio')] ? String(row[col('convenio')]).trim() : null,
          em_remessa: row[col('em_remessa')] ? String(row[col('em_remessa')]).trim() : null,
          arquivo_nome: arquivo_nome || null,
          uploaded_by: user.id,
        });
      } catch (err: any) {
        erros.push({ linha: i + 2, erro: err.message });
      }
    }

    // Inserir em batches
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('devedores_parcelas')
        .insert(batch);

      if (insertError) {
        console.error(`Erro no batch ${i}-${i + batch.length}:`, insertError);
        erros.push({ linha: i, erro: insertError.message });
      } else {
        importados += batch.length;
      }
    }

    // Audit log
    try {
      await supabase.from('audit_logs').insert({
        actor_id: user.id,
        actor_email: user.email,
        actor_role: isSuperAdmin ? 'super_admin' : 'admin',
        action: 'upload_devedores',
        empresa_id,
        target_table: 'devedores_parcelas',
        metadata: { arquivo_nome, importados, erros: erros.length },
      });
    } catch (e) {
      console.error('Erro ao registrar audit log:', e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        resumo: { importados, erros: erros.length, total_linhas: jsonData.length }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Erro no upload de devedores:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
