import { useState } from "react";
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
import { useApprovePdc } from "@/hooks/useApprovalMatrix";
import { SEO } from "@/components/SEO";
import { ProcessStepper } from "@/components/ProcessStepper";
import { PURCHASE_STEPS, PURCHASE_STATUS_ORDER } from "@/lib/processStages";
import { ProcessStepperZoom } from "@/components/ProcessStepperZoom";
import { computeStageProgress } from "@/lib/stageProgress";
import { formatDate, humanizeTechnicalText } from "@/lib/stageLabels";
import type { Pdc, PdcMilestone } from "@/types/pdc";
import { useStageTemplates, stageIcon } from "@/hooks/useStageTemplates";
import { GENERIC_STAGES, PROCESS_TYPE_LABELS, canChain, genericStageIndex, isPurchaseType, type ProcessType } from "@/lib/processTypes";
import { Badge } from "@/components/ui/badge";
import { Link2 } from "lucide-react";
import { useProcessParticipants } from "@/hooks/useProcessParticipants";
import { InviteExternalDialog } from "@/components/InviteExternalDialog";
import { ProcessComments } from "@/components/ProcessComments";
import { ProcessCommitments } from "@/components/ProcessCommitments";
import { ProcessStages } from "@/components/ProcessStages";
import { ProcessDocuments } from "@/components/ProcessDocuments";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ContingencyDialog } from "@/components/ContingencyDialog";
import { ProcessContingencies } from "@/components/ProcessContingencies";
import { useCompleteContingency, useContingenciesByProcess } from "@/hooks/useProcessContingencies";
import { canManageContingencies, timeAgo } from "@/lib/contingencies";



function ApproveButton({ pdcId }: { pdcId: string }) {
  const m = useApprovePdc();
  return (
    <Button
      size="sm"
      disabled={m.isPending}
      onClick={() => m.mutate(pdcId, {
        onSuccess: () => toast.success("Aprobado y avanzado"),
        onError: (e) => toast.error((e as Error).message),
      })}
    >
      {m.isPending ? "Aprobando…" : "Aprobar"}
    </Button>
  );
}

const STATUS_ORDER = PURCHASE_STATUS_ORDER;

