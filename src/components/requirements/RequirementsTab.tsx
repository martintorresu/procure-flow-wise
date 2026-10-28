import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import writeXlsxFile from "write-excel-file/browser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Upload, FileSpreadsheet, FileDown, History, ShieldCheck } from "lucide-react";
import { toCsv } from "@/lib/csv";
import { isOverdue, stageStats, STAGE_STATE_LABELS, type StageState } from "@/lib/requirementsEngine";
import {
  APPLICABILITY_META, DISCLAIMER, MAPPING_LABELS, ORIGIN_LABELS, PRIORITY_LABELS, STATUS_META,
} from "@/lib/requirementLabels";
import { useTenantUsers } from "@/hooks/useTenantUsers";
import type { Process } from "@/types/process";
import {
  fetchProjectEvents, useAddGateReview, useFlow, useGateReviews, useLegalCatalog, useProjectMeta,
  useRequirementDocuments, useRequirementItems, type FlowGate, type RequirementItem,
} from "@/hooks/useProjectRequirementItems";
import { ProcessWizard } from "./ProcessWizard";
import { AddRequirementsDialog } from "./AddRequirementsDialog";
import { RequirementSheet } from "./RequirementSheet";
import { BulkDocumentUpload } from "./BulkDocumentUpload";

type GroupBy = "stage" | "process" | "origin";
const ALL = "__all";

const STATE_BADGE: Record<StageState, string> = {
  empty: "bg-muted text-muted-foreground",
  open: "bg-warning/15 text-warning border-warning/30",
  ready: "bg-primary/15 text-primary border-primary/30",
  approved: "bg-success text-success-foreground",
};

