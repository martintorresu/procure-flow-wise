import { useState } from "react";
import { getTrafficLight } from "@/lib/trafficLight";
import { usePdcs } from "@/hooks/usePdcs";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge, TrafficLightIndicator, CriticalityBadge } from "@/components/StatusIndicators";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SEO } from "@/components/SEO";

export default function PdcListPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [criticalityFilter, setCriticalityFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const { data: pdcs = [], isLoading: loading } = usePdcs();

  const filtered = pdcs.filter((pdc) => {
    if (statusFilter !== "all" && pdc.current_status !== statusFilter) return false;
    if (criticalityFilter !== "all" && pdc.criticality !== criticalityFilter) return false;
    if (search && !pdc.title.toLowerCase().includes(search.toLowerCase()) && !pdc.pdc_number.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <SEO title="Procesos" description="Listado de procesos con filtros por estado, criticidad y semáforo." path="/pdcs" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Procesos</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Cargando…" : `${filtered.length} procesos encontrados`}
          </p>
        </div>
        <Link to="/pdcs/new">
          <Button><Plus className="w-4 h-4 mr-2" />Crear Proceso</Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar por número o título..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="technical_definition">Def. Técnica</SelectItem>
                <SelectItem value="quotation">Cotización</SelectItem>
                <SelectItem value="po_issued">OC Emitida</SelectItem>
                <SelectItem value="fat">Prueba de Fábrica</SelectItem>
                <SelectItem value="shipping">En Tránsito</SelectItem>
              </SelectContent>
            </Select>
            <Select value={criticalityFilter} onValueChange={setCriticalityFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Criticidad" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toda criticidad</SelectItem>
                <SelectItem value="low">Baja</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">⚡</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">N° Proceso</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Proyecto</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Título</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Estado</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Responsable</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Criticidad</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Monto Est.</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Acción</th>
                </tr>
              </thead>
              <tbody>
                {loading && [0,1,2,3].map((i) => (
                  <tr key={i} className="border-b last:border-0">
                    {Array.from({length: 9}).map((_, j) => (
                      <td key={j} className="py-3 px-4"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <FileText className="w-8 h-8 opacity-40" />
                        <p className="text-sm font-medium">Sin procesos</p>
                        <p className="text-xs">Crea tu primer proceso con el botón "Crear Proceso".</p>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && filtered.map((pdc) => (
                  <tr
                    key={pdc.id}
                    role="button"
                    tabIndex={0}
                    className="border-b last:border-0 hover:bg-muted/50 hover:cursor-pointer transition-colors"
                    onClick={() => navigate(`/pdcs/${pdc.id}`)}
                  >
                    <td className="py-3 px-4"><TrafficLightIndicator color={getTrafficLight(pdc)} /></td>
                    <td className="py-3 px-4 font-mono text-xs font-medium">{pdc.pdc_number}</td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">{pdc.project}</td>
                    <td className="py-3 px-4 font-medium">{pdc.title}</td>
                    <td className="py-3 px-4"><StatusBadge status={pdc.current_status} /></td>
                    <td className="py-3 px-4 text-muted-foreground">{pdc.current_owner}</td>
                    <td className="py-3 px-4"><CriticalityBadge level={pdc.criticality} /></td>
                    <td className="py-3 px-4 font-mono text-xs">{pdc.currency} {pdc.estimated_amount.toLocaleString()}</td>
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <Link to={`/pdcs/${pdc.id}`}>
                        <Button variant="outline" size="sm">Ver detalle</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