function PurchaseStepperCard({ pdc, milestones }: { pdc: Pdc; milestones: PdcMilestone[] }) {
  const [showFull, setShowFull] = useState(false);
  const steps = PURCHASE_STEPS;
  const idx = STATUS_ORDER.indexOf(pdc.current_status);
  const activeStepIdx = idx >= 0 ? idx : 0;
  const useZoom = steps.length > 6 && !showFull;
  const progress = computeStageProgress(milestones, steps[activeStepIdx].key, pdc.created_at);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">Avance del proceso</h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              Etapa actual: <span className="font-medium text-foreground">{steps[activeStepIdx]?.label ?? "—"}</span>
            </span>
            <button
              type="button"
              onClick={() => setShowFull((v) => !v)}
              className="text-xs text-accent hover:underline"
            >
              {useZoom ? `Ver flujo completo (${steps.length} etapas)` : "Ver etapa crítica"}
            </button>
          </div>
        </div>
        {useZoom ? (
          <ProcessStepperZoom steps={steps} activeIndex={activeStepIdx} progress={progress} />
        ) : (
          <ProcessStepper steps={steps} activeIndex={activeStepIdx} />
        )}
      </CardContent>
    </Card>
  );
}




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
  const { data: stageTemplates = [] } = useStageTemplates(pdc?.process_type);
  const { data: participants = [] } = useProcessParticipants(pdc?.id);
  const { data: contingencies = [] } = useContingenciesByProcess(pdc?.id);
  const completeContingency = useCompleteContingency();

  // ¿El usuario actual es un participante externo (no pertenece al tenant dueño)?
  const myParticipation = participants.find((p) => p.user_id === user?.id && p.status === "accepted");
  const isInternal = !!user?.tenantId && !!pdc?.tenant_id && user.tenantId === pdc.tenant_id;
  const isExternal = !!myParticipation && !isInternal;
  const canComment = isInternal || myParticipation?.permission_level === "comment";
  const canBifurcate = isInternal && canManageContingencies(user?.role);
  const isPaused = !!pdc?.paused_by_contingency;
  const pausingContingency = contingencies.find((c) => c.id === pdc?.paused_by_contingency);



  if (loading) {
    return <div className="text-center py-20 text-muted-foreground">Cargando proceso…</div>;
  }

  if (!pdc) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Proceso no encontrado</p>
        <Link to="/pdcs"><Button variant="outline" className="mt-4">Volver</Button></Link>
      </div>
    );
  }

  const rfqSuppliers = rfqsData?.suppliers ?? [];
  const processType = (pdc.process_type ?? "compra") as ProcessType;
  const isPurchase = isPurchaseType(processType);
  const showChainButton = canChain(processType, pdc.current_stage, pdc.current_status);
  const alerts = allAlerts.filter((a) => a.pdc_id === pdc.id);

  // Etapas del stepper genérico: plantilla configurable del tenant, con fallback a GENERIC_STAGES
  const activeTemplates = stageTemplates.filter((t) => t.active);
  const genericSteps = activeTemplates.length
    ? activeTemplates.map((t) => ({ key: t.stage_key, label: t.label, icon: stageIcon(t.icon_name) }))
    : GENERIC_STAGES.map((g, i) => ({
        key: g.key,
        label: g.label,
        icon: [FileText, ClipboardList, Wrench, Check][i],
      }));
  const genericActiveIndex = Math.min(genericStageIndex(pdc.current_stage), genericSteps.length - 1);

  return (
    <div className="space-y-6">
      <SEO title={`${pdc.pdc_number} — ${pdc.title}`} description={`Detalle del proceso ${pdc.pdc_number}: estado ${pdc.current_status}, proyecto ${pdc.project}.`} path={`/pdcs/${pdc.id}`} />
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
              <Badge variant="outline" className="text-xs">
                {isPurchase ? "Proceso de Compra" : PROCESS_TYPE_LABELS[processType]}
              </Badge>
            </div>
            <p className="text-lg font-medium">{pdc.title}</p>
            <p className="text-sm text-muted-foreground">{pdc.project}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isExternal ? (
            <Badge variant="outline" className="text-xs">Acceso externo · solo lectura</Badge>
          ) : (
            <>
              {showChainButton && !isPaused && (
                <Link to={`/pdcs/new?from=${pdc.id}`}>
                  <Button size="sm" className="gap-2">
                    <Link2 className="w-4 h-4" /> Crear proceso de continuación
                  </Button>
                </Link>
              )}
              {canBifurcate && user && !isPaused && (
                <ContingencyDialog pdc={pdc} createdBy={user.id} />
              )}
              {isAdmin && pdc.tenant_id && user && (
                <InviteExternalDialog processId={pdc.id} tenantId={pdc.tenant_id} invitedBy={user.id} />
              )}
              {isAdmin && (
                isPaused ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button variant="outline" size="sm" className="gap-2" disabled>
                            <Pencil className="w-4 h-4" /> Editar
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">
                        Proceso pausado por contingencia
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <Link to={`/pdcs/${pdc.id}/edit`}>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Pencil className="w-4 h-4" /> Editar
                    </Button>
                  </Link>
                )
              )}
            </>
          )}
        </div>

      </div>

      {isPaused && pausingContingency && (
        <Card className="border-l-4 border-l-amber-500 bg-amber-500/5">
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">
                ⏸️ Proceso pausado por contingencia
              </p>
              <p className="text-xs text-muted-foreground">
                {pausingContingency.reason} · Iniciada {timeAgo(pausingContingency.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link to={`/pdcs/${pausingContingency.child_process_id}`}>
                <Button variant="outline" size="sm">Ver contingencia</Button>
              </Link>
              {canBifurcate && (
                <Button
                  size="sm"
                  disabled={completeContingency.isPending}
                  onClick={() =>
                    completeContingency.mutate(pausingContingency.id, {
                      onSuccess: () => toast.success("Contingencia completada. Proceso reanudado."),
                      onError: (e: Error) => toast.error(e.message),
                    })
                  }
                >
                  Completar y reanudar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {pdc.approval_status === "pending" && (
        <Card className="border-l-4 border-l-warning bg-warning/5">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Esperando aprobación de {pdc.approval_required_role}</p>
              <p className="text-xs text-muted-foreground">
                Avance bloqueado a la etapa <code className="bg-muted px-1 rounded">{pdc.approval_target_stage}</code> hasta que el rol indicado apruebe.
              </p>
            </div>
            {(user?.role === pdc.approval_required_role || user?.role === "admin") && (
              <ApproveButton pdcId={pdc.id} />
            )}
          </CardContent>
        </Card>
      )}


      {/* Key info cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: User, label: "Responsable", value: pdc.current_owner },
          ...(isExternal ? [] : [{ icon: DollarSign, label: "Monto Estimado", value: `${pdc.currency} ${pdc.estimated_amount.toLocaleString()}` }]),
          { icon: Calendar, label: "Fecha Requerida", value: pdc.required_on_site_date },
          ...(isExternal ? [] : [{ icon: MapPin, label: "Proveedor", value: pdc.selected_supplier || "Sin asignar" }]),
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
      {!isPurchase && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">Avance del proceso</h3>
              <span className="text-xs text-muted-foreground">
                Etapa actual:{" "}
                <span className="font-medium text-foreground">
                  {genericSteps[genericActiveIndex].label}
                </span>
              </span>
            </div>
            <ProcessStepper steps={genericSteps} activeIndex={genericActiveIndex} />
          </CardContent>
        </Card>
      )}
      {isPurchase && (
        <PurchaseStepperCard pdc={pdc} milestones={milestones} />
      )}


      {/* Vista reducida para participantes externos */}
      {isExternal && (
        <>
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <h3 className="font-medium mb-1">Descripción</h3>
                <p className="text-sm text-muted-foreground">{pdc.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Categoría:</span> {pdc.category}</div>
                <div><span className="text-muted-foreground">Creado:</span> {formatDate(pdc.created_at)}</div>
                <div><span className="text-muted-foreground">Actualizado:</span> {formatDate(pdc.updated_at)}</div>
              </div>
            </CardContent>
          </Card>
          {pdc.tenant_id && user && (
            <ProcessComments
              processId={pdc.id}
              tenantId={pdc.tenant_id}
              authorUserId={user.id}
              canComment={!!canComment}
            />
          )}
        </>
      )}

      {/* Tabs */}
      {!isExternal && (
      <Tabs defaultValue="summary">

        <TabsList className="grid grid-cols-4 lg:grid-cols-13 w-full">
          <TabsTrigger value="summary">Resumen</TabsTrigger>
          <TabsTrigger value="stages">Etapas</TabsTrigger>
          <TabsTrigger value="technical">Técnica</TabsTrigger>
          <TabsTrigger value="planning">Planificación</TabsTrigger>
          <TabsTrigger value="quotations">Cotización</TabsTrigger>
          <TabsTrigger value="award">Adjudicación</TabsTrigger>
          <TabsTrigger value="vendor">OC / Vendor</TabsTrigger>
          <TabsTrigger value="fat">Prueba de Fábrica</TabsTrigger>
          <TabsTrigger value="logistics">Logística</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="commitments">Compromisos</TabsTrigger>
          <TabsTrigger value="contingencies">Contingencias</TabsTrigger>
          <TabsTrigger value="closed">Cerrada</TabsTrigger>
        </TabsList>

        <TabsContent value="stages">
          <ProcessStages processId={pdc.id} />
        </TabsContent>

        <TabsContent value="contingencies">
          <ProcessContingencies processId={pdc.id} canManage={canBifurcate} />
        </TabsContent>

        <TabsContent value="documents">
          <ProcessDocuments processId={pdc.id} />

        </TabsContent>

        <TabsContent value="commitments">
          <ProcessCommitments pdcId={pdc.id} />
        </TabsContent>



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
                <div><span className="text-muted-foreground">Creado:</span> {formatDate(pdc.created_at)}</div>
                <div><span className="text-muted-foreground">Actualizado:</span> {formatDate(pdc.updated_at)}</div>
                <div><span className="text-muted-foreground">Moneda:</span> {pdc.currency}</div>
              </div>
              {alerts.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Alertas activas</h3>
                  {alerts.filter((a) => !a.resolved).map((a) => (
                    <div key={a.id} className={`border-l-4 ${a.severity === "critical" || a.severity === "high" ? "border-l-danger" : "border-l-warning"} bg-muted/30 rounded-r p-3 mb-2`}>
                      <p className="text-sm">{humanizeTechnicalText(a.message)}</p>
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
                  <div className="relative flex items-center gap-1 mt-4 mb-6">
                    {[
                      { label: "Ex-Work", date: l.exwork_date },
                      { label: "Embarcado", date: l.shipped_date },
                      { label: "Arribo", date: l.chile_arrival_date },
                      { label: "Puerto", date: l.port_arrival_date },
                    ].map((step, i) => (
                      <div key={i} className="relative flex items-center flex-1">
                        <div className={`w-3 h-3 rounded-full shrink-0 ${step.date ? "bg-success" : "bg-muted-foreground/30"}`} />
                        <div className={`h-0.5 flex-1 ${step.date ? "bg-success" : "bg-muted-foreground/20"}`} />
                        <span className="absolute top-5 left-0 text-[10px] text-muted-foreground whitespace-nowrap">{step.label}</span>
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
                  <div><span className="text-muted-foreground">Última actualización:</span> {formatDate(pdc.updated_at)}</div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">El proceso aún no se encuentra cerrado.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      )}

      {/* Comentarios (vista interna) */}
      {!isExternal && pdc.tenant_id && user && (
        <ProcessComments
          processId={pdc.id}
          tenantId={pdc.tenant_id}
          authorUserId={user.id}
          canComment
        />
      )}
    </div>

  );
}
