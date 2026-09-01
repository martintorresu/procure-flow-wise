import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, Cell } from "recharts";
import { AlertTriangle, Clock, CheckCircle2, ArrowUpCircle, ChevronDown, ChevronUp } from "lucide-react";
import type { Alert, Process } from "@/types/process";

interface Props {
  alerts: Alert[];
  processes: Process[];
}

const SEVERITY_RANK: Record<string, number> = { critical: 3, high: 2, medium: 1, low: 0 };
const SEVERITY_COLOR: Record<string, string> = {
  critical: "hsl(var(--danger))",
  high: "hsl(var(--danger))",
  medium: "hsl(var(--warning))",
  low: "hsl(var(--success))",
};

function resolvedAt(a: Alert): string | null {
  if (!a.resolved) return null;
  return a.updated_at ?? a.created_at ?? null;
}

function weekLabel(d: Date): string {
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((target.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `Sem ${week}`;
}

export function AlertsDashboard({ alerts, processes }: Props) {
  const [open, setOpen] = useState(true);

  const metrics = useMemo(() => {
    const now = Date.now();
    const cutoff30 = now - 30 * 86400000;

    const pending = alerts.filter((a) => !a.resolved).length;
    const escalated = alerts.filter((a) => !a.resolved && a.escalated_at).length;

    const recent = alerts.filter((a) => new Date(a.created_at).getTime() >= cutoff30);
    const recentResolved = recent.filter((a) => a.resolved);
    const rate = recent.length ? Math.round((recentResolved.length / recent.length) * 100) : null;

    const durations = alerts
      .filter((a) => a.resolved)
      .map((a) => {
        const r = resolvedAt(a);
        if (!r) return null;
        const rt = new Date(r).getTime();
        if (rt < cutoff30) return null;
        const diff = (rt - new Date(a.created_at).getTime()) / 3600000;
        return diff >= 0 ? diff : null;
      })
      .filter((v): v is number => v !== null);
    const avgHours = durations.length
      ? durations.reduce((s, v) => s + v, 0) / durations.length
      : null;

    return { pending, escalated, rate, avgHours };
  }, [alerts]);

  const weekly = useMemo(() => {
    const buckets: { key: string; label: string; Creadas: number; Resueltas: number }[] = [];
    const index = new Map<string, number>();
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 7 * 86400000);
      const label = weekLabel(d);
      index.set(label, buckets.length);
      buckets.push({ key: label, label, Creadas: 0, Resueltas: 0 });
    }
    const oldest = now.getTime() - 8 * 7 * 86400000;
    for (const a of alerts) {
      const ct = new Date(a.created_at).getTime();
      if (ct >= oldest) {
        const i = index.get(weekLabel(new Date(ct)));
        if (i !== undefined) buckets[i].Creadas += 1;
      }
      const r = resolvedAt(a);
      if (r) {
        const rt = new Date(r).getTime();
        if (rt >= oldest) {
          const i = index.get(weekLabel(new Date(rt)));
          if (i !== undefined) buckets[i].Resueltas += 1;
        }
      }
    }
    return buckets;
  }, [alerts]);

  const topProcesses = useMemo(() => {
    const map = new Map<string, { count: number; sev: string }>();
    for (const a of alerts) {
      if (a.resolved || !a.process_id) continue;
      const cur = map.get(a.process_id) ?? { count: 0, sev: "low" };
      cur.count += 1;
      if ((SEVERITY_RANK[a.severity] ?? 0) > (SEVERITY_RANK[cur.sev] ?? 0)) cur.sev = a.severity;
      map.set(a.process_id, cur);
    }
    return Array.from(map.entries())
      .map(([id, v]) => {
        const p = processes.find((pr) => pr.id === id);
        return {
          name: p ? `${p.process_number} · ${p.title}`.slice(0, 28) : "Sin proceso",
          value: v.count,
          fill: SEVERITY_COLOR[v.sev] ?? SEVERITY_COLOR.low,
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [alerts, processes]);

  const kpis = [
    {
      icon: AlertTriangle,
      label: "Total pendientes",
      value: String(metrics.pending),
      good: metrics.pending === 0,
    },
    {
      icon: Clock,
      label: "Tiempo medio de resolución",
      value: metrics.avgHours === null ? "—" : `${metrics.avgHours.toFixed(1)} h`,
      good: metrics.avgHours !== null && metrics.avgHours <= 48,
    },
    {
      icon: CheckCircle2,
      label: "Tasa de resolución (30 d)",
      value: metrics.rate === null ? "—" : `${metrics.rate}%`,
      good: (metrics.rate ?? 0) >= 70,
    },
    {
      icon: ArrowUpCircle,
      label: "Escaladas sin resolver",
      value: String(metrics.escalated),
      good: metrics.escalated === 0,
    },
  ];

  return (
    <section className="space-y-4">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)}>
          {open ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
          {open ? "Ocultar analítica" : "Ver analítica"}
        </Button>
      </div>

      {open && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {kpis.map((k) => (
              <Card key={k.label}>
                <CardContent className="p-4 space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <k.icon className={`w-4 h-4 ${k.good ? "text-success" : "text-danger"}`} />
                    <span className="text-xs">{k.label}</span>
                  </div>
                  <p className={`text-2xl font-bold ${k.good ? "text-success" : "text-danger"}`}>{k.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardContent className="p-4">
                <h2 className="text-sm font-medium mb-3">Tendencia semanal (8 semanas)</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weekly}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Creadas" fill="hsl(var(--warning))" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Resueltas" fill="hsl(var(--success))" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h2 className="text-sm font-medium mb-3">Top 5 procesos con alertas pendientes</h2>
                <div className="h-64">
                  {topProcesses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin alertas pendientes.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topProcesses} layout="vertical" margin={{ left: 12 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="value" name="Pendientes" radius={[0, 3, 3, 0]}>
                          {topProcesses.map((p) => (
                            <Cell key={p.name} fill={p.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </section>
  );
}
