import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
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
import Metas from "./pages/Metas";
import MinhaPerformance from "./pages/MinhaPerformance";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Auth routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="/esqueci-senha" element={<EsqueciSenha />} />
            <Route path="/redefinir-senha" element={<RedefinirSenha />} />
            
            {/* Admin routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute requiredRole="admin">
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/upload" element={
              <ProtectedRoute requiredRole="admin">
                <Upload />
              </ProtectedRoute>
            } />
            <Route path="/gerencial" element={
              <ProtectedRoute requiredRole="admin">
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
            <Route path="/consultoras" element={
              <ProtectedRoute requiredRole="admin">
                <Consultoras />
              </ProtectedRoute>
            } />
            <Route path="/metas" element={
              <ProtectedRoute requiredRole="admin">
                <Metas />
              </ProtectedRoute>
            } />

            {/* Consultora route */}
            <Route path="/minha-performance" element={
              <ProtectedRoute requiredRole="consultora">
                <MinhaPerformance />
              </ProtectedRoute>
            } />

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
