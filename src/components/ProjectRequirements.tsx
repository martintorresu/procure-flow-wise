import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardList } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  APPLICABILITY_OPTIONS, REQUIREMENT_STATUS_OPTIONS,
  useApplyRequirementTemplate, useProjectRequirements, useUpdateProjectRequirement,
  type Applicability, type RequirementStatus,
} from "@/hooks/useRequirements";
import type { Process } from "@/types/process";

interface Props {
  processes: Process[];
}

/** Campo de texto que guarda al salir del foco. */
function TextCell({
  value,
  placeholder,
  onCommit,
}: {
  value: string;
  placeholder: string;
  onCommit: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <Input
      value={draft}
      placeholder={placeholder}
      className="h-8 text-xs"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { if (draft !== value) onCommit(draft); }}
    />
  );
}

export default function ProjectRequirements({ processes }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [processId, setProcessId] = useState<string | undefined>(processes[0]?.id);

  useEffect(() => {
    if (!processId && processes.length > 0) setProcessId(processes[0].id);
  }, [processes, processId]);

  const { data: requirements = [], isLoading } = useProjectRequirements(processId);
  const applyTemplate = useApplyRequirementTemplate();
  const updateRequirement = useUpdateProjectRequirement(processId);

  const canEdit = user?.role === "admin" || user?.role === "gestor";

  const handleApply = () => {
    if (!processId || !user?.tenantId) return;
    applyTemplate.mutate(
      { processId, tenantId: user.tenantId },
      {
        onSuccess: (n) =>
          toast({
            title: n > 0 ? "Plantilla aplicada" : "Sin cambios",
            description: n > 0 ? `Se crearon ${n} requisitos.` : "Este proceso ya tiene la plantilla aplicada.",
          }),
        onError: (e) =>
          toast({ title: "No se pudo aplicar la plantilla", description: e.message, variant: "destructive" }),
      },
    );
  };

  const patch = (id: string, p: Parameters<typeof updateRequirement.mutate>[0]["patch"]) =>
    updateRequirement.mutate(
      { id, patch: p },
      { onError: (e) => toast({ title: "No se pudo guardar", description: e.message, variant: "destructive" }) },
    );

  if (processes.length === 0) {
    return (
      <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
        Crea un proceso en este proyecto para poder aplicar la plantilla.
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={processId} onValueChange={setProcessId}>
          <SelectTrigger className="w-[320px]">
            <SelectValue placeholder="Selecciona un proceso" />
          </SelectTrigger>
          <SelectContent>
            {processes.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.process_number} · {p.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {canEdit && (
          <Button onClick={handleApply} disabled={applyTemplate.isPending || !processId}>
            <ClipboardList className="w-4 h-4 mr-2" />
            {applyTemplate.isPending ? "Aplicando…" : "Aplicar plantilla Permisos DOM"}
          </Button>
        )}
      </div>

      {isLoading && <Skeleton className="h-48 w-full" />}

      {!isLoading && requirements.length === 0 && (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          Este proceso aún no tiene la plantilla aplicada.
        </CardContent></Card>
      )}

      {requirements.length > 0 && (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Código</TableHead>
                  <TableHead className="min-w-[220px]">Actividad</TableHead>
                  <TableHead className="min-w-[170px]">Aplicabilidad</TableHead>
                  <TableHead className="min-w-[160px]">Responsable</TableHead>
                  <TableHead className="min-w-[150px]">Fecha objetivo</TableHead>
                  <TableHead className="min-w-[190px]">Estado</TableHead>
                  <TableHead className="min-w-[220px]">Criterio de cierre</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requirements.map((r) => (
                  <TableRow key={r.id} className="align-top">
                    <TableCell className="font-mono text-xs">{r.catalog?.code ?? "—"}</TableCell>
                    <TableCell className="text-sm">
                      <p>{r.catalog?.activity}</p>
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        Etapa {r.catalog?.stage_number} · {r.catalog?.stage_name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={r.applicability}
                        disabled={!canEdit}
                        onValueChange={(v) => patch(r.id, { applicability: v as Applicability })}
                      >
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {APPLICABILITY_OPTIONS.map((o) => (
                            <SelectItem key={o} value={o}>{o}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <TextCell
                        value={r.responsible_name ?? ""}
                        placeholder="Nombre"
                        onCommit={(v) => patch(r.id, { responsible_name: v || null })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        className="h-8 text-xs"
                        disabled={!canEdit}
                        value={r.fecha_objetivo ?? ""}
                        onChange={(e) => patch(r.id, { fecha_objetivo: e.target.value || null })}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={r.status}
                        disabled={!canEdit}
                        onValueChange={(v) => patch(r.id, { status: v as RequirementStatus })}
                      >
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {REQUIREMENT_STATUS_OPTIONS.map((o) => (
                            <SelectItem key={o} value={o}>{o}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <TextCell
                        value={r.criterio_cierre ?? ""}
                        placeholder="Criterio de cierre"
                        onCommit={(v) => patch(r.id, { criterio_cierre: v || null })}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
