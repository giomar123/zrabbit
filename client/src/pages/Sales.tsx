import { useState } from "react";
import { trpc } from "@/lib/trpc";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, TrendingUp } from "lucide-react";

export default function Sales() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [formData, setFormData] = useState({
    saleDate: new Date().toISOString().split('T')[0],
    productId: "",
    quantity: "",
    unitPrice: "",
    buyerName: "",
    buyerEmail: "",
    buyerPhone: "",
  });

  const { data: sales, isLoading, refetch } = trpc.sales.list.useQuery();
  const { data: products } = trpc.products.list.useQuery();
  const { data: inventory } = trpc.inventory.list.useQuery();
  
  // Filter products: only show products with stock > 0
  const productsWithStock = products?.filter(product => {
    const inventoryItem = inventory?.find(inv => inv.productId === product.id);
    return inventoryItem && inventoryItem.finalStock > 0;
  }) || [];
  
  // Filter products by search term
  const filteredProducts = productsWithStock.filter(product => {
    const searchLower = productSearch.toLowerCase();
    return (
      product.name.toLowerCase().includes(searchLower) ||
      product.code.toLowerCase().includes(searchLower)
    );
  });
  
  const createMutation = trpc.sales.create.useMutation({
    onSuccess: () => {
      toast.success("Venta registrada exitosamente");
      refetch();
      setOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
  
  const updateMutation = trpc.sales.update.useMutation({
    onSuccess: () => {
      toast.success("Venta actualizada exitosamente");
      refetch();
      setOpen(false);
      resetForm();
    },
  });
  
  const deleteMutation = trpc.sales.delete.useMutation({
    onSuccess: () => {
      toast.success("Venta eliminada exitosamente");
      refetch();
    },
  });

  const resetForm = () => {
    setFormData({
      saleDate: new Date().toISOString().split('T')[0],
      productId: "",
      quantity: "",
      unitPrice: "",
      buyerName: "",
      buyerEmail: "",
      buyerPhone: "",
    });
    setEditingId(null);
    setProductSearch("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const quantity = parseFloat(formData.quantity);
    const unitPrice = parseFloat(formData.unitPrice);

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        saleDate: formData.saleDate,
        productId: parseInt(formData.productId),
        quantity,
        unitPrice: unitPrice.toFixed(2),
        buyerName: formData.buyerName || undefined,
        buyerEmail: formData.buyerEmail || undefined,
        buyerPhone: formData.buyerPhone || undefined,
      });
    } else {
      createMutation.mutate({
        saleDate: formData.saleDate,
        productId: parseInt(formData.productId),
        quantity,
        unitPrice: unitPrice.toFixed(2),
        buyerName: formData.buyerName || undefined,
        buyerEmail: formData.buyerEmail || undefined,
        buyerPhone: formData.buyerPhone || undefined,
      });
    }
  };

  const handleEdit = (sale: any) => {
    setEditingId(sale.id);
    setFormData({
      saleDate: sale.saleDate,
      productId: sale.productId.toString(),
      quantity: sale.quantity.toString(),
      unitPrice: sale.unitPrice.toString(),
      buyerName: sale.buyerName || "",
      buyerEmail: sale.buyerEmail || "",
      buyerPhone: sale.buyerPhone || "",
    });
    setOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Estás seguro de eliminar esta venta?")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Cargando ventas...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ventas</h1>
          <p className="text-muted-foreground">Registro de ventas de productos</p>
        </div>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Venta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Venta" : "Nueva Venta"}</DialogTitle>
              <DialogDescription>
                {editingId ? "Modifica los datos de la venta" : "Registra una nueva venta de producto"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="saleDate">Fecha</Label>
                  <Input
                    id="saleDate"
                    type="date"
                    value={formData.saleDate}
                    onChange={(e) => setFormData({ ...formData, saleDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="productId">Producto</Label>
                  <Select
                    value={formData.productId}
                    onValueChange={(value) => {
                      setFormData({ ...formData, productId: value });
                      setProductSearch(""); // Reset search when product is selected
                    }}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un producto" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="px-2 py-1.5 sticky top-0 bg-background border-b">
                        <Input
                          placeholder="Buscar producto..."
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          className="h-8"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      {filteredProducts.length === 0 ? (
                        <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                          {productSearch ? "No se encontraron productos" : "No hay productos con stock disponible"}
                        </div>
                      ) : (
                        filteredProducts.map((product) => {
                          const inventoryItem = inventory?.find(inv => inv.productId === product.id);
                          const stock = inventoryItem?.finalStock || 0;
                          return (
                            <SelectItem key={product.id} value={product.id.toString()}>
                              <div className="flex items-center justify-between w-full">
                                <span>{product.code} - {product.name}</span>
                                <span className="ml-2 text-xs text-muted-foreground">Stock: {stock}</span>
                              </div>
                            </SelectItem>
                          );
                        })
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Cantidad</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    step="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unitPrice">Precio Unitario (S/.)</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Información del Comprador (opcional)</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="buyerName">Nombre</Label>
                    <Input
                      id="buyerName"
                      value={formData.buyerName}
                      onChange={(e) => setFormData({ ...formData, buyerName: e.target.value })}
                      placeholder="Nombre del comprador"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="buyerEmail">Correo</Label>
                      <Input
                        id="buyerEmail"
                        type="email"
                        value={formData.buyerEmail}
                        onChange={(e) => setFormData({ ...formData, buyerEmail: e.target.value })}
                        placeholder="correo@ejemplo.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="buyerPhone">Teléfono</Label>
                      <Input
                        id="buyerPhone"
                        type="tel"
                        value={formData.buyerPhone}
                        onChange={(e) => setFormData({ ...formData, buyerPhone: e.target.value })}
                        placeholder="+51 999 999 999"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingId ? "Actualizar" : "Guardar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Lista de Ventas
          </CardTitle>
          <CardDescription>
            {sales?.length || 0} ventas registradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!sales || sales.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay ventas registradas. Crea tu primera venta.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">P. Unitario</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Comprador</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>{new Date(sale.saleDate).toLocaleDateString('es-PE')}</TableCell>
                      <TableCell className="font-mono text-sm">{sale.product?.code}</TableCell>
                      <TableCell>{sale.product?.name}</TableCell>
                      <TableCell className="text-right">{sale.quantity}</TableCell>
                      <TableCell className="text-right">S/. {parseFloat(sale.unitPrice).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold">S/. {parseFloat(sale.total).toFixed(2)}</TableCell>
                      <TableCell>{sale.buyerName || "-"}</TableCell>
                      <TableCell className="text-sm">
                        {sale.buyerEmail && <div>{sale.buyerEmail}</div>}
                        {sale.buyerPhone && <div className="text-muted-foreground">{sale.buyerPhone}</div>}
                        {!sale.buyerEmail && !sale.buyerPhone && "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(sale)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(sale.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
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
