import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ── Normalização de cabeçalhos (duplicado do importador para independência de deploy) ──

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
  produto:             ['produto', 'produtos', 'descricao produto'],
  matricula:           ['matricula', 'mat', 'codigo aluno', 'cod aluno'],
  nome_cliente:        ['nome', 'cliente', 'nome cliente', 'nome do cliente', 'razao social', 'aluno', 'nome aluno'],
  resp_venda:          ['resp venda', 'resp. venda', 'responsavel venda', 'responsavel pela venda', 'vendedor', 'consultor', 'consultora', 'consultor venda', 'responsavel'],
  resp_recebimento:    ['resp recebimento', 'resp. recebimento', 'responsavel recebimento', 'responsavel pelo recebimento', 'recebimento', 'responsavel 1'],
  data_cadastro:       ['data de cadastro', 'data cadastro', 'dt cadastro'],
  numero_contrato:     ['n contrato', 'no contrato', 'numero contrato', 'nro contrato', 'contrato', 'num contrato', 'numero do contrato'],
  data_inicio:         ['data inicio', 'data de inicio', 'dt inicio', 'inicio'],
  data_termino:        ['data termino', 'data de termino', 'dt termino', 'termino'],
  duracao:             ['duracao'],
  modalidades:         ['modalidades', 'modalidade'],
  turmas:              ['turmas', 'turma'],
  categoria:           ['categoria'],
  plano:               ['plano', 'planos'],
  situacao_contrato:   ['situacao do contrato', 'situacao contrato', 'status contrato', 'sit contrato'],
  data_lancamento:     ['data lancamento', 'data de lancamento', 'dt lancamento', 'data lanc'],
  forma_pagamento:     ['forma pagamento', 'forma de pagamento', 'forma pgto', 'meio pagamento'],
  condicao_pagamento:  ['condicao pagamento', 'condicao de pagamento', 'cond pagamento', 'condicao pgto'],
  valor:               ['valor', 'vlr', 'total'],
  empresa:             ['empresa', 'unidade'],
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Autenticação
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

    const { upload_id } = await req.json();
    if (!upload_id) {
      return new Response(JSON.stringify({ error: 'upload_id é obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Buscar upload
    const { data: uploadData, error: uploadErr } = await supabase
      .from('uploads')
      .select('empresa_id, arquivo_path')
      .eq('id', upload_id)
      .single();

    if (uploadErr || !uploadData) {
      return new Response(JSON.stringify({ error: 'Upload não encontrado' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verificar permissão (admin da mesma empresa)
    const { data: userEmpresaId } = await supabase.rpc('get_user_empresa_id', { _user_id: user.id });
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    const { data: isSuperAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'super_admin' });

    if (!isSuperAdmin && (!isAdmin || uploadData.empresa_id !== userEmpresaId)) {
      return new Response(JSON.stringify({ error: 'Acesso negado — apenas admins podem reprocessar' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const empresa_id = uploadData.empresa_id;

    // 1. Marcar como importando
    await supabase.from('uploads').update({ status: 'importando' }).eq('id', upload_id);

    // 2. Deletar lançamentos antigos deste upload
    const { error: delErr } = await supabase
      .from('lancamentos')
      .delete()
      .eq('upload_id', upload_id);

    if (delErr) {
      console.error('Erro ao deletar lançamentos:', delErr);
      throw new Error(`Falha ao deletar lançamentos antigos: ${delErr.message}`);
    }

    // 3. Baixar arquivo do storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('uploads')
      .download(uploadData.arquivo_path);

    if (downloadError) throw downloadError;

    // 4. Processar Excel
    const XLSX = await import('npm:xlsx@0.18.5');
    const arrayBuffer = await fileData.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null }) as Record<string, any>[];

    const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
    const headerMap = buildHeaderMap(headers);
    console.log('Reprocessando upload', upload_id);
    console.log('Cabeçalhos:', headers);
    console.log('Mapeamento:', headerMap);

    const col = (field: string) => headerMap[field] || '';

    // Buscar regras
    const { data: regras } = await supabase
      .from('regras_meta')
      .select('*')
      .eq('empresa_id', empresa_id)
      .eq('ativo', true)
      .order('prioridade', { ascending: true });

    let importados = 0;
    let duplicados = 0;
    let erros: { linha: number; erro: string }[] = [];
    let pendentes = 0;

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      try {
        const lancamento = {
          upload_id,
          empresa_id,
          produto:             row[col('produto')] || null,
          matricula:           row[col('matricula')] || null,
          nome_cliente:        row[col('nome_cliente')] || null,
          resp_venda:          row[col('resp_venda')] || null,
          resp_recebimento:    row[col('resp_recebimento')] || null,
          data_cadastro:       parseDate(row[col('data_cadastro')]),
          numero_contrato:     row[col('numero_contrato')] != null ? String(row[col('numero_contrato')]) : null,
          data_inicio:         parseDate(row[col('data_inicio')]),
          data_termino:        parseDate(row[col('data_termino')]),
          duracao:             row[col('duracao')] || null,
          modalidades:         row[col('modalidades')] || null,
          turmas:              row[col('turmas')] || null,
          categoria:           row[col('categoria')] || null,
          plano:               row[col('plano')] || null,
          situacao_contrato:   row[col('situacao_contrato')] || null,
          data_lancamento:     parseDate(row[col('data_lancamento')]),
          forma_pagamento:     row[col('forma_pagamento')] || null,
          condicao_pagamento:  row[col('condicao_pagamento')] || null,
          valor:               parseValor(row[col('valor')]),
          empresa:             row[col('empresa')] || null,
          entra_meta: false,
          pendente_regra: true,
          consultora_chave: null as string | null,
          mes_competencia: null as string | null,
          regra_aplicada_id: null as string | null,
          motivo_classificacao: null as string | null,
          hash_linha: '',
        };

        // Hash
        const hashStr = `${lancamento.empresa}|${lancamento.matricula}|${lancamento.produto}|${lancamento.data_lancamento}|${lancamento.valor}|${lancamento.resp_venda}|${lancamento.numero_contrato}`;
        const encoder = new TextEncoder();
        const data = encoder.encode(hashStr);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        lancamento.hash_linha = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Aplicar regras
        if (regras) {
          for (const regra of regras) {
            const campoValor = lancamento[regra.campo_alvo as keyof typeof lancamento];
            if (!campoValor) continue;

            let match = false;
            const valorStr = String(campoValor).toLowerCase();
            const regraValor = regra.valor.toLowerCase();

            switch (regra.operador) {
              case 'contem': match = valorStr.includes(regraValor); break;
              case 'igual': match = valorStr === regraValor; break;
              case 'comeca_com': match = valorStr.startsWith(regraValor); break;
              case 'termina_com': match = valorStr.endsWith(regraValor); break;
              case 'regex':
                try {
                  if (valorStr.length > 1000) break;
                  // Reject dangerous regex patterns (nested quantifiers → ReDoS)
                  if (regra.valor.length > 200 || /(\+|\*|\{)\s*\)(\+|\*|\{|\?)/.test(regra.valor)) {
                    console.warn('Regex rejected (potential ReDoS):', regra.valor);
                    match = false;
                    break;
                  }
                  match = new RegExp(regra.valor, 'i').test(valorStr);
                } catch (e) { match = false; }
                break;
            }

            if (match) {
              lancamento.entra_meta = regra.entra_meta;
              lancamento.pendente_regra = false;
              lancamento.regra_aplicada_id = regra.id;
              lancamento.consultora_chave = lancamento[regra.responsavel_campo as keyof typeof lancamento] as string || null;

              let dataRef: string | null = null;
              if (regra.regra_mes === 'DATA_LANCAMENTO') dataRef = lancamento.data_lancamento;
              else if (regra.regra_mes === 'DATA_INICIO') dataRef = lancamento.data_inicio || lancamento.data_lancamento;



              if (dataRef) lancamento.mes_competencia = dataRef.substring(0, 7);
              break;
            }
          }
        }

        if (lancamento.pendente_regra) pendentes++;

        const { error: insertError } = await supabase
          .from('lancamentos')
          .insert(lancamento);

        if (insertError) {
          if (insertError.code === '23505') duplicados++;
          else throw insertError;
        } else {
          importados++;
        }
      } catch (err: any) {
        erros.push({ linha: i + 2, erro: err.message });
      }
    }

    // 5. Atualizar resumo
    await supabase.from('uploads').update({
      status: 'concluido',
      resumo: {
        total_linhas: jsonData.length,
        importados,
        duplicados,
        erros: erros.length,
        pendentes_regra: pendentes,
      },
      erros,
    }).eq('id', upload_id);

    return new Response(
      JSON.stringify({ success: true, resumo: { total_linhas: jsonData.length, importados, duplicados, erros: erros.length, pendentes_regra: pendentes } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Erro no reprocessamento:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
