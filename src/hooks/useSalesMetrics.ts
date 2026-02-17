import { useMemo } from 'react';
import type { Lancamento } from '@/types/database';

export interface RevenueByDay {
  data: string;
  receita: number;
  pedidos: number;
  ticketMedio: number;
  acumulado: number;
}

export interface RevenueByPayment {
  forma: string;
  receita: number;
  pedidos: number;
}

export interface TopProduct {
  produto: string;
  receita: number;
  qtd: number;
}

export interface SalesByPlan {
  plano: string;
  receita: number;
  percentual: number;
}

export interface TicketBin {
  faixa: string;
  contagem: number;
}

export interface SalesMetrics {
  revenueByDay: RevenueByDay[];
  revenueByPayment: RevenueByPayment[];
  topProducts: TopProduct[];
  salesByPlan: SalesByPlan[];
  ticketDistribution: TicketBin[];
  ticketMedioGlobal: number;
}

export function useSalesMetrics(lancamentos: Lancamento[] | undefined): SalesMetrics {
  return useMemo(() => {
    const empty: SalesMetrics = {
      revenueByDay: [],
      revenueByPayment: [],
      topProducts: [],
      salesByPlan: [],
      ticketDistribution: [],
      ticketMedioGlobal: 0,
    };

    if (!lancamentos || lancamentos.length === 0) return empty;

    // A) Revenue by day
    const dayMap = new Map<string, { receita: number; pedidos: number }>();
    for (const l of lancamentos) {
      const dia = l.data_lancamento || 'sem-data';
      const entry = dayMap.get(dia) || { receita: 0, pedidos: 0 };
      entry.receita += Number(l.valor) || 0;
      entry.pedidos += 1;
      dayMap.set(dia, entry);
    }
    const sortedDays = Array.from(dayMap.entries())
      .filter(([k]) => k !== 'sem-data')
      .sort(([a], [b]) => a.localeCompare(b));

    let acumulado = 0;
    const revenueByDay: RevenueByDay[] = sortedDays.map(([data, v]) => {
      acumulado += v.receita;
      return {
        data,
        receita: v.receita,
        pedidos: v.pedidos,
        ticketMedio: v.pedidos > 0 ? v.receita / v.pedidos : 0,
        acumulado,
      };
    });

    // B) Revenue by payment method
    const payMap = new Map<string, { receita: number; pedidos: number }>();
    for (const l of lancamentos) {
      const forma = l.forma_pagamento || 'Não informado';
      const entry = payMap.get(forma) || { receita: 0, pedidos: 0 };
      entry.receita += Number(l.valor) || 0;
      entry.pedidos += 1;
      payMap.set(forma, entry);
    }
    const revenueByPayment: RevenueByPayment[] = Array.from(payMap.entries())
      .map(([forma, v]) => ({ forma, ...v }))
      .sort((a, b) => b.receita - a.receita);

    // C) Top 10 products
    const prodMap = new Map<string, { receita: number; qtd: number }>();
    for (const l of lancamentos) {
      const produto = l.produto || 'Não informado';
      const entry = prodMap.get(produto) || { receita: 0, qtd: 0 };
      entry.receita += Number(l.valor) || 0;
      entry.qtd += 1;
      prodMap.set(produto, entry);
    }
    const topProducts: TopProduct[] = Array.from(prodMap.entries())
      .map(([produto, v]) => ({ produto, ...v }))
      .sort((a, b) => b.receita - a.receita)
      .slice(0, 10);

    // D) Sales by plan (donut)
    const planMap = new Map<string, number>();
    let totalReceita = 0;
    for (const l of lancamentos) {
      const plano = l.plano || 'Não informado';
      planMap.set(plano, (planMap.get(plano) || 0) + (Number(l.valor) || 0));
      totalReceita += Number(l.valor) || 0;
    }
    let planEntries = Array.from(planMap.entries())
      .map(([plano, receita]) => ({ plano, receita }))
      .sort((a, b) => b.receita - a.receita);

    // Group smaller into "Outros" if > 6
    let salesByPlan: SalesByPlan[];
    if (planEntries.length > 6) {
      const top5 = planEntries.slice(0, 5);
      const outrosReceita = planEntries.slice(5).reduce((s, e) => s + e.receita, 0);
      salesByPlan = [
        ...top5.map(e => ({
          plano: e.plano,
          receita: e.receita,
          percentual: totalReceita > 0 ? (e.receita / totalReceita) * 100 : 0,
        })),
        {
          plano: 'Outros',
          receita: outrosReceita,
          percentual: totalReceita > 0 ? (outrosReceita / totalReceita) * 100 : 0,
        },
      ];
    } else {
      salesByPlan = planEntries.map(e => ({
        plano: e.plano,
        receita: e.receita,
        percentual: totalReceita > 0 ? (e.receita / totalReceita) * 100 : 0,
      }));
    }

    // E) Ticket distribution
    const bins = [
      { faixa: 'R$0-100', min: 0, max: 100 },
      { faixa: 'R$100-300', min: 100, max: 300 },
      { faixa: 'R$300-500', min: 300, max: 500 },
      { faixa: 'R$500-1000', min: 500, max: 1000 },
      { faixa: 'R$1000+', min: 1000, max: Infinity },
    ];
    const ticketCounts = bins.map(b => ({ faixa: b.faixa, contagem: 0 }));
    for (const l of lancamentos) {
      const v = Number(l.valor) || 0;
      for (let i = 0; i < bins.length; i++) {
        if (v >= bins[i].min && v < bins[i].max) {
          ticketCounts[i].contagem += 1;
          break;
        }
      }
    }

    const ticketMedioGlobal = lancamentos.length > 0 ? totalReceita / lancamentos.length : 0;

    return {
      revenueByDay,
      revenueByPayment,
      topProducts,
      salesByPlan,
      ticketDistribution: ticketCounts,
      ticketMedioGlobal,
    };
  }, [lancamentos]);
}
