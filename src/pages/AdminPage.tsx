import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Trash2, UserPlus, Database, Bell, ShieldCheck, Info } from "lucide-react";
import { SEO } from "@/components/SEO";
import { useAlertRules, useUpdateAlertRule, TRIGGER_DESCRIPTIONS, type AlertRule, type AlertSeverity } from "@/hooks/useAlertRules";
import { useApprovalMatrix, useUpdateApprovalRule, type ApprovalRule } from "@/hooks/useApprovalMatrix";
import { EtFieldsAdminSection } from "@/components/admin/EtFieldsAdminSection";
import type { UserRole } from "@/types/pdc";

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "ingenieria", label: "Ingeniería" },
  { value: "programacion", label: "Programación" },
  { value: "compras", label: "Compras" },
  { value: "gerente", label: "Gerente" },
  { value: "planificacion", label: "Planificación" },
  { value: "logistica", label: "Logística" },
];

const SAMPLE_USERS = ROLES.map((r) => ({
  role: r.value,
  email: `${r.value}@demo.local`,
  full_name: `Demo ${r.label}`,
  password: "demo123456",
}));

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [working, setWorking] = useState<string | null>(null);
  const [demoCount, setDemoCount] = useState<number | null>(null);

  // Form individual
  const [form, setForm] = useState({
    email: "", password: "demo123456", full_name: "", role: "ingenieria",
  });

  const refreshDemoCount = async () => {
    const { count } = await supabase
      .from("purchase_processes")
      .select("id", { count: "exact", head: true })
      .eq("project", "__DEMO__");
    setDemoCount(count ?? 0);
  };

  useEffect(() => {
    if (user?.role === "admin") refreshDemoCount();
  }, [user]);

  if (loading) return <div className="text-center py-20 text-muted-foreground">Cargando…</div>;
  if (user?.role !== "admin") return <Navigate to="/" replace />;

  const callAdmin = async (action: string, payload?: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("admin-seed", {
      body: { action, payload },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const createUser = async (payload: typeof form) => {
    if (!payload.email || !payload.password) {
      toast.error("Email y password requeridos");
      return;
    }
    setWorking(`user:${payload.email}`);
    try {
      const data = await callAdmin("create_user", payload);
      toast.success(`Usuario creado: ${data.email} (${data.role})`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setWorking(null);
    }
  };

  const seedAll = async () => {
    setWorking("seed-users");
    let ok = 0, fail = 0;
    for (const u of SAMPLE_USERS) {
      try {
        await callAdmin("create_user", u);
        ok++;
      } catch (e) {
        // Si ya existe, lo contamos como ok silencioso
        const msg = e instanceof Error ? e.message : "";
        if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("registered")) {
          ok++;
        } else {
          fail++;
          console.error(u.email, msg);
        }
      }
    }
    setWorking(null);
    toast.success(`Usuarios creados: ${ok}/${SAMPLE_USERS.length}${fail ? ` · ${fail} fallaron` : ""}`);
  };

  const seedPdcs = async () => {
    setWorking("seed-pdcs");
    try {
      const data = await callAdmin("seed_pdcs");
      toast.success(`${data.count} PdCs demo creados`);
      await refreshDemoCount();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setWorking(null);
    }
  };

  const cleanupDemo = async () => {
    if (!confirm("¿Borrar todos los PdCs demo (project='__DEMO__')?")) return;
    setWorking("cleanup");
    try {
      const data = await callAdmin("cleanup_demo");
      toast.success(`${data.deleted} PdCs demo eliminados`);
      await refreshDemoCount();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setWorking(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <SEO title="Administración" description="Gestión de usuarios, roles y datos demo de Procurement by InHR." path="/admin" />
      <div>
        <h1 className="text-2xl font-bold">Administración</h1>
        <p className="text-sm text-muted-foreground">
          Crear usuarios de ejemplo y datos demo para validación end-to-end.
        </p>
      </div>

      {/* Sembrar todos los usuarios */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Usuarios de ejemplo (1 por rol)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Crea un usuario por cada rol con password <code className="bg-muted px-1 rounded">demo123456</code>.
            Email format: <code className="bg-muted px-1 rounded">{"{rol}"}@demo.local</code>. Se omiten los que ya existen.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {SAMPLE_USERS.map((u) => (
              <div key={u.role} className="text-xs border rounded p-2">
                <div className="font-medium capitalize">{u.role}</div>
                <div className="text-muted-foreground truncate">{u.email}</div>
              </div>
            ))}
          </div>
          <Button onClick={seedAll} disabled={working === "seed-users"}>
            {working === "seed-users" ? "Creando…" : "Crear todos los usuarios demo"}
          </Button>
        </CardContent>
      </Card>

      {/* Crear usuario individual */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Crear usuario individual</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
            onSubmit={(e) => { e.preventDefault(); createUser(form); }}
          >
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="usuario@empresa.com" />
            </div>
            <div className="space-y-2">
              <Label>Nombre completo</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Nombre Apellido" />
            </div>
            <div className="space-y-2">
              <Label>Password (mín 6)</Label>
              <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={working?.startsWith("user:")}>
                {working?.startsWith("user:") ? "Creando…" : "Crear usuario"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* PdCs demo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="w-4 h-4" /> PdCs demo (1 por etapa)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Crea 8 PdCs marcados con proyecto <code className="bg-muted px-1 rounded">__DEMO__</code>,
            uno por cada etapa del flujo, todos con tu usuario como creador.
          </p>
          <div className="text-sm">
            PdCs demo actuales: <span className="font-mono font-medium">{demoCount ?? "…"}</span>
          </div>
          <div className="flex gap-2">
            <Button onClick={seedPdcs} disabled={working === "seed-pdcs"}>
              {working === "seed-pdcs" ? "Creando…" : "Sembrar 8 PdCs demo"}
            </Button>
            <Button variant="outline" onClick={cleanupDemo} disabled={working === "cleanup"}>
              <Trash2 className="w-4 h-4 mr-2" />
              {working === "cleanup" ? "Limpiando…" : "Limpiar PdCs demo"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertRulesSection />
      <ApprovalMatrixSection />
    </div>
  );
}

const SEVERITY_LABELS: Record<AlertSeverity, string> = {
  low: "Baja", medium: "Media", high: "Alta", critical: "Crítica",
};

function AlertRulesSection() {
  const { data: rules = [], isLoading } = useAlertRules();
  const updateMutation = useUpdateAlertRule();
  const [draft, setDraft] = useState<Record<string, AlertRule>>({});

  // Sincroniza el draft cuando llegan las reglas
  useEffect(() => {
    if (rules.length) {
      setDraft((prev) => {
        const next = { ...prev };
        rules.forEach((r) => { if (!next[r.id]) next[r.id] = r; });
        return next;
      });
    }
  }, [rules]);

  const setField = <K extends keyof AlertRule>(id: string, k: K, v: AlertRule[K]) => {
    setDraft((p) => ({ ...p, [id]: { ...p[id], [k]: v } }));
  };

  const dirty = rules.some((r) => {
    const d = draft[r.id];
    return d && (d.threshold_days !== r.threshold_days || d.severity !== r.severity || d.active !== r.active);
  });

  const save = async () => {
    const changed = rules.filter((r) => {
      const d = draft[r.id];
      return d && (d.threshold_days !== r.threshold_days || d.severity !== r.severity || d.active !== r.active);
    });
    try {
      await Promise.all(changed.map((r) => {
        const d = draft[r.id];
        return updateMutation.mutateAsync({
          id: r.id, threshold_days: d.threshold_days, severity: d.severity, active: d.active,
        });
      }));
      toast.success(`${changed.length} regla(s) actualizada(s)`);
    } catch (e) {
      toast.error(`Error: ${(e as Error).message}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="w-4 h-4" /> Reglas de Alerta del Tenant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Configura los umbrales y severidades que disparan alertas automáticas en tu organización.
        </p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando reglas…</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Disparador</TableHead>
                  <TableHead className="w-[140px]">Días anticipación</TableHead>
                  <TableHead className="w-[140px]">Severidad</TableHead>
                  <TableHead className="w-[80px]">Activa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((r) => {
                  const d = draft[r.id] ?? r;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {d.label}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              {TRIGGER_DESCRIPTIONS[r.trigger_type]}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number" min={0}
                          value={d.threshold_days}
                          onChange={(e) => setField(r.id, "threshold_days", Number(e.target.value))}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Select value={d.severity} onValueChange={(v) => setField(r.id, "severity", v as AlertSeverity)}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(["low","medium","high","critical"] as AlertSeverity[]).map((s) => (
                              <SelectItem key={s} value={s}>{SEVERITY_LABELS[s]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Switch checked={d.active} onCheckedChange={(v) => setField(r.id, "active", v)} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Button onClick={save} disabled={!dirty || updateMutation.isPending}>
              {updateMutation.isPending ? "Guardando…" : "Guardar cambios"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

const APPROVAL_ROLES: { value: UserRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "gerente", label: "Gerente" },
  { value: "compras", label: "Compras" },
  { value: "ingenieria", label: "Ingeniería" },
  { value: "planificacion", label: "Planificación" },
  { value: "logistica", label: "Logística" },
];

function ApprovalMatrixSection() {
  const { data: rules = [], isLoading } = useApprovalMatrix();
  const updateMutation = useUpdateApprovalRule();
  const [draft, setDraft] = useState<Record<string, ApprovalRule>>({});

  useEffect(() => {
    if (rules.length) {
      setDraft((prev) => {
        const next = { ...prev };
        rules.forEach((r) => { if (!next[r.id]) next[r.id] = r; });
        return next;
      });
    }
  }, [rules]);

  const setField = <K extends keyof ApprovalRule>(id: string, k: K, v: ApprovalRule[K]) => {
    setDraft((p) => ({ ...p, [id]: { ...p[id], [k]: v } }));
  };

  const dirty = rules.some((r) => {
    const d = draft[r.id];
    return d && (
      Number(d.amount_threshold ?? 0) !== Number(r.amount_threshold ?? 0) ||
      d.required_role !== r.required_role || d.active !== r.active
    );
  });

  const save = async () => {
    const changed = rules.filter((r) => {
      const d = draft[r.id];
      return d && (
        Number(d.amount_threshold ?? 0) !== Number(r.amount_threshold ?? 0) ||
        d.required_role !== r.required_role || d.active !== r.active
      );
    });
    try {
      await Promise.all(changed.map((r) => {
        const d = draft[r.id];
        return updateMutation.mutateAsync({
          id: r.id, amount_threshold: d.amount_threshold, required_role: d.required_role, active: d.active,
        });
      }));
      toast.success(`${changed.length} regla(s) actualizada(s)`);
    } catch (e) {
      toast.error(`Error: ${(e as Error).message}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" /> Matriz de Aprobación
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          PdCs que cumplan estas condiciones quedarán en estado <code className="bg-muted px-1 rounded">pending_approval</code> antes de avanzar a la etapa indicada.
        </p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando reglas…</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Regla</TableHead>
                  <TableHead className="w-[120px]">Etapa</TableHead>
                  <TableHead className="w-[120px]">Tipo</TableHead>
                  <TableHead className="w-[160px]">Umbral monto</TableHead>
                  <TableHead className="w-[160px]">Rol requerido</TableHead>
                  <TableHead className="w-[80px]">Activa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((r) => {
                  const d = draft[r.id] ?? r;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-xs">{d.label}</TableCell>
                      <TableCell className="text-xs"><code className="bg-muted px-1 rounded">{d.stage}</code></TableCell>
                      <TableCell className="text-xs capitalize">{d.condition_type}</TableCell>
                      <TableCell>
                        <Input
                          type="number" min={0} disabled={d.condition_type === "criticality"}
                          value={d.amount_threshold ?? ""}
                          onChange={(e) => setField(r.id, "amount_threshold", e.target.value === "" ? null : Number(e.target.value))}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Select value={d.required_role} onValueChange={(v) => setField(r.id, "required_role", v as UserRole)}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {APPROVAL_ROLES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Switch checked={d.active} onCheckedChange={(v) => setField(r.id, "active", v)} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Button onClick={save} disabled={!dirty || updateMutation.isPending}>
              {updateMutation.isPending ? "Guardando…" : "Guardar cambios"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
