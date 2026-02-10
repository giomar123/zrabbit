import { trpc } from "@/lib/trpc";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp } from "lucide-react";

export default function CashFlow() {
  const { data: cashFlow, isLoading } = trpc.cashFlow.list.useQuery();

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Cargando flujo de caja...</p>
          </div>
        </div>
      </Layout>
    );
  }

  let accumulatedCash = 0;

  return (
    <Layout>
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Flujo de Caja</h1>
        <p className="text-muted-foreground">Resumen mensual de inversiones, compras, ventas y balance</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Flujo de Caja Mensual
          </CardTitle>
          <CardDescription>
            Total Inversión, Compras, Ventas, Gastos y Balance Neto por mes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!cashFlow || cashFlow.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay datos de flujo de caja disponibles.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mes</TableHead>
                    <TableHead className="text-right">Inv. Giomar</TableHead>
                    <TableHead className="text-right">Inv. Erick</TableHead>
                    <TableHead className="text-right">Total Inv.</TableHead>
                    <TableHead className="text-right">Compras</TableHead>
                    <TableHead className="text-right">Ventas</TableHead>
                    <TableHead className="text-right">Gastos</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Caja Acum.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cashFlow.map((row) => {
                    accumulatedCash += row.netBalance;
                    return (
                      <TableRow key={row.month}>
                        <TableCell className="font-medium">{row.month}</TableCell>
                        <TableCell className="text-right">S/. {row.giomarInvestment.toFixed(2)}</TableCell>
                        <TableCell className="text-right">S/. {row.erickInvestment.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-semibold">S/. {row.totalInvestment.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-red-600">S/. {row.totalPurchases.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-green-600">S/. {row.totalSales.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-red-600">S/. {row.totalExpenses.toFixed(2)}</TableCell>
                        <TableCell className={`text-right font-semibold ${row.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          S/. {row.netBalance.toFixed(2)}
                        </TableCell>
                        <TableCell className={`text-right font-bold ${accumulatedCash >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          S/. {accumulatedCash.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </Layout>
  );
}
