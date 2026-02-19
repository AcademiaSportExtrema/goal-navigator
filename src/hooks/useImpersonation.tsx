import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImpersonationState {
  isImpersonating: boolean;
  targetEmail: string | null;
  targetRole: string | null;
  originalSessionToken: string | null;
}

interface ImpersonationContextType extends ImpersonationState {
  startImpersonation: (targetUserId: string, motivo: string) => Promise<boolean>;
  endImpersonation: () => Promise<void>;
}

const ImpersonationContext = createContext<ImpersonationContextType | null>(null);

const STORAGE_KEY = 'impersonation_original_token';

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ImpersonationState>(() => {
    // Restore impersonation state from sessionStorage (survives page reload but not tab close)
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          isImpersonating: true,
          targetEmail: parsed.targetEmail,
          targetRole: parsed.targetRole,
          originalSessionToken: parsed.originalSessionToken,
        };
      } catch { /* ignore */ }
    }
    return { isImpersonating: false, targetEmail: null, targetRole: null, originalSessionToken: null };
  });

  const startImpersonation = useCallback(async (targetUserId: string, motivo: string): Promise<boolean> => {
    try {
      // Save current session before switching
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        toast.error('Sessão atual não encontrada');
        return false;
      }

      // Call edge function to get impersonation token
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/impersonate-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentSession.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ target_user_id: targetUserId, motivo }),
        }
      );

      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || 'Erro ao iniciar impersonação');
        return false;
      }

      // Save original session info
      const impersonationData = {
        originalSessionToken: currentSession.refresh_token,
        targetEmail: result.email,
        targetRole: result.target_role,
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(impersonationData));

      // Use verifyOtp with the magic link token to sign in as the target user
      const { error: otpError } = await supabase.auth.verifyOtp({
        token_hash: result.token_hash,
        type: 'magiclink',
      });

      if (otpError) {
        sessionStorage.removeItem(STORAGE_KEY);
        toast.error('Erro ao autenticar como usuário alvo: ' + otpError.message);
        return false;
      }

      setState({
        isImpersonating: true,
        targetEmail: result.email,
        targetRole: result.target_role,
        originalSessionToken: currentSession.refresh_token,
      });

      toast.success(`Impersonando ${result.email}`);
      
      // Reload to get fresh auth state
      window.location.href = '/dashboard';
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Erro ao impersonar');
      return false;
    }
  }, []);

  const endImpersonation = useCallback(async () => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (!saved) {
        toast.error('Dados de sessão original não encontrados');
        return;
      }

      const { originalSessionToken } = JSON.parse(saved);

      // Sign out from impersonated session
      await supabase.auth.signOut();

      // Restore original super admin session using refresh token
      const { error } = await supabase.auth.refreshSession({
        refresh_token: originalSessionToken,
      });

      sessionStorage.removeItem(STORAGE_KEY);

      setState({
        isImpersonating: false,
        targetEmail: null,
        targetRole: null,
        originalSessionToken: null,
      });

      if (error) {
        toast.error('Erro ao restaurar sessão. Faça login novamente.');
        window.location.href = '/login';
        return;
      }

      toast.success('Impersonação encerrada');
      window.location.href = '/super-admin/empresas';
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
      window.location.href = '/login';
    }
  }, []);

  return (
    <ImpersonationContext.Provider value={{ ...state, startImpersonation, endImpersonation }}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (!context) {
    throw new Error('useImpersonation must be used within ImpersonationProvider');
  }
  return context;
}
