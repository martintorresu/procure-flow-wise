import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { LEVEL_LABELS } from "@/lib/requirementLabels";
import { stageCodeOf } from "@/lib/requirementsEngine";
import type { ProjectProfile } from "@/lib/projectProfile";
import {
  useFlow, useInsertRequirementItems, useLegalCatalog, useMunicipalRequirements,
} from "@/hooks/useProjectRequirementItems";
import { ProposeRequirementsDialog, buildLegalItem } from "./ProposeRequirementsDialog";

const ALL = "__all";

/** Carga personalizada: buscador del catálogo + municipal, trámite completo y requisito propio. */
export function AddRequirementsDialog({
  open, onOpenChange, projectId, tenantId, municipalityId, profile, existingKeys,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; projectId: string; tenantId: string; municipalityId: string | null;
  profile: ProjectProfile; existingKeys: Set<string>;
}) {
  const { data: cat } = useLegalCatalog();
  const { data: flow } = useFlow();
  const { data: munis = [] } = useMunicipalRequirements(municipalityId);
  const insert = useInsertRequirementItems(projectId, tenantId);
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [proc, setProc] = useState(ALL);
  const [stage, setStage] = useState(ALL);
  const [level, setLevel] = useState(ALL);
  const [origin, setOrigin] = useState(ALL);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [fullProc, setFullProc] = useState<string>("");
  const [proposeOpen, setProposeOpen] = useState(false);
  const [own, setOwn] = useState({ code: "", name: "", evidence_required: "", stage: "" });

  const procByCode = useMemo(() => new Map((cat?.processes ?? []).map((p) => [p.process_code, p])), [cat]);
  const stageByCode = useMemo(() => new Map((flow?.stages ?? []).map((s) => [s.code, s])), [flow]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    const legal = (cat?.requirements ?? []).map((r) => ({
      key: `legal:${r.requirement_code}`, origin: "legal" as const, code: r.requirement_code, name: r.requirement_name,
      process: r.process_code, stage: stageCodeOf(procByCode.get(r.process_code)?.default_flow_stage), level: r.requirement_level,
      evidence: r.evidence_pending ? null : r.evidence_required, reference: r.legal_reference, recipient: r.recipient ?? r.issuer, legal: r, muni: null,
    }));
    const muni = munis.map((m) => ({
      key: `municipal:${m.code}`, origin: "municipal" as const, code: m.code, name: m.name, process: m.process_code,
      stage: stageCodeOf(m.flow_stage_code), level: null as string | null, evidence: m.evidence_required, reference: m.source,
      recipient: m.issuer, legal: null, muni: m,
    }));
    return [...legal, ...muni].filter((x) =>
      (origin === ALL || x.origin === origin) && (proc === ALL || x.process === proc) && (stage === ALL || x.stage === stage) &&
      (level === ALL || x.level === level) &&
      (!term || x.code.toLowerCase().includes(term) || x.name.toLowerCase().includes(term)),
    ).slice(0, 300);
  }, [cat, munis, q, proc, stage, level, origin, procByCode]);

  const addPicked = async () => {
    const rows = results.filter((r) => picked.has(r.key) && !existingKeys.has(r.key)).map((r) => {
      const stageId = r.stage ? stageByCode.get(r.stage)?.id ?? null : null;
      if (r.legal) return buildLegalItem(r.legal, stageId, null, "manual");
      const m = r.muni!;
      return {
        origin_type: "municipal" as const, origin_id: m.id, code: m.code, name: m.name, process_code: m.process_code,
        legal_reference: m.source, evidence_required: m.evidence_required, evidence_pending: !m.evidence_required,
        activation_mode: "manual", mapping_status: "linked" as const, applicability: "review_required" as const, flow_stage_id: stageId,
      };
    });
    try {
      const n = await insert.mutateAsync(rows);
      toast({ title: `${n} requisitos agregados` });
      setPicked(new Set());
    } catch (e) {
      toast({ title: "No se pudieron agregar", description: (e as Error).message, variant: "destructive" });
    }
  };

  const addOwn = async () => {
    if (!own.code.trim() || !own.name.trim()) return;
    try {
      await insert.mutateAsync([{
        origin_type: "tenant", code: own.code.trim(), name: own.name.trim(), evidence_required: own.evidence_required || null,
        evidence_pending: !own.evidence_required, activation_mode: "manual", mapping_status: "unmapped", applicability: "applicable",
        flow_stage_id: own.stage || null,
      }]);
      toast({ title: "Requisito propio creado" });
      setOwn({ code: "", name: "", evidence_required: "", stage: "" });
    } catch (e) {
      toast({ title: "No se pudo crear", description: (e as Error).message, variant: "destructive" });
    }
  };

  const existingCodes = new Set([...existingKeys].filter((k) => k.startsWith("legal:")).map((k) => k.slice(6)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Agregar requisitos</DialogTitle>
          <DialogDescription>Catálogo legal vigente y exigencias de la municipalidad del proyecto.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="search">
          <TabsList>
            <TabsTrigger value="search">Buscador</TabsTrigger>
            <TabsTrigger value="own">Requisito propio</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-3">
            <div className="grid gap-2 md:grid-cols-5">
              <Input placeholder="Buscar código o nombre" value={q} onChange={(e) => setQ(e.target.value)} className="md:col-span-1" />
              <Select value={proc} onValueChange={setProc}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                <SelectItem value={ALL}>Todos los trámites</SelectItem>
                {(cat?.processes ?? []).map((p) => <SelectItem key={p.process_code} value={p.process_code}>{p.process_code} {p.name}</SelectItem>)}
              </SelectContent></Select>
              <Select value={stage} onValueChange={setStage}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                <SelectItem value={ALL}>Todas las etapas</SelectItem>
                {(flow?.stages ?? []).map((s) => <SelectItem key={s.code} value={s.code}>{s.code} {s.name}</SelectItem>)}
              </SelectContent></Select>
              <Select value={level} onValueChange={setLevel}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                <SelectItem value={ALL}>Todo nivel</SelectItem>
                {Object.entries(LEVEL_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent></Select>
              <Select value={origin} onValueChange={setOrigin}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                <SelectItem value={ALL}>Todo origen</SelectItem>
                <SelectItem value="legal">Legal</SelectItem>
                <SelectItem value="municipal">Municipal</SelectItem>
              </SelectContent></Select>
            </div>
            {!municipalityId && <p className="text-xs text-muted-foreground">Define la municipalidad en el Perfil para ver sus exigencias.</p>}
            <ScrollArea className="h-[45vh] rounded border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted text-left text-xs">
                  <tr><th className="p-2 w-8" /><th className="p-2">Código</th><th className="p-2">Trámite</th><th className="p-2">Requisito</th><th className="p-2">Evidencia</th><th className="p-2">Referencia</th><th className="p-2">Organismo</th></tr>
                </thead>
                <tbody>
                  {results.map((r) => {
                    const exists = existingKeys.has(r.key);
                    return (
                      <tr key={r.key} className="border-t align-top">
                        <td className="p-2">
                          <input type="checkbox" disabled={exists} checked={exists || picked.has(r.key)} aria-label={`Agregar ${r.code}`}
                            onChange={(e) => setPicked((s) => { const n = new Set(s); if (e.target.checked) n.add(r.key); else n.delete(r.key); return n; })} />
                        </td>
                        <td className="p-2 font-mono text-xs">{r.code} {r.origin === "municipal" && <Badge variant="outline" className="ml-1">Municipal</Badge>}</td>
                        <td className="p-2 text-xs">{r.process ?? "—"}</td>
                        <td className="p-2">{r.name}{exists && <span className="ml-1 text-xs text-muted-foreground">(ya en el proyecto)</span>}</td>
                        <td className="p-2 text-xs">{r.evidence ?? <span className="italic text-muted-foreground">Evidencia por definir</span>}</td>
                        <td className="p-2 text-xs">{r.reference}</td>
                        <td className="p-2 text-xs">{r.recipient}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollArea>
            <DialogFooter>
              <Button onClick={addPicked} disabled={!picked.size || insert.isPending}>Agregar {picked.size} seleccionados</Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="own" className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1"><Label>Código</Label><Input value={own.code} onChange={(e) => setOwn({ ...own, code: e.target.value })} placeholder="EL-001" /></div>
              <div className="space-y-1"><Label>Etapa del flujo</Label>
                <Select value={own.stage} onValueChange={(v) => setOwn({ ...own, stage: v })}>
                  <SelectTrigger><SelectValue placeholder="Sin etapa" /></SelectTrigger>
                  <SelectContent>{(flow?.stages ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.code} {s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1 md:col-span-2"><Label>Nombre</Label><Input value={own.name} onChange={(e) => setOwn({ ...own, name: e.target.value })} /></div>
              <div className="space-y-1 md:col-span-2"><Label>Evidencia requerida</Label><Textarea value={own.evidence_required} onChange={(e) => setOwn({ ...own, evidence_required: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={addOwn} disabled={!own.code.trim() || !own.name.trim() || insert.isPending}>Crear requisito propio</Button></DialogFooter>
          </TabsContent>
        </Tabs>

      </DialogContent>
    </Dialog>
  );
}
