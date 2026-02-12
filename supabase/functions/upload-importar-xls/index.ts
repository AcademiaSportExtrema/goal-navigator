import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { upload_id, arquivo_path } = await req.json();

    if (!upload_id || !arquivo_path) {
      throw new Error('upload_id e arquivo_path são obrigatórios');
    }

    // Buscar empresa_id do upload
    const { data: uploadData, error: uploadFetchError } = await supabase
      .from('uploads')
      .select('empresa_id')
      .eq('id', upload_id)
      .single();

    if (uploadFetchError || !uploadData) throw new Error('Upload não encontrado');
    const empresa_id = uploadData.empresa_id;

    // Atualizar status para importando
    await supabase.from('uploads').update({ status: 'importando' }).eq('id', upload_id);

    // Baixar arquivo do storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('uploads')
      .download(arquivo_path);

    if (downloadError) throw downloadError;

    // Processar Excel usando SheetJS via npm
    const XLSX = await import('npm:xlsx@0.18.5');
    
    const arrayBuffer = await fileData.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    let importados = 0;
    let duplicados = 0;
    let erros: { linha: number; erro: string }[] = [];
    let pendentes = 0;

    // Buscar regras ativas
    const { data: regras } = await supabase
      .from('regras_meta')
      .select('*')
      .eq('ativo', true)
      .order('prioridade', { ascending: true });

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i] as Record<string, any>;
      
      try {
        // Normalizar dados
        const parseDate = (val: any): string | null => {
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
        };

        const parseValor = (val: any): number => {
          if (!val) return 0;
          if (typeof val === 'number') return val;
          const str = String(val).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
          return parseFloat(str) || 0;
        };

        const lancamento = {
          upload_id,
          empresa_id,
          produto: row['Produto'] || null,
          matricula: row['Matrícula'] || row['Matricula'] || null,
          nome_cliente: row['Nome'] || null,
          resp_venda: row['Resp. Venda'] || row['Resp Venda'] || null,
          resp_recebimento: row['Resp. Recebimento'] || row['Resp Recebimento'] || null,
          data_cadastro: parseDate(row['Data de Cadastro'] || row['Data Cadastro']),
          numero_contrato: row['N° Contrato'] || row['Contrato'] || null,
          data_inicio: parseDate(row['Data Início'] || row['Data Inicio']),
          data_termino: parseDate(row['Data Término'] || row['Data Termino']),
          duracao: row['Duração'] || row['Duracao'] || null,
          modalidades: row['Modalidades'] || null,
          turmas: row['Turmas'] || null,
          categoria: row['Categoria'] || null,
          plano: row['Plano'] || null,
          situacao_contrato: row['Situação do Contrato'] || row['Situacao Contrato'] || null,
          data_lancamento: parseDate(row['Data Lançamento'] || row['Data Lancamento']),
          forma_pagamento: row['Forma Pagamento'] || row['Forma de Pagamento'] || null,
          condicao_pagamento: row['Condicao Pagamento'] || row['Condição Pagamento'] || null,
          valor: parseValor(row['Valor']),
          empresa: row['Empresa'] || null,
          entra_meta: false,
          pendente_regra: true,
          consultora_chave: null as string | null,
          mes_competencia: null as string | null,
          regra_aplicada_id: null as string | null,
          motivo_classificacao: null as string | null,
          hash_linha: '',
        };

        // Gerar hash para deduplicação
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
              case 'contem':
                match = valorStr.includes(regraValor);
                break;
              case 'igual':
                match = valorStr === regraValor;
                break;
              case 'comeca_com':
                match = valorStr.startsWith(regraValor);
                break;
              case 'termina_com':
                match = valorStr.endsWith(regraValor);
                break;
              case 'regex':
                match = new RegExp(regra.valor, 'i').test(valorStr);
                break;
            }

            if (match) {
              lancamento.entra_meta = regra.entra_meta;
              lancamento.pendente_regra = false;
              lancamento.regra_aplicada_id = regra.id;
              lancamento.consultora_chave = lancamento[regra.responsavel_campo as keyof typeof lancamento] as string || null;

              // Definir mês de competência
              let dataRef: string | null = null;
              if (regra.regra_mes === 'DATA_LANCAMENTO') {
                dataRef = lancamento.data_lancamento;
              } else if (regra.regra_mes === 'DATA_INICIO') {
                dataRef = lancamento.data_inicio || lancamento.data_lancamento;
              } else if (regra.regra_mes === 'HIBRIDA') {
                dataRef = lancamento.plano ? (lancamento.data_inicio || lancamento.data_lancamento) : lancamento.data_lancamento;
              }
              
              if (dataRef) {
                lancamento.mes_competencia = dataRef.substring(0, 7);
              }

              break;
            }
          }
        }

        if (lancamento.pendente_regra) pendentes++;

        // Inserir
        const { error: insertError } = await supabase
          .from('lancamentos')
          .insert(lancamento);

        if (insertError) {
          if (insertError.code === '23505') {
            duplicados++;
          } else {
            throw insertError;
          }
        } else {
          importados++;
        }
      } catch (err: any) {
        erros.push({ linha: i + 2, erro: err.message });
      }
    }

    // Atualizar upload com resumo
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
      JSON.stringify({ success: true, resumo: { importados, duplicados, erros: erros.length, pendentes_regra: pendentes } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Erro na importação:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
