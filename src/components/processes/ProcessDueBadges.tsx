import { Badge } from "@/components/ui/badge";
import { formatShortDate, stageSignals } from "@/hooks/useProcessFilters";
import type { StageSummary } from "@/hooks/useProcessStageSummaries";

export function ProcessDueBadges({ summary, today }: { summary: StageSummary | undefined; today: string }) {
  const { overdue, upcoming15 } = stageSignals(summary, today);
  return (
    <>
      {overdue.length > 0 && (
        <Badge variant="destructive" className="text-[10px]">
          {overdue.length} {overdue.length === 1 ? "atrasada" : "atrasadas"}
        </Badge>
      )}
      {upcoming15.length > 0 && (
        <Badge variant="outline" className="border-warning/50 bg-warning/10 text-warning text-[10px]">
          Vence {formatShortDate(upcoming15[0])}
        </Badge>
      )}
    </>
  );
}
