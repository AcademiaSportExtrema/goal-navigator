import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import type { AppRole } from '@/types/database';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: AppRole;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, role, isLoading } = useAuth();
  const { hasPermission, isLoading: permLoading } = usePermissions();
  const location = useLocation();

  if (isLoading || permLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && role !== requiredRole) {
    // Allow cross-role access if permission is granted (e.g. consultora accessing /dashboard)
    if (!hasPermission(location.pathname)) {
      if (role === 'consultora') {
        return <Navigate to="/minha-performance" replace />;
      }
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Check route permission even if role matches
  if (!hasPermission(location.pathname)) {
    if (role === 'consultora') {
      return <Navigate to="/minha-performance" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
