import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PesoSemanal {
  semana: number;
  peso_percent: number;
}

export interface SemanaDetalhe {
  semana: number;
  diasLabel: string;
  pesoPercent: number;
  metaValor: number;
  vendido: number;
  percentual: number;
  falta: number;
  status: 'bateu' | 'no_ritmo' | 'atrasada' | 'futura';
  isCurrent: boolean;
}

interface RitmoSemanal {
  semanaAtual: number;
  totalSemanas: number;
  metaEsperadaPercent: number;
  metaEsperadaValor: number;
  vendido: number;
  percentualDoEsperado: number;
  status: 'adiantada' | 'no_ritmo' | 'atrasada';
  pesos: PesoSemanal[];
  semanas: SemanaDetalhe[];
}

/**
 * Calcula quantas semanas o mês tem (4 ou 5) e retorna os intervalos de dias.
 */
export function getSemanasDoMes(ano: number, mes: number): { semana: number; diaInicio: number; diaFim: number }[] {
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const semanas = [
    { semana: 1, diaInicio: 1, diaFim: 7 },
    { semana: 2, diaInicio: 8, diaFim: 14 },
    { semana: 3, diaInicio: 15, diaFim: 21 },
    { semana: 4, diaInicio: 22, diaFim: ultimoDia <= 28 ? ultimoDia : 28 },
  ];

  if (ultimoDia > 28) {
    // Mês tem 5ª semana
    semanas[3].diaFim = 28;
    semanas.push({ semana: 5, diaInicio: 29, diaFim: ultimoDia });
  }

  return semanas;
}

function getSemanaDoMes(dia: number, ultimoDia: number): number {
  if (dia <= 7) return 1;
  if (dia <= 14) return 2;
  if (dia <= 21) return 3;
  if (dia <= 28) return 4;
  return ultimoDia > 28 ? 5 : 4;
}

function getProgressoSemana(dia: number, semanaInfo: { diaInicio: number; diaFim: number }): number {
  const diasNaSemana = semanaInfo.diaFim - semanaInfo.diaInicio + 1;
  const diasPassados = dia - semanaInfo.diaInicio + 1;
  return Math.min(diasPassados / diasNaSemana, 1);
}

function calcularMetaEsperada(
  pesos: PesoSemanal[],
  dia: number,
  semanasDoMes: { semana: number; diaInicio: number; diaFim: number }[],
): number {
  const ultimoDia = semanasDoMes[semanasDoMes.length - 1].diaFim;
  const semanaAtual = getSemanaDoMes(dia, ultimoDia);
  const semanaInfo = semanasDoMes.find(s => s.semana === semanaAtual);

  let acumulado = 0;

  for (const p of pesos) {
    if (p.semana < semanaAtual) {
      acumulado += p.peso_percent;
    }
  }

  const pesoSemanaAtual = pesos.find(p => p.semana === semanaAtual)?.peso_percent || 0;
  if (semanaInfo) {
    acumulado += pesoSemanaAtual * getProgressoSemana(dia, semanaInfo);
  }

  return acumulado;
}

/**
 * Agrupa vendas por semana a partir de lancamentos usando data_inicio.
 */
function agruparVendasPorSemana(
  lancamentos: { data_inicio?: string | null; valor?: number | null }[] | undefined,
  ano: number,
  mes: number,
  semanasDoMes: { semana: number; diaInicio: number; diaFim: number }[],
): Record<number, number> {
  const result: Record<number, number> = {};
  for (const s of semanasDoMes) {
    result[s.semana] = 0;
  }

  if (!lancamentos) return result;

  for (const l of lancamentos) {
    if (!l.data_inicio) continue;
    const [dAno, dMes, dDia] = l.data_inicio.split('-').map(Number);
    if (dAno !== ano || dMes !== mes) continue;

    const semanaInfo = semanasDoMes.find(s => dDia >= s.diaInicio && dDia <= s.diaFim);
    if (semanaInfo) {
      result[semanaInfo.semana] += Number(l.valor) || 0;
    }
  }

  return result;
}

