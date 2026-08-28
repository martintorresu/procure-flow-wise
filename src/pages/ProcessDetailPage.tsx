import { useParams, Link } from "react-router-dom";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Pencil, Link2, FolderKanban } from "lucide-react";
import { toast } from "sonner";
import { useProcess } from "@/hooks/useProcesses";
import { useAlerts } from "@/hooks/useAlerts";
import { useAuth } from "@/contexts/AuthContext";
import { SEO } from "@/components/SEO";
import { formatDate, humanizeTechnicalText } from "@/lib/stageLabels";
import { PROCESS_TYPE_LABELS, canChain, type ProcessType } from "@/lib/processTypes";
import { Badge } from "@/components/ui/badge";
import { useProcessParticipants } from "@/hooks/useProcessParticipants";
import { InviteExternalDialog } from "@/components/InviteExternalDialog";
import { ProcessComments } from "@/components/ProcessComments";
import { ProcessCommitments } from "@/components/ProcessCommitments";
import { ProcessStages } from "@/components/ProcessStages";
import { ProcessDocuments } from "@/components/ProcessDocuments";
import { ProcessProgressCard } from "@/components/StageProgress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ContingencyDialog } from "@/components/ContingencyDialog";
import { ProcessContingencies } from "@/components/ProcessContingencies";
import { useCompleteContingency, useContingenciesByProcess } from "@/hooks/useProcessContingencies";
import { canManageContingencies, timeAgo } from "@/lib/contingencies";

export default function ProcessDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: process, isLoading: loading } = useProcess(id);
  const isAdmin = user?.role === "admin";

  const { data: allAlerts = [] } = useAlerts();
  const { data: participants = [] } = useProcessParticipants(process?.id);
  const { data: contingencies = [] } = useContingenciesByProcess(process?.id);
  const completeContingency = useCompleteContingency();

  // ¿El usuario actual es un participante externo (no pertenece al tenant dueño)?
  const myParticipation = participants.find((p) => p.user_id === user?.id && p.status === "accepted");
  const isInternal = !!user?.tenantId && !!process?.tenant_id && user.tenantId === process.tenant_id;
  const isExternal = !!myParticipation && !isInternal;
  const canComment = isInternal || myParticipation?.permission_level === "comment";
  const canBifurcate = isInternal && canManageContingencies(user?.role);
  const isPaused = !!process?.paused_by_contingency;
  const pausingContingency = contingencies.find((c) => c.id === process?.paused_by_contingency);

  if (loading) {
    return <div className="text-center py-20 text-muted-foreground">Cargando proceso…</div>;
  }

  if (!process) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Proceso no encontrado</p>
        <Link to="/procesos"><Button variant="outline" className="mt-4">Volver</Button></Link>
      </div>
    );
  }

  const processType = (process.process_type ?? "compra") as ProcessType;
  const showChainButton = canChain();
  const alerts = allAlerts.filter((a) => a.process_id === process.id);

  return (
    <div className="space-y-6">
      <SEO
        title={`${process.process_number} — ${process.title}`}
        description={`Detalle del proceso ${process.process_number} del proyecto ${process.project_name}.`}
        path={`/procesos/${process.id}`}
      />
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link to="/procesos">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold">{process.process_number}</h1>
              <Badge variant="outline" className="text-xs">{PROCESS_TYPE_LABELS[processType]}</Badge>
            </div>
            <p className="text-lg font-medium">{process.title}</p>
            <p className="text-sm text-muted-foreground">{process.project_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isExternal ? (
            <Badge variant="outline" className="text-xs">Acceso externo · solo lectura</Badge>
          ) : (
            <>
              {showChainButton && !isPaused && (
                <Link to={`/procesos/new?from=${process.id}`}>
                  <Button size="sm" className="gap-2">
                    <Link2 className="w-4 h-4" /> Crear proceso de continuación
                  </Button>
                </Link>
              )}
              {canBifurcate && user && (
                !isPaused && <ContingencyDialog process={process} createdBy={user.id} />
              )}
              {isAdmin && process.tenant_id && user && (
                <InviteExternalDialog processId={process.id} tenantId={process.tenant_id} invitedBy={user.id} />
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
                  <Link to={`/procesos/${process.id}/edit`}>
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
              <p className="text-sm font-medium">⏸️ Proceso pausado por contingencia</p>
              <p className="text-xs text-muted-foreground">
                {pausingContingency.reason} · Iniciada {timeAgo(pausingContingency.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link to={`/procesos/${pausingContingency.child_process_id}`}>
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

      {/* Key info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { icon: User, label: "Responsable", value: process.current_owner },
          { icon: FolderKanban, label: "Proyecto", value: process.project_name },
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

      {/* Avance real desde process_stages */}
      <ProcessProgressCard processId={process.id} />

      {/* Vista reducida para participantes externos */}
      {isExternal && (
        <>
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <h3 className="font-medium mb-1">Descripción</h3>
                <p className="text-sm text-muted-foreground">{process.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Creado:</span> {formatDate(process.created_at)}</div>
                <div><span className="text-muted-foreground">Actualizado:</span> {formatDate(process.updated_at)}</div>
              </div>
            </CardContent>
          </Card>
          {process.tenant_id && user && (
            <ProcessComments
              processId={process.id}
              tenantId={process.tenant_id}
              authorUserId={user.id}
              canComment={!!canComment}
            />
          )}
        </>
      )}

      {/* Tabs */}
      {!isExternal && (
      <Tabs defaultValue="summary">
        <TabsList className="grid grid-cols-3 lg:grid-cols-5 w-full h-auto">
          <TabsTrigger value="summary">Resumen</TabsTrigger>
          <TabsTrigger value="stages">Etapas</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="commitments">Compromisos</TabsTrigger>
          <TabsTrigger value="contingencies">Contingencias</TabsTrigger>
        </TabsList>

        <TabsContent value="stages">
          <ProcessStages processId={process.id} />
        </TabsContent>

        <TabsContent value="contingencies">
          <ProcessContingencies processId={process.id} canManage={canBifurcate} />
        </TabsContent>

        <TabsContent value="documents">
          <ProcessDocuments processId={process.id} />
        </TabsContent>

        <TabsContent value="commitments">
          <ProcessCommitments processId={process.id} />
        </TabsContent>

        {/* Summary */}
        <TabsContent value="summary">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <h3 className="font-medium mb-1">Descripción</h3>
                <p className="text-sm text-muted-foreground">{process.description || "Sin descripción."}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Tipo:</span> {PROCESS_TYPE_LABELS[processType]}</div>
                <div><span className="text-muted-foreground">Proyecto:</span> {process.project_name}</div>
                <div><span className="text-muted-foreground">Creado:</span> {formatDate(process.created_at)}</div>
                <div><span className="text-muted-foreground">Actualizado:</span> {formatDate(process.updated_at)}</div>
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
      </Tabs>
      )}

      {/* Comentarios (vista interna) */}
      {!isExternal && process.tenant_id && user && (
        <ProcessComments
          processId={process.id}
          tenantId={process.tenant_id}
          authorUserId={user.id}
          canComment
        />
      )}
    </div>
  );
}
