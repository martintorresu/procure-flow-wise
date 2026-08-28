import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  useCreatePermit,
  useUpdatePermit,
  usePermitTypes,
  type Permit,
} from "@/hooks/usePermits";
import { PermitDocumentsSection } from "@/components/permits/PermitDocumentsSection";
import { useProjects } from "@/hooks/useProjects";
import { useTenantUsers } from "@/hooks/useTenantUsers";
import { useProcessOptions } from "@/hooks/useCommitments";
import {
  PERMIT_STATUSES,
  PERMIT_STATUS_LABELS,
  addDaysIso,
  type PermitStatus,
} from "@/lib/permits";

const NONE = "__none__";

interface FormState {
  permit_type_id: string;
  permit_type: string;
  permit_number: string;
  issuing_authority: string;
  application_date: string;
  approval_date: string;
  expiration_date: string;
  status: PermitStatus;
  project_id: string;
  pdc_id: string;
  responsible_user_id: string;
  notes: string;
}

const EMPTY: FormState = {
  permit_type_id: "",
  permit_type: "",
  permit_number: "",
  issuing_authority: "",
  application_date: "",
  approval_date: "",
  expiration_date: "",
  status: "pendiente",
  project_id: "",
  pdc_id: "",
  responsible_user_id: "",
  notes: "",
};

export function PermitFormDialog({
  open,
  onOpenChange,
  permit,
  defaultProjectId,
  defaultPdcId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  permit?: Permit | null;
  defaultProjectId?: string;
  defaultPdcId?: string;
}) {
  const { data: types = [] } = usePermitTypes(true);
  const { data: projects = [] } = useProjects();
  const { data: users = [] } = useTenantUsers();
  const { data: processes = [] } = useProcessOptions();
  const createMutation = useCreatePermit();
  const updateMutation = useUpdatePermit();

  const [form, setForm] = useState<FormState>(EMPTY);

  useEffect(() => {
    if (!open) return;
    if (permit) {
      setForm({
        permit_type_id: permit.permit_type_id ?? "",
        permit_type: permit.permit_type ?? "",
        permit_number: permit.permit_number ?? "",
        issuing_authority: permit.issuing_authority ?? "",
        application_date: permit.application_date ?? "",
        approval_date: permit.approval_date ?? "",
        expiration_date: permit.expiration_date ?? "",
        status: permit.status,
        project_id: permit.project_id ?? "",
        pdc_id: permit.pdc_id ?? "",
        responsible_user_id: permit.responsible_user_id ?? "",
        notes: permit.notes ?? "",
      });
    } else {
      setForm({ ...EMPTY, project_id: defaultProjectId ?? "", pdc_id: defaultPdcId ?? "" });
    }
  }, [open, permit, defaultProjectId, defaultPdcId]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((p) => ({ ...p, [k]: v }));

  /** Al elegir tipo: autocompleta entidad y sugiere vencimiento. */
  const onTypeChange = (typeId: string) => {
    const t = types.find((x) => x.id === typeId);
    setForm((p) => {
      const next = { ...p, permit_type_id: typeId, permit_type: t?.name ?? p.permit_type };
      if (t?.typical_authority && !p.issuing_authority) next.issuing_authority = t.typical_authority;
      const base = p.approval_date || p.application_date;
      if (t?.typical_duration_days && base && !p.expiration_date) {
        next.expiration_date = addDaysIso(base, t.typical_duration_days);
      }
      return next;
    });
  };

  /** Al cambiar la fecha de aprobación, recalcula el vencimiento sugerido. */
  const onApprovalChange = (v: string) => {
    const t = types.find((x) => x.id === form.permit_type_id);
    setForm((p) => ({
      ...p,
      approval_date: v,
      expiration_date:
        t?.typical_duration_days && v ? addDaysIso(v, t.typical_duration_days) : p.expiration_date,
    }));
  };

  const submit = async () => {
    if (!form.permit_type.trim()) {
      toast.error("Selecciona el tipo de permiso");
      return;
    }
    const payload = {
      permit_type_id: form.permit_type_id || null,
      permit_type: form.permit_type.trim(),
      permit_number: form.permit_number.trim() || null,
      issuing_authority: form.issuing_authority.trim() || null,
      application_date: form.application_date || null,
      approval_date: form.approval_date || null,
      expiration_date: form.expiration_date || null,
      status: form.status,
      project_id: form.project_id || null,
      pdc_id: form.pdc_id || null,
      responsible_user_id: form.responsible_user_id || null,
      notes: form.notes.trim() || null,
    };
    try {
      if (permit) {
        await updateMutation.mutateAsync({ id: permit.id, ...payload } as never);
        toast.success("Permiso actualizado");
      } else {
        await createMutation.mutateAsync(payload as never);
        toast.success("Permiso creado");
      }
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{permit ? "Editar permiso" : "Nuevo permiso"}</DialogTitle>
          <DialogDescription>
            Datos del trámite: tipo, expediente, entidad emisora, fechas y responsable.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tipo de permiso</Label>
            <Select value={form.permit_type_id || NONE} onValueChange={(v) => onTypeChange(v === NONE ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Selecciona un tipo" /></SelectTrigger>
              <SelectContent>
                {types.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {!types.length && (
              <p className="text-[11px] text-muted-foreground">
                No hay tipos en el catálogo. Configúralos en Administración.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>N° expediente / resolución</Label>
            <Input value={form.permit_number} onChange={(e) => set("permit_number", e.target.value)} placeholder="Ej: 1234/2026" />
          </div>

          <div className="space-y-2">
            <Label>Entidad emisora</Label>
            <Input value={form.issuing_authority} onChange={(e) => set("issuing_authority", e.target.value)} placeholder="DOM, SEREMI, SEC…" />
          </div>

          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v as PermitStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERMIT_STATUSES.map((s) => <SelectItem key={s} value={s}>{PERMIT_STATUS_LABELS[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Fecha de solicitud</Label>
            <Input type="date" value={form.application_date} onChange={(e) => set("application_date", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Fecha de aprobación</Label>
            <Input type="date" value={form.approval_date} onChange={(e) => onApprovalChange(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Fecha de vencimiento</Label>
            <Input type="date" value={form.expiration_date} onChange={(e) => set("expiration_date", e.target.value)} />
            <p className="text-[11px] text-muted-foreground">Se sugiere según la duración típica del tipo.</p>
          </div>

          <div className="space-y-2">
            <Label>Obra / proyecto</Label>
            <Select value={form.project_id || NONE} onValueChange={(v) => set("project_id", v === NONE ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Sin proyecto" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sin proyecto</SelectItem>
                {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Proceso vinculado</Label>
            <Select value={form.pdc_id || NONE} onValueChange={(v) => set("pdc_id", v === NONE ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Sin proceso" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sin proceso</SelectItem>
                {processes.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.pdc_number} · {p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Responsable del trámite</Label>
            <Select value={form.responsible_user_id || NONE} onValueChange={(v) => set("responsible_user_id", v === NONE ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Sin responsable" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sin responsable</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.full_name ?? u.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Notas</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} placeholder="Observaciones del trámite…" />
          </div>
        </div>

        {permit && <PermitDocumentsSection permitId={permit.id} />}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

