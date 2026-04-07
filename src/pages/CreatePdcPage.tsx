import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function CreatePdcPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    project: "", title: "", description: "", category: "",
    criticality: "medium", estimated_amount: "", currency: "USD",
    required_on_site_date: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.project || !form.title || !form.required_on_site_date) {
      toast.error("Complete los campos obligatorios");
      return;
    }
    toast.success("PdC creado exitosamente (modo demo)");
    navigate("/pdcs");
  };

  const update = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Crear Proceso de Compra</h1>
        <p className="text-sm text-muted-foreground">Complete los datos del nuevo PdC</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Proyecto *</Label>
                <Input value={form.project} onChange={(e) => update("project", e.target.value)} placeholder="Nombre del proyecto" />
              </div>
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={form.category} onValueChange={(v) => update("category", v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Equipos Mecánicos">Equipos Mecánicos</SelectItem>
                    <SelectItem value="Equipos Eléctricos">Equipos Eléctricos</SelectItem>
                    <SelectItem value="Instrumentación">Instrumentación</SelectItem>
                    <SelectItem value="Válvulas">Válvulas</SelectItem>
                    <SelectItem value="Materiales Eléctricos">Materiales Eléctricos</SelectItem>
                    <SelectItem value="Estructuras">Estructuras</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Descripción breve del item" />
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Descripción técnica detallada" rows={3} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Criticidad</Label>
                <Select value={form.criticality} onValueChange={(v) => update("criticality", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Monto Estimado</Label>
                <Input type="number" value={form.estimated_amount} onChange={(e) => update("estimated_amount", e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Moneda</Label>
                <Select value={form.currency} onValueChange={(v) => update("currency", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="CLP">CLP</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Fecha Requerida en Obra *</Label>
              <Input type="date" value={form.required_on_site_date} onChange={(e) => update("required_on_site_date", e.target.value)} />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit">Crear PdC</Button>
              <Button type="button" variant="outline" onClick={() => navigate("/pdcs")}>Cancelar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
