import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, Upload, Download } from "lucide-react";
import {
  APPLICABILITY_META, DOC_REVIEW_LABELS, MAPPING_LABELS, ORIGIN_LABELS, PRIORITY_LABELS, STATUS_META, nextStatuses,
  type ReqApplicability, type ReqStatus,
} from "@/lib/requirementLabels";
import { REQUIREMENT_FILE_ACCEPT, validateRequirementFile } from "@/lib/requirementFiles";
import { isOverdue } from "@/lib/requirementsEngine";
import { useTenantUsers } from "@/hooks/useTenantUsers";
import { useProcessStagesByProcess } from "@/hooks/useProcessStages";
import type { Process } from "@/types/process";
import {
  reqKeys, signedDocumentUrl, uploadRequirementDocument, useAddRequirementComment, useRequirementEvents,
  useReviewDocument, useUpdateRequirementItem, type FlowStage, type RequirementDocument, type RequirementItem,
} from "@/hooks/useProjectRequirementItems";

const NONE = "__none";
const FIELD_LABELS: Record<string, string> = {
  applicability: "Aplicabilidad", status: "Estado", owner_user_id: "Responsable", owner_name: "Responsable externo", owner_email: "Correo responsable externo", justification: "Justificación", due_date: "Fecha comprometida",
  fulfilled_at: "Fecha de cumplimiento", flow_stage_id: "Etapa", priority: "Prioridad", mapping_status: "Vínculo", folio: "Folio",
  link_url: "Enlace", notes: "Observaciones", process_id: "Proceso", stage_id: "Etapa del proceso", observation_reason: "Motivo",
  corrective_action: "Acción correctiva", evidence_required: "Evidencia", code: "Código", name: "Nombre", review_status: "Revisión",
};

