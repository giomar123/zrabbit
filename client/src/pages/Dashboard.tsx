import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Package, TrendingUp, DollarSign, ShoppingCart, Receipt, Wallet } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";

export default function Dashboard() {
  const { data: inventory, isLoading: inventoryLoading, error: inventoryError } = trpc.inventory.list.useQuery();
  const { data: sales, isLoading: salesLoading, error: salesError } = trpc.sales.list.useQuery();
  const { data: purchases, isLoading: purchasesLoading, error: purchasesError } = trpc.purchases.list.useQuery();
  const { data: expenses, isLoading: expensesLoading, error: expensesError } = trpc.expenses.list.useQuery();
  const { data: cashFlow, isLoading: cashFlowLoading, error: cashFlowError } = trpc.cashFlow.list.useQuery();
  const { data: products, isLoading: productsLoading } = trpc.products.list.useQuery();

  const isLoading = inventoryLoading || salesLoading || purchasesLoading || expensesLoading || cashFlowLoading || productsLoading;
  const hasError = inventoryError || salesError || purchasesError || expensesError || cashFlowError;

  // Calculate metrics
  const totalInventoryValue = inventory?.reduce((sum, item: any) => sum + parseFloat(item.inventoryValue || 0), 0) || 0;
  
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthSales = sales?.filter(sale => sale.saleDate.startsWith(currentMonth)) || [];
  const monthSalesTotal = currentMonthSales.reduce((sum, sale) => sum + parseFloat(sale.total), 0);
  
  const currentMonthPurchases = purchases?.filter(purchase => purchase.purchaseDate.startsWith(currentMonth)) || [];
  const monthPurchasesTotal = currentMonthPurchases.reduce((sum, purchase) => sum + parseFloat(purchase.total), 0);
  
  const currentMonthExpenses = expenses?.filter(expense => expense.expenseDate.startsWith(currentMonth)) || [];
  const monthExpensesTotal = currentMonthExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
  
  const monthBalance = monthSalesTotal - monthPurchasesTotal - monthExpensesTotal;

  // Calculate total available cash (accumulated from all time)
  const availableCash = cashFlow && cashFlow.length > 0 
    ? cashFlow[cashFlow.length - 1].accumulatedCash 
    : 0;

  // Product sales ranking
  const productSalesMap = new Map<number, { name: string; code: string; quantity: number; total: number }>();
  sales?.forEach(sale => {
    const product = products?.find(p => p.id === sale.productId);
    const existing = productSalesMap.get(sale.productId) || { name: product?.name || 'Producto desconocido', code: product?.code || '', quantity: 0, total: 0 };
    productSalesMap.set(sale.productId, {
      name: product?.name || existing.name,
      code: product?.code || existing.code,
      quantity: existing.quantity + sale.quantity,
      total: existing.total + parseFloat(sale.total),
    });
  });

  const topProducts = Array.from(productSalesMap.entries())
    .sort((a, b) => b[1].quantity - a[1].quantity)
    .slice(0, 5);

  // Cash flow chart data
  const cashFlowChartData = cashFlow?.map((item: any) => ({
    month: item.month,
    inversiones: parseFloat(item.totalInvestment || 0),
    compras: parseFloat(item.totalPurchases || 0),
    ventas: parseFloat(item.totalSales || 0),
    gastos: parseFloat(item.totalExpenses || 0),
    balance: parseFloat(item.netBalance || 0),
    cajaAcumulada: parseFloat(item.accumulatedCash || 0),
  })) || [];
  
  // Last 3 months data
  const last3MonthsData = cashFlowChartData.slice(-3);
  
  console.log('[Dashboard] cashFlowChartData:', cashFlowChartData);
  console.log('[Dashboard] last3MonthsData:', last3MonthsData);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Cargando dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (hasError) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-destructive font-semibold">Error al cargar el dashboard</p>
            <p className="mt-2 text-muted-foreground text-sm">Por favor, verifica la consola para más detalles</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Resumen general de tu negocio Zrabbit
          </p>
        </div>

        {/* Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Caja Disponible
              </CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${availableCash >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                S/. {availableCash.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Efectivo acumulado total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Valor del Inventario
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">S/. {totalInventoryValue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Stock total disponible
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Ventas del Mes
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">S/. {monthSalesTotal.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                {currentMonthSales.length} ventas realizadas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Compras del Mes
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">S/. {monthPurchasesTotal.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                {currentMonthPurchases.length} compras registradas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Gastos del Mes
              </CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">S/. {monthExpensesTotal.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                {currentMonthExpenses.length} gastos registrados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Balance del Mes
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${monthBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                S/. {monthBalance.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Ventas - Compras - Gastos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Flujo de Caja Últimos 3 Meses</CardTitle>
              <CardDescription>
                Detalle de Inversión, Compras, Ventas, Gastos y Balance de los últimos 3 meses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={last3MonthsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `S/. ${value.toFixed(2)}`} />
                  <Legend />
                  <Bar dataKey="inversiones" fill="#6b9bd1" name="Total Inversión" />
                  <Bar dataKey="compras" fill="#2c3e50" name="Compras" />
                  <Bar dataKey="ventas" fill="#e67e22" name="Ventas" />
                  <Bar dataKey="gastos" fill="#e74c3c" name="Gastos" />
                  <Bar dataKey="balance" fill="#16a085" name="Balance Neto" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Flujo de Caja Mensual</CardTitle>
              <CardDescription>
                Total Inversión, Compras, Ventas, Gastos y Balance Neto por mes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={cashFlowChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `S/. ${value.toFixed(2)}`} />
                  <Legend />
                  <Bar dataKey="inversiones" fill="#6b9bd1" name="Total Inversión" />
                  <Bar dataKey="compras" fill="#2c3e50" name="Compras" />
                  <Bar dataKey="ventas" fill="#e67e22" name="Ventas" />
                  <Bar dataKey="gastos" fill="#e74c3c" name="Gastos" />
                  <Bar dataKey="balance" fill="#16a085" name="Balance Neto" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ventas por Mes</CardTitle>
              <CardDescription>
                Evolución de las ventas mensuales
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={cashFlowChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `S/. ${value.toFixed(2)}`} />
                  <Line type="monotone" dataKey="ventas" stroke="#e67e22" strokeWidth={2} name="Ventas" dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top Products and Recent Activity */}
        <div className="grid gap-4 md:grid-cols-2">

          <Card>
            <CardHeader>
              <CardTitle>Productos Más Vendidos</CardTitle>
              <CardDescription>
                Top 5 productos por cantidad vendida
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topProducts.length > 0 ? (
                  topProducts.map(([productId, data], index) => (
                    <div key={productId} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{data.name}</p>
                          <p className="text-sm text-muted-foreground">{data.quantity} unidades · {data.code}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">S/. {data.total.toFixed(2)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No hay ventas registradas aún
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>
              Últimas transacciones registradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sales?.slice(0, 5).map(sale => (
                <div key={sale.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Venta - Producto #{sale.productId}</p>
                      <p className="text-sm text-muted-foreground">{sale.saleDate}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">+S/. {parseFloat(sale.total).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">{sale.quantity} unidades</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
