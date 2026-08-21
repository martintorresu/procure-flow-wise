import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { ArrowRight, MessagesSquare } from "lucide-react";
import { useCommitments } from "@/hooks/useCommitments";
import { useAuth } from "@/contexts/AuthContext";
import { dueMeta } from "@/lib/commitments";

const OPEN = ["pendiente", "en_progreso"];

export function DashboardCommitmentsWidget() {
  const { user } = useAuth();
  const { data: commitments = [], isLoading } = useCommitments();

  const mine = commitments.filter(
    (c) => OPEN.includes(c.status) && (!user?.id || c.responsible_user_id === user.id),
  );
  const overdue = mine.filter((c) => dueMeta(c.due_date, c.status).overdue);
  const urgent = [...mine]
    .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"))
    .slice(0, 3);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MessagesSquare className="w-4 h-4" /> Compromisos pendientes
        </CardTitle>
        <Link to="/commitments">
          <Button variant="ghost" size="sm" className="text-accent">
            Ver todos <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <Skeleton className="h-24 w-full rounded-lg" />}
        {!isLoading && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Pendientes</p>
                <p className="text-2xl font-bold mt-0.5">{mine.length}</p>
              </div>
              <div className={`rounded-lg border p-3 ${overdue.length ? "border-danger/50 bg-danger/5" : ""}`}>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Vencidos</p>
                <p className={`text-2xl font-bold mt-0.5 ${overdue.length ? "text-danger" : ""}`}>{overdue.length}</p>
              </div>
            </div>

            {urgent.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">No tienes compromisos pendientes.</p>
            )}

            <ul className="space-y-2">
              {urgent.map((c) => {
                const meta = dueMeta(c.due_date, c.status);
                return (
                  <li
                    key={c.id}
                    className={`rounded-md border-l-4 bg-muted/30 p-3 ${meta.overdue ? "border-l-danger" : "border-l-warning"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium line-clamp-2">{c.commitment_text}</p>
                      {meta.overdue && <Badge variant="destructive" className="shrink-0">Vencido</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {c.meeting_title ? `${c.meeting_title} · ` : ""}
                      <span className={meta.className}>{meta.label}</span>
                      {c.due_date ? ` · ${c.due_date}` : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
