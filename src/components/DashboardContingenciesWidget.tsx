import { Link } from "react-router-dom";
import { GitBranch } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllContingencies } from "@/hooks/useProcessContingencies";
import {
  CONTINGENCY_MODE_BADGE, CONTINGENCY_MODE_EMOJI, CONTINGENCY_MODE_LABELS, timeAgo,
} from "@/lib/contingencies";

/** Panel del dashboard con el estado de las bifurcaciones por contingencia. */
export function DashboardContingenciesWidget() {
  const { data: contingencies = [], isLoading } = useAllContingencies();

  const active = contingencies.filter((c) => c.status === "active");
  const paused = active.filter((c) => c.execution_mode === "pause_and_attend");
  const completed = contingencies.filter((c) => c.status === "completed");
  const top = [...active]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(0, 3);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <GitBranch className="w-4 h-4" /> Bifurcaciones por Contingencia
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: "Activas", value: active.length },
            { label: "Pausadas", value: paused.length },
            { label: "Completadas", value: completed.length },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border p-2">
              <div className="text-lg font-semibold">{s.value}</div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        {isLoading && <Skeleton className="h-16 w-full" />}

        {!isLoading && top.length === 0 && (
          <p className="text-sm text-muted-foreground">No hay contingencias activas.</p>
        )}

        <ul className="space-y-2">
          {top.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 rounded-lg border p-2.5">
              <div className="min-w-0 space-y-1">
                <p className="truncate text-sm font-medium">
                  {c.parent?.name ?? "Proceso padre"} → {c.child?.name ?? "Contingencia"}
                </p>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${CONTINGENCY_MODE_BADGE[c.execution_mode]}`}>
                    {CONTINGENCY_MODE_EMOJI[c.execution_mode]} {CONTINGENCY_MODE_LABELS[c.execution_mode]}
                  </span>
                  <span className="text-xs text-muted-foreground">{timeAgo(c.created_at)}</span>
                </div>
              </div>
              <Link to={`/procesos/${c.child_process_id}`}>
                <Button variant="outline" size="sm">Ver</Button>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
