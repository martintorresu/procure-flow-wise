import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useCreatePdc, usePdc } from "@/hooks/usePdcs";
import { ProjectSelect } from "@/components/ProjectSelect";
import { ProcessStepper } from "@/components/ProcessStepper";
import { PURCHASE_STEPS } from "@/lib/processStages";
import { SEO } from "@/components/SEO";
import { GENERIC_STAGES, PROCESS_TYPES, PROCESS_TYPE_LABELS, isPurchaseType, type ProcessType } from "@/lib/processTypes";
import { FileText, Wrench, ClipboardList, FileSearch, Award, Truck, FlaskConical, Ship, Check, Link2, Lock } from "lucide-react";
import { useTenantSubscription } from "@/hooks/useTenantSubscription";
import { PLAN_LABELS, PROCESS_LIMIT_MESSAGE, usageLabel } from "@/lib/plans";



const GENERIC_STEPS = GENERIC_STAGES.map((s, i) => ({
  key: s.key,
  label: s.label,
  icon: [FileText, ClipboardList, Wrench, Check][i],
}));

export default function CreatePdcPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const subscription = useTenantSubscription();

  const [params] = useSearchParams();
  const fromId = params.get("from") ?? undefined;
  const { data: parent } = usePdc(fromId);
  const createPdc = useCreatePdc();
  const submitting = createPdc.isPending;

  const [form, setForm] = useState({
    process_type: "compra" as ProcessType,
    project_id: null as string | null,
    project: "", title: "", description: "", category: "",
    criticality: "medium" as "low" | "medium" | "high",
    estimated_amount: "", currency: "USD",
    required_on_site_date: "",
    requesting_area: "",
    responsible_name: "",
  });

  // Precarga editable desde el proceso padre (encadenamiento)
  useEffect(() => {
    if (!parent) return;
    setForm((p) => ({
      ...p,
      project_id: parent.project_id ?? null,
      project: parent.project ?? "",
      description: parent.selected_supplier
        ? `Continuación de ${parent.pdc_number}. Proveedor adjudicado: ${parent.selected_supplier}.`
        : `Continuación de ${parent.pdc_number} — ${parent.title}.`,
      category: parent.category || "",
      criticality: parent.criticality,
      estimated_amount: parent.estimated_amount ? String(parent.estimated_amount) : "",
      currency: parent.currency || "USD",
      required_on_site_date: parent.required_on_site_date || "",
      responsible_name: parent.current_owner && parent.current_owner !== "—" ? parent.current_owner : "",
    }));
  }, [parent]);

  const update = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const isPurchase = isPurchaseType(form.process_type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.project_id || !form.title || !form.required_on_site_date) {
      toast.error("Complete los campos obligatorios");
      return;
    }
    if (!user) {
      toast.error("Sesión expirada. Vuelva a iniciar sesión.");
      return;
    }
    // Refuerzo del límite de plan también ante acceso directo por URL.
    if (subscription.isAtProcessLimit) {
      toast.error(PROCESS_LIMIT_MESSAGE);
      return;
    }

    try {
      // SECURITY: tenant_id is resolved server-side via RLS policy using auth.uid()
      // The PLACEHOLDER_TENANT pattern is used; the actual tenant is set by trigger
      // TODO: La columna created_by debería tener DEFAULT auth.uid() en la migración SQL
      const data = await createPdc.mutateAsync({
        name: form.title,
        project: form.project,
        project_id: form.project_id,
        process_type: form.process_type,
        predecessor_process_id: fromId ?? null,
        description: form.description || null,
        category: form.category || null,
        criticality: form.criticality,
        estimated_amount: form.estimated_amount ? Number(form.estimated_amount) : null,
        currency: form.currency,
        required_on_site_date: form.required_on_site_date,
        requesting_area: form.requesting_area || "Sin especificar",
        responsible_name: form.responsible_name || null,
        created_by: user.id,
      });

      toast.success(`Proceso ${data.pdc_number} creado exitosamente`);
      // Los procesos tipo "permiso" continúan en Permisología para completar el trámite
      if (form.process_type === "permiso") {
        navigate(`/permits?pdc=${data.id}&project=${form.project_id ?? ""}`);
        return;
      }
      navigate(`/pdcs/${data.id}`);
    } catch (err) {
      toast.error(`Error al crear el proceso: ${(err as Error).message}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <SEO title="Nuevo Proceso" description="Crea un nuevo proceso indicando tipo, proyecto, criticidad, monto y fecha requerida." path="/pdcs/new" />
      <div>
        <h1 className="text-2xl font-bold">Crear Proceso</h1>
        <p className="text-sm text-muted-foreground">Complete los datos del nuevo proceso</p>
      </div>

      {subscription.tier === "free" && (
        <Card className={subscription.isAtProcessLimit ? "border-l-4 border-l-destructive bg-destructive/5" : "border-l-4 border-l-muted"}>
          <CardContent className="p-4 flex items-start gap-2 text-sm">
            <Lock className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
            <span>
              <span className="font-medium">
                {`Plan ${PLAN_LABELS.free} · ${usageLabel(subscription.usage.processes, subscription.limits.maxActiveProcesses, "procesos")}`}
              </span>
              {subscription.isAtProcessLimit && <span className="block">{PROCESS_LIMIT_MESSAGE}</span>}
            </span>
          </CardContent>
        </Card>
      )}



      {parent && (
        <Card className="border-l-4 border-l-accent bg-accent/5">
          <CardContent className="p-4 flex items-center gap-2 text-sm">
            <Link2 className="w-4 h-4 text-accent" />
            <span>
              Continuación de <span className="font-mono">{parent.pdc_number}</span> — {parent.title}
            </span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-6 space-y-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {isPurchase ? "Flujo de compra (8 etapas)" : "Flujo genérico (4 etapas)"}
          </p>
          <ProcessStepper steps={isPurchase ? PURCHASE_STEPS : GENERIC_STEPS} activeIndex={0} compact />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de proceso *</Label>
                <Select value={form.process_type} onValueChange={(v) => update("process_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROCESS_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{PROCESS_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <Label>Proyecto *</Label>
              <ProjectSelect
                value={form.project_id}
                onChange={(id, name) => setForm((p) => ({ ...p, project_id: id, project: name }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Descripción breve del item" />
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Descripción técnica detallada" rows={3} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Área Solicitante</Label>
                <Input value={form.requesting_area} onChange={(e) => update("requesting_area", e.target.value)} placeholder="Ej: Operaciones, Mantenimiento" />
              </div>
              <div className="space-y-2">
                <Label>Responsable</Label>
                <Input value={form.responsible_name} onChange={(e) => update("responsible_name", e.target.value)} placeholder="Nombre del responsable" />
              </div>
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
              <Button type="submit" disabled={submitting || subscription.isAtProcessLimit}>
                {submitting ? "Creando…" : "Crear Proceso"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/pdcs")}>Cancelar</Button>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}
