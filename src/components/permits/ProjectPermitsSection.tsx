import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileCheck, Plus } from "lucide-react";
import { useProjectPermits, type Permit } from "@/hooks/usePermits";
import { PermitFormDialog } from "@/components/permits/PermitFormDialog";
import { PERMIT_STATUS_BADGE, PERMIT_STATUS_LABELS, expiryMeta, type PermitStatus } from "@/lib/permits";

/** Permisos asociados a una obra/proyecto. */
export function ProjectPermitsSection({ projectId }: { projectId: string | undefined }) {
  const { data: permits = [], isLoading } = useProjectPermits(projectId);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Permit | null>(null);

  const openNew = () => { setEditing(null); setOpen(true); };

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-accent" /> Permisos de la obra ({permits.length})
        </h2>
        <Button size="sm" variant="outline" onClick={openNew}>
          <Plus className="w-4 h-4 mr-1" /> Nuevo permiso
        </Button>
      </div>

      {permits.length === 0 && (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          Esta obra aún no tiene permisos registrados.
        </CardContent></Card>
      )}

      <div className="space-y-2">
        {permits.map((p) => {
          const meta = expiryMeta(p.expiration_date, p.status);
          return (
            <Card
              key={p.id}
              className={`cursor-pointer transition-colors hover:border-primary/40 border-l-4 ${meta.overdue ? "border-l-danger" : meta.days !== null && meta.days <= 30 ? "border-l-warning" : "border-l-transparent"}`}
              onClick={() => { setEditing(p); setOpen(true); }}
            >
              <CardContent className="p-4 flex flex-wrap items-center gap-3">
                <span className="font-medium flex-1 min-w-[180px] truncate">{p.permit_type}</span>
                <span className="font-mono text-xs text-muted-foreground">{p.permit_number ?? "—"}</span>
                <span className="text-xs text-muted-foreground">{p.issuing_authority ?? "—"}</span>
                <Badge variant="outline" className={PERMIT_STATUS_BADGE[p.status as PermitStatus]}>
                  {PERMIT_STATUS_LABELS[p.status as PermitStatus] ?? p.status}
                </Badge>
                <span className={`text-xs ${meta.className}`}>{meta.label}</span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <PermitFormDialog open={open} onOpenChange={setOpen} permit={editing} defaultProjectId={projectId} />
    </div>
  );
}
