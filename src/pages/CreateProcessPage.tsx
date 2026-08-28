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
import { useCreateProcess, useProcess } from "@/hooks/useProcesses";
import { ProjectSelect } from "@/components/ProjectSelect";
import { SEO } from "@/components/SEO";
import {
  ADMINISTRACION_CONTRATO_STAGES,
  LICITACION_STAGES,
  OBRA_STAGES,
  PROCESS_TYPES,
  PROCESS_TYPE_LABELS,
  isAdministracionContratoType,
  isLicitacionType,
  isObraType,
  type ProcessType,
} from "@/lib/processTypes";
import { Link2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantSubscription } from "@/hooks/useTenantSubscription";
import { PLAN_LABELS, PROCESS_LIMIT_MESSAGE, usageLabel } from "@/lib/plans";

export default function CreateProcessPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const subscription = useTenantSubscription();

  const [params] = useSearchParams();
  const fromId = params.get("from") ?? undefined;
  const { data: parent } = useProcess(fromId);
  const createProcess = useCreateProcess();
  const submitting = createProcess.isPending;

  const [form, setForm] = useState({
    process_type: "compra" as ProcessType,
    project_id: null as string | null,
    title: "",
    description: "",
    responsible_name: "",
  });

  // Precarga editable desde el proceso padre (encadenamiento)
  useEffect(() => {
    if (!parent) return;
    setForm((p) => ({
      ...p,
      project_id: parent.project_id ?? null,
      description: `Continuación de ${parent.process_number} — ${parent.title}.`,
      responsible_name: parent.current_owner && parent.current_owner !== "—" ? parent.current_owner : "",
    }));
  }, [parent]);

  const update = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const isObra = isObraType(form.process_type);
  const isLicitacion = isLicitacionType(form.process_type);
  const isContrato = isAdministracionContratoType(form.process_type);

  const presetStages = isObra
    ? OBRA_STAGES
    : isLicitacion
      ? LICITACION_STAGES
      : isContrato
        ? ADMINISTRACION_CONTRATO_STAGES
        : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.project_id || !form.title) {
      toast.error("Complete los campos obligatorios");
      return;
    }
    if (!user) {
      toast.error("Sesión expirada. Vuelva a iniciar sesión.");
      return;
    }
    if (subscription.isAtProcessLimit) {
      toast.error(PROCESS_LIMIT_MESSAGE);
      return;
    }

    try {
      const data = await createProcess.mutateAsync({
        name: form.title,
        project_id: form.project_id,
        process_type: form.process_type,
        predecessor_process_id: fromId ?? null,
        description: form.description || null,
        responsible_name: form.responsible_name || null,
        created_by: user.id,
      });

      // Los procesos preestablecidos reciben sus 10 etapas
      if (isObra || isLicitacion || isContrato) {
        const { error: stagesError } = await supabase.rpc(
          isObra ? "seed_obra_stages" : isLicitacion ? "seed_licitacion_stages" : "seed_administracion_contrato_stages",
          { p_process_id: data.id },
        );
        if (stagesError) toast.error(`Proceso creado, pero no se pudieron crear las etapas: ${stagesError.message}`);
      }
      toast.success(`Proceso ${data.process_number} creado exitosamente`);
      navigate(`/procesos/${data.id}`);
    } catch (err) {
      toast.error(`Error al crear el proceso: ${(err as Error).message}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <SEO title="Nuevo Proceso" description="Crea un nuevo proceso indicando tipo, proyecto y responsable." path="/procesos/new" />
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
              Continuación de <span className="font-mono">{parent.process_number}</span> — {parent.title}
            </span>
          </CardContent>
        </Card>
      )}

      {presetStages && (
        <Card>
          <CardContent className="p-6 space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Etapas preestablecidas ({presetStages.length})
            </p>
            <ol className="grid gap-1 text-sm sm:grid-cols-2">
              {presetStages.map((s, i) => (
                <li key={s.key} className="text-muted-foreground">
                  <span className="font-mono text-xs mr-1">{i + 1}.</span>{s.label}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
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
              <Label>Proyecto *</Label>
              <ProjectSelect
                value={form.project_id}
                onChange={(id) => setForm((p) => ({ ...p, project_id: id }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Nombre del proceso" />
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Descripción del alcance" rows={3} />
            </div>

            <div className="space-y-2">
              <Label>Responsable</Label>
              <Input value={form.responsible_name} onChange={(e) => update("responsible_name", e.target.value)} placeholder="Nombre del responsable" />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={submitting || subscription.isAtProcessLimit}>
                {submitting ? "Creando…" : "Crear Proceso"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/procesos")}>Cancelar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
