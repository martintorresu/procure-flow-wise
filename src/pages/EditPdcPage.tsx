import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePdc, useUpdatePdc } from "@/hooks/usePdcs";
import { SEO } from "@/components/SEO";
import { ProjectSelect } from "@/components/ProjectSelect";
import { DB_STAGES, type DbStageValue } from "@/lib/processStages";

export default function EditPdcPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const updatePdc = useUpdatePdc();
  const submitting = updatePdc.isPending;
  const isAdmin = user?.role === "admin";
  const { data: pdc, isLoading, isError } = usePdc(isAdmin ? id : undefined);
  const [pdcNumber, setPdcNumber] = useState<string>("");
  const [form, setForm] = useState({
    project_id: null as string | null,
    project: "", name: "", description: "", category: "",
    criticality: "medium" as "low" | "medium" | "high",
    estimated_amount: "", currency: "USD",
    required_on_site_date: "",
    requesting_area: "",
    responsible_name: "",
    current_stage: "ingenieria" as DbStageValue,
  });

  useEffect(() => {
    if (isError) toast.error("No se pudo cargar el proceso");
  }, [isError]);

  useEffect(() => {
    if (!pdc) return;
    setPdcNumber(pdc.pdc_number);
    setForm({
      project_id: pdc.project_id ?? null,
      project: pdc.project ?? "",
      name: pdc.title ?? "",
      description: pdc.description ?? "",
      category: pdc.category ?? "",
      criticality: pdc.criticality,
      estimated_amount: pdc.estimated_amount ? String(pdc.estimated_amount) : "",
      currency: pdc.currency ?? "USD",
      required_on_site_date: pdc.required_on_site_date ?? "",
      requesting_area: pdc.requesting_area ?? "",
      responsible_name: pdc.current_owner === "—" ? "" : (pdc.current_owner ?? ""),
      current_stage: (pdc.current_stage ?? "ingenieria") as DbStageValue,
    });
  }, [pdc]);

  if (!isAdmin) {
    return (
      <Card className="max-w-xl mx-auto mt-10">
        <CardContent className="p-8 text-center space-y-3">
          <ShieldAlert className="w-10 h-10 mx-auto text-warning" />
          <h2 className="text-lg font-semibold">Acceso restringido</h2>
          <p className="text-sm text-muted-foreground">Solo el perfil Administrador puede editar procesos de compra ya iniciados.</p>
          <Button variant="outline" onClick={() => navigate(-1)}>Volver</Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) return <div className="text-center py-20 text-muted-foreground">Cargando…</div>;

  const update = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.project_id || !form.name || !form.required_on_site_date) {
      toast.error("Complete los campos obligatorios");
      return;
    }
    try {
      await updatePdc.mutateAsync({
        id: id!,
        patch: {
          name: form.name,
          project: form.project,
          project_id: form.project_id,
          description: form.description || null,
          category: form.category || null,
          criticality: form.criticality,
          estimated_amount: form.estimated_amount ? Number(form.estimated_amount) : null,
          currency: form.currency,
          required_on_site_date: form.required_on_site_date,
          requesting_area: form.requesting_area || "Sin especificar",
          responsible_name: form.responsible_name || null,
          current_stage: form.current_stage,
        },
      });
      toast.success("Proceso actualizado correctamente");
      navigate(`/pdcs/${id}`);
    } catch (err) {
      toast.error(`Error al guardar: ${(err as Error).message}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <SEO title={pdcNumber ? `Editar Proceso ${pdcNumber}` : "Editar Proceso"} description="Actualiza datos generales, criticidad y etapa del proceso de compra." />
      <div className="flex items-center gap-3">
        <Link to={`/pdcs/${id}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Editar Proceso {pdcNumber}</h1>
          <p className="text-sm text-muted-foreground">Edición administrativa de un proceso ya iniciado</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Proyecto *</Label>
                <ProjectSelect
                  value={form.project_id}
                  onChange={(id, name) => setForm((p) => ({ ...p, project_id: id, project: name }))}
                />
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
              <Input value={form.name} onChange={(e) => update("name", e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={3} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Área Solicitante</Label>
                <Input value={form.requesting_area} onChange={(e) => update("requesting_area", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Responsable</Label>
                <Input value={form.responsible_name} onChange={(e) => update("responsible_name", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Criticidad</Label>
                <Select value={form.criticality} onValueChange={(v) => update("criticality", v as "low" | "medium" | "high")}>
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
                <Input type="number" value={form.estimated_amount} onChange={(e) => update("estimated_amount", e.target.value)} />
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha Requerida en Obra *</Label>
                <Input type="date" value={form.required_on_site_date} onChange={(e) => update("required_on_site_date", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Etapa Actual (admin)</Label>
                <Select value={form.current_stage} onValueChange={(v) => update("current_stage", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DB_STAGES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Guardando…" : "Guardar cambios"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(`/pdcs/${id}`)}>Cancelar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
