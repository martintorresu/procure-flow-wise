import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
  applicability: "Aplicabilidad", status: "Estado", owner_user_id: "Responsable", owner_name: "Responsable", due_date: "Fecha comprometida",
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
  item, open, onOpenChange, docs, stages, processes, canManage, userId, tenantId,
}: {
  item: RequirementItem | null; open: boolean; onOpenChange: (o: boolean) => void; docs: RequirementDocument[];
  stages: FlowStage[]; processes: Process[]; canManage: boolean; userId: string | undefined; tenantId: string;
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
  const { data: stagesByProcess = {} } = useProcessStagesByProcess([form.process_id ?? null]);

  useEffect(() => {
    if (item) setForm(item);
    setTarget(""); setJust(""); setObs({ reason: "", action: "", due: "" });
  }, [item]);

  const userName = useMemo(() => new Map(users.map((u) => [u.id, u.full_name || u.email])), [users]);
  if (!item) return null;

  const isOwner = item.owner_user_id === userId;
  const canEditOps = canManage || isOwner;
  const myDocs = docs.filter((d) => d.project_requirement_id === item.id).sort((a, b) => b.version - a.version);
  const stageOptions = (stagesByProcess as Record<string, { id: string; name: string }[]>)[form.process_id ?? ""] ?? [];

  const run = async (patch: Partial<RequirementItem>, ok: string) => {
    try { await update.mutateAsync({ id: item.id, patch }); toast({ title: ok }); return true; }
    catch (e) { toast({ title: "No se pudo guardar", description: (e as Error).message, variant: "destructive" }); return false; }
  };

  const saveFields = () => {
    const keys: (keyof RequirementItem)[] = canManage
      ? ["applicability", "justification", "owner_user_id", "owner_name", "due_date", "fulfilled_at", "flow_stage_id", "priority", "folio", "link_url", "notes", "process_id", "stage_id", "mapping_status"]
      : ["folio", "link_url", "notes", "fulfilled_at"];
    const patch: Record<string, unknown> = {};
    keys.forEach((k) => { if (form[k] !== item[k]) patch[k] = form[k] === "" ? null : form[k]; });
    if (!Object.keys(patch).length) return;
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
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        const err = validateRequirementFile(f);
        if (err) { toast({ title: f.name, description: err, variant: "destructive" }); continue; }
        await uploadRequirementDocument({ tenantId, projectId: item.project_id, req: item, file: f, meta, replacesId });
      }
      toast({ title: "Documento cargado" });
      qc.invalidateQueries({ queryKey: reqKeys.docs(item.project_id) });
      qc.invalidateQueries({ queryKey: reqKeys.items(item.project_id) });
      qc.invalidateQueries({ queryKey: reqKeys.events(item.id) });
    } catch (e) {
      toast({ title: "No se pudo cargar", description: (e as Error).message, variant: "destructive" });
    } finally { setUploading(false); }
  };

  const open_ = async (d: RequirementDocument) => {
    try { window.open(await signedDocumentUrl(d.file_path), "_blank", "noopener"); }
    catch (e) { toast({ title: "No se pudo abrir", description: (e as Error).message, variant: "destructive" }); }
  };

  const statusOptions = item.applicability === "applicable" && item.status ? nextStatuses(item.status, canManage) : [];
  const needsJust = target === "compliant" && !myDocs.some((d) => d.is_current && d.review_status === "approved") || (target === "observed" && item.status === "compliant");

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
            <div className="sm:col-span-2"><span className="text-muted-foreground">Evidencia requerida:</span>{" "}
              {item.evidence_pending || !item.evidence_required ? <span className="italic">Evidencia por definir</span> : item.evidence_required}</div>
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
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(APPLICABILITY_META).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Etapa del flujo</Label>
                  <Select value={form.flow_stage_id ?? NONE} onValueChange={(v) => setForm({ ...form, flow_stage_id: v === NONE ? null : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value={NONE}>Sin etapa</SelectItem>{stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.code} {s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {form.applicability !== item.applicability && (
                  <div className="sm:col-span-2 space-y-1"><Label>Justificación del cambio</Label>
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
                Responsable: {item.owner_user_id ? userName.get(item.owner_user_id) : item.owner_name ?? "—"} · Fecha comprometida: {item.due_date ?? "—"}
              </div>
            )}
            <div className="space-y-1"><Label>Folio</Label><Input value={form.folio ?? ""} disabled={!canEditOps} onChange={(e) => setForm({ ...form, folio: e.target.value })} /></div>
            <div className="space-y-1"><Label>Fecha de cumplimiento</Label><Input type="date" value={form.fulfilled_at ?? ""} disabled={!canEditOps} onChange={(e) => setForm({ ...form, fulfilled_at: e.target.value || null })} /></div>
            <div className="space-y-1 sm:col-span-2"><Label>Enlace</Label><Input value={form.link_url ?? ""} disabled={!canEditOps} onChange={(e) => setForm({ ...form, link_url: e.target.value })} /></div>
            <div className="space-y-1 sm:col-span-2"><Label>Observaciones</Label><Textarea value={form.notes ?? ""} disabled={!canEditOps} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          {canEditOps && <div className="flex justify-end"><Button size="sm" onClick={saveFields} disabled={update.isPending}>Guardar cambios</Button></div>}

          <Separator />
          <div className="space-y-2">
            <h3 className="font-semibold">Documentos</h3>
            {canEditOps && (
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
                    <Button size="sm" variant="outline" onClick={() => review.mutate({ id: d.id, review_status: "approved" })}>Aprobar</Button>
                    <Button size="sm" variant="outline" onClick={() => review.mutate({ id: d.id, review_status: "observed" })}>Observar</Button>
                  </>
                )}
                {canEditOps && d.is_current && (
                  <label className="cursor-pointer text-xs text-primary">
                    Reemplazar
                    <input type="file" className="hidden" accept={REQUIREMENT_FILE_ACCEPT} onChange={(e) => { void onUpload(e.target.files, d.id); e.target.value = ""; }} />
                  </label>
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
    </Sheet>
  );
}
