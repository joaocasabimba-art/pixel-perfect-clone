import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import Agenda from "./pages/Agenda";
import Ordens from "./pages/Ordens";
import Laudos from "./pages/Laudos";
import Clientes from "./pages/Clientes";
import Estoque from "./pages/Estoque";
import Recorrencias from "./pages/Recorrencias";
import Configuracoes from "./pages/Configuracoes";
import Mais from "./pages/Mais";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Login />} />

          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/ordens" element={<Ordens />} />
            <Route path="/laudos" element={<Laudos />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/estoque" element={<Estoque />} />
            <Route path="/recorrencias" element={<Recorrencias />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
            <Route path="/mais" element={<Mais />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
