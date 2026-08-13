import { Toaster } from "@/components/ui/sonner";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { CartProvider } from "./contexts/CartContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import Cart from "./pages/Cart";
import Home from "./pages/Home";
import ProductDetail from "./pages/ProductDetail";
import Storefront from "./pages/Storefront";

function Router() { return <Switch><Route path="/" component={Home} /><Route path="/catalogo">{() => <Storefront catalogueMode />}</Route><Route path="/productos/:slug">{params => <ProductDetail slug={params.slug} />}</Route><Route path="/carrito" component={Cart} /><Route path="/admin/login" component={AdminLogin} /><Route path="/admin" component={Admin} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>; }
function App() { return <ErrorBoundary><ThemeProvider defaultTheme="light"><CartProvider><Toaster /><Router /></CartProvider></ThemeProvider></ErrorBoundary>; }
export default App;
