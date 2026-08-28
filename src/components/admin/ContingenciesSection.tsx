import { useProjects } from "@/hooks/useProjects";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { GitBranch } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useAllContingencies, useCancelContingency, useCompleteContingency,
} from "@/hooks/useProcessContingencies";
import {
  CONTINGENCY_MODE_BADGE, CONTINGENCY_MODE_EMOJI, CONTINGENCY_MODE_LABELS,
  CONTINGENCY_STATUS_BADGE, CONTINGENCY_STATUS_LABELS, type ContingencyStatus,
} from "@/lib/contingencies";
import { formatDate } from "@/lib/stageLabels";

/** Tabla administrativa de todas las bifurcaciones por contingencia del tenant. */
export function ContingenciesSection() {
  const { data: contingencies = [], isLoading } = useAllContingencies();
  const complete = useCompleteContingency();
  const cancel = useCancelContingency();

  const [fMode, setFMode] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [fProject, setFProject] = useState("all");

  const { data: allProjects = [] } = useProjects();
  const projectNameById = useMemo(
    () => Object.fromEntries(allProjects.map((p) => [p.id, p.name])),
    [allProjects],
  );
  const projects = useMemo(
    () => Array.from(new Set(contingencies.map((c) => c.parent?.project_id).filter(Boolean) as string[])),
    [contingencies],
  );

  const rows = contingencies.filter((c) => {
    if (fMode !== "all" && c.execution_mode !== fMode) return false;
    if (fStatus !== "all" && c.status !== fStatus) return false;
    if (fProject !== "all" && c.parent?.project_id !== fProject) return false;
    return true;
  });

  const run = (kind: "complete" | "cancel", id: string) => {
    const m = kind === "complete" ? complete : cancel;
    m.mutate(id, {
      onSuccess: () => toast.success(kind === "complete" ? "Contingencia completada" : "Contingencia cancelada"),
      onError: (e: Error) => toast.error(e.message),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <GitBranch className="w-4 h-4" /> Bifurcaciones por Contingencia ({rows.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Select value={fMode} onValueChange={setFMode}>
            <SelectTrigger><SelectValue placeholder="Modo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los modos</SelectItem>
              <SelectItem value="pause_and_attend">Pausa y Atención</SelectItem>
              <SelectItem value="parallel_effort">Esfuerzo en Paralelo</SelectItem>
            </SelectContent>
          </Select>
          <Select value={fStatus} onValueChange={setFStatus}>
            <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="active">Activa</SelectItem>
              <SelectItem value="completed">Completada</SelectItem>
              <SelectItem value="cancelled">Cancelada</SelectItem>
            </SelectContent>
          </Select>
          <Select value={fProject} onValueChange={setFProject}>
            <SelectTrigger><SelectValue placeholder="Proyecto" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los proyectos</SelectItem>
              {projects.map((p) => <SelectItem key={p} value={p}>{projectNameById[p] ?? "Sin proyecto"}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proceso padre</TableHead>
                <TableHead>Proceso hijo</TableHead>
                <TableHead>Modo</TableHead>
                <TableHead className="min-w-[200px]">Razón</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground">Cargando…</TableCell></TableRow>
              )}
              {!isLoading && rows.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground">Sin bifurcaciones.</TableCell></TableRow>
              )}
              {rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-sm">
                    <Link className="hover:underline" to={`/pdcs/${c.parent_process_id}`}>
                      {c.parent?.pdc_number} · {c.parent?.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">
                    <Link className="hover:underline" to={`/pdcs/${c.child_process_id}`}>
                      {c.child?.pdc_number} · {c.child?.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${CONTINGENCY_MODE_BADGE[c.execution_mode]}`}>
                      {CONTINGENCY_MODE_EMOJI[c.execution_mode]} {CONTINGENCY_MODE_LABELS[c.execution_mode]}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.reason}</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${CONTINGENCY_STATUS_BADGE[c.status as ContingencyStatus]}`}>
                      {CONTINGENCY_STATUS_LABELS[c.status as ContingencyStatus]}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDate(c.created_at)}</TableCell>
                  <TableCell className="text-right">
                    {c.status === "active" ? (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" disabled={complete.isPending} onClick={() => run("complete", c.id)}>
                          Completar
                        </Button>
                        <Button size="sm" variant="ghost" disabled={cancel.isPending} onClick={() => run("cancel", c.id)}>
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
