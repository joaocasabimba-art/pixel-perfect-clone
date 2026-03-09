import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageSkeleton } from "@/components/PageSkeleton";
import Login from "./pages/Login";
import Registro from "./pages/Registro";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

const Leads = lazy(() => import("./pages/Leads"));
const Agenda = lazy(() => import("./pages/Agenda"));
const Ordens = lazy(() => import("./pages/Ordens"));
const OrdemDetalhe = lazy(() => import("./pages/OrdemDetalhe"));
const Laudos = lazy(() => import("./pages/Laudos"));
const LaudoDetalhe = lazy(() => import("./pages/LaudoDetalhe"));
const Clientes = lazy(() => import("./pages/Clientes"));
const ClienteDetalhe = lazy(() => import("./pages/ClienteDetalhe"));
const Estoque = lazy(() => import("./pages/Estoque"));
const Recorrencias = lazy(() => import("./pages/Recorrencias"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const Mais = lazy(() => import("./pages/Mais"));

const queryClient = new QueryClient();

function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <AppLayout />
    </ProtectedRoute>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<PageSkeleton />}>
              <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/registro" element={<Registro />} />

                <Route element={<ProtectedLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/leads" element={<Leads />} />
                  <Route path="/agenda" element={<Agenda />} />
                  <Route path="/ordens" element={<Ordens />} />
                  <Route path="/ordens/:id" element={<OrdemDetalhe />} />
                  <Route path="/laudos" element={<Laudos />} />
                  <Route path="/laudos/:id" element={<LaudoDetalhe />} />
                  <Route path="/clientes" element={<Clientes />} />
                  <Route path="/clientes/:id" element={<ClienteDetalhe />} />
                  <Route path="/estoque" element={<Estoque />} />
                  <Route path="/recorrencias" element={<Recorrencias />} />
                  <Route path="/configuracoes" element={<Configuracoes />} />
                  <Route path="/mais" element={<Mais />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
