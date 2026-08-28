import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CalendarDays, Flag, ListChecks, ExternalLink, Layers } from "lucide-react";
import { useProcessStages, useUpdateStageStatus, STAGE_STATUS_META, type ProcessStage, type StageStatus } from "@/hooks/useProcessStages";
import { useStageCommitments, type StageCommitment } from "@/hooks/useStageCommitments";
import { dueMeta, statusMeta } from "@/lib/commitments";
import { formatDate } from "@/lib/stageLabels";

type QuickFilter = "todos" | "pendiente" | "cumplido" | "vencido";

const QUICK_FILTERS: { value: QuickFilter; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "pendiente", label: "Pendientes" },
  { value: "cumplido", label: "Cumplidos" },
  { value: "vencido", label: "Vencidos" },
];

function matchesFilter(c: StageCommitment, f: QuickFilter): boolean {
  if (f === "todos") return true;
  if (f === "cumplido") return c.status === "completado";
  if (f === "vencido") return dueMeta(c.due_date, c.status).overdue;
  return c.status === "pendiente" || c.status === "en_progreso";
}

function groupByMeeting(items: StageCommitment[]) {
  const map = new Map<string, { key: string; title: string; date: string | null; sessionId: string | null; items: StageCommitment[] }>();
  for (const c of items) {
    const key = c.meeting_session_id ?? `${c.meeting_date ?? "sin-fecha"}|${c.meeting_title ?? ""}`;
    const g = map.get(key) ?? {
      key,
      title: c.meeting_title ?? "Reunión sin título",
      date: c.meeting_date,
      sessionId: c.meeting_session_id,
      items: [] as StageCommitment[],
    };
    g.items.push(c);
    map.set(key, g);
  }
  return [...map.values()].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

function StageCommitmentsBlock({ commitments }: { commitments: StageCommitment[] }) {
  if (!commitments.length) {
    return <p className="text-sm text-muted-foreground">Sin compromisos vinculados a esta etapa.</p>;
  }
  return (
    <div className="space-y-4">
      {groupByMeeting(commitments).map((g) => (
        <div key={g.key} className="rounded-lg border border-border">
          <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{g.title}</p>
              <p className="text-xs text-muted-foreground">
                <CalendarDays className="mr-1 inline h-3 w-3" />
                {g.date ? formatDate(g.date) : "Sin fecha"}
              </p>
            </div>
            <Link
              to={g.sessionId ? `/commitments?session=${g.sessionId}` : "/commitments"}
              className="shrink-0 text-xs text-primary hover:underline"
            >
              Ver minuta <ExternalLink className="ml-0.5 inline h-3 w-3" />
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {g.items.map((c) => {
              const due = dueMeta(c.due_date, c.status);
              const meta = statusMeta(c.status);
              return (
                <li key={c.id} className={`px-3 py-2 ${due.overdue ? "bg-danger/5" : ""}`}>
                  <p className="text-sm font-medium">{c.commitment_text}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{c.responsible_name || (c.responsible_user_id ? "Usuario vinculado" : "Sin responsable")}</span>
                    <span>·</span>
                    <span>{c.due_date ? formatDate(c.due_date) : "Sin fecha"}</span>
                    <span className={due.className}>{due.label}</span>
                    <Badge variant="outline" className={`text-[10px] ${meta.className}`}>{meta.label}</Badge>
                    {c.activity_ref && (
                      <Badge variant="outline" className="text-[10px]">{c.activity_ref}</Badge>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

const STAGE_STATUSES: StageStatus[] = ["not_started", "in_progress", "blocked", "completed"];

function StageStatusSelect({ stage, processId }: { stage: ProcessStage; processId: string }) {
  const update = useUpdateStageStatus(processId);
  return (
    <Select
      value={stage.status}
      disabled={update.isPending}
      onValueChange={(v) => {
        if (v !== stage.status) update.mutate({ stageId: stage.id, status: v as StageStatus });
      }}
    >
      <SelectTrigger className="h-8 w-[170px]" aria-label={`Estado de la etapa ${stage.name}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STAGE_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            <span className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${STAGE_STATUS_META[s].dot}`} aria-hidden />
              {STAGE_STATUS_META[s].label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function StageItem({ stage, processId, commitments }: { stage: ProcessStage; processId: string; commitments: StageCommitment[] }) {
  const meta = STAGE_STATUS_META[stage.status];
  return (
    <AccordionItem value={stage.id} className="rounded-lg border border-border px-3">
      <AccordionTrigger className="hover:no-underline">
        <div className="flex flex-1 items-center gap-3 pr-2 text-left">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`} aria-hidden />
          <span className="text-xs text-muted-foreground">{stage.sort_order}</span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{stage.name}</span>
          <Badge variant="outline" className={`text-[10px] ${meta.badge}`}>{meta.label}</Badge>
          {commitments.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">{commitments.length} comp.</Badge>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="space-y-4 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase text-muted-foreground">Estado</span>
          <StageStatusSelect stage={stage} processId={processId} />
        </div>
        {stage.description && <p className="text-sm text-muted-foreground">{stage.description}</p>}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground">
              <Flag className="h-3 w-3" /> Hitos
            </p>
            <ul className="list-inside list-disc space-y-0.5 text-sm">
              {stage.activities.milestones.length
                ? stage.activities.milestones.map((m) => <li key={m}>{m}</li>)
                : <li className="list-none text-muted-foreground">Sin hitos.</li>}
            </ul>
          </div>
          <div>
            <p className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground">
              <ListChecks className="h-3 w-3" /> Actividades
            </p>
            <ul className="list-inside list-disc space-y-0.5 text-sm">
              {stage.activities.tasks.length
                ? stage.activities.tasks.map((t) => <li key={t}>{t}</li>)
                : <li className="list-none text-muted-foreground">Sin actividades.</li>}
            </ul>
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Compromisos vinculados</p>
          <StageCommitmentsBlock commitments={commitments} />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

/** Etapas del proceso con hitos, actividades y compromisos vinculados. */
export function ProcessStages({ processId }: { processId: string }) {
  const { data: stages = [], isLoading } = useProcessStages(processId);
  const { data: commitments = [] } = useStageCommitments(processId);
  const [filter, setFilter] = useState<QuickFilter>("todos");
  const [responsible, setResponsible] = useState<string>("todos");

  const responsibles = useMemo(() => {
    const set = new Set<string>();
    commitments.forEach((c) => c.responsible_name && set.add(c.responsible_name));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [commitments]);

  const filtered = useMemo(
    () =>
      commitments.filter(
        (c) => matchesFilter(c, filter) && (responsible === "todos" || c.responsible_name === responsible),
      ),
    [commitments, filter, responsible],
  );

  const byStage = useMemo(() => {
    const map = new Map<string, StageCommitment[]>();
    filtered.forEach((c) => {
      if (!c.stage_id) return;
      map.set(c.stage_id, [...(map.get(c.stage_id) ?? []), c]);
    });
    return map;
  }, [filtered]);

  return (
    <Card>
      <CardHeader className="gap-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Layers className="h-4 w-4" /> Etapas ({stages.length})
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as QuickFilter)}>
            <SelectTrigger className="h-8 w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {QUICK_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={responsible} onValueChange={setResponsible}>
            <SelectTrigger className="h-8 w-[200px]"><SelectValue placeholder="Responsable" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los responsables</SelectItem>
              {responsibles.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-24 w-full" />}
        {!isLoading && stages.length === 0 && (
          <p className="text-sm text-muted-foreground">Este proceso aún no tiene etapas definidas.</p>
        )}
        {!isLoading && stages.length > 0 && (
          <Accordion type="multiple" className="space-y-2">
            {stages.map((s) => (
              <StageItem key={s.id} stage={s} processId={processId} commitments={byStage.get(s.id) ?? []} />
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
