import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Layers } from "lucide-react";
import { useProcessStages } from "@/hooks/useProcessStages";
import type { StageSummary } from "@/hooks/useProcessStageSummaries";

/** Etiqueta compacta de avance por etapas para listados. */
export function StageProgressBadge({ summary }: { summary?: StageSummary }) {
  if (!summary || summary.total === 0) {
    return (
      <Badge variant="outline" className="font-normal text-muted-foreground">
        Sin etapas definidas
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="font-normal">
      {summary.completed} de {summary.total} etapas · {summary.percent}%
    </Badge>
  );
}

/** Nombres de las etapas en curso, en formato de texto corto. */
export function InProgressStagesText({ summary }: { summary?: StageSummary }) {
  if (!summary || summary.inProgress.length === 0) return null;
  return (
    <span className="text-xs text-muted-foreground truncate">
      En curso: {summary.inProgress.join(" · ")}
    </span>
  );
}

/** Tarjeta "Avance del proceso" calculada desde process_stages. */
export function ProcessProgressCard({ processId }: { processId: string }) {
  const { data: stages = [], isLoading } = useProcessStages(processId);

  const total = stages.length;
  const completed = stages.filter((s) => s.status === "completed").length;
  const inProgress = stages.filter((s) => s.status === "in_progress");
  const percent = total ? Math.round((completed / total) * 100) : 0;

  return (
    <Card>
      <CardContent className="p-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Layers className="w-4 h-4 text-accent" /> Avance del proceso
          </h3>
          {total > 0 && (
            <span className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{completed} de {total}</span> etapas completadas
            </span>
          )}
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Cargando etapas…</p>}

        {!isLoading && total === 0 && (
          <div className="rounded-lg border border-dashed p-6 text-center space-y-2">
            <p className="text-sm font-medium">Este proceso aún no tiene etapas definidas</p>
            <p className="text-xs text-muted-foreground">
              Define las etapas para hacer seguimiento del avance y vincular compromisos.
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/procesos/${processId}`}>Ir a la pestaña Etapas</Link>
            </Button>
          </div>
        )}

        {!isLoading && total > 0 && (
          <>
            <Progress value={percent} aria-label={`Avance ${percent}%`} />
            <div className="flex flex-wrap items-center gap-2">
              {inProgress.length === 0 ? (
                <span className="text-xs text-muted-foreground">
                  {completed === total ? "Todas las etapas están completadas." : "Ninguna etapa en curso."}
                </span>
              ) : (
                <>
                  <span className="text-xs text-muted-foreground">En curso:</span>
                  {inProgress.map((s) => (
                    <Badge key={s.id} variant="outline" className="bg-info/10 text-info border-info/40 font-normal">
                      {s.name}
                    </Badge>
                  ))}
                </>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
