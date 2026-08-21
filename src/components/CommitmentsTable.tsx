import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { Trash2, Unlink } from "lucide-react";
import { COMMITMENT_STATUSES, dueMeta, statusMeta } from "@/lib/commitments";
import {
  useDeleteCommitment,
  useUpdateCommitment,
  type Commitment,
  type ProcessOption,
} from "@/hooks/useCommitments";
import { toast } from "sonner";

interface Props {
  commitments: Commitment[];
  processes?: ProcessOption[];
  /** Oculta la columna de proceso (cuando ya se está dentro de un proceso). */
  hideProcessColumn?: boolean;
  /** Oculta la columna de reunión (cuando la tabla ya está agrupada por reunión). */
  hideMeetingColumn?: boolean;
  isLoading?: boolean;
}

export function CommitmentsTable({
  commitments,
  processes = [],
  hideProcessColumn,
  hideMeetingColumn,
  isLoading,
}: Props) {
  const update = useUpdateCommitment();
  const remove = useDeleteCommitment();

  const procLabel = (id: string | null) => {
    const p = processes.find((x) => x.id === id);
    return p ? `${p.pdc_number} · ${p.name}` : null;
  };

  const colCount = 7 + (hideProcessColumn ? 0 : 1) + (hideMeetingColumn ? 0 : 1);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="min-w-[240px]">Compromiso</TableHead>
          <TableHead>Responsable</TableHead>
          {!hideProcessColumn && <TableHead>Proceso</TableHead>}
          {!hideMeetingColumn && <TableHead>Reunión</TableHead>}
          <TableHead>Límite</TableHead>
          <TableHead>Prioridad</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading && (
          <TableRow><TableCell colSpan={colCount} className="text-muted-foreground">Cargando…</TableCell></TableRow>
        )}
        {!isLoading && commitments.length === 0 && (
          <TableRow><TableCell colSpan={colCount} className="text-muted-foreground">Sin compromisos.</TableCell></TableRow>
        )}
        {commitments.map((c) => {
          const meta = statusMeta(c.status);
          const due = dueMeta(c.due_date, c.status);
          return (
            <TableRow key={c.id} className={due.overdue ? "bg-danger/5" : undefined}>
              <TableCell className={`max-w-[380px] ${due.overdue ? "border-l-4 border-l-danger" : ""}`}>
                <div className="flex items-start gap-2">
                  <p className="text-sm font-medium">{c.commitment_text}</p>
                  {due.overdue && <Badge variant="destructive" className="shrink-0 text-[10px]">Vencido</Badge>}
                </div>
                <Badge variant="outline" className="mt-1 text-[10px]">
                  {c.source === "api" ? "API" : "Manual"}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">
                {c.responsible_name || (c.responsible_user_id ? "Usuario vinculado" : "—")}
              </TableCell>
              {!hideProcessColumn && (
                <TableCell className="text-sm">
                  {c.pdc_id ? (
                    <Link to={`/pdcs/${c.pdc_id}`} className="text-primary hover:underline">
                      {procLabel(c.pdc_id) ?? "Ver proceso"}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">Sin vincular</span>
                  )}
                </TableCell>
              )}
              {!hideMeetingColumn && (
                <TableCell className="text-sm max-w-[200px]">
                  {c.meeting_title || c.meeting_date ? (
                    <>
                      <p className="truncate">{c.meeting_title ?? "Reunión"}</p>
                      <p className="text-xs text-muted-foreground">{c.meeting_date ?? "Sin fecha"}</p>
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              )}
              <TableCell className="text-sm whitespace-nowrap">
                <p>{c.due_date ?? "—"}</p>
                <p className={`text-xs font-medium ${due.className}`}>{due.label}</p>
              </TableCell>
              <TableCell className="text-sm capitalize">{c.priority ?? "—"}</TableCell>
              <TableCell>
                <Select
                  value={c.status}
                  onValueChange={(v) => update.mutate({ id: c.id, status: v as Commitment["status"] })}
                >
                  <SelectTrigger className={`h-8 w-[140px] border ${meta.className}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMITMENT_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="text-right whitespace-nowrap">
                {c.pdc_id && (
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Desvincular proceso"
                    aria-label="Desvincular proceso"
                    onClick={() => update.mutate({ id: c.id, pdc_id: null })}
                  >
                    <Unlink className="w-4 h-4" />
                  </Button>
                )}
                {!c.pdc_id && processes.length > 0 && (
                  <Select onValueChange={(v) => update.mutate({ id: c.id, pdc_id: v })}>
                    <SelectTrigger className="h-8 w-[150px] inline-flex">
                      <SelectValue placeholder="Vincular…" />
                    </SelectTrigger>
                    <SelectContent>
                      {processes.slice(0, 100).map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.pdc_number} · {p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  title="Eliminar"
                  aria-label="Eliminar compromiso"
                  onClick={() => {
                    remove.mutate(c.id, {
                      onSuccess: () => toast.success("Compromiso eliminado"),
                      onError: (e) => toast.error((e as Error).message),
                    });
                  }}
                >
                  <Trash2 className="w-4 h-4 text-danger" />
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
