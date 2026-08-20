import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ListOrdered, Plus, Trash2 } from "lucide-react";
import {
  CONFIGURABLE_PROCESS_TYPES,
  useAddStageTemplate,
  useDeleteStageTemplate,
  useStageTemplates,
  useUpdateStageTemplates,
  type ConfigurableProcessType,
  type StageTemplate,
} from "@/hooks/useStageTemplates";
import { PROCESS_TYPE_LABELS } from "@/lib/processTypes";

export function StageTemplatesSection() {
  const [processType, setProcessType] = useState<ConfigurableProcessType>("licitacion");
  const { data: rows = [], isLoading } = useStageTemplates(processType);
  const updateMutation = useUpdateStageTemplates();
  const addMutation = useAddStageTemplate();
  const deleteMutation = useDeleteStageTemplate();

  const [draft, setDraft] = useState<StageTemplate[]>([]);
  const [newLabel, setNewLabel] = useState("");

  useEffect(() => {
    setDraft(rows.map((r) => ({ ...r })));
  }, [rows]);

  const dirty = useMemo(() => {
    if (draft.length !== rows.length) return false;
    return draft.some((d, i) => {
      const orig = rows.find((r) => r.id === d.id);
      return !orig || orig.label !== d.label || orig.active !== d.active || orig.order_index !== i;
    });
  }, [draft, rows]);

  const setField = <K extends keyof StageTemplate>(id: string, k: K, v: StageTemplate[K]) =>
    setDraft((p) => p.map((r) => (r.id === id ? { ...r, [k]: v } : r)));

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= draft.length) return;
    setDraft((p) => {
      const next = [...p];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const save = async () => {
    try {
      await updateMutation.mutateAsync(
        draft.map((d, i) => ({ id: d.id, label: d.label, order_index: i, active: d.active })),
      );
      toast.success("Etapas actualizadas");
    } catch (e) {
      toast.error(`Error: ${(e as Error).message}`);
    }
  };

  const addStage = async () => {
    const label = newLabel.trim();
    if (!label) return;
    try {
      await addMutation.mutateAsync({ processType, label, orderIndex: draft.length });
      setNewLabel("");
      toast.success("Etapa agregada");
    } catch (e) {
      toast.error(`Error: ${(e as Error).message}`);
    }
  };

  const removeStage = async (row: StageTemplate) => {
    if (draft.length <= 1) {
      toast.error("Debe quedar al menos una etapa para este tipo de proceso.");
      return;
    }
    if (!window.confirm(`¿Eliminar la etapa "${row.label}"?`)) return;
    try {
      await deleteMutation.mutateAsync(row.id);
      toast.success("Etapa eliminada");
    } catch (e) {
      toast.error(`Error: ${(e as Error).message}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ListOrdered className="w-4 h-4" /> Etapas por Tipo de Proceso
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Define las etapas que se muestran en la ficha de cada tipo de proceso. Los procesos de{" "}
          <strong>Compra</strong> usan un flujo fijo de 8 etapas y no son configurables, para no romper
          procesos existentes.
        </p>

        <div className="w-[240px]">
          <Select value={processType} onValueChange={(v) => setProcessType(v as ConfigurableProcessType)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CONFIGURABLE_PROCESS_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{PROCESS_TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando etapas…</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">#</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead className="w-[110px]">Orden</TableHead>
                  <TableHead className="w-[80px]">Activa</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {draft.map((r, i) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-muted-foreground text-sm">{i + 1}</TableCell>
                    <TableCell>
                      <Input
                        value={r.label}
                        onChange={(e) => setField(r.id, "label", e.target.value)}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="outline" className="h-8 w-8"
                          disabled={i === 0} onClick={() => move(i, -1)} aria-label="Subir etapa">
                          <ArrowUp className="w-3 h-3" />
                        </Button>
                        <Button size="icon" variant="outline" className="h-8 w-8"
                          disabled={i === draft.length - 1} onClick={() => move(i, 1)} aria-label="Bajar etapa">
                          <ArrowDown className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch checked={r.active} onCheckedChange={(v) => setField(r.id, "active", v)} />
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" className="h-8 w-8"
                        onClick={() => removeStage(r)} aria-label="Eliminar etapa">
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {draft.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-sm text-muted-foreground">
                      Sin etapas definidas para este tipo.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <div className="flex items-center gap-2">
              <Input
                placeholder="Nombre de la nueva etapa"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="h-9 max-w-xs"
              />
              <Button variant="outline" onClick={addStage} disabled={!newLabel.trim() || addMutation.isPending}>
                <Plus className="w-4 h-4 mr-1" /> Agregar etapa
              </Button>
            </div>

            <Button onClick={save} disabled={!dirty || updateMutation.isPending}>
              {updateMutation.isPending ? "Guardando…" : "Guardar cambios"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
