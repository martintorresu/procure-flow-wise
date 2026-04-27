import { useState } from "react";
import { mockPdcs, getTrafficLight } from "@/data/mockData";
import { usePdcs } from "@/hooks/usePdcs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, TrafficLightIndicator, CriticalityBadge } from "@/components/StatusIndicators";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import type { PdcStatus, Criticality } from "@/types/pdc";

export default function PdcListPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [criticalityFilter, setCriticalityFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const { pdcs: realPdcs, loading } = usePdcs();

  // Combinar PdCs reales (al inicio) con los mocks de demo
  const allPdcs = [...realPdcs, ...mockPdcs];

  const filtered = allPdcs.filter((pdc) => {
    if (statusFilter !== "all" && pdc.current_status !== statusFilter) return false;
    if (criticalityFilter !== "all" && pdc.criticality !== criticalityFilter) return false;
    if (search && !pdc.title.toLowerCase().includes(search.toLowerCase()) && !pdc.pdc_number.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Procesos de Compra</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} procesos encontrados</p>
        </div>
        <Link to="/pdcs/new">
          <Button><Plus className="w-4 h-4 mr-2" />Crear PdC</Button>
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
                <SelectItem value="fat">FAT</SelectItem>
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
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">N° PdC</th>
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
                {filtered.map((pdc) => (
                  <tr key={pdc.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4"><TrafficLightIndicator color={getTrafficLight(pdc)} /></td>
                    <td className="py-3 px-4 font-mono text-xs font-medium">{pdc.pdc_number}</td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">{pdc.project}</td>
                    <td className="py-3 px-4 font-medium">{pdc.title}</td>
                    <td className="py-3 px-4"><StatusBadge status={pdc.current_status} /></td>
                    <td className="py-3 px-4 text-muted-foreground">{pdc.current_owner}</td>
                    <td className="py-3 px-4"><CriticalityBadge level={pdc.criticality} /></td>
                    <td className="py-3 px-4 font-mono text-xs">{pdc.currency} {pdc.estimated_amount.toLocaleString()}</td>
                    <td className="py-3 px-4">
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
