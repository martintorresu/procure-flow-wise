import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { planGeneration, stageCodeOf, type GenExisting } from "@/lib/requirementsEngine";
import { effectiveProfile, fieldLabel, type ProjectProfile } from "@/lib/projectProfile";
import { APPLICABILITY_META, DISCLAIMER } from "@/lib/requirementLabels";
import {
  useBulkUpdateRequirements, useFlow, useInsertRequirementItems, useLegalCatalog, useMunicipalRequirements,
} from "@/hooks/useProjectRequirementItems";

/** Nivel 2: genera los requisitos de los trámites confirmados. Idempotente. */
export function GenerateRequirementsDialog({
  open, onOpenChange, processCodes, profile, municipalityId, existing, docCount, projectId, tenantId,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; processCodes: string[]; profile: ProjectProfile; municipalityId: string | null;
  existing: GenExisting[]; docCount: Map<string, number>; projectId: string; tenantId: string;
}) {
  const { data: cat } = useLegalCatalog();
  const { data: flow } = useFlow();
  const { data: municipal = [] } = useMunicipalRequirements(municipalityId);
  const insert = useInsertRequirementItems(projectId, tenantId);
  const bulk = useBulkUpdateRequirements(projectId);
  const { toast } = useToast();
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [toReview, setToReview] = useState<Set<string>>(new Set());

  const plan = useMemo(() => {
    if (!cat || !flow) return null;
    const stageIdByCode = new Map(flow.stages.map((s) => [s.code, s.id]));
    const processStage = new Map(cat.processes.map((p) => [p.process_code, stageIdByCode.get(stageCodeOf(p.default_flow_stage) ?? "") ?? null]));
    return planGeneration({
      processCodes, requirements: cat.requirements, rules: cat.rules, municipal, processStage, stageIdByCode,
      profile: effectiveProfile(profile), existing, docCount, label: fieldLabel,
    });
  }, [cat, flow, municipal, processCodes, profile, existing, docCount]);

  useEffect(() => { if (open) { setAccepted(new Set()); setToReview(new Set()); } }, [open]);

  const apply = async () => {
    if (!plan) return;
    try {
      const rows = plan.inserts.map((r) => (toReview.has(r.code)
        ? { ...r, applicability: "review_required" as const, justification: null, rule_explanation: `Pasado a revisión por el gestor. ${r.justification ?? ""}`.trim() }
        : r));
      const n = rows.length ? await insert.mutateAsync(rows) : 0;
      const ch = plan.changes.filter((c) => !c.locked && accepted.has(c.id));
      if (ch.length) {
        await bulk.mutateAsync(ch.map((c) => ({
          id: c.id,
          patch: { applicability: c.to, justification: c.justification, rule_id: c.rule_id, rule_explanation: c.rule_explanation },
        })));
      }
      toast({ title: "Requisitos generados", description: `${n} nuevos · ${ch.length} cambios de aplicabilidad aplicados.` });
      onOpenChange(false);
    } catch (e) {
      toast({ title: "No se pudieron generar", description: (e as Error).message, variant: "destructive" });
    }
  };

  const counts = plan ? {
    applicable: plan.inserts.filter((r) => r.applicability === "applicable").length,
    review: plan.inserts.filter((r) => r.applicability === "review_required").length,
    na: plan.inserts.filter((r) => r.applicability === "not_applicable").length,
    municipal: plan.inserts.filter((r) => r.origin_type === "municipal").length,
  } : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Generar requisitos</DialogTitle>
          <DialogDescription>Trámites confirmados: {processCodes.join(", ") || "—"}. {DISCLAIMER}</DialogDescription>
        </DialogHeader>
        {!plan ? <p className="text-sm text-muted-foreground">Cargando catálogo…</p> : (
          <div className="space-y-3 text-sm">
            <div className="rounded border p-3">
              <p className="font-medium">{plan.inserts.length} requisitos nuevos</p>
              {counts && plan.inserts.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {counts.applicable} aplican · {counts.review} requieren revisión · {counts.na} no aplican · {counts.municipal} exigencias municipales
                </p>
              )}
            </div>
            {plan.inserts.some((r) => r.applicability === "not_applicable") && (
              <div className="rounded border p-3">
                <p className="font-medium">No aplican según el perfil · {plan.inserts.filter((r) => r.applicability === "not_applicable").length}</p>
                <p className="text-xs text-muted-foreground">Se registran como «No aplica» con la regla que los excluye. Marca los que quieras pasar a «Revisión requerida».</p>
                <ScrollArea className="mt-2 max-h-48">
                  <ul className="space-y-1">
                    {plan.inserts.filter((r) => r.applicability === "not_applicable").map((r) => (
                      <li key={r.code} className="flex items-start gap-2 text-xs">
                        <Checkbox checked={toReview.has(r.code)} aria-label={`Pasar ${r.code} a revisión`}
                          onCheckedChange={(v) => setToReview((s) => { const n = new Set(s); if (v) n.add(r.code); else n.delete(r.code); return n; })} />
                        <span className="font-mono">{r.code}</span>
                        <span className="flex-1">{r.name}<span className="block text-muted-foreground">{r.justification}</span></span>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            )}
            <div className="rounded border p-3">
              <p className="font-medium">{plan.changes.length} requisitos cambiarían de aplicabilidad</p>
              <p className="text-xs text-muted-foreground">Se aplican solo los que marques. Los que ya tienen gestión no se modifican.</p>
              {plan.changes.length > 0 && (
                <ScrollArea className="mt-2 max-h-60">
                  <ul className="space-y-1">
                    {plan.changes.map((c) => (
                      <li key={c.id} className="flex flex-wrap items-center gap-2">
                        <Checkbox disabled={c.locked} checked={accepted.has(c.id)} aria-label={`Aplicar cambio ${c.code}`}
                          onCheckedChange={(v) => setAccepted((s) => { const n = new Set(s); if (v) n.add(c.id); else n.delete(c.id); return n; })} />
                        <span className="font-mono text-xs">{c.code}</span>
                        <Badge variant="outline" className={APPLICABILITY_META[c.from].badge}>{APPLICABILITY_META[c.from].label}</Badge>→
                        <Badge variant="outline" className={APPLICABILITY_META[c.to].badge}>{APPLICABILITY_META[c.to].label}</Badge>
                        {c.locked && <span className="text-xs text-muted-foreground">Bloqueado: {c.lockReason}</span>}
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              )}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={apply} disabled={!plan || insert.isPending || bulk.isPending || (plan.inserts.length === 0 && accepted.size === 0)}>
            Generar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
