import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock } from "lucide-react";
import { toast } from "sonner";
import {
  useEscalationRules,
  useUpsertEscalationRule,
  type EscalationRule,
  type EscalationSeverity,
} from "@/hooks/useEscalationRules";

const SEVERITY_LABELS: Record<EscalationSeverity, string> = {
  high: "Alta",
  critical: "Crítica",
};

export function EscalationRulesSection() {
  const { data: rules = [], isLoading } = useEscalationRules();
  const upsert = useUpsertEscalationRule();
  const [draft, setDraft] = useState<Record<string, EscalationRule>>({});

  useEffect(() => {
    if (rules.length) {
      setDraft((prev) => {
        const next = { ...prev };
        rules.forEach((r) => { if (!next[r.id]) next[r.id] = r; });
        return next;
      });
    }
  }, [rules]);

  const setField = <K extends keyof EscalationRule>(id: string, k: K, v: EscalationRule[K]) => {
    setDraft((p) => ({ ...p, [id]: { ...p[id], [k]: v } }));
  };

  const isChanged = (r: EscalationRule) => {
    const d = draft[r.id];
    return !!d && (
      d.escalation_hours !== r.escalation_hours ||
      d.re_notify_assignee !== r.re_notify_assignee ||
      d.notify_manager !== r.notify_manager ||
      d.active !== r.active
    );
  };

  const dirty = rules.some(isChanged);

  const save = async () => {
    const changed = rules.filter(isChanged);
    try {
      await Promise.all(changed.map((r) => {
        const d = draft[r.id];
        return upsert.mutateAsync({
          id: r.id,
          escalation_hours: d.escalation_hours,
          re_notify_assignee: d.re_notify_assignee,
          notify_manager: d.notify_manager,
          active: d.active,
        });
      }));
      toast.success(`${changed.length} regla(s) de escalamiento actualizada(s)`);
    } catch (e) {
      toast.error(`Error: ${(e as Error).message}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4" /> Reglas de Escalamiento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Configura cuánto tiempo esperar antes de re-notificar y escalar alertas no resueltas.
        </p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando reglas…</p>
        ) : rules.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay reglas de escalamiento configuradas para tu organización.
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Severidad</TableHead>
                  <TableHead className="w-[150px]">Horas para escalar</TableHead>
                  <TableHead className="w-[190px]">Re-notificar responsable</TableHead>
                  <TableHead className="w-[150px]">Notificar gerentes</TableHead>
                  <TableHead className="w-[80px]">Activa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((r) => {
                  const d = draft[r.id] ?? r;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{SEVERITY_LABELS[r.severity] ?? r.severity}</TableCell>
                      <TableCell>
                        <Input
                          type="number" min={1}
                          value={d.escalation_hours}
                          onChange={(e) => setField(r.id, "escalation_hours", Math.max(1, Number(e.target.value)))}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={d.re_notify_assignee}
                          onCheckedChange={(v) => setField(r.id, "re_notify_assignee", v)}
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={d.notify_manager}
                          onCheckedChange={(v) => setField(r.id, "notify_manager", v)}
                        />
                      </TableCell>
                      <TableCell>
                        <Switch checked={d.active} onCheckedChange={(v) => setField(r.id, "active", v)} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Button onClick={save} disabled={!dirty || upsert.isPending}>
              {upsert.isPending ? "Guardando…" : "Guardar cambios"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
