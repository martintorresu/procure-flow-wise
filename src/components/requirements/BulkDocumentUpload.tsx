import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { matchFileToCode } from "@/lib/requirementsEngine";
import { REQUIREMENT_FILE_ACCEPT, validateRequirementFile } from "@/lib/requirementFiles";
import { reqKeys, uploadRequirementDocument, type RequirementItem } from "@/hooks/useProjectRequirementItems";

const NONE = "__none";

/** Carga múltiple: propone el requisito según el prefijo del nombre del archivo; el usuario confirma. */
export function BulkDocumentUpload({
  open, onOpenChange, items, projectId, tenantId,
}: { open: boolean; onOpenChange: (o: boolean) => void; items: RequirementItem[]; projectId: string; tenantId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [rows, setRows] = useState<{ file: File; reqId: string; error: string | null }[]>([]);
  const [busy, setBusy] = useState(false);
  const eligible = items.filter((i) => i.applicability !== "not_applicable");

  const pick = (files: FileList | null) => {
    if (!files) return;
    const codes = eligible.map((i) => i.code);
    setRows(Array.from(files).map((file) => {
      const code = matchFileToCode(file.name, codes);
      return { file, reqId: eligible.find((i) => i.code === code)?.id ?? NONE, error: validateRequirementFile(file) };
    }));
  };

  const save = async () => {
    setBusy(true);
    let ok = 0;
    for (const r of rows) {
      if (r.error || r.reqId === NONE) continue;
      const req = eligible.find((i) => i.id === r.reqId)!;
      try { await uploadRequirementDocument({ tenantId, projectId, req, file: r.file, meta: {} }); ok++; }
      catch (e) { toast({ title: r.file.name, description: (e as Error).message, variant: "destructive" }); }
    }
    setBusy(false);
    qc.invalidateQueries({ queryKey: reqKeys.docs(projectId) });
    qc.invalidateQueries({ queryKey: reqKeys.items(projectId) });
    toast({ title: `${ok} documentos cargados` });
    setRows([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setRows([]); onOpenChange(o); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Carga documental múltiple</DialogTitle>
          <DialogDescription>Si el nombre empieza con el código del requisito (ej. EL-024_TE1.pdf) se propone el requisito. Revisa antes de guardar.</DialogDescription>
        </DialogHeader>
        <input type="file" multiple accept={REQUIREMENT_FILE_ACCEPT} onChange={(e) => pick(e.target.files)} aria-label="Elegir archivos" />
        <div className="max-h-[50vh] space-y-2 overflow-y-auto">
          {rows.map((r, i) => (
            <div key={i} className="grid items-center gap-2 rounded border p-2 text-sm sm:grid-cols-2">
              <div className="min-w-0">
                <p className="truncate">{r.file.name}</p>
                {r.error && <p className="text-xs text-destructive">{r.error}</p>}
              </div>
              <Select value={r.reqId} disabled={!!r.error} onValueChange={(v) => setRows((x) => x.map((y, j) => (j === i ? { ...y, reqId: v } : y)))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sin asociar (se omite)</SelectItem>
                  {eligible.map((it) => <SelectItem key={it.id} value={it.id}>{it.code} · {it.name.slice(0, 60)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={busy || !rows.some((r) => !r.error && r.reqId !== NONE)}>
            {busy ? "Cargando…" : `Guardar ${rows.filter((r) => !r.error && r.reqId !== NONE).length}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
