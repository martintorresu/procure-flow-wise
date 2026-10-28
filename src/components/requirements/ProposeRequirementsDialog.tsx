import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { evaluateRequirements, stageCodeOf } from "@/lib/requirementsEngine";
import { effectiveProfile, type ProjectProfile } from "@/lib/projectProfile";
import { APPLICABILITY_META, DISCLAIMER } from "@/lib/requirementLabels";
import {
  useFlow, useInsertRequirementItems, useLegalCatalog,
  type CatalogRequirementRow, type NewRequirementItem, type RequirementItem,
} from "@/hooks/useProjectRequirementItems";

export function buildLegalItem(
  r: CatalogRequirementRow,
  stageId: string | null,
  decision: { applicability: RequirementItem["applicability"]; rule_id: string | null; explanation: string } | null,
  mode: "rules" | "manual",
): NewRequirementItem {
  return {
    origin_type: "legal", origin_id: r.id, code: r.requirement_code, name: r.requirement_name, process_code: r.process_code,
    legal_reference: r.legal_reference, origin_version: r.catalog_version, evidence_required: r.evidence_required,
    evidence_pending: r.evidence_pending, activation_mode: mode, rule_id: decision?.rule_id ?? null,
    rule_explanation: decision?.explanation ?? null, mapping_status: "linked",
    applicability: decision?.applicability ?? "review_required", flow_stage_id: stageId,
    priority: r.default_priority,
  };
}

/** Propone los requisitos de los trámites indicados, ya evaluados por el nivel 2. */
export function ProposeRequirementsDialog({
  open, onOpenChange, processCodes, profile, existingCodes, projectId, tenantId, title,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; processCodes: string[]; profile: ProjectProfile;
  existingCodes: Set<string>; projectId: string; tenantId: string; title: string;
}) {
  const { data: cat } = useLegalCatalog();
  const { data: flow } = useFlow();
  const insert = useInsertRequirementItems(projectId, tenantId);
  const { toast } = useToast();
  const [unchecked, setUnchecked] = useState<Set<string>>(new Set());

  useEffect(() => { if (open) setUnchecked(new Set()); }, [open]);

  const rows = useMemo(() => {
    if (!cat || !flow) return [];
    const procByCode = new Map(cat.processes.map((p) => [p.process_code, p]));
    const stageByCode = new Map(flow.stages.map((s) => [s.code, s]));
    const reqs = cat.requirements.filter((r) => processCodes.includes(r.process_code) && !existingCodes.has(r.requirement_code));
    const decisions = evaluateRequirements(reqs.map((r) => r.requirement_code), cat.rules, effectiveProfile(profile));
    return reqs.map((r) => {
      const d = decisions.get(r.requirement_code)!;
      const stage = stageByCode.get(stageCodeOf(procByCode.get(r.process_code)?.default_flow_stage) ?? "");
      return { r, d, stage, process: procByCode.get(r.process_code) };
    });
  }, [cat, flow, processCodes, profile, existingCodes]);

  // Por defecto se desmarcan los que el motor dejó en «No aplica»
  useEffect(() => {
    if (open) setUnchecked(new Set(rows.filter((x) => x.d.applicability === "not_applicable").map((x) => x.r.requirement_code)));
  }, [open, rows]);

  const selected = rows.filter((x) => !unchecked.has(x.r.requirement_code));

  const confirm = async () => {
    try {
      const n = await insert.mutateAsync(selected.map((x) => buildLegalItem(x.r, x.stage?.id ?? null, x.d.applicability === "not_applicable" ? { ...x.d, applicability: "review_required" } : x.d, "rules")));
      toast({ title: `${n} requisitos activados` });
      onOpenChange(false);
    } catch (e) {
      toast({ title: "No se pudieron activar los requisitos", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {rows.length} requisitos de {processCodes.join(", ") || "—"} que aún no están en el proyecto. Desmarca los que no correspondan. {DISCLAIMER}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[55vh] rounded border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted text-left text-xs">
              <tr>
                <th className="p-2 w-8" />
                <th className="p-2">Código</th><th className="p-2">Trámite</th><th className="p-2">Requisito</th>
                <th className="p-2">Aplicabilidad</th><th className="p-2">Evidencia</th><th className="p-2">Referencia</th><th className="p-2">Organismo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ r, d, process }) => (
                <tr key={r.requirement_code} className="border-t align-top">
                  <td className="p-2">
                    <Checkbox
                      checked={!unchecked.has(r.requirement_code)}
                      onCheckedChange={(c) => setUnchecked((s) => { const n = new Set(s); if (c) n.delete(r.requirement_code); else n.add(r.requirement_code); return n; })}
                      aria-label={`Incluir ${r.requirement_code}`}
                    />
                  </td>
                  <td className="p-2 font-mono text-xs">{r.requirement_code}</td>
                  <td className="p-2 text-xs">{r.process_code} {process?.name}</td>
                  <td className="p-2">{r.requirement_name}</td>
                  <td className="p-2">
                    <Badge variant="outline" className={APPLICABILITY_META[d.applicability].badge}>{APPLICABILITY_META[d.applicability].label}</Badge>
                    {d.explanation && <p className="mt-1 text-xs text-muted-foreground">{d.explanation}</p>}
                  </td>
                  <td className="p-2 text-xs">{r.evidence_pending || !r.evidence_required ? <span className="italic text-muted-foreground">Evidencia por definir</span> : r.evidence_required}</td>
                  <td className="p-2 text-xs">{r.legal_reference}</td>
                  <td className="p-2 text-xs">{r.recipient ?? r.issuer}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No hay requisitos nuevos que proponer.</td></tr>}
            </tbody>
          </table>
        </ScrollArea>
        <p className="text-xs text-muted-foreground">Los marcados «No aplica» por el motor se ofrecen desmarcados; si los incluyes quedan en revisión.</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={confirm} disabled={!selected.length || insert.isPending}>Activar {selected.length} requisitos</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
