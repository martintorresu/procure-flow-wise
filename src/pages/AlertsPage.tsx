import { mockAlerts, mockPdcs } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Bell, CheckCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState(mockAlerts);

  const resolve = (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, resolved: true } : a)));
    toast.success("Alerta marcada como resuelta");
  };

  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...alerts].sort((a, b) => {
    if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  const severityColors = {
    low: "border-l-success bg-success/5",
    medium: "border-l-warning bg-warning/5",
    high: "border-l-danger bg-danger/5",
    critical: "border-l-danger bg-danger/10",
  };

  const severityLabels = { low: "Baja", medium: "Media", high: "Alta", critical: "Crítica" };

  return (
    <div className="space-y-6">
      <SEO title="Alertas" description="Alertas automáticas de PdCs por retrasos, hitos vencidos y desviaciones por severidad." path="/alerts" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alertas</h1>
          <p className="text-sm text-muted-foreground">{alerts.filter((a) => !a.resolved).length} alertas pendientes</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">PdC</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Tipo</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Severidad</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Mensaje</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Estado</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Acción</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((alert) => {
                  const pdc = mockPdcs.find((p) => p.id === alert.pdc_id);
                  return (
                    <tr key={alert.id} className={`border-b last:border-0 ${alert.resolved ? "opacity-50" : ""}`}>
                      <td className="py-3 px-4">
                        <Link to={`/pdcs/${alert.pdc_id}`} className="text-accent hover:underline font-mono text-xs">
                          {pdc?.pdc_number}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground capitalize">{alert.type.replace("_", " ")}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full border-l-4 ${severityColors[alert.severity]}`}>
                          {severityLabels[alert.severity]}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-[300px]">{alert.message}</td>
                      <td className="py-3 px-4">
                        {alert.resolved ? (
                          <span className="text-success text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3" />Resuelta</span>
                        ) : (
                          <span className="text-warning text-xs">Pendiente</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {!alert.resolved && (
                          <Button variant="outline" size="sm" onClick={() => resolve(alert.id)}>Resolver</Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
