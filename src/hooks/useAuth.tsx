import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  consultoraId: string | null;
  empresaId: string | null;
  empresaNome: string | null;
  empresaLogoUrl: string | null;
  isSuperAdmin: boolean;
  empresaAtiva: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [consultoraId, setConsultoraId] = useState<string | null>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [empresaNome, setEmpresaNome] = useState<string | null>(null);
  const [empresaLogoUrl, setEmpresaLogoUrl] = useState<string | null>(null);
  const [empresaAtiva, setEmpresaAtiva] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const resetProfile = useCallback(() => {
    setRole(null);
    setConsultoraId(null);
    setEmpresaId(null);
    setEmpresaNome(null);
    setEmpresaLogoUrl(null);
    setEmpresaAtiva(true);
  }, []);

  // 1) onAuthStateChange only syncs session/user — no awaits, no DB calls
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (!session?.user) {
          resetProfile();
          setIsLoading(false);
        }
      }
    );

    // Bootstrap from stored session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session?.user) {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [resetProfile]);

  // 2) Separate effect to fetch profile when user.id changes
  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;
    setIsLoading(true);

    const fetchUserData = async () => {
      try {
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role, consultora_id, empresa_id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        if (roleError || !roleData) {
          console.error('Failed to fetch user role:', roleError);
          resetProfile();
          return;
        }

        setRole(roleData.role as AppRole);
        setConsultoraId(roleData.consultora_id);
        setEmpresaId(roleData.empresa_id);

        // Check empresa active status (skip for super_admin)
        if (roleData.role !== 'super_admin' && roleData.empresa_id) {
          const { data: empresa } = await supabase
            .from('empresas')
            .select('nome, logo_url, ativo, subscription_status, trial_ends_at')
            .eq('id', roleData.empresa_id)
            .maybeSingle();

          if (cancelled) return;

          if (empresa) {
            setEmpresaNome(empresa.nome);
            setEmpresaLogoUrl(empresa.logo_url);
            const isActive = empresa.ativo && (
              empresa.subscription_status === 'active' ||
              (empresa.trial_ends_at && new Date(empresa.trial_ends_at) > new Date())
            );
            setEmpresaAtiva(!!isActive);
          }
        } else {
          setEmpresaAtiva(true);
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Error loading user profile:', err);
        resetProfile();
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchUserData();

    return () => { cancelled = true; };
  }, [user?.id, resetProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    resetProfile();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        consultoraId,
        empresaId,
        empresaNome,
        empresaLogoUrl,
        isSuperAdmin: role === 'super_admin',
        empresaAtiva,
        isLoading,
        isAdmin: role === 'admin' || role === 'super_admin',
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
