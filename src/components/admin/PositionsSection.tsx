import { useState } from "react";
import { toast } from "sonner";
import { BriefcaseBusiness, Check, Pencil, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { usePositions, useCreatePosition, useUpdatePosition, type Position } from "@/hooks/usePositions";
import { PROCESS_TYPE_LABELS } from "@/lib/processTypes";

const TRANSVERSAL = "__transversal__";
const GROUPS: (string | null)[] = [null, "obra", "licitacion", "contrato", "compra_industrial"];

const groupLabel = (t: string | null) =>
  t === null ? "Transversales" : (PROCESS_TYPE_LABELS[t as keyof typeof PROCESS_TYPE_LABELS] ?? t);

/** Catálogo de cargos del tenant. Solo visible para admin. */
export function PositionsSection() {
  const { user } = useAuth();
  const { data: positions = [], isLoading } = usePositions();
  const create = useCreatePosition();
  const update = useUpdatePosition();

  const [name, setName] = useState("");
  const [processType, setProcessType] = useState<string>(TRANSVERSAL);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const add = async () => {
    if (name.trim().length < 2) {
      toast.error("Escribe un nombre de cargo");
      return;
    }
    if (!user?.tenantId) {
      toast.error("No se pudo determinar la organización");
      return;
    }
    try {
      await create.mutateAsync({
        tenantId: user.tenantId,
        name,
        processType: processType === TRANSVERSAL ? null : processType,
      });
      setName("");
      toast.success("Cargo creado");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const rename = async (p: Position) => {
    if (editName.trim().length < 2) return;
    try {
      await update.mutateAsync({ id: p.id, name: editName.trim() });
      setEditingId(null);
      toast.success("Cargo actualizado");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const toggle = async (p: Position, active: boolean) => {
    try {
      await update.mutateAsync({ id: p.id, is_active: active });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BriefcaseBusiness className="w-4 h-4" /> Cargos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-xs text-muted-foreground">
          El cargo describe <strong>qué hace</strong> la persona; el nivel de acceso define{" "}
          <strong>qué puede hacer</strong> en el sistema. Los cargos son solo descriptivos y no otorgan permisos.
          Desactiva un cargo en vez de eliminarlo: seguirá visible donde ya fue usado.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto] gap-3 items-end">
          <div className="space-y-1.5">
            <Label htmlFor="new-position">Nombre del cargo</Label>
            <Input id="new-position" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jefe de Obra" />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo de proceso</Label>
            <Select value={processType} onValueChange={setProcessType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TRANSVERSAL}>Transversal</SelectItem>
                {GROUPS.filter((g): g is string => g !== null).map((g) => (
                  <SelectItem key={g} value={g}>{groupLabel(g)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={add} disabled={create.isPending}>
            {create.isPending ? "Creando…" : "Crear cargo"}
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando cargos…</p>
        ) : (
          <div className="space-y-4">
            {GROUPS.map((g) => {
              const items = positions.filter((p) => (p.process_type ?? null) === g);
              if (!items.length) return null;
              return (
                <div key={g ?? "transversal"} className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {groupLabel(g)}
                  </p>
                  <div className="divide-y rounded-md border">
                    {items.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 px-3 py-2">
                        {editingId === p.id ? (
                          <>
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="h-8 flex-1"
                            />
                            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => rename(p)}>
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setEditingId(null)}>
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-sm">{p.name}</span>
                            {!p.is_active && <Badge variant="outline" className="text-xs">Inactivo</Badge>}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2"
                              onClick={() => { setEditingId(p.id); setEditName(p.name); }}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Switch checked={p.is_active} onCheckedChange={(v) => toggle(p, v)} />
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {positions.length === 0 && (
              <p className="text-sm text-muted-foreground">Aún no hay cargos en el catálogo.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
