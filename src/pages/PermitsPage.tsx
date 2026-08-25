import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarRange, FileCheck, List, Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";
import { PermitFormDialog } from "@/components/permits/PermitFormDialog";
import { PermitsTimeline } from "@/components/permits/PermitsTimeline";
import {
  usePermits,
  usePermitTypes,
  usePermitAlertSync,
  useStartRenewal,
  type Permit,
} from "@/hooks/usePermits";
import { useProjects } from "@/hooks/useProjects";
import { useTenantUsers } from "@/hooks/useTenantUsers";
import {
  PERMIT_STATUSES,
  PERMIT_STATUS_BADGE,
  PERMIT_STATUS_LABELS,
  expiryMeta,
  type PermitStatus,
} from "@/lib/permits";

const ALL = "all";

export default function PermitsPage() {
  const { data: permits = [], isLoading } = usePermits();
  const { data: types = [] } = usePermitTypes();
  const { data: projects = [] } = useProjects();
  const { data: users = [] } = useTenantUsers();
  const renewal = useStartRenewal();

  usePermitAlertSync(permits);

  const [view, setView] = useState<"list" | "calendar">("list");
  const [status, setStatus] = useState<string>(ALL);
  const [typeId, setTypeId] = useState<string>(ALL);
  const [projectId, setProjectId] = useState<string>(ALL);
  const [responsible, setResponsible] = useState<string>(ALL);
  const [q, setQ] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Permit | null>(null);

  // Alta guiada tras crear un proceso tipo "permiso"
  const [searchParams, setSearchParams] = useSearchParams();
  const prefillPdc = searchParams.get("pdc") ?? undefined;
  const prefillProject = searchParams.get("project") || undefined;
  useEffect(() => {
    if (prefillPdc) {
      setEditing(null);
      setDialogOpen(true);
    }
  }, [prefillPdc]);

  const projectName = (id: string | null) => projects.find((p) => p.id === id)?.name ?? "—";
  const userName = (id: string | null) => {
    const u = users.find((x) => x.id === id);
    return u?.full_name ?? u?.email ?? "—";
  };
  const typeRequiresRenewal = (p: Permit) =>
    types.find((t) => t.id === p.permit_type_id)?.requires_renewal ?? false;

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return permits
      .filter((p) => status === ALL || p.status === status)
      .filter((p) => typeId === ALL || p.permit_type_id === typeId)
      .filter((p) => projectId === ALL || p.project_id === projectId)
      .filter((p) => responsible === ALL || p.responsible_user_id === responsible)
      .filter((p) =>
        !term ||
        [p.permit_type, p.permit_number, p.issuing_authority]
          .filter(Boolean)
          .some((v) => (v as string).toLowerCase().includes(term)),
      )
      .sort((a, b) => (a.expiration_date ?? "9999-12-31").localeCompare(b.expiration_date ?? "9999-12-31"));
  }, [permits, status, typeId, projectId, responsible, q]);

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (p: Permit) => { setEditing(p); setDialogOpen(true); };

  const startRenewal = async (p: Permit) => {
    try {
      const created = await renewal.mutateAsync(p);
      toast.success("Renovación creada");
      setEditing(created);
      setDialogOpen(true);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <SEO
        title="Permisología"
        description="Gestión de permisos de obra: municipales, ambientales, sanitarios y eléctricos, con vencimientos y responsables."
        path="/permits"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-accent" /> Permisología
          </h1>
          <p className="text-sm text-muted-foreground">
            Permisos de obra con expediente, entidad emisora, vencimientos y responsables.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border overflow-hidden">
            <Button
              variant={view === "list" ? "secondary" : "ghost"} size="sm" className="rounded-none"
              onClick={() => setView("list")}
            >
              <List className="w-4 h-4 mr-1" /> Lista
            </Button>
            <Button
              variant={view === "calendar" ? "secondary" : "ghost"} size="sm" className="rounded-none"
              onClick={() => setView("calendar")}
            >
              <CalendarRange className="w-4 h-4 mr-1" /> Calendario
            </Button>
          </div>
          <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Nuevo permiso</Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los estados</SelectItem>
              {PERMIT_STATUSES.map((s) => <SelectItem key={s} value={s}>{PERMIT_STATUS_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={typeId} onValueChange={setTypeId}>
            <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los tipos</SelectItem>
              {types.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger><SelectValue placeholder="Obra" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas las obras</SelectItem>
              {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={responsible} onValueChange={setResponsible}>
            <SelectTrigger><SelectValue placeholder="Responsable" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los responsables</SelectItem>
              {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name ?? u.email}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {isLoading && <Skeleton className="h-64 w-full" />}

      {!isLoading && view === "calendar" && (
        <PermitsTimeline permits={filtered} onSelect={openEdit} />
      )}

      {!isLoading && view === "list" && (
        filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
            No hay permisos que coincidan con los filtros.
          </CardContent></Card>
        ) : (
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>N° expediente</TableHead>
                  <TableHead>Obra</TableHead>
                  <TableHead>Entidad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead className="w-[120px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const meta = expiryMeta(p.expiration_date, p.status);
                  return (
                    <TableRow
                      key={p.id}
                      className={`cursor-pointer ${meta.overdue ? "border-l-4 border-l-danger" : meta.days !== null && meta.days <= 30 ? "border-l-4 border-l-warning" : ""}`}
                      onClick={() => openEdit(p)}
                    >
                      <TableCell className="font-medium">{p.permit_type}</TableCell>
                      <TableCell className="text-sm">{p.permit_number ?? "—"}</TableCell>
                      <TableCell className="text-sm">{projectName(p.project_id)}</TableCell>
                      <TableCell className="text-sm">{p.issuing_authority ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={PERMIT_STATUS_BADGE[p.status as PermitStatus]}>
                          {PERMIT_STATUS_LABELS[p.status as PermitStatus] ?? p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{userName(p.responsible_user_id)}</TableCell>
                      <TableCell className="text-sm">
                        <div>{p.expiration_date ?? "—"}</div>
                        <div className={`text-xs ${meta.className}`}>{meta.label}</div>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {typeRequiresRenewal(p) && (
                          <Button
                            variant="outline" size="sm"
                            onClick={() => startRenewal(p)}
                            disabled={renewal.isPending}
                          >
                            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Renovar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )
      )}

      <PermitFormDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v && prefillPdc) setSearchParams({}, { replace: true });
        }}
        permit={editing}
        defaultPdcId={editing ? undefined : prefillPdc}
        defaultProjectId={editing ? undefined : prefillProject}
      />
    </div>
  );
}
