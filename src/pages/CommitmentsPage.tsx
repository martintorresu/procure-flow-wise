import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ClipboardList, ListChecks, Wand2 } from "lucide-react";
import { SEO } from "@/components/SEO";
import { CommitmentsTable } from "@/components/CommitmentsTable";
import {
  useCommitments,
  useImportCommitments,
  useProcessOptions,
  type NewCommitment,
} from "@/hooks/useCommitments";
import { useTenantUsers } from "@/hooks/useTenantUsers";
import {
  COMMITMENT_STATUSES,
  matchProcess,
  matchUser,
  parseCommitmentsText,
  type CommitmentPriority,
  type ParsedCommitment,
} from "@/lib/commitments";

const PLACEHOLDER = `Formato (uno por línea):
- [Responsable] Compromiso | Fecha límite | Prioridad | PDC relacionado

Ejemplo:
- [Juan Pérez] Subir certificado de materiales | 25/08/2026 | Alta | PC-2024-0045`;

interface DraftRow extends ParsedCommitment {
  userId: string | null;
  pdcId: string | null;
  autoUser: boolean;
  autoPdc: boolean;
}

export default function CommitmentsPage() {
  const { data: commitments = [], isLoading } = useCommitments();
  const { data: processes = [] } = useProcessOptions();
  const { data: users = [] } = useTenantUsers();
  const importMutation = useImportCommitments();

  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<DraftRow[] | null>(null);

  // Filtros de la lista
  const [fStatus, setFStatus] = useState("all");
  const [fResponsible, setFResponsible] = useState("all");
  const [fPdc, setFPdc] = useState("all");
  const [fMeetingDate, setFMeetingDate] = useState("");

  const handleParse = () => {
    const parsed = parseCommitmentsText(text);
    if (!parsed.length) {
      toast.error("No se detectó ningún compromiso en el texto");
      return;
    }
    const rows: DraftRow[] = parsed.map((p) => {
      const u = p.responsible ? matchUser(p.responsible, users) : null;
      const proc = p.pdcReference ? matchProcess(p.pdcReference, processes) : null;
      return {
        ...p,
        userId: u?.id ?? null,
        pdcId: proc?.id ?? null,
        autoUser: !!u,
        autoPdc: !!proc,
      };
    });
    setDraft(rows);
    toast.success(`${rows.length} compromiso(s) detectado(s)`);
  };

  const handleImport = async () => {
    if (!draft?.length) return;
    const payload: NewCommitment[] = draft.map((d) => ({
      commitment_text: d.text,
      responsible_user_id: d.userId,
      responsible_name: d.responsible || null,
      pdc_id: d.pdcId,
      due_date: d.dueDate,
      priority: d.priority,
      meeting_title: meetingTitle.trim() || null,
      meeting_date: meetingDate || null,
      raw_json: { source: "manual_textarea", parsed: d },
    }));
    try {
      const res = await importMutation.mutateAsync(payload);
      toast.success(`${res.inserted} compromiso(s) importado(s)`);
      setDraft(null);
      setText("");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const updateDraft = (i: number, patch: Partial<DraftRow>) =>
    setDraft((prev) => (prev ? prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) : prev));

  const responsibles = useMemo(() => {
    const set = new Map<string, string>();
    commitments.forEach((c) => {
      if (c.responsible_name) set.set(c.responsible_name, c.responsible_name);
    });
    return Array.from(set.keys()).sort();
  }, [commitments]);

  const filtered = useMemo(
    () =>
      commitments.filter((c) => {
        if (fStatus !== "all" && c.status !== fStatus) return false;
        if (fResponsible !== "all" && c.responsible_name !== fResponsible) return false;
        if (fPdc === "none" && c.pdc_id) return false;
        if (fPdc !== "all" && fPdc !== "none" && c.pdc_id !== fPdc) return false;
        if (fMeetingDate && c.meeting_date !== fMeetingDate) return false;
        return true;
      }),
    [commitments, fStatus, fResponsible, fPdc, fMeetingDate],
  );

  return (
    <div className="space-y-6">
      <SEO
        title="Compromisos de reuniones | Pro.Curem Flow"
        description="Importa y gestiona los compromisos acordados en reuniones, vinculándolos a procesos y responsables."
      />

      <header className="flex items-center gap-3">
        <ClipboardList className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Compromisos</h1>
          <p className="text-sm text-muted-foreground">
            Importa compromisos desde un agente externo o pegando el acta de la reunión.
          </p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wand2 className="w-4 h-4" /> Importación manual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="meeting-title">Título de la reunión</Label>
              <Input
                id="meeting-title"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="Reunión de avance proyecto X"
              />
            </div>
            <div>
              <Label htmlFor="meeting-date">Fecha de la reunión</Label>
              <Input id="meeting-date" type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} />
            </div>
          </div>

          <div>
            <Label htmlFor="commitments-text">Compromisos</Label>
            <Textarea
              id="commitments-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={PLACEHOLDER}
              rows={10}
              className="font-mono text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleParse} variant="secondary">Parsear</Button>
            {draft && (
              <Button onClick={handleImport} disabled={importMutation.isPending}>
                Importar {draft.length} compromiso{draft.length === 1 ? "" : "s"}
              </Button>
            )}
            {draft && (
              <Button variant="ghost" onClick={() => setDraft(null)}>Descartar</Button>
            )}
          </div>

          {draft && (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[220px]">Compromiso</TableHead>
                    <TableHead>Responsable</TableHead>
                    <TableHead>Proceso</TableHead>
                    <TableHead>Límite</TableHead>
                    <TableHead>Prioridad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {draft.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Input value={d.text} onChange={(e) => updateDraft(i, { text: e.target.value })} />
                      </TableCell>
                      <TableCell className={!d.userId ? "bg-warning/10" : undefined}>
                        <Select
                          value={d.userId ?? "none"}
                          onValueChange={(v) => updateDraft(i, { userId: v === "none" ? null : v })}
                        >
                          <SelectTrigger className="w-[190px]">
                            <SelectValue placeholder="Sin vincular" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin vincular{d.responsible ? ` (${d.responsible})` : ""}</SelectItem>
                            {users.map((u) => (
                              <SelectItem key={u.id} value={u.id}>{u.full_name ?? u.email}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className={!d.pdcId ? "bg-warning/10" : undefined}>
                        <Select
                          value={d.pdcId ?? "none"}
                          onValueChange={(v) => updateDraft(i, { pdcId: v === "none" ? null : v })}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Sin proceso" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin proceso{d.pdcReference ? ` (${d.pdcReference})` : ""}</SelectItem>
                            {processes.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.pdc_number} · {p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          className="w-[150px]"
                          value={d.dueDate ?? ""}
                          onChange={(e) => updateDraft(i, { dueDate: e.target.value || null })}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={d.priority ?? "none"}
                          onValueChange={(v) =>
                            updateDraft(i, { priority: v === "none" ? null : (v as CommitmentPriority) })
                          }
                        >
                          <SelectTrigger className="w-[120px]"><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">—</SelectItem>
                            <SelectItem value="alta">Alta</SelectItem>
                            <SelectItem value="media">Media</SelectItem>
                            <SelectItem value="baja">Baja</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="w-4 h-4" /> Compromisos registrados ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <Select value={fStatus} onValueChange={setFStatus}>
              <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {COMMITMENT_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={fResponsible} onValueChange={setFResponsible}>
              <SelectTrigger><SelectValue placeholder="Responsable" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los responsables</SelectItem>
                {responsibles.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={fPdc} onValueChange={setFPdc}>
              <SelectTrigger><SelectValue placeholder="Proceso" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los procesos</SelectItem>
                <SelectItem value="none">Sin vincular</SelectItem>
                {processes.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.pdc_number} · {p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={fMeetingDate} onChange={(e) => setFMeetingDate(e.target.value)} />
          </div>

          <div className="overflow-x-auto">
            <CommitmentsTable commitments={filtered} processes={processes} isLoading={isLoading} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