function fmtVal(field: string | null, v: unknown) {
  if (v == null || v === "") return "—";
  if (field === "status") return STATUS_META[v as ReqStatus]?.label ?? String(v);
  if (field === "applicability") return APPLICABILITY_META[v as ReqApplicability]?.label ?? String(v);
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export function RequirementSheet({
  item, open, onOpenChange, docs, stages, processes, canManage, userId, tenantId, onSaved,
}: {
  item: RequirementItem | null; open: boolean; onOpenChange: (o: boolean) => void; docs: RequirementDocument[];
  stages: FlowStage[]; processes: Process[]; canManage: boolean; userId: string | undefined; tenantId: string; onSaved?: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const update = useUpdateRequirementItem(item?.project_id);
  const review = useReviewDocument(item?.project_id);
  const comment = useAddRequirementComment(item?.project_id, tenantId);
  const { data: events = [] } = useRequirementEvents(item?.id);
  const { data: users = [] } = useTenantUsers();
  const [form, setForm] = useState<Partial<RequirementItem>>({});
  const [target, setTarget] = useState<ReqStatus | "">("");
  const [just, setJust] = useState("");
  const [obs, setObs] = useState({ reason: "", action: "", due: "" });
  const [newComment, setNewComment] = useState("");
  const [meta, setMeta] = useState({ document_type: "", issuer: "", folio: "", issued_at: "", expires_at: "" });
  const [uploading, setUploading] = useState(false);
  const [approveDoc, setApproveDoc] = useState<RequirementDocument | null>(null);
  const [observeDoc, setObserveDoc] = useState<RequirementDocument | null>(null);
  const [obsForm, setObsForm] = useState({ reason: "", action: "", owner: NONE, ownerName: "", due: "" });
  const { data: stagesByProcess } = useProcessStagesByProcess([form.process_id ?? null]);

  useEffect(() => {
    if (item) setForm(item);
    setTarget(""); setJust(""); setObs({ reason: "", action: "", due: "" });
    setApproveDoc(null); setObserveDoc(null);
    if (item) setObsForm({ reason: item.observation_reason ?? "", action: item.corrective_action ?? "", owner: item.owner_user_id ?? NONE, ownerName: item.owner_name ?? "", due: "" });
  }, [item]);

  const userName = useMemo(() => new Map(users.map((u) => [u.id, u.full_name || u.email])), [users]);
  if (!item) return null;

  const isOwner = item.owner_user_id === userId;
  const canEditOps = canManage || isOwner;
  const myDocs = docs.filter((d) => d.project_requirement_id === item.id).sort((a, b) => b.version - a.version);
  const stageOptions = stagesByProcess?.get(form.process_id ?? "") ?? [];

  const run = async (patch: Partial<RequirementItem>, ok: string) => {
    try { await update.mutateAsync({ id: item.id, patch }); toast({ title: ok }); onSaved?.(); return true; }
    catch (e) { toast({ title: "No se pudo guardar", description: (e as Error).message, variant: "destructive" }); return false; }
  };

  const saveFields = () => {
    const keys: (keyof RequirementItem)[] = canManage
      ? ["applicability", "justification", "owner_user_id", "owner_name", "owner_email", "due_date", "flow_stage_id", "priority", "folio", "link_url", "notes", "process_id", "stage_id", "mapping_status"]
      : ["folio", "link_url", "notes"];
    const patch: Record<string, unknown> = {};
    keys.forEach((k) => { if (form[k] !== item[k]) patch[k] = form[k] === "" ? null : form[k]; });
    if (!Object.keys(patch).length) { onSaved?.(); return; }
    const email = (form.owner_email ?? "").trim();
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast({ title: "El correo del responsable externo no es válido", variant: "destructive" }); return;
    }
    if (patch.applicability === "not_applicable" && !(form.justification ?? "").trim()) {
      toast({ title: "«No aplica» exige justificación", variant: "destructive" }); return;
    }
    void run(patch as Partial<RequirementItem>, "Requisito actualizado");
  };

  const changeStatus = async () => {
    if (!target) return;
    const patch: Partial<RequirementItem> = { status: target };
    if (just.trim()) patch.justification = just.trim();
    if (target === "observed") Object.assign(patch, { observation_reason: obs.reason, corrective_action: obs.action, due_date: obs.due || null });
    if (await run(patch, `Estado: ${STATUS_META[target].label}`)) { setTarget(""); setJust(""); }
  };

  const onUpload = async (files: FileList | null, replacesId?: string) => {
    if (!files?.length) return;
    if (item.applicability === "review_required") {
      toast({ title: "Primero indica si este requisito Aplica o No aplica", variant: "destructive" }); return;
    }
    setUploading(true);
    let ok = 0;
    try {
      for (const f of Array.from(files)) {
        const err = validateRequirementFile(f);
        if (err) { toast({ title: f.name, description: err, variant: "destructive" }); continue; }
        await uploadRequirementDocument({ tenantId, projectId: item.project_id, req: item, file: f, meta, replacesId });
        ok++;
      }
      qc.invalidateQueries({ queryKey: reqKeys.docs(item.project_id) });
      qc.invalidateQueries({ queryKey: reqKeys.items(item.project_id) });
      qc.invalidateQueries({ queryKey: reqKeys.events(item.id) });
      if (ok) { toast({ title: ok > 1 ? `${ok} documentos cargados` : "Documento cargado" }); onSaved?.(); }
    } catch (e) {
      toast({ title: "No se pudo cargar", description: (e as Error).message, variant: "destructive" });
    } finally { setUploading(false); }
  };

  const doApprove = async () => {
    if (!approveDoc) return;
    try {
      await review.mutateAsync({ id: approveDoc.id, review_status: "approved" });
      toast({ title: "Documento aprobado · requisito Conforme" }); setApproveDoc(null); onSaved?.();
    } catch (e) { toast({ title: "No se pudo aprobar", description: (e as Error).message, variant: "destructive" }); }
  };

  const obsValid = !!obsForm.reason.trim() && !!obsForm.action.trim() && (obsForm.owner !== NONE || !!obsForm.ownerName.trim()) && !!obsForm.due;
  const doObserve = async () => {
    if (!observeDoc) return;
    if (!obsValid) { toast({ title: "Completa motivo, acción correctiva, responsable y nueva fecha", variant: "destructive" }); return; }
    try {
      await update.mutateAsync({ id: item.id, patch: {
        observation_reason: obsForm.reason.trim(), corrective_action: obsForm.action.trim(), due_date: obsForm.due,
        owner_user_id: obsForm.owner === NONE ? null : obsForm.owner, owner_name: obsForm.owner === NONE ? obsForm.ownerName.trim() : null,
      } });
      await review.mutateAsync({ id: observeDoc.id, review_status: "observed" });
      qc.invalidateQueries({ queryKey: reqKeys.items(item.project_id) });
      toast({ title: "Documento observado · requisito Observado" }); setObserveDoc(null); onSaved?.();
    } catch (e) { toast({ title: "No se pudo observar", description: (e as Error).message, variant: "destructive" }); }
  };

  const open_ = async (d: RequirementDocument) => {
    try { window.open(await signedDocumentUrl(d.file_path), "_blank", "noopener"); }
    catch (e) { toast({ title: "No se pudo abrir", description: (e as Error).message, variant: "destructive" }); }
  };

  const statusOptions = item.applicability === "applicable" && item.status ? nextStatuses(item.status, canManage) : [];
  const needsJust = (target === "compliant" && !myDocs.some((d) => d.is_current && d.review_status === "approved")) || (target === "observed" && item.status === "compliant");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm">{item.code}</span> {item.name}
          </SheetTitle>
          <SheetDescription className="flex flex-wrap gap-2">
            <Badge variant="outline">{ORIGIN_LABELS[item.origin_type]}</Badge>
            <Badge variant="outline">{MAPPING_LABELS[item.mapping_status]}</Badge>
            <Badge variant="outline" className={APPLICABILITY_META[item.applicability].badge}>{APPLICABILITY_META[item.applicability].label}</Badge>
            {item.status && <Badge variant="outline" className={STATUS_META[item.status].badge}>{STATUS_META[item.status].label}</Badge>}
            {isOverdue(item) && <Badge variant="destructive">Vencido</Badge>}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4 text-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            <div><span className="text-muted-foreground">Trámite:</span> {item.process_code ?? "—"}</div>
            <div><span className="text-muted-foreground">Versión de origen:</span> {item.origin_version ?? "—"}</div>
            <div className="sm:col-span-2"><span className="text-muted-foreground">Referencia legal:</span> {item.legal_reference ?? "—"}</div>
            <div className="sm:col-span-2 rounded-md border border-primary/30 bg-primary/5 p-3">
              <p className="text-xs font-semibold uppercase text-primary">Evidencia requerida</p>
              <p className="mt-1">{item.evidence_pending || !item.evidence_required ? <span className="italic">Evidencia por definir</span> : item.evidence_required}</p>
            </div>
            {item.justification && (
              <div className="sm:col-span-2 rounded border bg-muted/40 p-2"><span className="text-muted-foreground">Justificación:</span> {item.justification}</div>
            )}
            {item.rule_id && <div className="sm:col-span-2 text-xs text-muted-foreground">Regla {item.rule_id}: {item.rule_explanation}</div>}
            {item.status === "observed" && (
              <div className="sm:col-span-2 rounded border border-destructive/40 p-2 text-xs">
                <b>Observado:</b> {item.observation_reason} · <b>Acción:</b> {item.corrective_action}
              </div>
            )}
          </div>

          {statusOptions.length > 0 && (
            <div className="space-y-2 rounded border p-3">
              <Label>Cambiar estado</Label>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((s) => (
                  <Button key={s} size="sm" variant={target === s ? "default" : "outline"} onClick={() => setTarget(s)}>{STATUS_META[s].label}</Button>
                ))}
              </div>
              {target === "observed" && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Textarea placeholder="Motivo" value={obs.reason} onChange={(e) => setObs({ ...obs, reason: e.target.value })} />
                  <Textarea placeholder="Acción correctiva" value={obs.action} onChange={(e) => setObs({ ...obs, action: e.target.value })} />
                  <div className="space-y-1"><Label className="text-xs">Nueva fecha comprometida</Label><Input type="date" value={obs.due} onChange={(e) => setObs({ ...obs, due: e.target.value })} /></div>
                  <p className="text-xs text-muted-foreground self-end">Requiere responsable asignado.</p>
                </div>
              )}
              {needsJust && <Textarea placeholder="Justificación (obligatoria)" value={just} onChange={(e) => setJust(e.target.value)} />}
              {target && <Button size="sm" onClick={changeStatus} disabled={update.isPending || (needsJust && !just.trim())}>Confirmar cambio</Button>}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {canManage && (
              <>
                <div className="space-y-1"><Label>Aplicabilidad</Label>
                  <Select value={form.applicability} onValueChange={(v) => setForm({ ...form, applicability: v as ReqApplicability })}>
                    <SelectTrigger aria-label="Aplicabilidad"><SelectValue placeholder="Aplicabilidad">{form.applicability ? APPLICABILITY_META[form.applicability].label : undefined}</SelectValue></SelectTrigger>
                    <SelectContent>{Object.entries(APPLICABILITY_META).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Etapa del flujo</Label>
                  <Select value={form.flow_stage_id ?? NONE} onValueChange={(v) => setForm({ ...form, flow_stage_id: v === NONE ? null : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value={NONE}>Sin etapa</SelectItem>{stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.code} {s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {(form.applicability !== item.applicability || form.applicability === "not_applicable") && (
                  <div className="sm:col-span-2 space-y-1"><Label>Justificación{form.applicability === "not_applicable" ? " (obligatoria para «No aplica»)" : " (opcional)"}</Label>
                    <Textarea value={form.justification ?? ""} onChange={(e) => setForm({ ...form, justification: e.target.value })} />
                  </div>
                )}
                <div className="space-y-1"><Label>Responsable (usuario)</Label>
                  <Select value={form.owner_user_id ?? NONE} onValueChange={(v) => setForm({ ...form, owner_user_id: v === NONE ? null : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value={NONE}>Sin usuario</SelectItem>{users.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Responsable externo (nombre)</Label><Input value={form.owner_name ?? ""} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} /></div>
                <div className="space-y-1"><Label>Correo responsable externo (opcional)</Label><Input type="email" placeholder="nombre@empresa.cl" value={form.owner_email ?? ""} onChange={(e) => setForm({ ...form, owner_email: e.target.value })} /></div>
                <div className="space-y-1"><Label>Fecha comprometida</Label><Input type="date" value={form.due_date ?? ""} onChange={(e) => setForm({ ...form, due_date: e.target.value || null })} /></div>
                <div className="space-y-1"><Label>Prioridad</Label>
                  <Select value={form.priority ?? NONE} onValueChange={(v) => setForm({ ...form, priority: v === NONE ? null : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value={NONE}>Sin prioridad</SelectItem>{Object.entries(PRIORITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {item.mapping_status === "pending_validation" && (
                  <div className="space-y-1 sm:col-span-2"><Label>Vínculo sugerido {item.suggested_code ? `(${item.suggested_code})` : ""}</Label>
                    <Select value={form.mapping_status} onValueChange={(v) => setForm({ ...form, mapping_status: v as RequirementItem["mapping_status"] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(MAPPING_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1"><Label>Proceso vinculado</Label>
                  <Select value={form.process_id ?? NONE} onValueChange={(v) => setForm({ ...form, process_id: v === NONE ? null : v, stage_id: null })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value={NONE}>Sin proceso</SelectItem>{processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.process_number} {p.title}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Etapa del proceso</Label>
                  <Select value={form.stage_id ?? NONE} onValueChange={(v) => setForm({ ...form, stage_id: v === NONE ? null : v })} disabled={!form.process_id}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value={NONE}>Sin etapa</SelectItem>{stageOptions.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </>
            )}
            {!canManage && (
              <div className="sm:col-span-2 text-xs text-muted-foreground">
                Responsable: {item.owner_user_id ? userName.get(item.owner_user_id) : item.owner_name ?? "—"}{item.owner_email ? ` (${item.owner_email})` : ""} · Fecha comprometida: {item.due_date ?? "—"}
              </div>
            )}
            <div className="space-y-1"><Label>Folio</Label><Input value={form.folio ?? ""} disabled={!canEditOps} onChange={(e) => setForm({ ...form, folio: e.target.value })} /></div>
            <div className="space-y-1"><Label>Fecha de cumplimiento</Label><Input type="date" value={item.fulfilled_at ?? ""} disabled readOnly /><p className="text-xs text-muted-foreground">Se registra sola al quedar Conforme.</p></div>
            <div className="space-y-1 sm:col-span-2"><Label>Enlace</Label><Input value={form.link_url ?? ""} disabled={!canEditOps} onChange={(e) => setForm({ ...form, link_url: e.target.value })} /></div>
            <div className="space-y-1 sm:col-span-2"><Label>Observaciones</Label><Textarea value={form.notes ?? ""} disabled={!canEditOps} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          {canEditOps && <div className="flex justify-end"><Button size="sm" onClick={saveFields} disabled={update.isPending}>Guardar cambios</Button></div>}

          <Separator />
          <div className="space-y-2">
            <h3 className="font-semibold">Documentos</h3>
            {canEditOps && item.applicability === "review_required" && (
              <p className="rounded border border-warning/40 bg-warning/10 p-2 text-xs">Primero indica si este requisito Aplica o No aplica</p>
            )}
            {canEditOps && item.applicability !== "review_required" && (
              <div className="space-y-2 rounded border p-3">
                <div className="grid gap-2 sm:grid-cols-3">
                  <Input placeholder="Tipo documental" value={meta.document_type} onChange={(e) => setMeta({ ...meta, document_type: e.target.value })} />
                  <Input placeholder="Emisor" value={meta.issuer} onChange={(e) => setMeta({ ...meta, issuer: e.target.value })} />
                  <Input placeholder="Folio" value={meta.folio} onChange={(e) => setMeta({ ...meta, folio: e.target.value })} />
                  <div><Label className="text-xs">Emisión</Label><Input type="date" value={meta.issued_at} onChange={(e) => setMeta({ ...meta, issued_at: e.target.value })} /></div>
                  <div><Label className="text-xs">Vencimiento</Label><Input type="date" value={meta.expires_at} onChange={(e) => setMeta({ ...meta, expires_at: e.target.value })} /></div>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-primary">
                  <Upload className="h-4 w-4" /> {uploading ? "Cargando…" : "Subir documentos (PDF, JPG, PNG, DOCX, XLSX, DWG · máx. 25 MB)"}
                  <input type="file" multiple className="hidden" accept={REQUIREMENT_FILE_ACCEPT} disabled={uploading} onChange={(e) => { void onUpload(e.target.files); e.target.value = ""; }} />
                </label>
              </div>
            )}
            {myDocs.length === 0 && <p className="text-xs text-muted-foreground">Sin documentos.</p>}
            {myDocs.map((d) => (
              <div key={d.id} className={`flex flex-wrap items-center gap-2 rounded border p-2 ${d.is_current ? "" : "opacity-60"}`}>
                <FileText className="h-4 w-4" />
                <span className="min-w-0 flex-1 truncate">{d.file_name}</span>
                <Badge variant="outline">v{d.version}{d.is_current ? "" : " · anterior"}</Badge>
                <Badge variant="outline">{DOC_REVIEW_LABELS[d.review_status]}</Badge>
                <span className="text-xs text-muted-foreground">{userName.get(d.created_by ?? "") ?? ""} · {new Date(d.created_at).toLocaleDateString("es-CL")}</span>
                <Button size="icon" variant="ghost" onClick={() => open_(d)} aria-label="Abrir"><Download className="h-4 w-4" /></Button>
                {canManage && d.is_current && d.review_status === "in_review" && (
                  <>
                    <Button size="sm" onClick={() => setApproveDoc(d)}>Aprobar</Button>
                    <Button size="sm" variant="destructive" onClick={() => setObserveDoc(observeDoc?.id === d.id ? null : d)}>Observar</Button>
                  </>
                )}
                {canEditOps && d.is_current && (
                  <label className="cursor-pointer text-xs text-primary">
                    Reemplazar
                    <input type="file" className="hidden" accept={REQUIREMENT_FILE_ACCEPT} onChange={(e) => { void onUpload(e.target.files, d.id); e.target.value = ""; }} />
                  </label>
                )}
                {observeDoc?.id === d.id && (
                  <div className="basis-full space-y-2 rounded border border-destructive/40 p-3">
                    <p className="text-sm font-semibold">Observar documento (todos los campos son obligatorios)</p>
                    <Textarea placeholder="Motivo de la observación" value={obsForm.reason} onChange={(e) => setObsForm({ ...obsForm, reason: e.target.value })} />
                    <Textarea placeholder="Acción correctiva" value={obsForm.action} onChange={(e) => setObsForm({ ...obsForm, action: e.target.value })} />
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Select value={obsForm.owner} onValueChange={(v) => setObsForm({ ...obsForm, owner: v })}>
                        <SelectTrigger aria-label="Responsable"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value={NONE}>Responsable externo…</SelectItem>{users.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input placeholder="Nombre responsable externo" disabled={obsForm.owner !== NONE} value={obsForm.ownerName} onChange={(e) => setObsForm({ ...obsForm, ownerName: e.target.value })} />
                      <Input type="date" aria-label="Nueva fecha comprometida" min={new Date().toISOString().slice(0, 10)} value={obsForm.due} onChange={(e) => setObsForm({ ...obsForm, due: e.target.value })} />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => setObserveDoc(null)}>Cancelar</Button>
                      <Button size="sm" variant="destructive" disabled={!obsValid || update.isPending || review.isPending} onClick={doObserve}>Guardar observación</Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <Separator />
          <div className="space-y-2">
            <h3 className="font-semibold">Comentarios e historial</h3>
            <div className="flex gap-2">
              <Input placeholder="Escribe un comentario" value={newComment} onChange={(e) => setNewComment(e.target.value)} />
              <Button size="sm" disabled={!newComment.trim()} onClick={async () => { await comment.mutateAsync({ reqId: item.id, text: newComment.trim() }); setNewComment(""); }}>Enviar</Button>
            </div>
            <ul className="space-y-1 text-xs">
              {events.map((e) => (
                <li key={e.id} className="rounded bg-muted/40 p-2">
                  <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString("es-CL")} · {userName.get(e.created_by ?? "") ?? "Sistema"}: </span>
                  {e.action === "comment" ? <span>💬 {String(e.new_value)}</span>
                    : e.action === "create" ? <span>Requisito activado</span>
                    : e.action === "document_uploaded" ? <span>Documento cargado: {(e.new_value as { file_name?: string })?.file_name}</span>
                    : e.action === "document_reviewed" ? <span>Documento {(e.new_value as { file_name?: string })?.file_name}: {DOC_REVIEW_LABELS[(e.new_value as { review_status?: string })?.review_status ?? ""]}</span>
                    : <span>{FIELD_LABELS[e.field ?? ""] ?? e.field}: {fmtVal(e.field, e.old_value)} → {fmtVal(e.field, e.new_value)}</span>}
                  {e.justification && <span className="block italic">Justificación: {e.justification}</span>}
                  {e.rule_id && <span className="block text-muted-foreground">Regla: {e.rule_id}</span>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SheetContent>
      <AlertDialog open={!!approveDoc} onOpenChange={(o) => !o && setApproveDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar cambio</AlertDialogTitle>
            <AlertDialogDescription>Se aprobará «{approveDoc?.file_name}» y el requisito {item.code} quedará Conforme, con fecha de cumplimiento de hoy.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); void doApprove(); }} disabled={review.isPending}>Confirmar cambio</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
