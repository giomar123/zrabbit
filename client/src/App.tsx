import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import Purchases from "./pages/Purchases";
import Sales from "./pages/Sales";
import Inventory from "./pages/Inventory";
import Products from "./pages/Products";
import Investments from "./pages/Investments";
import Expenses from "./pages/Expenses";
import CashFlow from "./pages/CashFlow";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Dashboard} />
      <Route path={"/compras"} component={Purchases} />
      <Route path={"/ventas"} component={Sales} />
      <Route path={"/inventario"} component={Inventory} />
      <Route path={"/productos"} component={Products} />
      <Route path={"/inversiones"} component={Investments} />
      <Route path={"/gastos"} component={Expenses} />
      <Route path={"/flujo-caja"} component={CashFlow} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
