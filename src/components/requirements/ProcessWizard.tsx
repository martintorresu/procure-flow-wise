import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { suggestProcesses } from "@/lib/requirementsEngine";
import { effectiveProfile, type ProjectProfile } from "@/lib/projectProfile";
import { APPLICABILITY_META } from "@/lib/requirementLabels";
import { useLegalCatalog, useProjectProcessSelection, useSaveProcessSelection } from "@/hooks/useProjectRequirementItems";
import { ProposeRequirementsDialog } from "./ProposeRequirementsDialog";

/** Asistente de trámites (nivel 1): el sistema sugiere, el gestor confirma. */
export function ProcessWizard({
  projectId, tenantId, profile, canManage, existingCodes,
}: { projectId: string; tenantId: string; profile: ProjectProfile; canManage: boolean; existingCodes: Set<string> }) {
  const { data: cat } = useLegalCatalog();
  const { data: selection = [] } = useProjectProcessSelection(projectId);
  const save = useSaveProcessSelection(projectId, tenantId);
  const { toast } = useToast();
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [proposeCodes, setProposeCodes] = useState<string[]>([]);

  const suggestions = useMemo(
    () => (cat ? suggestProcesses(cat.processes, cat.processRules, effectiveProfile(profile)) : []),
    [cat, profile],
  );
  const confirmed = useMemo(() => new Set(selection.filter((s) => s.active).map((s) => s.process_code)), [selection]);

  useEffect(() => {
    // Sin confirmación previa, se parte de la sugerencia («aplica»); luego, de lo confirmado
    if (selection.length) setChecked(new Set(confirmed));
    else setChecked(new Set(suggestions.filter((s) => s.result === "applicable").map((s) => s.process_code)));
  }, [selection, confirmed, suggestions]);

  const suggested = suggestions.filter((s) => s.result === "applicable").map((s) => s.process_code);

  const onConfirm = async () => {
    const touched = suggestions.filter((s) => checked.has(s.process_code) || selection.some((x) => x.process_code === s.process_code));
    try {
      await save.mutateAsync(touched.map((s) => ({
        process_code: s.process_code, suggested: s.result === "applicable", suggestion_explanation: s.explanation, active: checked.has(s.process_code),
      })));
      const added = [...checked].filter((c) => !confirmed.has(c));
      toast({ title: "Trámites confirmados", description: `${checked.size} trámites activos en el proyecto.` });
      if (added.length) { setProposeCodes(added); setOpen(true); }
    } catch (e) {
      toast({ title: "No se pudo guardar la selección", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Asistente de trámites</CardTitle>
        <CardDescription>
          Según el perfil, aplican: {suggested.length ? suggested.join(", ") : "ninguno todavía (completa el perfil)"}. El gestor confirma, agrega o quita trámites.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 md:grid-cols-2">
          {suggestions.map((s) => {
            const sel = selection.find((x) => x.process_code === s.process_code);
            return (
              <label key={s.process_code} className="flex gap-3 rounded border p-2 text-sm hover:bg-muted/40">
                <Checkbox
                  checked={checked.has(s.process_code)} disabled={!canManage}
                  onCheckedChange={(c) => setChecked((x) => { const n = new Set(x); if (c) n.add(s.process_code); else n.delete(s.process_code); return n; })}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs">{s.process_code}</span>
                    <span className="font-medium">{s.name}</span>
                    <Badge variant="outline" className={APPLICABILITY_META[s.result].badge}>{APPLICABILITY_META[s.result].label}</Badge>
                    {sel?.active && <Badge variant="secondary">Confirmado</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{s.explanation}</p>
                  {sel?.confirmed_at && <p className="text-[11px] text-muted-foreground">Confirmado el {new Date(sel.confirmed_at).toLocaleDateString("es-CL")}</p>}
                </div>
              </label>
            );
          })}
        </div>
        {canManage && (
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => { setProposeCodes([...confirmed]); setOpen(true); }} disabled={!confirmed.size}>
              Proponer requisitos de trámites confirmados
            </Button>
            <Button onClick={onConfirm} disabled={save.isPending}>Confirmar trámites</Button>
          </div>
        )}
      </CardContent>
      <ProposeRequirementsDialog
        open={open} onOpenChange={setOpen} processCodes={proposeCodes} profile={profile}
        existingCodes={existingCodes} projectId={projectId} tenantId={tenantId} title="Requisitos de los trámites confirmados"
      />
    </Card>
  );
}
