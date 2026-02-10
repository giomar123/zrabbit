import { trpc } from "@/lib/trpc";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Package, AlertTriangle } from "lucide-react";

export default function Inventory() {
  const { data: inventory, isLoading } = trpc.inventory.list.useQuery();

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Cargando inventario...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const totalInventoryValue = inventory?.reduce((sum, item) => sum + (item.inventoryValue || 0), 0) || 0;
  const lowStockItems = inventory?.filter(item => item.finalStock > 0 && item.finalStock <= 5) || [];

  return (
    <Layout>
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Inventario</h1>
        <p className="text-muted-foreground">Control de stock y valor del inventario</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total del Inventario</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">S/. {totalInventoryValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {inventory?.length || 0} productos en stock
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos con Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {inventory?.filter(item => item.finalStock > 0).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Productos disponibles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {lowStockItems.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Productos con 5 o menos unidades
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Detalle de Inventario
          </CardTitle>
          <CardDescription>
            Stock disponible y valor por producto
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!inventory || inventory.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay productos en el inventario.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Compras</TableHead>
                    <TableHead className="text-right">Ventas</TableHead>
                    <TableHead className="text-right">Stock Final</TableHead>
                    <TableHead className="text-right">Valor Unitario</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((item) => (
                    <TableRow key={item.productId}>
                      <TableCell className="font-mono text-sm">{item.productCode}</TableCell>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell className="text-right">{item.totalPurchased}</TableCell>
                      <TableCell className="text-right">{item.totalSold}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {item.finalStock}
                      </TableCell>
                      <TableCell className="text-right">
                        S/. {(item.avgUnitPrice || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        S/. {(item.inventoryValue || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {item.finalStock === 0 ? (
                          <Badge variant="secondary">Sin stock</Badge>
                        ) : item.finalStock <= 5 ? (
                          <Badge variant="destructive">Stock bajo</Badge>
                        ) : (
                          <Badge variant="default">Disponible</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
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
