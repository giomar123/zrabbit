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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, ShoppingCart, PackagePlus } from "lucide-react";

export default function Purchases() {
  const [open, setOpen] = useState(false);
  const [showNewProductDialog, setShowNewProductDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [formData, setFormData] = useState({
    purchaseDate: new Date().toISOString().split('T')[0],
    productId: "",
    quantity: "",
    unitPrice: "",
    suggestedPrice: "",
    status: "Recibido",
    detail: "",
  });
  const [newProductData, setNewProductData] = useState({
    name: "",
    categoryId: "",
  });

  const { data: purchases, isLoading, refetch } = trpc.purchases.list.useQuery();
  const { data: products, refetch: refetchProducts } = trpc.products.list.useQuery();
  const { data: categories } = trpc.categories.list.useQuery();
  
  // Filter products by search term
  const filteredProducts = products?.filter(product => {
    const searchLower = productSearch.toLowerCase();
    return (
      product.name.toLowerCase().includes(searchLower) ||
      product.code.toLowerCase().includes(searchLower)
    );
  }) || [];
  
  const createMutation = trpc.purchases.create.useMutation({
    onSuccess: () => {
      toast.success("Compra registrada exitosamente");
      refetch();
      setOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
  
  const updateMutation = trpc.purchases.update.useMutation({
    onSuccess: () => {
      toast.success("Compra actualizada exitosamente");
      refetch();
      setOpen(false);
      resetForm();
    },
  });
  
  const deleteMutation = trpc.purchases.delete.useMutation({
    onSuccess: () => {
      toast.success("Compra eliminada exitosamente");
      refetch();
    },
  });

  const createProductMutation = trpc.products.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Producto creado: ${data.code}`);
      refetchProducts();
      setFormData({ ...formData, productId: data.id.toString() });
      setShowNewProductDialog(false);
      setNewProductData({ name: "", categoryId: "" });
    },
    onError: (error) => {
      toast.error(`Error al crear producto: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      purchaseDate: new Date().toISOString().split('T')[0],
      productId: "",
      quantity: "",
      unitPrice: "",
      suggestedPrice: "",
      status: "Recibido",
      detail: "",
    });
    setEditingId(null);
    setProductSearch("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const quantity = parseFloat(formData.quantity);
    const unitPrice = parseFloat(formData.unitPrice);
    const total = quantity * unitPrice;
    const suggestedPrice = unitPrice * 1.30; // 30% margen

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        purchaseDate: formData.purchaseDate,
        productId: parseInt(formData.productId),
        quantity,
        unitPrice: unitPrice.toFixed(2),
        status: formData.status as "Recibido" | "Recibido parcial" | "Pendiente",
        detail: formData.detail,
      });
    } else {
      createMutation.mutate({
        purchaseDate: formData.purchaseDate,
        productId: parseInt(formData.productId),
        quantity,
        unitPrice: unitPrice.toFixed(2),
        status: formData.status as "Recibido" | "Recibido parcial" | "Pendiente",
        detail: formData.detail,
      });
    }
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    createProductMutation.mutate({
      name: newProductData.name,
      categoryId: parseInt(newProductData.categoryId),
    });
  };

  const handleEdit = (purchase: any) => {
    setEditingId(purchase.id);
    setFormData({
      purchaseDate: purchase.purchaseDate,
      productId: purchase.productId.toString(),
      quantity: purchase.quantity.toString(),
      unitPrice: purchase.unitPrice.toString(),
      suggestedPrice: purchase.suggestedPrice.toString(),
      status: purchase.status,
      detail: purchase.detail || "",
    });
    setOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Estás seguro de eliminar esta compra?")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Cargando compras...</p>
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
          <h1 className="text-3xl font-bold">Compras</h1>
          <p className="text-muted-foreground">Registro de compras de productos</p>
        </div>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Compra
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Compra" : "Nueva Compra"}</DialogTitle>
              <DialogDescription>
                {editingId ? "Modifica los datos de la compra" : "Registra una nueva compra de producto"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchaseDate">Fecha</Label>
                  <Input
                    id="purchaseDate"
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="productId">Producto</Label>
                  <div className="flex gap-2">
                    <Select
                      value={formData.productId}
                      onValueChange={(value) => {
                        setFormData({ ...formData, productId: value });
                        setProductSearch(""); // Reset search when product is selected
                      }}
                      required
                    >
                      <SelectTrigger className="flex-1">
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
                            {productSearch ? "No se encontraron productos" : "No hay productos disponibles"}
                          </div>
                        ) : (
                          filteredProducts.map((product) => (
                            <SelectItem key={product.id} value={product.id.toString()}>
                              {product.code} - {product.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowNewProductDialog(true)}
                      title="Crear nuevo producto"
                    >
                      <PackagePlus className="h-4 w-4" />
                    </Button>
                  </div>
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
                    onChange={(e) => {
                      setFormData({ ...formData, unitPrice: e.target.value });
                      // Auto-calculate suggested price
                      const price = parseFloat(e.target.value);
                      if (!isNaN(price)) {
                        setFormData(prev => ({ ...prev, unitPrice: e.target.value, suggestedPrice: (price * 1.30).toFixed(2) }));
                      }
                    }}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="suggestedPrice">Precio Sugerido 30% (S/.)</Label>
                  <Input
                    id="suggestedPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.suggestedPrice}
                    onChange={(e) => setFormData({ ...formData, suggestedPrice: e.target.value })}
                    placeholder="Se calcula automáticamente"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Estado</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Recibido">Recibido</SelectItem>
                      <SelectItem value="Recibido parcial">Recibido parcial</SelectItem>
                      <SelectItem value="Pendiente">Pendiente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="detail">Detalle (opcional)</Label>
                <Input
                  id="detail"
                  value={formData.detail}
                  onChange={(e) => setFormData({ ...formData, detail: e.target.value })}
                  placeholder="Notas adicionales sobre la compra"
                />
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

      {/* Dialog para crear nuevo producto */}
      <Dialog open={showNewProductDialog} onOpenChange={setShowNewProductDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Producto</DialogTitle>
            <DialogDescription>
              El código se generará automáticamente según la categoría seleccionada
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateProduct} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newProductName">Nombre del Producto</Label>
              <Input
                id="newProductName"
                value={newProductData.name}
                onChange={(e) => setNewProductData({ ...newProductData, name: e.target.value })}
                placeholder="Ej: Pikachu Funko Pop"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newProductCategory">Categoría</Label>
              <Select
                value={newProductData.categoryId}
                onValueChange={(value) => setNewProductData({ ...newProductData, categoryId: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name} ({category.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowNewProductDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createProductMutation.isPending}>
                Crear Producto
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Lista de Compras
          </CardTitle>
          <CardDescription>
            {purchases?.length || 0} compras registradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!purchases || purchases.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay compras registradas. Crea tu primera compra.</p>
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
                    <TableHead className="text-right">P. Sugerido</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell>{new Date(purchase.purchaseDate).toLocaleDateString('es-PE')}</TableCell>
                      <TableCell className="font-mono text-sm">{purchase.product?.code}</TableCell>
                      <TableCell>{purchase.product?.name}</TableCell>
                      <TableCell className="text-right">{purchase.quantity}</TableCell>
                      <TableCell className="text-right">S/. {parseFloat(purchase.unitPrice).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold">S/. {parseFloat(purchase.total).toFixed(2)}</TableCell>
                      <TableCell className="text-right text-green-600">S/. {parseFloat(purchase.suggestedPrice).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={purchase.status === "Recibido" ? "default" : "secondary"}>
                          {purchase.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(purchase)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(purchase.id)}
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
