import { useMemo } from "react";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardList, GitBranch } from "lucide-react";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessRules, useRequirementCatalog, type RequirementCatalogItem } from "@/hooks/useRequirements";

export default function RequirementTemplatePage() {
  const { user } = useAuth();
  const { data: catalog = [], isLoading } = useRequirementCatalog();
  const { data: rules = [], isLoading: loadingRules } = useBusinessRules();

  const byStage = useMemo(() => {
    const map = new Map<number, { name: string; items: RequirementCatalogItem[] }>();
    for (const item of catalog) {
      const entry = map.get(item.stage_number) ?? { name: item.stage_name, items: [] };
      entry.items.push(item);
      map.set(item.stage_number, entry);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [catalog]);

  if (user && user.role !== "admin" && user.role !== "gestor") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      <SEO
        title="Plantilla Permisos DOM"
        description="Catálogo de actividades y reglas de negocio de la plantilla Permisos DOM."
        path="/plantilla-dom"
      />
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-accent" /> Plantilla Permisos DOM
        </h1>
        <p className="text-sm text-muted-foreground">
          Material de referencia: {catalog.length} actividades y {rules.length} reglas de negocio.
        </p>
      </div>

      {isLoading && <Skeleton className="h-64 w-full" />}

      {byStage.map(([stageNumber, stage]) => (
        <Card key={stageNumber}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Etapa {stageNumber} · {stage.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Código</TableHead>
                  <TableHead className="min-w-[240px]">Actividad</TableHead>
                  <TableHead className="min-w-[140px]">Responsable</TableHead>
                  <TableHead className="min-w-[180px]">Evidencia</TableHead>
                  <TableHead className="min-w-[240px]">Compuerta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stage.items.map((item) => (
                  <TableRow key={item.id} className="align-top">
                    <TableCell className="font-mono text-xs">{item.code}</TableCell>
                    <TableCell className="text-sm">{item.activity}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.responsible_role ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.evidence ?? "—"}</TableCell>
                    <TableCell className="text-sm">
                      {item.gate_code ? (
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-[10px] font-mono">
                            <GitBranch className="w-3 h-3 mr-1" />
                            {item.gate_code}
                          </Badge>
                          {item.gate_question && <p className="text-xs">{item.gate_question}</p>}
                          {item.gate_route_si && (
                            <p className="text-xs text-muted-foreground">Sí → {item.gate_route_si}</p>
                          )}
                          {item.gate_route_no && (
                            <p className="text-xs text-muted-foreground">No → {item.gate_route_no}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Reglas de negocio</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loadingRules && <Skeleton className="h-32 w-full" />}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Código</TableHead>
                <TableHead className="min-w-[280px]">Condición</TableHead>
                <TableHead className="min-w-[280px]">Acción del sistema</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((r) => (
                <TableRow key={r.id} className="align-top">
                  <TableCell className="font-mono text-xs">{r.code}</TableCell>
                  <TableCell className="text-sm">{r.condicion}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.accion_sistema}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
