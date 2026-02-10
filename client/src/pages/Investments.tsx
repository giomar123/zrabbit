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
import { Pencil, Trash2, Plus, DollarSign } from "lucide-react";

export default function Investments() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    investmentDate: new Date().toISOString().split('T')[0],
    description: "",
    investor: "Giomar",
    amount: "",
  });

  const { data: investments, isLoading, refetch } = trpc.investments.list.useQuery();
  
  const createMutation = trpc.investments.create.useMutation({
    onSuccess: () => {
      toast.success("Inversión registrada exitosamente");
      refetch();
      setOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
  
  const updateMutation = trpc.investments.update.useMutation({
    onSuccess: () => {
      toast.success("Inversión actualizada exitosamente");
      refetch();
      setOpen(false);
      resetForm();
    },
  });
  
  const deleteMutation = trpc.investments.delete.useMutation({
    onSuccess: () => {
      toast.success("Inversión eliminada exitosamente");
      refetch();
    },
  });

  const resetForm = () => {
    setFormData({
      investmentDate: new Date().toISOString().split('T')[0],
      description: "",
      investor: "Giomar",
      amount: "",
    });
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(formData.amount);

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        investmentDate: formData.investmentDate,
        description: formData.description,
        investor: formData.investor as "Giomar" | "Erick",
        amount: amount.toFixed(2),
      });
    } else {
      createMutation.mutate({
        investmentDate: formData.investmentDate,
        description: formData.description,
        investor: formData.investor as "Giomar" | "Erick",
        amount: amount.toFixed(2),
      });
    }
  };

  const handleEdit = (investment: any) => {
    setEditingId(investment.id);
    setFormData({
      investmentDate: investment.investmentDate,
      description: investment.description,
      investor: investment.investor,
      amount: investment.amount.toString(),
    });
    setOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Estás seguro de eliminar esta inversión?")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Cargando inversiones...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const giomarTotal = investments?.filter(i => i.investor === "Giomar").reduce((sum, i) => sum + parseFloat(i.amount), 0) || 0;
  const erickTotal = investments?.filter(i => i.investor === "Erick").reduce((sum, i) => sum + parseFloat(i.amount), 0) || 0;
  const totalInvestment = giomarTotal + erickTotal;

  return (
    <Layout>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inversiones</h1>
          <p className="text-muted-foreground">Registro de aportes de inversores y gastos</p>
        </div>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Inversión
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Inversión" : "Nueva Inversión"}</DialogTitle>
              <DialogDescription>
                {editingId ? "Modifica los datos de la inversión" : "Registra una nueva inversión o gasto"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="investmentDate">Fecha</Label>
                  <Input
                    id="investmentDate"
                    type="date"
                    value={formData.investmentDate}
                    onChange={(e) => setFormData({ ...formData, investmentDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="investor">Inversor</Label>
                  <Select
                    value={formData.investor}
                    onValueChange={(value) => setFormData({ ...formData, investor: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Giomar">Giomar</SelectItem>
                      <SelectItem value="Erick">Erick</SelectItem>
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
                  placeholder="Ej: Aporte inicial, Publicidad TikTok, etc."
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inversión</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">S/. {totalInvestment.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {investments?.length || 0} registros
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inversión Giomar</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">S/. {giomarTotal.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {((giomarTotal / totalInvestment) * 100 || 0).toFixed(1)}% del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inversión Erick</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">S/. {erickTotal.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {((erickTotal / totalInvestment) * 100 || 0).toFixed(1)}% del total
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Lista de Inversiones
          </CardTitle>
          <CardDescription>
            {investments?.length || 0} inversiones registradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!investments || investments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay inversiones registradas. Crea tu primera inversión.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Inversor</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {investments.map((investment) => (
                    <TableRow key={investment.id}>
                      <TableCell>{new Date(investment.investmentDate).toLocaleDateString('es-PE')}</TableCell>
                      <TableCell>{investment.description}</TableCell>
                      <TableCell>
                        <Badge variant={investment.investor === "Giomar" ? "default" : "secondary"}>
                          {investment.investor}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        S/. {parseFloat(investment.amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(investment)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(investment.id)}
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
