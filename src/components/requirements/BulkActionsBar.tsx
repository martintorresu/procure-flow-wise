import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { TenantUser } from "@/hooks/useTenantUsers";
import { useBulkUpdateRequirements, type RequirementItem } from "@/hooks/useProjectRequirementItems";

const NONE = "__none";

/** Acciones en lote del gestor: resolver «Revisión requerida» y asignar responsable/fecha. */
export function BulkActionsBar({
  items, projectId, users, onDone,
}: { items: RequirementItem[]; projectId: string; users: TenantUser[]; onDone: () => void }) {
  const bulk = useBulkUpdateRequirements(projectId);
  const { toast } = useToast();
  const [just, setJust] = useState("");
  const [owner, setOwner] = useState(NONE);
  const [ext, setExt] = useState("");
  const [due, setDue] = useState("");

  const run = async (patch: Partial<RequirementItem>, label: string, only?: (i: RequirementItem) => boolean) => {
    const target = items.filter(only ?? (() => true));
    if (!target.length) { toast({ title: "Ningún requisito seleccionado aplica a esta acción" }); return; }
    try {
      await bulk.mutateAsync(target.map((i) => ({ id: i.id, patch })));
      toast({ title: `${label}: ${target.length} requisitos` });
      onDone();
    } catch (e) {
      toast({ title: "No se pudo aplicar", description: (e as Error).message, variant: "destructive" });
    }
  };

  const review = (i: RequirementItem) => i.applicability === "review_required";

  return (
    <div className="mt-3 space-y-3 rounded border border-primary/40 bg-primary/5 p-3 text-sm">
      <p className="font-medium">{items.length} seleccionados · {items.filter(review).length} en revisión requerida</p>
      <div className="flex flex-wrap items-end gap-2">
        <Button size="sm" variant="outline" disabled={bulk.isPending} onClick={() => run({ applicability: "applicable" }, "Marcados Aplica", review)}>Marcar Aplica</Button>
        <Textarea className="min-h-[38px] flex-1" placeholder="Justificación común para «No aplica» (obligatoria)" value={just} onChange={(e) => setJust(e.target.value)} />
        <Button size="sm" variant="outline" disabled={bulk.isPending || !just.trim()}
          onClick={() => run({ applicability: "not_applicable", justification: just.trim() }, "Marcados No aplica", review)}>Marcar No aplica</Button>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <Select value={owner} onValueChange={setOwner}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Usuario responsable" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Sin usuario</SelectItem>
            {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input className="w-56" placeholder="o nombre externo" value={ext} onChange={(e) => setExt(e.target.value)} />
        <Input className="w-44" type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Fecha comprometida" />
        <Button size="sm" disabled={bulk.isPending || (owner === NONE && !ext.trim() && !due)} onClick={() => {
          const patch: Partial<RequirementItem> = {};
          if (owner !== NONE) { patch.owner_user_id = owner; patch.owner_name = null; }
          else if (ext.trim()) { patch.owner_name = ext.trim(); patch.owner_user_id = null; }
          if (due) patch.due_date = due;
          void run(patch, "Asignados");
        }}>Asignar</Button>
        <Button size="sm" variant="ghost" onClick={onDone}>Limpiar selección</Button>
      </div>
    </div>
  );
}
