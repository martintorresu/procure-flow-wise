import { useMemo, useState } from "react";
import { mockPdcs, mockAlerts, getTrafficLight } from "@/data/mockData";
import { usePdcs } from "@/hooks/usePdcs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, TrafficLightIndicator, CriticalityBadge } from "@/components/StatusIndicators";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { FileText, AlertTriangle, Clock, TrendingUp, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATUS_LABELS, CRITICALITY_LABELS, type Criticality, type PdcStatus } from "@/types/pdc";
import { SEO } from "@/components/SEO";

export default function DashboardPage() {
  const { user } = useAuth();
  const { pdcs: realPdcs } = usePdcs();
  const allPdcs = [...realPdcs, ...mockPdcs];
  const activePdcs = allPdcs.filter((p) => !["closed", "closed_with_incident"].includes(p.current_status));
  const delayedPdcs = allPdcs.filter((p) => getTrafficLight(p) === "red");
  const criticalPdcs = allPdcs.filter((p) => p.criticality === "high");
  const unresolvedAlerts = mockAlerts.filter((a) => !a.resolved);

  const [criticalityFilter, setCriticalityFilter] = useState<Criticality | "all">("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<PdcStatus | "all">("all");

  const ownerOptions = useMemo(
    () => Array.from(new Set(activePdcs.map((p) => p.current_owner).filter(Boolean))).sort(),
    [activePdcs]
  );
  const statusOptions = useMemo(
    () => Array.from(new Set(activePdcs.map((p) => p.current_status))),
    [activePdcs]
  );

  const filteredPdcs = activePdcs.filter((p) =>
    (criticalityFilter === "all" || p.criticality === criticalityFilter) &&
    (ownerFilter === "all" || p.current_owner === ownerFilter) &&
    (statusFilter === "all" || p.current_status === statusFilter)
  );

  const stats = [
    { label: "PdCs Activos", value: activePdcs.length, icon: FileText, color: "text-accent", to: "/pdcs" },
    { label: "Atrasados", value: delayedPdcs.length, icon: Clock, color: "text-danger", to: "/alerts" },
    { label: "Críticos", value: criticalPdcs.length, icon: AlertTriangle, color: "text-warning", to: "/alerts" },
    { label: "Alertas Pendientes", value: unresolvedAlerts.length, icon: TrendingUp, color: "text-primary", to: "/alerts" },
  ];

  return (
    <div className="space-y-6">
      <SEO title="Panel de control" description="KPIs de procesos de compra activos, semáforos de criticidad y alertas pendientes." path="/" />
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bienvenido, {user?.name}</h1>
        <p className="text-sm text-muted-foreground">Resumen de procesos de compra</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const CardInner = (
            <Card className={s.to ? "transition-colors hover:bg-muted/40 hover:border-primary/40 cursor-pointer" : ""}>
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
          );
          return s.to ? (
            <Link key={s.label} to={s.to} aria-label={`Ver ${s.label}`}>{CardInner}</Link>
          ) : (
            <div key={s.label}>{CardInner}</div>
          );
        })}
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
                <tr className="border-b text-left align-bottom">
                  <th className="py-3 px-2 font-medium text-muted-foreground">Semáforo</th>
                  <th className="py-3 px-2 font-medium text-muted-foreground">N° PdC</th>
                  <th className="py-3 px-2 font-medium text-muted-foreground">Título</th>
                  <th className="py-3 px-2 font-medium text-muted-foreground">
                    <div className="space-y-1">
                      <div>Estado</div>
                      <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as PdcStatus | "all")}>
                        <SelectTrigger className="h-7 text-xs font-normal w-[140px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {statusOptions.map((s) => (
                            <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </th>
                  <th className="py-3 px-2 font-medium text-muted-foreground">
                    <div className="space-y-1">
                      <div>Responsable</div>
                      <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                        <SelectTrigger className="h-7 text-xs font-normal w-[160px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {ownerOptions.map((o) => (
                            <SelectItem key={o} value={o}>{o}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </th>
                  <th className="py-3 px-2 font-medium text-muted-foreground">
                    <div className="space-y-1">
                      <div>Criticidad</div>
                      <Select value={criticalityFilter} onValueChange={(v) => setCriticalityFilter(v as Criticality | "all")}>
                        <SelectTrigger className="h-7 text-xs font-normal w-[110px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          <SelectItem value="high">{CRITICALITY_LABELS.high}</SelectItem>
                          <SelectItem value="medium">{CRITICALITY_LABELS.medium}</SelectItem>
                          <SelectItem value="low">{CRITICALITY_LABELS.low}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </th>
                  <th className="py-3 px-2 font-medium text-muted-foreground">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredPdcs.map((pdc) => (
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
                {filteredPdcs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                      No hay PdCs que coincidan con los filtros.
                    </td>
                  </tr>
                )}
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
