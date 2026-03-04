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

function normalizeText(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

const COLUMN_ALIASES: Record<string, string[]> = {
  nome:            ['nome', 'cliente', 'nome cliente', 'nome do cliente', 'aluno', 'nome aluno'],
  cod_empresa:     ['cod empresa', 'codigo empresa', 'cod emp'],
  contrato:        ['contrato', 'n contrato', 'no contrato', 'numero contrato', 'nro contrato', 'num contrato'],
  codigo_parcela:  ['codigo parcela', 'cod parcela', 'codigo da parcela'],
  parcela:         ['parcela', 'num parcela', 'numero parcela'],
  data_vencimento: ['dt vencimento parcela', 'data vencimento parcela', 'dt vencimento', 'data vencimento', 'data de vencimento', 'vencimento'],
  valor_parcela:   ['vlr parcela', 'valor parcela', 'vlr da parcela', 'valor da parcela', 'valor'],
  convenio:        ['convenio cobranca', 'convenio', 'convenio cobranca', 'convenio de cobranca'],
  empresa:         ['empresa', 'unidade'],
  consultor:       ['consultor', 'consultora', 'resp venda', 'responsavel venda', 'vendedor'],
  em_remessa:      ['em remessa', 'remessa'],
};

const REQUIRED_COLUMNS = ['nome', 'data_vencimento', 'valor_parcela', 'consultor'];

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

function parseDate(val: any): { date: string | null; valid: boolean } {
  if (!val || val === '-' || val === '') return { date: null, valid: true };
  if (typeof val === 'number') {
    const d = new Date((val - 25569) * 86400 * 1000);
    if (isNaN(d.getTime())) return { date: null, valid: false };
    return { date: d.toISOString().split('T')[0], valid: true };
  }
  if (typeof val === 'string') {
    const parts = val.trim().split('/');
    if (parts.length === 3) {
      const [dd, mm, yyyy] = parts;
      const day = parseInt(dd, 10);
      const month = parseInt(mm, 10);
      const year = parseInt(yyyy, 10);
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
        return { date: `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`, valid: true };
      }
    }
    // Try ISO format
    const isoDate = new Date(val);
    if (!isNaN(isoDate.getTime())) {
      return { date: isoDate.toISOString().split('T')[0], valid: true };
    }
  }
  return { date: null, valid: false };
}

function parseValor(val: any): { valor: number; valid: boolean } {
  if (!val && val !== 0) return { valor: 0, valid: true };
  if (typeof val === 'number') return { valor: val, valid: true };
  const str = String(val).trim();
  if (!str) return { valor: 0, valid: true };
  const stripped = str.replace(/[R$\s]/g, '');
  const cleaned = stripped.includes(',')
    ? stripped.replace(/\./g, '').replace(',', '.')
    : stripped;
  const num = parseFloat(cleaned);
  if (isNaN(num)) return { valor: 0, valid: false };
  return { valor: num, valid: true };
}

function normalizeKeyPart(value: any): string {
  return String(value ?? '').trim().toLowerCase();
}

function normalizeDatePart(value: string | null): string {
  if (!value) return '';
  return value.split('T')[0];
}

function normalizeMoneyPart(value: number): string {
  if (Number.isNaN(Number(value))) return '';
  return Number(value).toFixed(2);
}

function buildDevedorKey(row: {
  cod_empresa: string | null;
  contrato: string | null;
  codigo_parcela: string | null;
  parcela: string | null;
  nome: string | null;
  data_vencimento: string | null;
  valor_parcela: number;
}): string {
  return [
    normalizeKeyPart(row.cod_empresa),
    normalizeKeyPart(row.contrato),
    normalizeKeyPart(row.codigo_parcela),
    normalizeKeyPart(row.parcela),
    normalizeKeyPart(row.nome),
    normalizeDatePart(row.data_vencimento),
    normalizeMoneyPart(row.valor_parcela),
  ].join('|');
}

// ── CSV parser ──────────────────────────────────────────────────────

