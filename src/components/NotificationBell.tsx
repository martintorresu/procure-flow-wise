import { Link } from "react-router-dom";
import { Bell, CheckCheck, ArrowRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useAlerts, useAlertsRealtime, useMarkAllAlertsRead, useMarkAlertRead } from "@/hooks/useAlerts";
import { humanizeTechnicalText } from "@/lib/stageLabels";
import { formatAlertType, relativeTime, SEVERITY_DOT } from "@/lib/alertLabels";

interface Props {
  /** Modo compacto para el sidebar colapsado. */
  collapsed?: boolean;
}

export function NotificationBell({ collapsed = false }: Props) {
  useAlertsRealtime();
  const { data: alerts = [] } = useAlerts();
  const markAll = useMarkAllAlertsRead();
  const markOne = useMarkAlertRead();

  const pending = alerts.filter((a) => !a.resolved);
  const unread = pending.filter((a) => !a.read_at);
  const hasUrgent = unread.some((a) => a.severity === "critical" || a.severity === "high");
  const items = pending.slice(0, 10);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label={`Notificaciones${unread.length ? `: ${unread.length} sin leer` : ""}`}
          className="relative flex items-center justify-center h-9 w-9 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground transition-colors"
        >
          <Bell className="w-5 h-5" />
          {unread.length > 0 && (
            <span
              className={`absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white bg-danger ${hasUrgent ? "animate-pulse" : ""}`}
            >
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align={collapsed ? "start" : "end"} side="right" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <p className="text-sm font-semibold">Notificaciones</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            disabled={unread.length === 0 || markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            <CheckCheck className="w-3.5 h-3.5 mr-1" />
            Marcar todas
          </Button>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 && (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground">Sin alertas pendientes</p>
          )}
          {items.map((a) => (
            <div
              key={a.id}
              className={`px-3 py-2.5 border-b last:border-0 ${a.read_at ? "" : "bg-muted/40"}`}
            >
              <div className="flex items-start gap-2">
                <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${SEVERITY_DOT[a.severity]}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                    {formatAlertType(a.type)}
                  </p>
                  <p className={`text-xs line-clamp-2 ${a.read_at ? "" : "font-medium"}`}>
                    {humanizeTechnicalText(a.message)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground">{relativeTime(a.created_at)}</span>
                    {a.process_id && (
                      <Link to={`/procesos/${a.process_id}`} className="text-[10px] text-accent hover:underline">
                        Ver proceso
                      </Link>
                    )}
                    {!a.read_at && (
                      <button
                        className="text-[10px] text-muted-foreground hover:text-foreground ml-auto"
                        onClick={() => markOne.mutate(a.id)}
                      >
                        Marcar leída
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t p-2">
          <Link to="/alerts" className="flex items-center justify-center gap-1 text-xs text-accent hover:underline">
            Ver todas <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default NotificationBell;
