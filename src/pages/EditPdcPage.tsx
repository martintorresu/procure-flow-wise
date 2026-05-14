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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdatePdc } from "@/hooks/usePdcs";
import { SEO } from "@/components/SEO";

const STAGES = [
  { value: "ingenieria", label: "Ingeniería" },
  { value: "programacion", label: "Programación / Planificación" },
  { value: "compras", label: "Compras" },
  { value: "licitacion", label: "Licitación" },
  { value: "evaluacion", label: "Evaluación" },
  { value: "orden_compra", label: "Orden de Compra" },
  { value: "seguimiento", label: "Seguimiento / FAT" },
  { value: "recepcion", label: "Recepción / Logística" },
];

export default function EditPdcPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pdcNumber, setPdcNumber] = useState<string>("");
  const [form, setForm] = useState({
    project: "", name: "", description: "", category: "",
    criticality: "medium" as "low" | "medium" | "high",
    estimated_amount: "", currency: "USD",
    required_on_site_date: "",
    requesting_area: "",
    responsible_name: "",
    current_stage: "ingenieria",
  });

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!id || !isAdmin) { setLoading(false); return; }
    (async () => {
      const { data, error } = await supabase
        .from("purchase_processes").select("*").eq("id", id).maybeSingle();
      if (error || !data) {
        toast.error("No se pudo cargar el PdC");
        setLoading(false);
        return;
      }
      setPdcNumber(data.pdc_number);
      const critMap: Record<string, "low" | "medium" | "high"> = { baja: "low", media: "medium", alta: "high" };
      setForm({
        project: data.project ?? "",
        name: data.name ?? "",
        description: data.description ?? "",
        category: data.category ?? "",
        criticality: critMap[data.criticality] ?? "medium",
        estimated_amount: data.estimated_amount?.toString() ?? "",
        currency: data.currency ?? "USD",
        required_on_site_date: data.required_on_site_date ?? "",
        requesting_area: data.requesting_area ?? "",
        responsible_name: data.responsible_name ?? "",
        current_stage: data.current_stage ?? "ingenieria",
      });
      setLoading(false);
    })();
  }, [id, isAdmin]);

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

  if (loading) return <div className="text-center py-20 text-muted-foreground">Cargando…</div>;

  const update = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.project || !form.name || !form.required_on_site_date) {
      toast.error("Complete los campos obligatorios");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase
      .from("purchase_processes")
      .update({
        name: form.name,
        project: form.project,
        description: form.description || null,
        category: form.category || null,
        criticality: CRIT_FE_TO_DB[form.criticality],
        estimated_amount: form.estimated_amount ? Number(form.estimated_amount) : null,
        currency: form.currency,
        required_on_site_date: form.required_on_site_date,
        requesting_area: form.requesting_area || "Sin especificar",
        responsible_name: form.responsible_name || null,
        current_stage: form.current_stage as
          | "ingenieria" | "programacion" | "compras" | "licitacion"
          | "evaluacion" | "orden_compra" | "seguimiento" | "recepcion",
      })
      .eq("id", id!);
    setSubmitting(false);
    if (error) {
      toast.error(`Error al guardar: ${error.message}`);
      return;
    }
    toast.success("PdC actualizado correctamente");
    navigate(`/pdcs/${id}`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <SEO title={pdcNumber ? `Editar PdC ${pdcNumber}` : "Editar PdC"} description="Actualiza datos generales, criticidad y etapa del proceso de compra." />
      <div className="flex items-center gap-3">
        <Link to={`/pdcs/${id}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Editar PdC {pdcNumber}</h1>
          <p className="text-sm text-muted-foreground">Edición administrativa de un proceso ya iniciado</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Proyecto *</Label>
                <Input value={form.project} onChange={(e) => update("project", e.target.value)} />
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
                    {STAGES.map((s) => (
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
