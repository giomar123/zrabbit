import { Toaster } from "@/components/ui/sonner";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { CartProvider } from "./contexts/CartContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import AdminCatalogActions from "./components/AdminCatalogActions";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import Cart from "./pages/Cart";
import Home from "./pages/Home";
import MyOrders from "./pages/MyOrders";
import ProductDetail from "./pages/ProductDetail";
import Storefront from "./pages/Storefront";
import TermsAndShipping from "./pages/TermsAndShipping";
import { CartDrawer } from "./components/CartDrawer";

function AdminWithCatalogActions() { return <><Admin /><AdminCatalogActions /></>; }
function Router() { return <Switch><Route path="/" component={Home} /><Route path="/catalogo">{() => <Storefront catalogueMode />}</Route><Route path="/productos/:slug">{params => <ProductDetail slug={params.slug} />}</Route><Route path="/carrito" component={Cart} /><Route path="/mis-pedidos" component={MyOrders} /><Route path="/terminos-y-envios" component={TermsAndShipping} /><Route path="/admin/login" component={AdminLogin} /><Route path="/admin" component={AdminWithCatalogActions} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>; }
function App() { return <ErrorBoundary><ThemeProvider defaultTheme="light"><CartProvider><Toaster /><CartDrawer /><Router /></CartProvider></ThemeProvider></ErrorBoundary>; }
export default App;
