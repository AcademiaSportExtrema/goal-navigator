import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PesoSemanal {
  semana: number;
  peso_percent: number;
}

interface RitmoSemanal {
  semanaAtual: number;
  metaEsperadaPercent: number;
  metaEsperadaValor: number;
  vendido: number;
  percentualDoEsperado: number;
  status: 'adiantada' | 'no_ritmo' | 'atrasada';
  pesos: PesoSemanal[];
}

/**
 * Determina em qual semana do mês estamos (1-5)
 * S1: dias 1-7, S2: 8-14, S3: 15-21, S4: 22-28, S5: 29+
 */
function getSemanaDoMes(dia: number): number {
  if (dia <= 7) return 1;
  if (dia <= 14) return 2;
  if (dia <= 21) return 3;
  if (dia <= 28) return 4;
  return 5;
}

/**
 * Calcula a proporção da semana atual que já passou (0 a 1)
 */
function getProgressoSemana(dia: number): number {
  const semana = getSemanaDoMes(dia);
  const inicioSemana = (semana - 1) * 7 + 1;
  const fimSemana = semana === 5 ? 31 : semana * 7;
  const diasNaSemana = fimSemana - inicioSemana + 1;
  const diasPassados = dia - inicioSemana + 1;
  return Math.min(diasPassados / diasNaSemana, 1);
}

/**
 * Calcula o percentual da meta que deveria ter sido atingido até agora,
 * considerando os pesos semanais configurados.
 */
function calcularMetaEsperada(
  pesos: PesoSemanal[],
  dia: number,
): number {
  const semanaAtual = getSemanaDoMes(dia);
  const progressoSemana = getProgressoSemana(dia);

  let acumulado = 0;

  // Semanas já concluídas
  for (const p of pesos) {
    if (p.semana < semanaAtual) {
      acumulado += p.peso_percent;
    }
  }

  // Proporção da semana atual
  const pesoSemanaAtual = pesos.find(p => p.semana === semanaAtual)?.peso_percent || 0;
  acumulado += pesoSemanaAtual * progressoSemana;

  return acumulado;
}

export function useMetaSemanal(
  metaMensalId: string | undefined,
  metaTotal: number,
  vendido: number,
  mesSelecionado: string,
) {
  const { data: pesosDb } = useQuery({
    queryKey: ['meta-semanal', metaMensalId],
    enabled: !!metaMensalId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('meta_semanal')
        .select('semana, peso_percent')
        .eq('meta_mensal_id', metaMensalId!)
        .order('semana');
      if (error) throw error;
      return data as PesoSemanal[];
    },
  });

  // Default: distribuição uniforme (25% por semana, S5 = 0)
  const pesos: PesoSemanal[] = pesosDb && pesosDb.length > 0
    ? pesosDb
    : [
        { semana: 1, peso_percent: 25 },
        { semana: 2, peso_percent: 25 },
        { semana: 3, peso_percent: 25 },
        { semana: 4, peso_percent: 25 },
      ];

  // Verificar se o mês selecionado é o mês atual
  const hoje = new Date();
  const [ano, mes] = mesSelecionado.split('-').map(Number);
  const isMesAtual = hoje.getFullYear() === ano && hoje.getMonth() + 1 === mes;
  const dia = isMesAtual ? hoje.getDate() : new Date(ano, mes, 0).getDate(); // último dia se não for o mês atual

  const semanaAtual = getSemanaDoMes(dia);
  const metaEsperadaPercent = calcularMetaEsperada(pesos, dia);
  const metaEsperadaValor = metaTotal * (metaEsperadaPercent / 100);
  const percentualDoEsperado = metaEsperadaValor > 0 ? (vendido / metaEsperadaValor) * 100 : 0;

  let status: 'adiantada' | 'no_ritmo' | 'atrasada' = 'no_ritmo';
  if (percentualDoEsperado >= 105) status = 'adiantada';
  else if (percentualDoEsperado < 90) status = 'atrasada';

  const ritmo: RitmoSemanal = {
    semanaAtual,
    metaEsperadaPercent,
    metaEsperadaValor,
    vendido,
    percentualDoEsperado,
    status,
    pesos,
  };

  return ritmo;
}

export function useMetaSemanalSalvar() {
  return {
    salvar: async (metaMensalId: string, empresaId: string, pesos: { semana: number; peso_percent: number }[]) => {
      // Delete existing
      await (supabase as any)
        .from('meta_semanal')
        .delete()
        .eq('meta_mensal_id', metaMensalId);

      // Insert new
      const rows = pesos
        .filter(p => p.peso_percent > 0)
        .map(p => ({
          meta_mensal_id: metaMensalId,
          empresa_id: empresaId,
          semana: p.semana,
          peso_percent: p.peso_percent,
        }));

      if (rows.length > 0) {
        const { error } = await (supabase as any)
          .from('meta_semanal')
          .insert(rows);
        if (error) throw error;
      }
    },
  };
}
