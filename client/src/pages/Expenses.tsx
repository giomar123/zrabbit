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
import { Pencil, Trash2, Plus, Megaphone, Truck, Package, MoreHorizontal } from "lucide-react";

export default function Expenses() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<{
    expenseDate: string;
    description: string;
    category: "Publicidad" | "Transporte" | "Embalaje" | "Otros";
    amount: string;
  }>({
    expenseDate: new Date().toISOString().split('T')[0],
    description: "",
    category: "Publicidad",
    amount: "",
  });

  const { data: expenses, isLoading, refetch } = trpc.expenses.list.useQuery();
  
  const createMutation = trpc.expenses.create.useMutation({
    onSuccess: () => {
      toast.success("Gasto registrado exitosamente");
      refetch();
      setOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
  
  const updateMutation = trpc.expenses.update.useMutation({
    onSuccess: () => {
      toast.success("Gasto actualizado exitosamente");
      refetch();
      setOpen(false);
      resetForm();
    },
  });
  
  const deleteMutation = trpc.expenses.delete.useMutation({
    onSuccess: () => {
      toast.success("Gasto eliminado exitosamente");
      refetch();
    },
  });

  const resetForm = () => {
    setFormData({
      expenseDate: new Date().toISOString().split('T')[0],
      description: "",
      category: "Publicidad",
      amount: "",
    });
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        ...formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (expense: any) => {
    setEditingId(expense.id);
    setFormData({
      expenseDate: expense.expenseDate,
      description: expense.description,
      category: expense.category as "Publicidad" | "Transporte" | "Embalaje" | "Otros",
      amount: expense.amount.toString(),
    });
    setOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Estás seguro de eliminar este gasto?")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Cargando gastos...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Calculate totals by category
  const publicidadTotal = expenses?.filter(e => e.category === "Publicidad").reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;
  const transporteTotal = expenses?.filter(e => e.category === "Transporte").reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;
  const embalajeTotal = expenses?.filter(e => e.category === "Embalaje").reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;
  const otrosTotal = expenses?.filter(e => e.category === "Otros").reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;
  const totalExpenses = publicidadTotal + transporteTotal + embalajeTotal + otrosTotal;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Publicidad": return <Megaphone className="h-5 w-5 text-green-600" />;
      case "Transporte": return <Truck className="h-5 w-5 text-blue-600" />;
      case "Embalaje": return <Package className="h-5 w-5 text-orange-600" />;
      case "Otros": return <MoreHorizontal className="h-5 w-5 text-gray-600" />;
      default: return null;
    }
  };

  return (
    <Layout>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gastos</h1>
          <p className="text-muted-foreground">Registro de gastos operativos del negocio</p>
        </div>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Gasto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Gasto" : "Nuevo Gasto"}</DialogTitle>
              <DialogDescription>
                {editingId ? "Actualiza la información del gasto" : "Registra un nuevo gasto operativo"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expenseDate">Fecha</Label>
                  <Input
                    id="expenseDate"
                    type="date"
                    value={formData.expenseDate}
                    onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoría</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value as "Publicidad" | "Transporte" | "Embalaje" | "Otros" })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Publicidad">Publicidad</SelectItem>
                      <SelectItem value="Transporte">Transporte</SelectItem>
                      <SelectItem value="Embalaje">Embalaje</SelectItem>
                      <SelectItem value="Otros">Otros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe el gasto"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Monto (S/.)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Gastos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">S/. {totalExpenses.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Publicidad</CardTitle>
            <Megaphone className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">S/. {publicidadTotal.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transporte</CardTitle>
            <Truck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">S/. {transporteTotal.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Embalaje</CardTitle>
            <Package className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">S/. {embalajeTotal.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Otros</CardTitle>
            <MoreHorizontal className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">S/. {otrosTotal.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Gastos</CardTitle>
          <CardDescription>
            {expenses?.length || 0} gastos registrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!expenses || expenses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay gastos registrados. Crea tu primer gasto.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{new Date(expense.expenseDate).toLocaleDateString('es-PE')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(expense.category)}
                          <span>{expense.category}</span>
                        </div>
                      </TableCell>
                      <TableCell>{expense.description}</TableCell>
                      <TableCell className="text-right font-semibold">S/. {parseFloat(expense.amount).toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(expense)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(expense.id)}
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
