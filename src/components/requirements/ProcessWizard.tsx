import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { deactivationBlockers, suggestProcesses, type GenExisting, type ProcessSuggestion } from "@/lib/requirementsEngine";
import { conditionToText } from "@/lib/conditionText";
import { effectiveProfile, fieldLabel, type ProjectProfile } from "@/lib/projectProfile";
import { DISCLAIMER } from "@/lib/requirementLabels";
import {
  useDeleteProcessRequirements, useLegalCatalog, useProjectProcessSelection, useSaveProcessSelection,
} from "@/hooks/useProjectRequirementItems";

/** Asistente de trámites (nivel 1): el sistema sugiere, el gestor confirma o agrega. */
export function ProcessWizard({
  projectId, tenantId, profile, canManage, existing, docCount, onGenerate,
}: {
  projectId: string; tenantId: string; profile: ProjectProfile; canManage: boolean;
  existing: GenExisting[]; docCount: Map<string, number>; onGenerate: (codes: string[]) => void;
}) {
  const { data: cat } = useLegalCatalog();
  const { data: selection = [] } = useProjectProcessSelection(projectId);
  const save = useSaveProcessSelection(projectId, tenantId);
  const del = useDeleteProcessRequirements(projectId);
  const { toast } = useToast();
  const [evaluated, setEvaluated] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const confirmed = useMemo(() => selection.filter((s) => s.active).map((s) => s.process_code).sort(), [selection]);
  const suggestions = useMemo(
    () => (cat ? suggestProcesses(cat.processes, cat.processRules.map((r) => ({ ...r, explanation: r.applicability ?? r.explanation })), effectiveProfile(profile)) : []),
    [cat, profile],
  );
  const ruleByCode = useMemo(() => new Map((cat?.processRules ?? []).map((r) => [r.process_code, r])), [cat]);

  const evaluate = () => {
    const base = new Set(confirmed);
    if (!selection.length) suggestions.filter((s) => s.result === "applicable").forEach((s) => base.add(s.process_code));
    setChecked(base);
    setEvaluated(true);
  };

  const onConfirm = async () => {
    const turnOff = confirmed.filter((c) => !checked.has(c));
    const blocked = turnOff.map((c) => ({ c, b: deactivationBlockers(c, existing, docCount) })).filter((x) => x.b.length);
    if (blocked.length) {
      toast({
        title: "No se puede desactivar",
        description: blocked.map((x) => `${x.c}: ${x.b.slice(0, 3).map((b) => `${b.code} ${b.reason}`).join("; ")}${x.b.length > 3 ? "…" : ""}`).join(" · "),
        variant: "destructive",
      });
      return;
    }
    const touched = suggestions.filter((s) => checked.has(s.process_code) || selection.some((x) => x.process_code === s.process_code));
    try {
      await save.mutateAsync(touched.map((s) => ({
        process_code: s.process_code, suggested: s.result === "applicable", suggestion_explanation: s.explanation, active: checked.has(s.process_code),
      })));
      const toRemove = existing.filter((e) => e.process_code && turnOff.includes(e.process_code)).map((e) => e.id);
      if (toRemove.length) await del.mutateAsync(toRemove);
      toast({ title: "Trámites confirmados", description: `${checked.size} activos${toRemove.length ? ` · ${toRemove.length} requisitos quitados` : ""}.` });
      setEvaluated(false);
      if (checked.size) onGenerate([...checked].sort());
    } catch (e) {
      toast({ title: "No se pudo guardar la selección", description: (e as Error).message, variant: "destructive" });
    }
  };

  const group = (kind: ProcessSuggestion["result"]) => suggestions.filter((s) => s.result === kind);
  const Item = ({ s }: { s: ProcessSuggestion }) => (
    <label className="flex gap-3 rounded border p-2 text-sm hover:bg-muted/40">
      <Checkbox checked={checked.has(s.process_code)} disabled={!canManage}
        onCheckedChange={(c) => setChecked((x) => { const n = new Set(x); if (c) n.add(s.process_code); else n.delete(s.process_code); return n; })} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs">{s.process_code}</span>
          <span className="font-medium">{s.name}</span>
          {confirmed.includes(s.process_code) && <Badge variant="secondary">Confirmado</Badge>}
        </div>
        {ruleByCode.get(s.process_code)?.applicability && <p className="text-xs">{ruleByCode.get(s.process_code)!.applicability}</p>}
        <p className="text-xs text-muted-foreground">Condición: {conditionToText(ruleByCode.get(s.process_code)?.condition_json)}</p>
        {s.result === "review_required" && s.missing.length > 0 && (
          <p className="text-xs text-warning">
            Falta: {[...new Set(s.missing)].map(fieldLabel).join(", ")} ·{" "}
            <Link to="?tab=profile" className="underline">completar perfil</Link>
          </p>
        )}
      </div>
    </label>
  );

  const sections: [string, ProcessSuggestion["result"]][] = [["Sugeridos", "applicable"], ["Requieren revisión", "review_required"], ["No aplican", "not_applicable"]];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="mr-auto text-base">Asistente de trámites</CardTitle>
          {confirmed.length > 0 && canManage && <Button size="sm" variant="outline" onClick={() => onGenerate(confirmed)}>Generar requisitos</Button>}
          <Button size="sm" onClick={evaluate}>Evaluar trámites</Button>
        </div>
        <CardDescription>
          Trámites confirmados: {confirmed.length ? confirmed.join(", ") : "ninguno"}. {DISCLAIMER}
        </CardDescription>
      </CardHeader>
      {evaluated && (
        <CardContent className="space-y-4">
          {sections.map(([title, kind]) => (
            <div key={kind} className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">{title} · {group(kind).length}</p>
              <div className="grid gap-2 md:grid-cols-2">{group(kind).map((s) => <Item key={s.process_code} s={s} />)}</div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">Puedes marcar cualquier trámite, aunque no esté sugerido, para agregarlo completo.</p>
          {canManage && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEvaluated(false)}>Cerrar</Button>
              <Button onClick={onConfirm} disabled={save.isPending || del.isPending}>Confirmar {checked.size} trámites</Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