function parseCSVText(text: string): Record<string, string>[][] {
  const clean = text.replace(/^\uFEFF/, '');
  const lines = clean.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [[], []];

  const separator = lines[0].includes(';') ? ';' : ',';

  function parseLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') { current += '"'; i++; }
          else inQuotes = false;
        } else current += ch;
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === separator) { result.push(current); current = ''; }
        else current += ch;
      }
    }
    result.push(current);
    return result;
  }

  // Try header at line 0
  const h0 = parseLine(lines[0]).map(h => h.trim());
  const rows0 = lines.slice(1).map(l => {
    const vals = parseLine(l);
    const obj: Record<string, string> = {};
    h0.forEach((h, i) => { obj[h] = (vals[i] || '').trim(); });
    return obj;
  });

  // Try header at line 1
  if (lines.length < 3) return [rows0, []];
  const h1 = parseLine(lines[1]).map(h => h.trim());
  const rows1 = lines.slice(2).map(l => {
    const vals = parseLine(l);
    const obj: Record<string, string> = {};
    h1.forEach((h, i) => { obj[h] = (vals[i] || '').trim(); });
    return obj;
  });

  return [rows0, rows1];
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

    // Derivar empresa_id do servidor
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

    // Detect file type and parse
    const isCSV = (arquivo_nome || arquivo_path || '').toLowerCase().endsWith('.csv');
    let jsonData: Record<string, any>[];
    let headerMap: Record<string, string>;

    if (isCSV) {
      const text = await fileData.text();
      const [rows0, rows1] = parseCSVText(text);
      const headers0 = rows0.length > 0 ? Object.keys(rows0[0]) : [];
      const headers1 = rows1.length > 0 ? Object.keys(rows1[0]) : [];
      const map0 = buildHeaderMap(headers0);
      const map1 = buildHeaderMap(headers1);
      if (Object.keys(map1).length > Object.keys(map0).length) {
        jsonData = rows1;
        headerMap = map1;
      } else {
        jsonData = rows0;
        headerMap = map0;
      }
    } else {
      const XLSX = await import('npm:xlsx@0.18.5');
      const arrayBuffer = await fileData.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const firstRowJson = XLSX.utils.sheet_to_json(worksheet, { defval: null, range: 0 }) as Record<string, any>[];
      const secondRowJson = XLSX.utils.sheet_to_json(worksheet, { defval: null, range: 1 }) as Record<string, any>[];

      const firstHeaders = firstRowJson.length > 0 ? Object.keys(firstRowJson[0]) : [];
      const secondHeaders = secondRowJson.length > 0 ? Object.keys(secondRowJson[0]) : [];

      const firstMap = buildHeaderMap(firstHeaders);
      const secondMap = buildHeaderMap(secondHeaders);

      if (Object.keys(secondMap).length > Object.keys(firstMap).length) {
        jsonData = secondRowJson;
        headerMap = secondMap;
      } else {
        jsonData = firstRowJson;
        headerMap = firstMap;
      }
    }

    console.log('Mapeamento construído:', headerMap);
    console.log(`Linhas a processar: ${jsonData.length}`);

    // ── Validação de colunas obrigatórias ──────────────────────────
    const missingColumns = REQUIRED_COLUMNS.filter(c => !headerMap[c]);
    if (missingColumns.length > 0) {
      const labelMap: Record<string, string> = {
        nome: 'Nome',
        data_vencimento: 'Data de Vencimento',
        valor_parcela: 'Valor da Parcela',
        consultor: 'Consultor',
      };
      return new Response(JSON.stringify({
        error: 'colunas_faltantes',
        colunas_faltantes: missingColumns.map(c => labelMap[c] || c),
        message: `Colunas obrigatórias não encontradas: ${missingColumns.map(c => labelMap[c] || c).join(', ')}`,
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ── Buscar consultoras cadastradas da empresa ──────────────────
    const { data: consultoras } = await supabase
      .from('consultoras')
      .select('nome')
      .eq('empresa_id', empresa_id);

    const consultoraNomes = (consultoras || []).map(c => normalizeText(c.nome));

    const { data: resumosAtuais } = await supabase
      .from('devedores_parcelas')
      .select('chave_cobranca, cod_empresa, contrato, codigo_parcela, parcela, nome, data_vencimento, valor_parcela, status_cobranca, ultimo_contato_em, ultima_observacao, pago_em, cobranca_enviada')
      .eq('empresa_id', empresa_id);

    const resumoPorChave = new Map<string, {
      cobranca_enviada: boolean;
      status_cobranca: 'pendente' | 'em_contato' | 'pago';
      ultimo_contato_em: string | null;
      ultima_observacao: string | null;
      pago_em: string | null;
    }>();

    for (const resumo of resumosAtuais || []) {
      const chave = resumo.chave_cobranca || buildDevedorKey({
        cod_empresa: resumo.cod_empresa,
        contrato: resumo.contrato,
        codigo_parcela: resumo.codigo_parcela,
        parcela: resumo.parcela,
        nome: resumo.nome,
        data_vencimento: resumo.data_vencimento,
        valor_parcela: Number(resumo.valor_parcela || 0),
      });

      if (!chave || resumoPorChave.has(chave)) continue;

      resumoPorChave.set(chave, {
        cobranca_enviada: !!resumo.cobranca_enviada,
        status_cobranca: (resumo.status_cobranca || 'pendente') as 'pendente' | 'em_contato' | 'pago',
        ultimo_contato_em: resumo.ultimo_contato_em || null,
        ultima_observacao: resumo.ultima_observacao || null,
        pago_em: resumo.pago_em || null,
      });
    }

    const col = (field: string) => headerMap[field] || '';

    // ── Processar linhas ──────────────────────────────────────────
    const avisos: { linha: number; tipo: string; detalhe: string }[] = [];
    const erros: { linha: number; erro: string }[] = [];
    const rows: any[] = [];
    let totalLinhasLidas = 0;

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const linhaNum = i + 2; // +2 porque cabeçalho é linha 1 (ou 2 se título)

      const nome = row[col('nome')] || null;
      const consultorRaw = row[col('consultor')] || null;
      const contratoRaw = row[col('contrato')] || null;

      // Limpar consultor duplicado por vírgula (ex: "Nicole, Nicole" → "Nicole")
      let consultorLimpo = consultorRaw ? String(consultorRaw).trim() : null;
      if (consultorLimpo && consultorLimpo.includes(',')) {
        consultorLimpo = consultorLimpo.split(',')[0].trim();
      }

      // Pular linhas completamente vazias
      if (!nome && !consultorLimpo && !contratoRaw) continue;
      totalLinhasLidas++;

      // Validar data
      const dateResult = parseDate(row[col('data_vencimento')]);
      if (!dateResult.valid) {
        avisos.push({
          linha: linhaNum,
          tipo: 'data_invalida',
          detalhe: `Data de vencimento inválida: "${row[col('data_vencimento')]}"`,
        });
      }

      // Validar valor
      const valorResult = parseValor(row[col('valor_parcela')]);
      if (!valorResult.valid) {
        avisos.push({
          linha: linhaNum,
          tipo: 'valor_invalido',
          detalhe: `Valor da parcela inválido: "${row[col('valor_parcela')]}"`,
        });
      }

      // Validar consultor cadastrado
      if (consultorLimpo) {
        const normConsultor = normalizeText(consultorLimpo);
        const found = consultoraNomes.some(cn => cn === normConsultor);
        if (!found) {
          avisos.push({
            linha: linhaNum,
            tipo: 'consultor_nao_cadastrado',
            detalhe: `Consultor "${consultorLimpo}" não encontrado no cadastro`,
          });
        }
      }

      try {
        const devedorRow = {
          empresa_id,
          nome: nome ? String(nome).trim() : null,
          data_vencimento: dateResult.date,
          valor_parcela: valorResult.valor,
          consultor: consultorLimpo,
          contrato: contratoRaw ? String(contratoRaw).trim() : null,
          codigo_parcela: row[col('codigo_parcela')] ? String(row[col('codigo_parcela')]).trim() : null,
          parcela: row[col('parcela')] ? String(row[col('parcela')]).trim() : null,
          cod_empresa: row[col('cod_empresa')] ? String(row[col('cod_empresa')]).trim() : null,
          convenio: row[col('convenio')] ? String(row[col('convenio')]).trim() : null,
          em_remessa: row[col('em_remessa')] ? String(row[col('em_remessa')]).trim() : null,
          arquivo_nome: arquivo_nome || null,
          uploaded_by: user.id,
        };

        const chave_cobranca = buildDevedorKey({
          cod_empresa: devedorRow.cod_empresa,
          contrato: devedorRow.contrato,
          codigo_parcela: devedorRow.codigo_parcela,
          parcela: devedorRow.parcela,
          nome: devedorRow.nome,
          data_vencimento: devedorRow.data_vencimento,
          valor_parcela: devedorRow.valor_parcela,
        });

        const resumoAtual = resumoPorChave.get(chave_cobranca);

        rows.push({
          ...devedorRow,
          chave_cobranca,
          cobranca_enviada: resumoAtual?.cobranca_enviada ?? false,
          status_cobranca: resumoAtual?.status_cobranca ?? 'pendente',
          ultimo_contato_em: resumoAtual?.ultimo_contato_em ?? null,
          ultima_observacao: resumoAtual?.ultima_observacao ?? null,
          pago_em: resumoAtual?.pago_em ?? null,
        });
      } catch (err: any) {
        erros.push({ linha: linhaNum, erro: err.message });
      }
    }

    // ── Substituir: deletar registros anteriores ────────────────────
    const { error: deleteError } = await supabase
      .from('devedores_parcelas')
      .delete()
      .eq('empresa_id', empresa_id);

    if (deleteError) {
      console.error('Erro ao limpar registros anteriores:', deleteError);
      throw deleteError;
    }

    // ── Inserir em batches ──────────────────────────────────────────
    let importados = 0;
    const batchSize = 500;

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

    const uploaded_at = new Date().toISOString();

    // Audit log
    try {
      await supabase.from('audit_logs').insert({
        actor_id: user.id,
        actor_email: user.email,
        actor_role: isSuperAdmin ? 'super_admin' : 'admin',
        action: 'upload_devedores',
        empresa_id,
        target_table: 'devedores_parcelas',
        metadata: { arquivo_nome, importados, erros: erros.length, avisos: avisos.length },
      });
    } catch (e) {
      console.error('Erro ao registrar audit log:', e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        resumo: {
          total_linhas: totalLinhasLidas,
          importados,
          avisos,
          erros,
          arquivo_nome: arquivo_nome || null,
          uploaded_at,
          uploaded_by_email: user.email || null,
        }
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
