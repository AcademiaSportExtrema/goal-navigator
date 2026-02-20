import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
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

  const fetchUserData = async (userId: string) => {
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role, consultora_id, empresa_id')
      .eq('user_id', userId)
      .single();

    if (roleData) {
      setRole(roleData.role as AppRole);
      setConsultoraId(roleData.consultora_id);
      setEmpresaId(roleData.empresa_id);

      // Check if empresa is active (skip for super_admin)
      if (roleData.role !== 'super_admin' && roleData.empresa_id) {
        const { data: empresa } = await supabase
          .from('empresas')
          .select('nome, logo_url, ativo, subscription_status, trial_ends_at')
          .eq('id', roleData.empresa_id)
          .single();

        if (empresa) {
          setEmpresaNome(empresa.nome);
          setEmpresaLogoUrl((empresa as any).logo_url);
          const isActive = empresa.ativo && (
            empresa.subscription_status === 'active' ||
            (empresa.trial_ends_at && new Date(empresa.trial_ends_at) > new Date())
          );
          setEmpresaAtiva(!!isActive);
        }
      } else {
        setEmpresaAtiva(true);
      }
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => fetchUserData(session.user.id), 0);
        } else {
          setRole(null);
          setConsultoraId(null);
          setEmpresaId(null);
          setEmpresaNome(null);
          setEmpresaLogoUrl(null);
          setEmpresaAtiva(true);
        }

        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserData(session.user.id).then(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
    setRole(null);
    setConsultoraId(null);
    setEmpresaId(null);
    setEmpresaNome(null);
    setEmpresaLogoUrl(null);
    setEmpresaAtiva(true);
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
