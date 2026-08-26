import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Mic, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

function startOfWeekISO(): string {
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // lunes = 0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Widget compacto de Minuta Activa para el Dashboard. */
export function DashboardMinutaWidget() {
  const { data: weekCount = 0 } = useQuery({
    queryKey: ["minuta-week-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("process_commitments")
        .select("id", { count: "exact", head: true })
        .eq("source", "manual")
        .gte("created_at", startOfWeekISO());
      if (error) return 0;
      return count ?? 0;
    },
  });

  return (
    <Card className="relative overflow-hidden border-sidebar-primary/30">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sidebar-primary/15 via-transparent to-sidebar-accent/20" />
      <CardContent className="relative p-5 flex items-center gap-4">
        <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-sidebar-primary to-sidebar-accent flex items-center justify-center shadow-lg">
          <Mic className="w-6 h-6 text-sidebar-primary-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">Minuta Activa</h3>
          <p className="text-xs text-muted-foreground">Captura compromisos de reunión con voz</p>
          <p className="text-xs mt-1 text-muted-foreground">
            <span className="font-semibold text-foreground">{weekCount}</span> compromiso{weekCount === 1 ? "" : "s"} capturado{weekCount === 1 ? "" : "s"} esta semana
          </p>
        </div>
        <Button asChild size="sm" className="shrink-0">
          <Link to="/minuta">
            Iniciar Captura <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
