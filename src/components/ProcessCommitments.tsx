import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";
import { CommitmentsTable } from "@/components/CommitmentsTable";
import { usePdcCommitments, useProcessOptions } from "@/hooks/useCommitments";

/** Compromisos de reuniones vinculados a un proceso. */
export function ProcessCommitments({ pdcId }: { pdcId: string }) {
  const { data: commitments = [], isLoading } = usePdcCommitments(pdcId);
  const { data: processes = [] } = useProcessOptions();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="w-4 h-4" /> Compromisos ({commitments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <CommitmentsTable
          commitments={commitments}
          processes={processes}
          hideProcessColumn
          isLoading={isLoading}
        />
      </CardContent>
    </Card>
  );
}