export function useMetaSemanal(
  metaMensalId: string | undefined,
  metaTotal: number,
  vendidoTotal: number,
  mesSelecionado: string,
  lancamentos?: { data_inicio?: string | null; valor?: number | null }[],
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

  const [ano, mes] = mesSelecionado.split('-').map(Number);
  const semanasDoMes = getSemanasDoMes(ano, mes);
  const totalSemanas = semanasDoMes.length;

  // Default: distribuição uniforme
  const defaultPeso = totalSemanas === 5 ? 20 : 25;
  const pesos: PesoSemanal[] = pesosDb && pesosDb.length > 0
    ? pesosDb.filter(p => p.semana <= totalSemanas)
    : semanasDoMes.map(s => ({ semana: s.semana, peso_percent: defaultPeso }));

  // Dia atual ou último dia do mês
  const hoje = new Date();
  const isMesAtual = hoje.getFullYear() === ano && hoje.getMonth() + 1 === mes;
  const dia = isMesAtual ? hoje.getDate() : semanasDoMes[semanasDoMes.length - 1].diaFim;

  const ultimoDia = semanasDoMes[semanasDoMes.length - 1].diaFim;
  const semanaAtual = getSemanaDoMes(dia, ultimoDia);
  const metaEsperadaPercent = calcularMetaEsperada(pesos, dia, semanasDoMes);
  const metaEsperadaValor = metaTotal * (metaEsperadaPercent / 100);
  const percentualDoEsperado = metaEsperadaValor > 0 ? (vendidoTotal / metaEsperadaValor) * 100 : 0;

  let status: 'adiantada' | 'no_ritmo' | 'atrasada' = 'no_ritmo';
  if (percentualDoEsperado >= 105) status = 'adiantada';
  else if (percentualDoEsperado < 90) status = 'atrasada';

  // Per-week breakdown
  const vendasPorSemana = agruparVendasPorSemana(lancamentos, ano, mes, semanasDoMes);

  const semanas: SemanaDetalhe[] = semanasDoMes.map(s => {
    const peso = pesos.find(p => p.semana === s.semana)?.peso_percent || 0;
    const metaValor = metaTotal * (peso / 100);
    const vendido = vendasPorSemana[s.semana] || 0;
    const percentual = metaValor > 0 ? (vendido / metaValor) * 100 : 0;
    const falta = Math.max(0, metaValor - vendido);
    const isCurrent = s.semana === semanaAtual && isMesAtual;

    let semStatus: SemanaDetalhe['status'] = 'futura';
    if (isMesAtual) {
      if (s.semana < semanaAtual) {
        semStatus = percentual >= 100 ? 'bateu' : percentual >= 90 ? 'no_ritmo' : 'atrasada';
      } else if (s.semana === semanaAtual) {
        semStatus = percentual >= 100 ? 'bateu' : percentual >= 90 ? 'no_ritmo' : 'atrasada';
      }
    } else {
      // Mês passado: todas as semanas estão concluídas
      semStatus = percentual >= 100 ? 'bateu' : percentual >= 90 ? 'no_ritmo' : 'atrasada';
    }

    return {
      semana: s.semana,
      diasLabel: `${s.diaInicio} - ${s.diaFim}`,
      pesoPercent: peso,
      metaValor,
      vendido,
      percentual,
      falta,
      status: semStatus,
      isCurrent,
    };
  });

  const ritmo: RitmoSemanal = {
    semanaAtual,
    totalSemanas,
    metaEsperadaPercent,
    metaEsperadaValor,
    vendido: vendidoTotal,
    percentualDoEsperado,
    status,
    pesos,
    semanas,
  };

  return ritmo;
}

export function useMetaSemanalSalvar() {
  return {
    salvar: async (metaMensalId: string, empresaId: string, pesos: { semana: number; peso_percent: number }[]) => {
      await (supabase as any)
        .from('meta_semanal')
        .delete()
        .eq('meta_mensal_id', metaMensalId);

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
