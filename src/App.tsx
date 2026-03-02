import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ImpersonationProvider } from "@/hooks/useImpersonation";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";

// Pages
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import EsqueciSenha from "./pages/EsqueciSenha";
import RedefinirSenha from "./pages/RedefinirSenha";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Gerencial from "./pages/Gerencial";
import Regras from "./pages/Regras";
import Pendencias from "./pages/Pendencias";
import ConfiguracaoMes from "./pages/ConfiguracaoMes";
import Consultoras from "./pages/Consultoras";
import Configuracao from "./pages/Configuracao";
import MinhaPerformance from "./pages/MinhaPerformance";
import SolicitarAjuste from "./pages/SolicitarAjuste";
import Ajustes from "./pages/Ajustes";
import VisaoConsultora from "./pages/VisaoConsultora";
import Relatorios from "./pages/Relatorios";
import Devedores from "./pages/Devedores";
import EmpresaBloqueada from "./pages/EmpresaBloqueada";
import NotFound from "./pages/NotFound";

// Super Admin
import Empresas from "./pages/super-admin/Empresas";
import NovaEmpresa from "./pages/super-admin/NovaEmpresa";
import EmpresaDetalhes from "./pages/super-admin/EmpresaDetalhes";
import Financeiro from "./pages/super-admin/Financeiro";
import Integracoes from "./pages/super-admin/Integracoes";
import Usuarios from "./pages/super-admin/Usuarios";
import Tickets from "./pages/super-admin/Tickets";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ImpersonationProvider>
            <ImpersonationBanner />
          <Routes>
            {/* Auth routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="/esqueci-senha" element={<EsqueciSenha />} />
            <Route path="/redefinir-senha" element={<RedefinirSenha />} />
            
            {/* Empresa bloqueada */}
            <Route path="/empresa-bloqueada" element={
              <ProtectedRoute>
                <EmpresaBloqueada />
              </ProtectedRoute>
            } />

            {/* Super Admin routes */}
            <Route path="/super-admin/empresas" element={
              <ProtectedRoute requiredRole="super_admin">
                <Empresas />
              </ProtectedRoute>
            } />
            <Route path="/super-admin/empresa/nova" element={
              <ProtectedRoute requiredRole="super_admin">
                <NovaEmpresa />
              </ProtectedRoute>
            } />
            <Route path="/super-admin/financeiro" element={
              <ProtectedRoute requiredRole="super_admin">
                <Financeiro />
              </ProtectedRoute>
            } />
            <Route path="/super-admin/integracoes" element={
              <ProtectedRoute requiredRole="super_admin">
                <Integracoes />
              </ProtectedRoute>
            } />
            <Route path="/super-admin/empresas/:id" element={
              <ProtectedRoute requiredRole="super_admin">
                <EmpresaDetalhes />
              </ProtectedRoute>
            } />
            <Route path="/super-admin/usuarios" element={
              <ProtectedRoute requiredRole="super_admin">
                <Usuarios />
              </ProtectedRoute>
            } />
            <Route path="/super-admin/tickets" element={
              <ProtectedRoute requiredRole="super_admin">
                <Tickets />
              </ProtectedRoute>
            } />

            {/* Admin routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/upload" element={
              <ProtectedRoute requiredRole="admin">
                <Upload />
              </ProtectedRoute>
            } />
            <Route path="/gerencial" element={
              <ProtectedRoute>
                <Gerencial />
              </ProtectedRoute>
            } />
            <Route path="/regras" element={
              <ProtectedRoute requiredRole="admin">
                <Regras />
              </ProtectedRoute>
            } />
            <Route path="/pendencias" element={
              <ProtectedRoute requiredRole="admin">
                <Pendencias />
              </ProtectedRoute>
            } />
            <Route path="/configuracao-mes" element={
              <ProtectedRoute requiredRole="admin">
                <ConfiguracaoMes />
              </ProtectedRoute>
            } />
            <Route path="/configuracao" element={
              <ProtectedRoute requiredRole="admin">
                <Configuracao />
              </ProtectedRoute>
            } />
            <Route path="/consultoras" element={<Navigate to="/configuracao" replace />} />
            <Route path="/metas" element={<Navigate to="/dashboard" replace />} />
            <Route path="/relatorios" element={
              <ProtectedRoute requiredRole="admin">
                <Relatorios />
              </ProtectedRoute>
            } />

            <Route path="/ajustes" element={
              <ProtectedRoute requiredRole="admin">
                <Ajustes />
              </ProtectedRoute>
            } />
            <Route path="/visao-consultora" element={
              <ProtectedRoute requiredRole="admin">
                <VisaoConsultora />
              </ProtectedRoute>
            } />
            <Route path="/devedores" element={
              <ProtectedRoute>
                <Devedores />
              </ProtectedRoute>
            } />

            {/* Consultora routes */}
            <Route path="/minha-performance" element={
              <ProtectedRoute requiredRole="consultora">
                <MinhaPerformance />
              </ProtectedRoute>
            } />
            <Route path="/solicitar-ajuste" element={
              <ProtectedRoute requiredRole="consultora">
                <SolicitarAjuste />
              </ProtectedRoute>
            } />

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </ImpersonationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
