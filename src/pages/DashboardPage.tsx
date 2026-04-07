import { mockPdcs, mockAlerts, getTrafficLight } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, TrafficLightIndicator, CriticalityBadge } from "@/components/StatusIndicators";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { FileText, AlertTriangle, Clock, TrendingUp, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { user } = useAuth();
  const activePdcs = mockPdcs.filter((p) => !["closed", "closed_with_incident"].includes(p.current_status));
  const delayedPdcs = mockPdcs.filter((p) => getTrafficLight(p) === "red");
  const criticalPdcs = mockPdcs.filter((p) => p.criticality === "high");
  const unresolvedAlerts = mockAlerts.filter((a) => !a.resolved);

  const stats = [
    { label: "PdCs Activos", value: activePdcs.length, icon: FileText, color: "text-accent" },
    { label: "Atrasados", value: delayedPdcs.length, icon: Clock, color: "text-danger" },
    { label: "Críticos", value: criticalPdcs.length, icon: AlertTriangle, color: "text-warning" },
    { label: "Alertas Pendientes", value: unresolvedAlerts.length, icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bienvenido, {user?.name}</h1>
        <p className="text-sm text-muted-foreground">Resumen de procesos de compra</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{s.label}</p>
                  <p className="text-3xl font-bold mt-1">{s.value}</p>
                </div>
                <s.icon className={`w-10 h-10 ${s.color} opacity-20`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Procesos de Compra Activos</CardTitle>
          <Link to="/pdcs">
            <Button variant="ghost" size="sm" className="text-accent">
              Ver todos <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-3 px-2 font-medium text-muted-foreground">Semáforo</th>
                  <th className="py-3 px-2 font-medium text-muted-foreground">N° PdC</th>
                  <th className="py-3 px-2 font-medium text-muted-foreground">Título</th>
                  <th className="py-3 px-2 font-medium text-muted-foreground">Estado</th>
                  <th className="py-3 px-2 font-medium text-muted-foreground">Responsable</th>
                  <th className="py-3 px-2 font-medium text-muted-foreground">Criticidad</th>
                  <th className="py-3 px-2 font-medium text-muted-foreground">Acción</th>
                </tr>
              </thead>
              <tbody>
                {activePdcs.map((pdc) => (
                  <tr key={pdc.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-2"><TrafficLightIndicator color={getTrafficLight(pdc)} /></td>
                    <td className="py-3 px-2 font-mono text-xs">{pdc.pdc_number}</td>
                    <td className="py-3 px-2 font-medium max-w-[200px] truncate">{pdc.title}</td>
                    <td className="py-3 px-2"><StatusBadge status={pdc.current_status} /></td>
                    <td className="py-3 px-2 text-muted-foreground">{pdc.current_owner}</td>
                    <td className="py-3 px-2"><CriticalityBadge level={pdc.criticality} /></td>
                    <td className="py-3 px-2">
                      <Link to={`/pdcs/${pdc.id}`}>
                        <Button variant="outline" size="sm">Ver</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Alerts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Alertas Recientes</CardTitle>
          <Link to="/alerts">
            <Button variant="ghost" size="sm" className="text-accent">
              Ver todas <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {unresolvedAlerts.slice(0, 3).map((alert) => {
              const pdc = mockPdcs.find((p) => p.id === alert.pdc_id);
              const severityColors = {
                low: "border-l-success", medium: "border-l-warning",
                high: "border-l-danger", critical: "border-l-danger",
              };
              return (
                <div key={alert.id} className={`border-l-4 ${severityColors[alert.severity]} bg-muted/30 rounded-r-md p-3`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{pdc?.pdc_number} — {pdc?.title}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{alert.created_at}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
