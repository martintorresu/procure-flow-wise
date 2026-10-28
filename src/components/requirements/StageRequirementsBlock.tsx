import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useStageRequirements } from "@/hooks/useProjectRequirementItems";
import { APPLICABILITY_META, STATUS_META } from "@/lib/requirementLabels";
import { useTenantPrefix } from "@/components/requirements/useTenantPrefix";

/** Requisitos vinculados a una etapa del proceso (visibilidad bidireccional). */
export function StageRequirementsBlock({ processId, stageId }: { processId: string; stageId: string }) {
  const { data = [] } = useStageRequirements(processId);
  const prefix = useTenantPrefix();
  const list = data.filter((r) => r.stage_id === stageId);
  if (!list.length) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Requisitos vinculados</p>
      <ul className="space-y-1 text-sm">
        {list.map((r) => {
          const meta = r.applicability === "applicable" && r.status ? STATUS_META[r.status] : APPLICABILITY_META[r.applicability];
          return (
            <li key={r.id} className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs">{r.code}</span>
              <span className="min-w-0 flex-1 truncate">{r.name}</span>
              <Badge variant="outline" className={meta.badge}>{meta.label}</Badge>
              <Link className="text-xs text-primary underline" to={`${prefix}/projects/${r.project_id}?tab=requirements&req=${r.id}`}>Ver ficha</Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
