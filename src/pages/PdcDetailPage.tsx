import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge, TrafficLightIndicator, CriticalityBadge } from "@/components/StatusIndicators";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, DollarSign, User, MapPin, FileText, ClipboardList, Wrench, FileSearch, Award, Truck, FlaskConical, Ship, Check, Pencil } from "lucide-react";
import { toast } from "sonner";
import { EtFormPanel } from "@/components/et/EtFormPanel";
import { usePdc } from "@/hooks/usePdcs";
import { useMilestones } from "@/hooks/useMilestones";
import { useRfqs } from "@/hooks/useRfqs";
import { usePurchaseOrders } from "@/hooks/usePurchaseOrders";
import { useFatEvents } from "@/hooks/useFatEvents";
import { useLogisticsEvents } from "@/hooks/useLogisticsEvents";
import { useAlerts } from "@/hooks/useAlerts";
import { getTrafficLight } from "@/lib/trafficLight";
import { useAuth } from "@/contexts/AuthContext";
import { SEO } from "@/components/SEO";

export default function PdcDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: pdc, isLoading: loading } = usePdc(id);
  const isAdmin = user?.role === "admin";

  const { data: milestones = [] } = useMilestones(pdc?.id);
  const { data: rfqsData } = useRfqs(pdc?.id);
  const { data: pos = [] } = usePurchaseOrders(pdc?.id);
  const { data: fatEvents = [] } = useFatEvents(pdc?.id);
  const { data: logistics = [] } = useLogisticsEvents(pdc?.id);
  const { data: allAlerts = [] } = useAlerts();

  if (loading) {
    return <div className="text-center py-20 text-muted-foreground">Cargando PdC…</div>;
  }

  if (!pdc) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">PdC no encontrado</p>
        <Link to="/pdcs"><Button variant="outline" className="mt-4">Volver</Button></Link>
      </div>
    );
  }

  const rfqSuppliers = rfqsData?.suppliers ?? [];
  const alerts = allAlerts.filter((a) => a.pdc_id === pdc.id);

  return (
    <div className="space-y-6">
      <SEO title={`PdC ${pdc.pdc_number} — ${pdc.title}`} description={`Detalle del proceso de compra ${pdc.pdc_number}: estado ${pdc.current_status}, proyecto ${pdc.project}.`} path={`/pdcs/${pdc.id}`} />
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link to="/pdcs">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <TrafficLightIndicator color={getTrafficLight(pdc)} />
              <h1 className="text-xl font-bold">{pdc.pdc_number}</h1>
              <StatusBadge status={pdc.current_status} />
              <CriticalityBadge level={pdc.criticality} />
            </div>
            <p className="text-lg font-medium">{pdc.title}</p>
            <p className="text-sm text-muted-foreground">{pdc.project}</p>
          </div>
        </div>
        {isAdmin && (
          <Link to={`/pdcs/${pdc.id}/edit`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Pencil className="w-4 h-4" /> Editar PdC
            </Button>
          </Link>
        )}
      </div>

      {/* Key info cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: User, label: "Responsable", value: pdc.current_owner },
          { icon: DollarSign, label: "Monto Estimado", value: `${pdc.currency} ${pdc.estimated_amount.toLocaleString()}` },
          { icon: Calendar, label: "Fecha Requerida", value: pdc.required_on_site_date },
          { icon: MapPin, label: "Proveedor", value: pdc.selected_supplier || "Sin asignar" },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <item.icon className="w-4 h-4" />
                <span className="text-xs">{item.label}</span>
              </div>
              <p className="text-sm font-medium truncate">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress stepper */}
      {(() => {
        const steps = [
          { key: "draft", label: "Borrador", icon: FileText },
          { key: "technical_definition", label: "Técnica", icon: Wrench },
          { key: "planning", label: "Planificación", icon: ClipboardList },
          { key: "quotation", label: "Cotización", icon: FileSearch },
          { key: "awarded", label: "Adjudicación", icon: Award },
          { key: "po_issued", label: "OC / Vendor", icon: Truck },
          { key: "fat", label: "Prueba de Fábrica", icon: FlaskConical },
          { key: "shipping", label: "Logística", icon: Ship },
          { key: "closed", label: "Cerrado", icon: Check },
        ];
        const order = ["draft","technical_definition","planning","quotation","evaluation","awarded","po_issued","drawings","fat","shipping","arrived","closed","closed_with_incident"];
        const currentIdx = order.indexOf(pdc.current_status);
        const activeStepIdx = steps.findIndex((s, i) => {
          const nextKey = steps[i + 1]?.key;
          const nextIdx = nextKey ? order.indexOf(nextKey) : order.length;
          return currentIdx >= order.indexOf(s.key) && currentIdx < nextIdx;
        });
        const progressPct = activeStepIdx >= 0 ? (activeStepIdx / (steps.length - 1)) * 100 : 0;

        return (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">Avance del proceso</h3>
                <span className="text-xs text-muted-foreground">Etapa actual: <span className="font-medium text-foreground">{steps[activeStepIdx]?.label ?? "—"}</span></span>
              </div>
              <div className="relative pt-4 pb-2">
                <div className="relative grid items-start" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
                  {steps.map((s, i) => {
                    const Icon = s.icon;
                    const isDraft = s.key === "draft";
                    const completed = i < activeStepIdx;
                    const active = i === activeStepIdx;
                    // Segment to the right of this circle (connection to next)
                    const nextCompleted = i + 1 <= activeStepIdx; // green if reached next or beyond
                    const showSegment = i < steps.length - 1;

                    // Color states
                    let circleClass = "";
                    let circleStyle: React.CSSProperties = {};
                    if (isDraft && !completed && !active) {
                      // Neutral
                      circleClass = "bg-muted border-muted-foreground/30 text-muted-foreground";
                    } else if (completed || active) {
                      // Green neon with glow
                      circleClass = "text-black";
                      circleStyle = {
                        backgroundColor: "#39FF14",
                        borderColor: "#39FF14",
                        boxShadow: "0 0 12px #39FF14, 0 0 24px rgba(57,255,20,0.6)",
                      };
                    } else {
                      // Light blue pending
                      circleClass = "text-sky-700";
                      circleStyle = {
                        backgroundColor: "rgba(125,211,252,0.25)",
                        borderColor: "#7DD3FC",
                        boxShadow: "0 0 8px rgba(125,211,252,0.6)",
                      };
                    }

                    const segmentStyle: React.CSSProperties = nextCompleted
                      ? { backgroundColor: "#39FF14", boxShadow: "0 0 8px #39FF14" }
                      : { backgroundColor: "#7DD3FC", boxShadow: "0 0 6px rgba(125,211,252,0.6)" };

                    return (
                      <div key={s.key} className="flex flex-col items-center gap-2 relative">
                        {showSegment && (
                          <div
                            className="absolute top-5 h-1 rounded-full"
                            style={{ left: "50%", right: `calc(-50% + 0px)`, width: "100%", ...segmentStyle }}
                          />
                        )}
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 transition-all ${circleClass} ${active ? "ring-4 ring-[#39FF14]/30" : ""}`}
                          style={circleStyle}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className={`text-[11px] text-center leading-tight z-10 ${active ? "font-medium text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Tabs */}
      <Tabs defaultValue="summary">
        <TabsList className="grid grid-cols-4 lg:grid-cols-9 w-full">
          <TabsTrigger value="summary">Resumen</TabsTrigger>
          <TabsTrigger value="technical">Técnica</TabsTrigger>
          <TabsTrigger value="planning">Planificación</TabsTrigger>
          <TabsTrigger value="quotations">Cotización</TabsTrigger>
          <TabsTrigger value="award">Adjudicación</TabsTrigger>
          <TabsTrigger value="vendor">OC / Vendor</TabsTrigger>
          <TabsTrigger value="fat">Prueba de Fábrica</TabsTrigger>
          <TabsTrigger value="logistics">Logística</TabsTrigger>
          <TabsTrigger value="closed">Cerrada</TabsTrigger>
        </TabsList>

        {/* Summary */}
        <TabsContent value="summary">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <h3 className="font-medium mb-1">Descripción</h3>
                <p className="text-sm text-muted-foreground">{pdc.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Categoría:</span> {pdc.category}</div>
                <div><span className="text-muted-foreground">Creado:</span> {pdc.created_at}</div>
                <div><span className="text-muted-foreground">Actualizado:</span> {pdc.updated_at}</div>
                <div><span className="text-muted-foreground">Moneda:</span> {pdc.currency}</div>
              </div>
              {alerts.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Alertas activas</h3>
                  {alerts.filter((a) => !a.resolved).map((a) => (
                    <div key={a.id} className={`border-l-4 ${a.severity === "critical" || a.severity === "high" ? "border-l-danger" : "border-l-warning"} bg-muted/30 rounded-r p-3 mb-2`}>
                      <p className="text-sm">{a.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Planning */}
        <TabsContent value="planning">
          <Card>
            <CardHeader><CardTitle className="text-base">Hitos de Planificación</CardTitle></CardHeader>
            <CardContent>
              {milestones.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin hitos registrados</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 text-left font-medium text-muted-foreground">Hito</th>
                      <th className="py-2 text-left font-medium text-muted-foreground">Fecha Plan</th>
                      <th className="py-2 text-left font-medium text-muted-foreground">Fecha Real</th>
                      <th className="py-2 text-left font-medium text-muted-foreground">Desviación</th>
                      <th className="py-2 text-left font-medium text-muted-foreground">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {milestones.map((m) => (
                      <tr key={m.id} className="border-b last:border-0">
                        <td className="py-2 font-medium">{m.milestone_type}</td>
                        <td className="py-2 text-muted-foreground">{m.planned_date}</td>
                        <td className="py-2 text-muted-foreground">{m.actual_date || "—"}</td>
                        <td className="py-2">
                          <span className={m.deviation_days > 5 ? "text-danger font-medium" : m.deviation_days > 0 ? "text-warning" : "text-success"}>
                            {m.deviation_days > 0 ? `+${m.deviation_days}d` : "0d"}
                          </span>
                        </td>
                        <td className="py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            m.status === "completed" ? "bg-success/15 text-success" :
                            m.status === "overdue" ? "bg-danger/15 text-danger" : "bg-muted text-muted-foreground"
                          }`}>{m.status === "completed" ? "Completado" : m.status === "overdue" ? "Vencido" : "Pendiente"}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Technical — Formulario ET dinámico */}
        <TabsContent value="technical">
          <EtFormPanel
            processId={pdc.id}
            demoMode={!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pdc.id)}
          />
        </TabsContent>

        {/* Quotations */}
        <TabsContent value="quotations">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Cotizaciones de Proveedores</CardTitle>
              <Button size="sm" onClick={() => toast.info("Función disponible con backend")}>Agregar Proveedor</Button>
            </CardHeader>
            <CardContent>
              {rfqSuppliers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin cotizaciones registradas</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 text-left font-medium text-muted-foreground">Proveedor</th>
                      <th className="py-2 text-left font-medium text-muted-foreground">Monto</th>
                      <th className="py-2 text-left font-medium text-muted-foreground">Plazo (días)</th>
                      <th className="py-2 text-left font-medium text-muted-foreground">Score Técnico</th>
                      <th className="py-2 text-left font-medium text-muted-foreground">Score Comercial</th>
                      <th className="py-2 text-left font-medium text-muted-foreground">Score Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rfqSuppliers.sort((a, b) => b.total_score - a.total_score).map((s, i) => (
                      <tr key={s.id} className={`border-b last:border-0 ${i === 0 ? "bg-success/5" : ""}`}>
                        <td className="py-2 font-medium">{s.supplier_name} {i === 0 && "⭐"}</td>
                        <td className="py-2 font-mono">USD {s.quoted_amount.toLocaleString()}</td>
                        <td className="py-2">{s.lead_time_days}</td>
                        <td className="py-2">{s.technical_score}</td>
                        <td className="py-2">{s.commercial_score}</td>
                        <td className="py-2 font-bold">{s.total_score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Award */}
        <TabsContent value="award">
          <Card>
            <CardHeader><CardTitle className="text-base">Adjudicación</CardTitle></CardHeader>
            <CardContent>
              {pdc.selected_supplier ? (
                <div className="space-y-4">
                  <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                    <p className="text-sm text-muted-foreground">Proveedor adjudicado</p>
                    <p className="text-lg font-bold text-success">{pdc.selected_supplier}</p>
                  </div>
                  {pos.map((po) => (
                    <div key={po.id} className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-muted-foreground">OC:</span> {po.po_number}</div>
                      <div><span className="text-muted-foreground">Monto:</span> USD {po.amount.toLocaleString()}</div>
                      <div><span className="text-muted-foreground">Emitida:</span> {po.issue_date}</div>
                      <div><span className="text-muted-foreground">Aceptada:</span> {po.accepted_date || "Pendiente"}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-4">Sin proveedor adjudicado</p>
                  {rfqSuppliers.length > 0 && (
                    <Button onClick={() => toast.info("Función disponible con backend")}>Adjudicar Proveedor</Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vendor */}
        <TabsContent value="vendor">
          <Card>
            <CardHeader><CardTitle className="text-base">Seguimiento Vendor</CardTitle></CardHeader>
            <CardContent>
              {pos.length > 0 ? (
                <div className="space-y-3 text-sm">
                  <div><span className="text-muted-foreground">Proveedor:</span> <span className="font-medium">{pdc.selected_supplier}</span></div>
                  {pos.map((po) => (
                    <div key={po.id} className="grid grid-cols-2 gap-3">
                      <div><span className="text-muted-foreground">N° OC:</span> {po.po_number}</div>
                      <div><span className="text-muted-foreground">Aceptación OC:</span> {po.accepted_date || "Pendiente"}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sin orden de compra emitida</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FAT */}
        <TabsContent value="fat">
          <Card>
            <CardHeader><CardTitle className="text-base">Prueba de Fábrica</CardTitle></CardHeader>
            <CardContent>
              {fatEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin eventos de Prueba de Fábrica registrados</p>
              ) : fatEvents.map((f) => (
                <div key={f.id} className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Programado:</span> {f.scheduled_date}</div>
                  <div><span className="text-muted-foreground">Ejecutado:</span> {f.executed_date || "Pendiente"}</div>
                  <div><span className="text-muted-foreground">Resultado:</span>
                    <span className={`ml-1 font-medium ${f.result === "passed" ? "text-success" : f.result === "failed" ? "text-danger" : "text-warning"}`}>
                      {f.result === "passed" ? "Aprobado" : f.result === "failed" ? "Reprobado" : f.result || "—"}
                    </span>
                  </div>
                  <div><span className="text-muted-foreground">Informe:</span> {f.report_received ? "Recibido ✓" : "Pendiente"}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logistics */}
        <TabsContent value="logistics">
          <Card>
            <CardHeader><CardTitle className="text-base">Logística y Embarque</CardTitle></CardHeader>
            <CardContent>
              {logistics.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin eventos logísticos registrados</p>
              ) : logistics.map((l) => (
                <div key={l.id} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Ex-Work:</span> {l.exwork_date || "—"}</div>
                    <div><span className="text-muted-foreground">Embarcado:</span> {l.shipped_date || "—"}</div>
                    <div><span className="text-muted-foreground">Arribo Chile:</span> {l.chile_arrival_date || "—"}</div>
                    <div><span className="text-muted-foreground">Puerto:</span> {l.port_arrival_date || "—"}</div>
                    <div><span className="text-muted-foreground">Daños:</span> {l.damages_reported ? "Sí ⚠️" : "No"}</div>
                  </div>
                  {/* Visual timeline */}
                  <div className="flex items-center gap-1 mt-4">
                    {[
                      { label: "Ex-Work", date: l.exwork_date },
                      { label: "Embarcado", date: l.shipped_date },
                      { label: "Arribo", date: l.chile_arrival_date },
                      { label: "Puerto", date: l.port_arrival_date },
                    ].map((step, i) => (
                      <div key={i} className="flex items-center flex-1">
                        <div className={`w-3 h-3 rounded-full shrink-0 ${step.date ? "bg-success" : "bg-muted-foreground/30"}`} />
                        <div className={`h-0.5 flex-1 ${step.date ? "bg-success" : "bg-muted-foreground/20"}`} />
                        <span className="text-[10px] text-muted-foreground absolute mt-6">{step.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Closed */}
        <TabsContent value="closed">
          <Card>
            <CardHeader><CardTitle className="text-base">Cierre del Proceso</CardTitle></CardHeader>
            <CardContent>
              {pdc.current_status === "closed" || pdc.current_status === "closed_with_incident" ? (
                <div className="space-y-3 text-sm">
                  <div className={`p-4 rounded-lg border ${pdc.current_status === "closed" ? "bg-success/10 border-success/20" : "bg-warning/10 border-warning/20"}`}>
                    <p className="text-muted-foreground">Estado de cierre</p>
                    <p className={`text-lg font-bold ${pdc.current_status === "closed" ? "text-success" : "text-warning"}`}>
                      {pdc.current_status === "closed" ? "Cerrado satisfactoriamente" : "Cerrado con incidente"}
                    </p>
                  </div>
                  <div><span className="text-muted-foreground">Última actualización:</span> {pdc.updated_at}</div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">El proceso aún no se encuentra cerrado.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
