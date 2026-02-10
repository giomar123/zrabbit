import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getLoginUrl } from "@/const";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  TrendingUp, 
  Package, 
  List, 
  DollarSign, 
  BarChart3,
  Receipt,
  LogOut,
  User
} from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated, loading } = useAuth();
  const logoutMutation = trpc.auth.logout.useMutation();

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    window.location.href = "/";
  };

  const tabs = [
    { value: "/", label: "Dashboard", icon: LayoutDashboard },
    { value: "/compras", label: "Compras", icon: ShoppingCart },
    { value: "/ventas", label: "Ventas", icon: TrendingUp },
    { value: "/inventario", label: "Inventario", icon: Package },
    { value: "/productos", label: "Productos", icon: List },
    { value: "/inversiones", label: "Inversiones", icon: DollarSign },
    { value: "/gastos", label: "Gastos", icon: Receipt },
    { value: "/flujo-caja", label: "Flujo de Caja", icon: BarChart3 },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-indigo-100">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
                <Package className="w-8 h-8 text-indigo-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Zrabbit</h1>
              <p className="text-gray-600">Sistema de Gestión Empresarial</p>
            </div>
            
            <div className="space-y-4">
              <p className="text-center text-gray-700">
                Gestiona tu negocio de figuras de colección de manera profesional e integrada.
              </p>
              
              <Button 
                onClick={() => window.location.href = getLoginUrl()} 
                className="w-full h-12 text-base font-semibold"
                size="lg"
              >
                Iniciar Sesión
              </Button>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-center text-sm text-gray-600">
                <div>
                  <div className="font-semibold text-gray-900">Control Total</div>
                  <div className="text-xs">Compras, Ventas, Inventario</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Reportes</div>
                  <div className="text-xs">Flujo de caja automático</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <button 
            onClick={() => setLocation("/")} 
            className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
              <Package className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Zrabbit</h1>
              <p className="text-xs text-muted-foreground">Gestión Empresarial</p>
            </div>
          </button>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground font-medium">{user?.name || user?.email}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="border-b bg-background">
        <div className="container">
          <Tabs value={location} onValueChange={setLocation} className="w-full">
            <TabsList className="w-full justify-start h-auto p-0 bg-transparent border-0 rounded-none">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="flex items-center gap-2 px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main Content */}
      <main className="container py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="container py-6">
          <p className="text-center text-sm text-muted-foreground">
            © 2025 Zrabbit. Sistema de Gestión Empresarial.
          </p>
        </div>
      </footer>
    </div>
  );
}
