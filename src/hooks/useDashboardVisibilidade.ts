import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface DashboardComponente {
  chave: string;
  label: string;
  padrao: boolean; // visível por padrão para consultoras?
}

export const DASHBOARD_COMPONENTES: DashboardComponente[] = [
  { chave: 'card_total_vendido', label: 'Card Total Vendido', padrao: true },
  { chave: 'card_total_faturado', label: 'Card Total Faturado', padrao: true },
  { chave: 'grafico_tendencia_receita', label: 'Tendência de Receita (linha)', padrao: true },
  { chave: 'grafico_forma_pagamento', label: 'Receita por Forma de Pagamento', padrao: false },
  { chave: 'tabela_vendas_plano', label: 'Vendas por Plano', padrao: false },
  { chave: 'grafico_categoria', label: 'Participação por Categoria', padrao: false },
  { chave: 'histograma_ticket', label: 'Histograma de Ticket Médio', padrao: false },
  { chave: 'grafico_share_consultora', label: 'Participação por Consultora', padrao: true },
  { chave: 'ultimos_uploads', label: 'Últimos Uploads', padrao: false },
  { chave: 'card_equipe', label: 'Equipe', padrao: false },
  { chave: 'acoes_rapidas', label: 'Ações Rápidas', padrao: false },
  { chave: 'card_ritmo_semanal', label: 'Ritmo Semanal', padrao: true },
];

const DEFAULTS = Object.fromEntries(
  DASHBOARD_COMPONENTES.map(c => [c.chave, c.padrao])
);

export function useDashboardVisibilidade() {
  const { empresaId } = useAuth();
  const queryClient = useQueryClient();

  const { data: registros, isLoading } = useQuery({
    queryKey: ['dashboard-visibilidade', empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dashboard_visibilidade')
        .select('componente, visivel')
        .eq('empresa_id', empresaId!);
      if (error) throw error;
      return data as { componente: string; visivel: boolean }[];
    },
  });

  const visibilidadeMap = registros
    ? Object.fromEntries(registros.map(r => [r.componente, r.visivel]))
    : {};

  const isComponenteVisivel = (chave: string): boolean => {
    if (chave in visibilidadeMap) return visibilidadeMap[chave];
    return DEFAULTS[chave] ?? true;
  };

  const toggleMutation = useMutation({
    mutationFn: async ({ componente, visivel }: { componente: string; visivel: boolean }) => {
      const { error } = await supabase
        .from('dashboard_visibilidade')
        .upsert(
          { empresa_id: empresaId!, componente, visivel },
          { onConflict: 'empresa_id,componente' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-visibilidade'] });
    },
  });

  return { isComponenteVisivel, isLoading, toggleMutation, visibilidadeMap };
}
