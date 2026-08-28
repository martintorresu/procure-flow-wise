import { Link } from "react-router-dom";
import { GitBranch } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCancelContingency, useCompleteContingency, useContingenciesByProcess,
} from "@/hooks/useProcessContingencies";
import {
  CONTINGENCY_MODE_BADGE, CONTINGENCY_MODE_EMOJI, CONTINGENCY_MODE_LABELS,
  CONTINGENCY_STATUS_BADGE, CONTINGENCY_STATUS_LABELS, timeAgo, type ContingencyStatus,
} from "@/lib/contingencies";

interface Props {
  processId: string;
  /** Habilita completar/cancelar (niveles admin, gestor). */
  canManage: boolean;
}

/** Pestaña de contingencias: bifurcaciones donde el proceso es padre o hijo. */
export function ProcessContingencies({ processId, canManage }: Props) {
  const { data: contingencies = [], isLoading } = useContingenciesByProcess(processId);
  const complete = useCompleteContingency();
  const cancel = useCancelContingency();

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  if (contingencies.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Este proceso no tiene bifurcaciones por contingencia.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {contingencies.map((c) => {
        const isParent = c.parent_process_id === processId;
        const other = isParent ? c.child : c.parent;
        return (
          <Card key={c.id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
                <GitBranch className="w-4 h-4" />
                {isParent ? "Contingencia derivada" : "Contingencia de"}
                <Link className="hover:underline" to={`/procesos/${isParent ? c.child_process_id : c.parent_process_id}`}>
                  {other?.process_number} · {other?.name}
                </Link>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${CONTINGENCY_MODE_BADGE[c.execution_mode]}`}>
                  {CONTINGENCY_MODE_EMOJI[c.execution_mode]} {CONTINGENCY_MODE_LABELS[c.execution_mode]}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${CONTINGENCY_STATUS_BADGE[c.status as ContingencyStatus]}`}>
                  {CONTINGENCY_STATUS_LABELS[c.status as ContingencyStatus]}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm">{c.reason}</p>
                <p className="text-xs text-muted-foreground">Creada {timeAgo(c.created_at)}</p>
              </div>
              {canManage && c.status === "active" && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={complete.isPending}
                    onClick={() => complete.mutate(c.id, {
                      onSuccess: () => toast.success("Contingencia completada"),
                      onError: (e: Error) => toast.error(e.message),
                    })}
                  >
                    Completar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={cancel.isPending}
                    onClick={() => cancel.mutate(c.id, {
                      onSuccess: () => toast.success("Contingencia cancelada"),
                      onError: (e: Error) => toast.error(e.message),
                    })}
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
