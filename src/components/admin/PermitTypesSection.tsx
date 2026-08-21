import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileCheck, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  usePermitTypes,
  useUpsertPermitType,
  useDeletePermitType,
  type PermitType,
} from "@/hooks/usePermits";
import { PERMIT_CATEGORIES, PERMIT_CATEGORY_LABELS } from "@/lib/permits";

const EMPTY = {
  name: "",
  category: "municipal",
  typical_authority: "",
  typical_duration_days: "",
  requires_renewal: false,
};

export function PermitTypesSection() {
  const { data: types = [], isLoading } = usePermitTypes();
  const upsert = useUpsertPermitType();
  const remove = useDeletePermitType();
  const [draft, setDraft] = useState(EMPTY);

  const save = async (t: PermitType, values: Partial<PermitType>) => {
    try {
      await upsert.mutateAsync({ id: t.id, name: t.name, ...values });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const add = async () => {
    if (!draft.name.trim()) { toast.error("Indica el nombre del tipo"); return; }
    try {
      await upsert.mutateAsync({
        name: draft.name.trim(),
        category: draft.category,
        typical_authority: draft.typical_authority.trim() || null,
        typical_duration_days: draft.typical_duration_days ? Number(draft.typical_duration_days) : null,
        requires_renewal: draft.requires_renewal,
        sort_order: (types.at(-1)?.sort_order ?? 0) + 1,
        enabled: true,
      });
      setDraft(EMPTY);
      toast.success("Tipo de permiso agregado");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileCheck className="w-4 h-4" /> Catálogo de tipos de permiso
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Define los permisos de obra que tu organización tramita. La duración típica se usa para sugerir la fecha de vencimiento.
        </p>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando catálogo…</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="w-[140px]">Categoría</TableHead>
                <TableHead className="w-[160px]">Entidad típica</TableHead>
                <TableHead className="w-[120px]">Duración (días)</TableHead>
                <TableHead className="w-[100px]">Renovable</TableHead>
                <TableHead className="w-[90px]">Activo</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium text-sm">{t.name}</TableCell>
                  <TableCell className="text-xs">
                    {PERMIT_CATEGORY_LABELS[t.category ?? "otro"] ?? t.category ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Input
                      defaultValue={t.typical_authority ?? ""}
                      className="h-8"
                      onBlur={(e) => e.target.value !== (t.typical_authority ?? "") && save(t, { typical_authority: e.target.value || null })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number" min={0} className="h-8"
                      defaultValue={t.typical_duration_days ?? ""}
                      onBlur={(e) => save(t, { typical_duration_days: e.target.value ? Number(e.target.value) : null })}
                    />
                  </TableCell>
                  <TableCell>
                    <Switch checked={t.requires_renewal} onCheckedChange={(v) => save(t, { requires_renewal: v })} />
                  </TableCell>
                  <TableCell>
                    <Switch checked={t.enabled} onCheckedChange={(v) => save(t, { enabled: v })} />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" aria-label="Eliminar tipo" onClick={() => remove.mutate(t.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center border-t pt-4">
          <Input placeholder="Nombre" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERMIT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{PERMIT_CATEGORY_LABELS[c]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Entidad" value={draft.typical_authority} onChange={(e) => setDraft({ ...draft, typical_authority: e.target.value })} />
          <Input type="number" min={0} placeholder="Días" value={draft.typical_duration_days} onChange={(e) => setDraft({ ...draft, typical_duration_days: e.target.value })} />
          <label className="flex items-center gap-2 text-xs">
            <Switch checked={draft.requires_renewal} onCheckedChange={(v) => setDraft({ ...draft, requires_renewal: v })} />
            Renovable
          </label>
          <Button onClick={add} disabled={upsert.isPending}><Plus className="w-4 h-4 mr-1" /> Agregar</Button>
        </div>
      </CardContent>
    </Card>
  );
}
