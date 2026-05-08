import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { DataProvider } from "@/context/DataContext";
import { AppLayout } from "@/components/layout/AppLayout";

import Dashboard from "@/pages/Dashboard";
import AngelusVsAngelus from "@/pages/AngelusVsAngelus";
import AngelusVsCompetencia from "@/pages/AngelusVsCompetencia";
import AlertasPrecio from "@/pages/AlertasPrecio";
import StockDrogueria from "@/pages/StockDrogueria";
const queryClient = new QueryClient();

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/angelus-vs-angelus" component={AngelusVsAngelus} />
        <Route path="/angelus-vs-competencia" component={AngelusVsCompetencia} />
        <Route path="/alertas" component={AlertasPrecio} />
        <Route path="/stock" component={StockDrogueria} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DataProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </DataProvider>
    </QueryClientProvider>
  );
}

export default App;