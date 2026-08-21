import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ArrowDown, User, FolderKanban } from "lucide-react";
import { SEO } from "@/components/SEO";
import { StatusBadge, TrafficLightIndicator } from "@/components/StatusIndicators";
import { getTrafficLight } from "@/lib/trafficLight";
import { useProject, useProjectProcesses } from "@/hooks/useProjects";
import { PROCESS_TYPE_LABELS, type ProcessType } from "@/lib/processTypes";
import type { Pdc } from "@/types/pdc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectPermitsSection } from "@/components/permits/ProjectPermitsSection";

/** Ordena los procesos siguiendo predecessor → continuación; los huérfanos al final. */
function buildChains(processes: Pdc[]): Pdc[][] {
  const byId = new Map(processes.map((p) => [p.id, p]));
  const children = new Map<string, Pdc[]>();
  const roots: Pdc[] = [];
  for (const p of processes) {
    const parentId = p.predecessor_process_id;
    if (parentId && byId.has(parentId)) {
      const list = children.get(parentId) ?? [];
      list.push(p);
      children.set(parentId, list);
    } else {
      roots.push(p);
    }
  }
  const chains: Pdc[][] = [];
  const walk = (node: Pdc, acc: Pdc[]) => {
    acc.push(node);
    const kids = children.get(node.id) ?? [];
    if (kids.length === 0) {
      chains.push(acc);
      return;
    }
    kids.forEach((k, i) => walk(k, i === 0 ? acc : [...acc.slice(0, -1), node]));
  };
  roots.forEach((r) => walk(r, []));
  return chains;
}

export default function ProjectChainPage() {
  const { id } = useParams();
  const { data: project } = useProject(id);
  const { data: processes = [], isLoading } = useProjectProcesses(id);

  const chains = useMemo(() => buildChains(processes), [processes]);

  return (
    <div className="space-y-6">
      <SEO
        title={project ? `Proyecto ${project.name}` : "Proyecto"}
        description="Cadena de procesos encadenados del proyecto, con tipo, estado, responsable y semáforo."
        path={`/projects/${id}`}
      />
      <div className="flex items-center gap-3">
        <Link to="/projects">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-accent" /> {project?.name ?? "Proyecto"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Cargando…" : `${processes.length} procesos en la cadena`}
          </p>
        </div>
      </div>

      <Tabs defaultValue="processes">
        <TabsList>
          <TabsTrigger value="processes">Procesos</TabsTrigger>
          <TabsTrigger value="permits">Permisos</TabsTrigger>
        </TabsList>

        <TabsContent value="processes" className="space-y-6 mt-4">
          {isLoading && <Skeleton className="h-40 w-full" />}

          {!isLoading && processes.length === 0 && (
            <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
              Este proyecto aún no tiene procesos.
            </CardContent></Card>
          )}

          <div className="space-y-8">
            {chains.map((chain, ci) => (
              <div key={ci} className="space-y-2">
                {chain.map((p, i) => (
                  <div key={`${ci}-${p.id}`} className="space-y-2">
                    <Card className="transition-colors hover:border-primary/40">
                      <CardContent className="p-4 flex flex-wrap items-center gap-3">
                        <TrafficLightIndicator color={getTrafficLight(p)} />
                        <Badge variant="outline" className="text-xs">
                          {PROCESS_TYPE_LABELS[(p.process_type ?? "compra") as ProcessType]}
                        </Badge>
                        <span className="font-mono text-xs">{p.pdc_number}</span>
                        <span className="font-medium flex-1 min-w-[160px] truncate">{p.title}</span>
                        <StatusBadge status={p.current_status} />
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="w-3 h-3" /> {p.current_owner}
                        </span>
                        <Link to={`/pdcs/${p.id}`}>
                          <Button variant="outline" size="sm">Ver ficha</Button>
                        </Link>
                      </CardContent>
                    </Card>
                    {i < chain.length - 1 && (
                      <div className="flex justify-center">
                        <ArrowDown
                          className="w-5 h-5"
                          style={{ color: "#39FF14", filter: "drop-shadow(0 0 6px #39FF14)" }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
    </div>
        </TabsContent>

        <TabsContent value="permits" className="mt-4">
          <ProjectPermitsSection projectId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