function download(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

export function RequirementsTab({
  projectId, processes, canManage, userId,
}: { projectId: string; processes: Process[]; canManage: boolean; userId: string | undefined }) {
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const { data: meta } = useProjectMeta(projectId);
  const { data: flow } = useFlow();
  const { data: cat } = useLegalCatalog();
  const { data: items = [], isLoading } = useRequirementItems(projectId);
  const { data: docs = [] } = useRequirementDocuments(projectId, items.map((i) => i.id));
  const { data: reviews = [] } = useGateReviews(projectId);
  const { data: users = [] } = useTenantUsers();
  const addGate = useAddGateReview(projectId, meta?.tenant_id);
  const [groupBy, setGroupBy] = useState<GroupBy>("stage");
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState(ALL);
  const [fStage, setFStage] = useState(ALL);
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [gate, setGate] = useState<FlowGate | null>(null);
  const [gateForm, setGateForm] = useState({ answer: "yes", notes: "" });

  const selectedId = params.get("req");
  const selected = items.find((i) => i.id === selectedId) ?? null;
  const setSelected = (id: string | null) => {
    const p = new URLSearchParams(params);
    if (id) p.set("req", id); else p.delete("req");
    setParams(p, { replace: true });
  };

  const levelByCode = useMemo(() => new Map((cat?.requirements ?? []).map((r) => [r.requirement_code, r.requirement_level])), [cat]);
  const procName = useMemo(() => new Map((cat?.processes ?? []).map((p) => [p.process_code, p.name])), [cat]);
  const userName = useMemo(() => new Map(users.map((u) => [u.id, u.full_name || u.email])), [users]);
  const stages = flow?.stages ?? [];
  const stageById = useMemo(() => new Map(stages.map((s) => [s.id, s])), [stages]);
  const docsByReq = useMemo(() => {
    const m = new Map<string, number>();
    docs.forEach((d) => d.is_current && m.set(d.project_requirement_id, (m.get(d.project_requirement_id) ?? 0) + 1));
    return m;
  }, [docs]);
  const levelOf = (i: RequirementItem) => (i.origin_type === "legal" ? levelByCode.get(i.code) : null);

  const kpis = useMemo(() => {
    const appl = items.filter((i) => i.applicability === "applicable");
    const denom = items.length - items.filter((i) => i.applicability === "not_applicable").length;
    const compliant = appl.filter((i) => i.status === "compliant").length;
    return [
      { label: "Aplicables", value: appl.length },
      { label: "En revisión", value: appl.filter((i) => i.status === "in_review").length },
      { label: "Observados", value: appl.filter((i) => i.status === "observed").length },
      { label: "Conformes", value: compliant },
      { label: "Vencidos", value: items.filter((i) => isOverdue(i)).length },
      { label: "Sin responsable", value: appl.filter((i) => !i.owner_user_id && !i.owner_name).length },
      { label: "Sin documento", value: appl.filter((i) => !docsByReq.get(i.id)).length },
      { label: "% de avance", value: `${denom > 0 ? Math.round((compliant / denom) * 100) : 0}%` },
    ];
  }, [items, docsByReq]);

  const stageCards = useMemo(() => stages.map((s) => {
    const gates = (flow?.gates ?? []).filter((g) => g.flow_stage_id === s.id);
    const approved = gates.filter((g) => reviews.some((r) => r.gate_id === g.id)).length;
    const its = items.filter((i) => i.flow_stage_id === s.id).map((i) => ({ ...i, requirement_level: levelOf(i) }));
    return { stage: s, gates, stats: stageStats(its, gates.length, approved) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [stages, flow, reviews, items, levelByCode]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter((i) =>
      (fStage === ALL || (fStage === "none" ? !i.flow_stage_id : i.flow_stage_id === fStage)) &&
      (fStatus === ALL || (fStatus === "overdue" ? isOverdue(i) : fStatus === "review_required" || fStatus === "not_applicable" ? i.applicability === fStatus : i.applicability === "applicable" && i.status === fStatus)) &&
      (!term || i.code.toLowerCase().includes(term) || i.name.toLowerCase().includes(term)));
  }, [items, q, fStatus, fStage]);

  const groups = useMemo(() => {
    const m = new Map<string, { label: string; order: number; rows: RequirementItem[] }>();
    for (const i of filtered) {
      let key: string, label: string, order = 99;
      if (groupBy === "stage") { const s = i.flow_stage_id ? stageById.get(i.flow_stage_id) : null; key = s?.id ?? "none"; label = s ? `${s.code} ${s.name}` : "Sin etapa"; order = s?.sort_order ?? 99; }
      else if (groupBy === "process") { key = i.process_code ?? "none"; label = i.process_code ? `${i.process_code} ${procName.get(i.process_code) ?? ""}` : "Sin trámite"; }
      else { key = i.origin_type; label = ORIGIN_LABELS[i.origin_type]; }
      const g = m.get(key) ?? { label, order, rows: [] };
      g.rows.push(i); m.set(key, g);
    }
    return [...m.values()].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
  }, [filtered, groupBy, stageById, procName]);

  const exportRows = () => [
    ["Código", "Nombre", "Origen", "Vínculo", "Trámite", "Etapa", "Aplicabilidad", "Estado", "Vencido", "Prioridad", "Responsable", "Fecha comprometida", "Fecha cumplimiento", "Folio", "Documentos", "Referencia legal", "Evidencia requerida", "Justificación"],
    ...filtered.map((i) => [
      i.code, i.name, ORIGIN_LABELS[i.origin_type], MAPPING_LABELS[i.mapping_status], i.process_code ?? "",
      i.flow_stage_id ? stageById.get(i.flow_stage_id)?.code ?? "" : "", APPLICABILITY_META[i.applicability].label,
      i.status ? STATUS_META[i.status].label : "", isOverdue(i) ? "Sí" : "", i.priority ? PRIORITY_LABELS[i.priority] ?? i.priority : "",
      i.owner_user_id ? userName.get(i.owner_user_id) ?? "" : i.owner_name ?? "", i.due_date ?? "", i.fulfilled_at ?? "", i.folio ?? "",
      docsByReq.get(i.id) ?? 0, i.legal_reference ?? "", i.evidence_pending ? "Evidencia por definir" : i.evidence_required ?? "", i.justification ?? "",
    ]),
  ];
  const fileBase = `requisitos_${(meta?.name ?? "proyecto").replace(/\W+/g, "_")}`;
  const exportCsv = () => download(`${fileBase}.csv`, toCsv(exportRows() as (string | number)[][]));
  const exportXlsx = async () => {
    const rows = exportRows();
    await writeXlsxFile(rows.map((r, ri) => r.map((v) => ({ value: v as string | number, fontWeight: ri === 0 ? "bold" as const : undefined }))), { fileName: `${fileBase}.xlsx` });
  };
  const exportHistory = async () => {
    try {
      const ev = await fetchProjectEvents(projectId);
      const code = new Map(items.map((i) => [i.id, i.code]));
      download(`${fileBase}_historial.csv`, toCsv([
        ["Fecha", "Usuario", "Requisito", "Acción", "Campo", "Valor anterior", "Valor nuevo", "Justificación", "Regla"],
        ...ev.map((e) => [new Date(e.created_at).toISOString(), userName.get(e.created_by ?? "") ?? e.created_by ?? "", code.get(e.project_requirement_id ?? "") ?? "",
          e.action, e.field ?? "", e.old_value == null ? "" : JSON.stringify(e.old_value), e.new_value == null ? "" : JSON.stringify(e.new_value), e.justification ?? "", e.rule_id ?? ""]),
      ]));
    } catch (e) { toast({ title: "No se pudo exportar", description: (e as Error).message, variant: "destructive" }); }
  };

  useEffect(() => { if (gate) setGateForm({ answer: "yes", notes: "" }); }, [gate]);

  if (isLoading || !meta) return <Skeleton className="h-64 w-full" />;
  const existingKeys = new Set(items.map((i) => `${i.origin_type}:${i.code}`));
  const existingLegal = new Set(items.filter((i) => i.origin_type === "legal").map((i) => i.code));

  return (
    <div className="space-y-4">
      <Alert><ShieldCheck className="h-4 w-4" /><AlertDescription>{DISCLAIMER}</AlertDescription></Alert>

      <ProcessWizard projectId={projectId} tenantId={meta.tenant_id} profile={meta.profile ?? {}} canManage={canManage} existingCodes={existingLegal} />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {kpis.map((k) => (
          <Card key={k.label}><CardContent className="p-3"><p className="text-xs text-muted-foreground">{k.label}</p><p className="text-xl font-bold">{k.value}</p></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Avance por etapa</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {stageCards.map(({ stage, gates, stats }) => (
            <div key={stage.id} className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <button className="font-medium hover:underline" onClick={() => { setGroupBy("stage"); setFStage(stage.id); }}>{stage.code} {stage.name}</button>
                <Badge variant="outline" className={STATE_BADGE[stats.state]}>{STAGE_STATE_LABELS[stats.state]}</Badge>
                <span className="text-xs text-muted-foreground">{stats.compliant}/{stats.total - stats.notApplicable} conformes · {stats.review} en revisión</span>
                <span className="ml-auto font-mono text-xs">{stats.progress}%</span>
              </div>
              <Progress value={stats.progress} className="h-2" />
              <div className="flex flex-wrap gap-1">
                {gates.map((g) => {
                  const r = reviews.find((x) => x.gate_id === g.id);
                  return (
                    <Button key={g.id} size="sm" variant={r ? "secondary" : "outline"} className="h-6 px-2 text-xs"
                      disabled={!canManage && !r} onClick={() => setGate(g)} title={g.question ?? ""}>
                      {g.code}{r ? ` · ${r.answer === "yes" ? "Sí" : "No"} ${new Date(r.reviewed_at).toLocaleDateString("es-CL")}` : ""}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="mr-auto text-base">Checklist ({filtered.length})</CardTitle>
            {canManage && <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="mr-1 h-4 w-4" />Agregar requisitos</Button>}
            {(canManage || items.some((i) => i.owner_user_id === userId)) && <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}><Upload className="mr-1 h-4 w-4" />Carga documental</Button>}
            <Button size="sm" variant="outline" onClick={exportXlsx}><FileSpreadsheet className="mr-1 h-4 w-4" />Excel</Button>
            <Button size="sm" variant="outline" onClick={exportCsv}><FileDown className="mr-1 h-4 w-4" />CSV</Button>
            <Button size="sm" variant="ghost" onClick={exportHistory}><History className="mr-1 h-4 w-4" />Historial</Button>
          </div>
          <div className="grid gap-2 pt-2 sm:grid-cols-4">
            <Input placeholder="Buscar código o nombre" value={q} onChange={(e) => setQ(e.target.value)} />
            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="stage">Agrupar por etapa</SelectItem><SelectItem value="process">Agrupar por trámite</SelectItem><SelectItem value="origin">Agrupar por origen</SelectItem></SelectContent>
            </Select>
            <Select value={fStage} onValueChange={setFStage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas las etapas</SelectItem>
                {stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.code} {s.name}</SelectItem>)}
                <SelectItem value="none">Sin etapa</SelectItem>
              </SelectContent>
            </Select>
            <Select value={fStatus} onValueChange={setFStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los estados</SelectItem>
                {Object.entries(STATUS_META).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}
                <SelectItem value="review_required">Revisión requerida</SelectItem>
                <SelectItem value="not_applicable">No aplica</SelectItem>
                <SelectItem value="overdue">Vencidos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Aún no hay requisitos. Completa el perfil y confirma los trámites para recibir la propuesta.</p>}
          {groups.map((g) => (
            <div key={g.label}>
              <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{g.label} · {g.rows.length}</p>
              <ul className="divide-y rounded border">
                {g.rows.map((i) => {
                  const st = i.applicability === "applicable" && i.status ? STATUS_META[i.status] : APPLICABILITY_META[i.applicability];
                  return (
                    <li key={i.id}>
                      <button className="flex w-full flex-wrap items-center gap-2 p-2 text-left text-sm hover:bg-muted/40" onClick={() => setSelected(i.id)}>
                        <span className="w-20 font-mono text-xs">{i.code}</span>
                        <span className="min-w-[180px] flex-1">{i.name}</span>
                        {i.mapping_status === "pending_validation" && <Badge variant="outline" className="text-xs">Pendiente de validación</Badge>}
                        {isOverdue(i) && <Badge variant="destructive" className="text-xs">Vencido</Badge>}
                        <span className="text-xs text-muted-foreground">{i.owner_user_id ? userName.get(i.owner_user_id) : i.owner_name ?? "Sin responsable"}</span>
                        <span className="text-xs text-muted-foreground">{docsByReq.get(i.id) ?? 0} doc.</span>
                        <Badge variant="outline" className={st.badge}>{st.label}</Badge>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      <AddRequirementsDialog open={addOpen} onOpenChange={setAddOpen} projectId={projectId} tenantId={meta.tenant_id}
        municipalityId={meta.municipality_id} profile={meta.profile ?? {}} existingKeys={existingKeys} />
      <BulkDocumentUpload open={bulkOpen} onOpenChange={setBulkOpen} projectId={projectId} tenantId={meta.tenant_id}
        items={canManage ? items : items.filter((i) => i.owner_user_id === userId)} />
      <RequirementSheet item={selected} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} docs={docs} stages={stages}
        processes={processes} canManage={canManage} userId={userId} tenantId={meta.tenant_id} />

      <Dialog open={!!gate} onOpenChange={(o) => !o && setGate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gate {gate?.code}</DialogTitle>
            <DialogDescription>{gate?.question}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            {reviews.filter((r) => r.gate_id === gate?.id).map((r) => (
              <p key={r.id} className="text-xs text-muted-foreground">
                {new Date(r.reviewed_at).toLocaleString("es-CL")} · {userName.get(r.created_by ?? "") ?? ""}: {r.answer === "yes" ? "Sí" : "No"} {r.notes ? `— ${r.notes}` : ""}
              </p>
            ))}
            {canManage && (
              <>
                <Select value={gateForm.answer} onValueChange={(v) => setGateForm({ ...gateForm, answer: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Sí {gate?.route_yes ? `→ ${gate.route_yes}` : ""}</SelectItem>
                    <SelectItem value="no">No {gate?.route_no ? `→ ${gate.route_no}` : ""}</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea placeholder="Notas" value={gateForm.notes} onChange={(e) => setGateForm({ ...gateForm, notes: e.target.value })} />
              </>
            )}
          </div>
          {canManage && (
            <DialogFooter>
              <Button onClick={async () => {
                try { await addGate.mutateAsync({ gate_id: gate!.id, answer: gateForm.answer, notes: gateForm.notes }); toast({ title: "Gate registrado" }); setGate(null); }
                catch (e) { toast({ title: "No se pudo registrar", description: (e as Error).message, variant: "destructive" }); }
              }} disabled={addGate.isPending}>Registrar aprobación</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
