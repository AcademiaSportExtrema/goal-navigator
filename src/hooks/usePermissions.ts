import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { AppRole } from '@/types/database';

interface Permissao {
  id: string;
  role: string;
  rota: string;
  permitido: boolean;
}

export function usePermissions() {
  const { role } = useAuth();

  const { data: permissoes, isLoading } = useQuery({
    queryKey: ['permissoes', role],
    queryFn: async () => {
      if (!role) return [];
      const { data, error } = await supabase
        .from('permissoes_perfil')
        .select('*')
        .eq('role', role);
      if (error) throw error;
      return data as Permissao[];
    },
    enabled: !!role,
  });

  const hasPermission = (rota: string): boolean => {
    if (!permissoes) return true; // default allow while loading
    const perm = permissoes.find(p => p.rota === rota);
    if (!perm) return true; // if no record exists, allow by default
    return perm.permitido;
  };

  return { permissoes, hasPermission, isLoading };
}

export function usePermissionsAdmin() {
  const queryClient = useQueryClient();

  const fetchPermissoesByRole = (targetRole: AppRole) => {
    return useQuery({
      queryKey: ['permissoes-admin', targetRole],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('permissoes_perfil')
          .select('*')
          .eq('role', targetRole);
        if (error) throw error;
        return data as Permissao[];
      },
    });
  };

  const updatePermissao = useMutation({
    mutationFn: async ({ role, rota, permitido }: { role: AppRole; rota: string; permitido: boolean }) => {
      const { error } = await supabase
        .from('permissoes_perfil')
        .update({ permitido })
        .eq('role', role)
        .eq('rota', rota);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissoes-admin'] });
      queryClient.invalidateQueries({ queryKey: ['permissoes'] });
    },
  });

  return { fetchPermissoesByRole, updatePermissao };
}
