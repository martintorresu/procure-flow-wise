import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ChevronDown, ListChecks, MessagesSquare, Wand2 } from "lucide-react";
import { SEO } from "@/components/SEO";
import { CommitmentsTable } from "@/components/CommitmentsTable";
import { MeetingToActionHero } from "@/components/MeetingToActionHero";
import {
  useCommitments,
  useImportCommitments,
  useProcessOptions,
  type Commitment,
  type NewCommitment,
} from "@/hooks/useCommitments";
import { useTenantUsers } from "@/hooks/useTenantUsers";
import {
  COMMITMENT_STATUSES,
  dueMeta,
  matchProcess,
  matchUser,
  parseCommitmentsText,
  parseTranscriptText,
  type CommitmentPriority,
  type ParsedCommitment,
} from "@/lib/commitments";

const STRUCTURED_PLACEHOLDER = `Formato (uno por línea):
- [Responsable] Compromiso | Fecha límite | Prioridad | PDC relacionado

Ejemplo:
- [Juan Pérez] Subir certificado de materiales | 25/08/2026 | Alta | PC-2024-0045`;

const TRANSCRIPT_PLACEHOLDER =
  "Pega aquí la transcripción de la reunión, notas de voz transcritas o el resumen del agente de minutas. El sistema identificará automáticamente los compromisos, responsables y fechas.";

type Mode = "transcript" | "structured";

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

  const [mode, setMode] = useState<Mode>("transcript");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<DraftRow[] | null>(null);

  // Filtros de la lista
  const [fStatus, setFStatus] = useState("all");
  const [fResponsible, setFResponsible] = useState("all");
  const [fPdc, setFPdc] = useState("all");
  const [fMeetingDate, setFMeetingDate] = useState("");
  const [grouped, setGrouped] = useState(false);

  const handleParse = () => {
    const parsed = mode === "transcript" ? parseTranscriptText(text) : parseCommitmentsText(text);
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
      raw_json: { source: mode === "transcript" ? "manual_transcript" : "manual_textarea", parsed: d },
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

  const groups = useMemo(() => {
    const map = new Map<string, { title: string; date: string | null; items: Commitment[] }>();
    filtered.forEach((c) => {
      const key = `${c.meeting_title ?? ""}|${c.meeting_date ?? ""}`;
      if (!map.has(key)) {
        map.set(key, {
          title: c.meeting_title ?? "Sin reunión asociada",
          date: c.meeting_date,
          items: [],
        });
      }
      map.get(key)!.items.push(c);
    });
    return Array.from(map.entries())
      .map(([key, g]) => ({ key, ...g }))
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  }, [filtered]);

  const overdueCount = filtered.filter((c) => dueMeta(c.due_date, c.status).overdue).length;

  const textareaRows = mode === "transcript" ? 14 : 10;

  return (
    <div className="space-y-6">
      <SEO
        title="Compromisos de reunión | Pro.Curem Flow"
        description="Convierte lo acordado en reuniones de obra en compromisos con responsable, fecha y seguimiento dentro de los procesos."
      />

      <header className="flex items-center gap-3">
        <MessagesSquare className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Compromisos de Reunión</h1>
          <p className="text-sm text-muted-foreground">
            Captura acuerdos de reuniones de obra y conviértelos en acciones con seguimiento.
          </p>
        </div>
      </header>

      <MeetingToActionHero />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wand2 className="w-4 h-4" /> Capturar compromisos de reunión
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
                placeholder="Visita a obra — Torre B, piso 7"
              />
            </div>
            <div>
              <Label htmlFor="meeting-date">Fecha de la reunión</Label>
              <Input id="meeting-date" type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} />
            </div>
          </div>

          <Tabs
            value={mode}
            onValueChange={(v) => {
              setMode(v as Mode);
              setDraft(null);
            }}
          >
            <TabsList>
              <TabsTrigger value="transcript">Pegar transcripción</TabsTrigger>
              <TabsTrigger value="structured">Formato estructurado</TabsTrigger>
            </TabsList>

            <TabsContent value="transcript" className="mt-4 space-y-2">
              <Label htmlFor="commitments-text">Transcripción o notas de la reunión</Label>
              <p className="text-xs text-muted-foreground">
                Detectamos frases como “Juan se compromete a…”, “queda pendiente que…”, “para el viernes
                hay que…” o “responsable: María”. Podrás corregir todo en la vista previa.
              </p>
            </TabsContent>

            <TabsContent value="structured" className="mt-4 space-y-2">
              <Label htmlFor="commitments-text">Compromisos (una línea por compromiso)</Label>
              <p className="text-xs text-muted-foreground">
                Formato: <code>[Responsable] Compromiso | Fecha | Prioridad | PDC</code>
              </p>
            </TabsContent>
          </Tabs>

          <Textarea
            id="commitments-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={mode === "transcript" ? TRANSCRIPT_PLACEHOLDER : STRUCTURED_PLACEHOLDER}
            rows={textareaRows}
            className={mode === "transcript" ? "text-sm" : "font-mono text-sm"}
          />

          <div className="flex gap-2">
            <Button onClick={handleParse} variant="secondary">Detectar compromisos</Button>
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
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="w-4 h-4" /> Compromisos registrados ({filtered.length})
            {overdueCount > 0 && (
              <Badge variant="destructive" className="ml-1">{overdueCount} vencido{overdueCount === 1 ? "" : "s"}</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="group-toggle" className="text-xs text-muted-foreground">Agrupar por reunión</Label>
            <Switch id="group-toggle" checked={grouped} onCheckedChange={setGrouped} />
          </div>
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

          {!grouped && (
            <div className="overflow-x-auto">
              <CommitmentsTable commitments={filtered} processes={processes} isLoading={isLoading} />
            </div>
          )}

          {grouped && (
            <div className="space-y-3">
              {groups.length === 0 && !isLoading && (
                <p className="text-sm text-muted-foreground">Sin compromisos.</p>
              )}
              {groups.map((g) => {
                const overdue = g.items.filter((c) => dueMeta(c.due_date, c.status).overdue).length;
                return (
                  <Collapsible key={g.key} defaultOpen className="border rounded-lg">
                    <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-muted/40 rounded-lg">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{g.title}</p>
                        <p className="text-xs text-muted-foreground">{g.date ?? "Sin fecha"}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline">{g.items.length}</Badge>
                        {overdue > 0 && <Badge variant="destructive">{overdue} vencido{overdue === 1 ? "" : "s"}</Badge>}
                        <ChevronDown className="w-4 h-4 transition-transform group-data-[state=open]:rotate-180" />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="overflow-x-auto border-t">
                        <CommitmentsTable commitments={g.items} processes={processes} hideMeetingColumn />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
