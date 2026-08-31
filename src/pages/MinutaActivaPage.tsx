import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Mic, Pause, Square, FileText, CheckCircle2, Plus, Trash2, RefreshCw, WifiOff } from "lucide-react";
import { SEO } from "@/components/SEO";
import { useVoiceCapture } from "@/hooks/useVoiceCapture";
import { useImportCommitments, useProcessOptions, type NewCommitment } from "@/hooks/useCommitments";
import { useTenantUsers, useMyProfile } from "@/hooks/useTenantUsers";
import { useOnlineStatus } from "@/hooks/useOfflineSync";
import { useMinutaConfig } from "@/hooks/useMinutaConfig";
import { useCreateMinutaSession } from "@/hooks/useMinutaSession";
import { useProcessStages, useProcessStagesByProcess, sortStagesForPicker } from "@/hooks/useProcessStages";
import { useAuth } from "@/contexts/AuthContext";
import { QualityGauge } from "@/components/minuta/QualityGauge";
import { QualityChecklist } from "@/components/minuta/QualityChecklist";
import { ParticipantsPicker, type MinutaParticipant } from "@/components/minuta/ParticipantsPicker";
import { calculateQualityScore, isWithinMaxDelivery } from "@/lib/minutaQuality";
import { enqueueCommitments } from "@/lib/offlineQueue";
import {
  matchProcess,
  matchUser,
  parseCommitmentsText,
  parseTranscriptText,
  presegmentTranscript,
  type CommitmentPriority,
  type ParsedCommitment,
} from "@/lib/commitments";

type Phase = "dashboard" | "setup" | "capture" | "transcript" | "review";

interface DraftRow extends ParsedCommitment {
  userId: string | null;
  processId: string | null;
  stageId: string | null;
  activityRef: string | null;
  included: boolean;
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function MinutaActivaPage() {
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const { data: processes = [] } = useProcessOptions();
  const { data: users = [] } = useTenantUsers();
  const importMutation = useImportCommitments();
  const createSession = useCreateMinutaSession();
  const voice = useVoiceCapture();
  const { user } = useAuth();
  const { data: myProfile } = useMyProfile(user?.id);
  const { qualityThreshold, maxDeliveryDays } = useMinutaConfig();

  // PWA dedicada (minuta.html): sin sidebar ni navegación a /commitments
  const isStandaloneApp =
    typeof window !== "undefined" && window.location.pathname.includes("minuta.html");

  const [phase, setPhase] = useState<Phase>("dashboard");
  const [importDone, setImportDone] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [importedCount, setImportedCount] = useState(0);

  // Fase 1
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState(todayISO);
  const [presetProcessId, setPresetProcessId] = useState<string | null>(null);
  const [presetStageId, setPresetStageId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<MinutaParticipant[]>([]);

  // El creador se agrega automáticamente como participante
  useEffect(() => {
    if (!myProfile) return;
    setParticipants((prev) =>
      prev.some((p) => p.userId === myProfile.id)
        ? prev
        : [
            {
              key: myProfile.id,
              userId: myProfile.id,
              name: myProfile.full_name ?? myProfile.email,
              role: myProfile.area,
              email: myProfile.email,
              company: null,
              isGuest: false,
              locked: true,
            },
            ...prev,
          ],
    );
  }, [myProfile]);

  // Etapas del proceso vinculado (dependiente del proceso seleccionado)
  const { data: stages = [] } = useProcessStages(presetProcessId ?? undefined);
  const sortedStages = useMemo(() => sortStagesForPicker(stages), [stages]);

  // Al cambiar el proceso se limpia la etapa seleccionada
  useEffect(() => {
    setPresetStageId(null);
  }, [presetProcessId]);

  // Preselección automática si hay exactamente una etapa en curso
  useEffect(() => {
    if (presetStageId) return;
    const active = stages.filter((s) => s.status === "in_progress");
    if (active.length === 1) setPresetStageId(active[0].id);
  }, [stages, presetStageId]);

  // Fase 2
  const [elapsed, setElapsed] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [manualText, setManualText] = useState("");
  const [textSheetOpen, setTextSheetOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Fase 3
  const [draft, setDraft] = useState<DraftRow[]>([]);
  const [rawTranscript, setRawTranscript] = useState("");
  const [approvedTranscript, setApprovedTranscript] = useState("");
  const [noDetected, setNoDetected] = useState(false);

  // Etapas de todos los procesos involucrados (Setup + reclasificaciones por fila)
  const involvedProcessIds = useMemo(
    () => [presetProcessId, ...draft.map((d) => d.processId)],
    [presetProcessId, draft],
  );
  const { data: stagesByProcess } = useProcessStagesByProcess(involvedProcessIds);
  const stagesFor = (processId: string | null) =>
    (processId ? stagesByProcess?.get(processId) : undefined) ?? [];

  // Timer de captura
  useEffect(() => {
    if (phase !== "capture" || startedAt === null) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [phase, startedAt]);

  // Scroll automático del área de transcripción
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [voice.transcript, voice.interimText]);

  const fullTranscript = useMemo(() => {
    const parts = [voice.transcript.trim(), manualText.trim()].filter(Boolean);
    return parts.join("\n");
  }, [voice.transcript, manualText]);

  const setupValid =
    meetingTitle.trim().length >= 3 &&
    !!meetingDate &&
    !!presetProcessId &&
    !!presetStageId &&
    participants.length > 0;

  const startCapture = async () => {
    if (!setupValid) {
      toast.error("Completa título, fecha, proceso, etapa y al menos un participante");
      return;
    }
    setPhase("capture");
    setStartedAt(Date.now());
    setElapsed(0);
    if (voice.isSupported) await voice.start();
  };

  const buildDraft = (text: string) => {
    let parsed = parseTranscriptText(text);
    // Complementar con parser estructurado por si el usuario pegó líneas con formato
    // Presegmentar para que el texto de voz (una sola línea) se divida antes de parseCommitmentsText
    const structured = parseCommitmentsText(presegmentTranscript(text));
    const seen = new Set(parsed.map((p) => p.text));
    for (const s of structured) {
      if (!seen.has(s.text) && s.text.length >= 12) parsed.push(s);
    }
    return parsed.map((p): DraftRow => {
      const u = p.responsible ? matchUser(p.responsible, users) : null;
      const proc = p.processReference ? matchProcess(p.processReference, processes) : null;
      return {
        ...p,
        userId: u?.id ?? null,
        processId: proc?.id ?? presetProcessId,
        stageId: (proc?.id ?? presetProcessId) === presetProcessId ? presetStageId : null,
        activityRef: null,
        included: true,
      };
    });
  };

  const closeCapture = () => {
    if (voice.isListening || voice.isPaused) voice.stop();
    const text = fullTranscript;
    if (!text.trim()) {
      toast.error("No hay transcripción para procesar. Agrega texto manual primero.");
      return;
    }
    setRawTranscript(text);
    setApprovedTranscript(text);
    setPhase("transcript");
  };

  const approveTranscript = () => {
    const text = approvedTranscript.trim();
    if (!text) {
      toast.error("La transcripción está vacía.");
      return;
    }
    const rows = buildDraft(approvedTranscript);
    setDraft(rows);
    setNoDetected(rows.length === 0);
    setPhase("review");
  };


  const reprocess = () => {
    const rows = buildDraft(approvedTranscript || rawTranscript);
    setDraft(rows);
    setNoDetected(rows.length === 0);
    if (rows.length) toast.success(`${rows.length} compromiso(s) detectado(s)`);
    else toast.info("Aún no se detectan compromisos en el texto");
  };

  const updateDraft = (i: number, patch: Partial<DraftRow>) =>
    setDraft((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const removeDraft = (i: number) => setDraft((prev) => prev.filter((_, idx) => idx !== i));

  const addManualDraft = () =>
    setDraft((prev) => [
      ...prev,
      {
        text: "",
        responsible: "",
        dueDate: null,
        priority: null,
        processReference: "",
        userId: null,
        processId: presetProcessId,
        stageId: presetStageId,
        activityRef: null,
        included: true,
      },
    ]);

  /* ------------------- Estándar de Minuta: calidad ------------------- */
  const includedDrafts = useMemo(
    () => draft.filter((d) => d.included && d.text.trim()),
    [draft],
  );

  const quality = useMemo(
    () =>
      calculateQualityScore(
        {
          hasProject: !!presetProcessId || includedDrafts.some((d) => !!d.processId),
          hasStage: !!presetStageId,
          hasMeetingDate: !!meetingDate,
          participantCount: participants.length,
          commitments: includedDrafts.map((d) => ({
            hasResponsible: !!d.userId || !!d.responsible.trim(),
            hasDueDate: !!d.dueDate,
            dueDateWithinMax: isWithinMaxDelivery(meetingDate || null, d.dueDate, maxDeliveryDays),
          })),
        },
        maxDeliveryDays,
      ),
    [includedDrafts, presetProcessId, presetStageId, meetingDate, participants.length, maxDeliveryDays],
  );

  const qualityOk = quality.score >= qualityThreshold;

  /** Carátula: todos los criterios pendientes (0%). */
  const blankQuality = useMemo(
    () =>
      calculateQualityScore(
        { hasProject: false, hasStage: false, hasMeetingDate: false, participantCount: 0, commitments: [] },
        maxDeliveryDays,
      ),
    [maxDeliveryDays],
  );

  const handleImport = async () => {
    const selected = includedDrafts;
    if (!selected.length) {
      toast.error("No hay compromisos seleccionados para importar");
      return;
    }
    if (!qualityOk) {
      toast.error(`La calidad mínima requerida es ${qualityThreshold}%.`);
      return;
    }
    if (selected.some((d) => !d.stageId)) {
      toast.error("Cada compromiso debe tener una etapa asignada.");
      return;
    }
    const mismatch = selected.findIndex(
      (d) => !d.processId || !stagesFor(d.processId).some((s) => s.id === d.stageId),
    );
    if (mismatch >= 0) {
      toast.error(
        `El compromiso ${mismatch + 1} tiene una etapa que no pertenece a su proceso. Vuelve a seleccionarla.`,
      );
      return;
    }

    const basePayload: NewCommitment[] = selected.map((d) => ({
      commitment_text: d.text.trim(),
      responsible_user_id: d.userId,
      responsible_name: d.userId ? ((users.find((u) => u.id === d.userId)?.full_name ?? d.responsible) || null) : (d.responsible || null),
      process_id: d.processId,
      stage_id: d.stageId,
      activity_ref: d.activityRef,
      due_date: d.dueDate,
      priority: d.priority,
      meeting_title: meetingTitle.trim(),
      meeting_date: meetingDate || null,
      raw_json: { source: "minuta_activa", parsed: d, quality_score: quality.score },
    }));

    if (!isOnline) {
      enqueueCommitments(basePayload, meetingTitle.trim());
      toast.info("📴 Sin conexión. Los compromisos se enviarán automáticamente cuando vuelva Internet.");
      setFinalScore(quality.score);
      setImportedCount(basePayload.length);
      if (isStandaloneApp) setImportDone(true);
      else navigate("/commitments");
      return;
    }

    try {
      let sessionId: string | null = null;
      try {
        sessionId = await createSession.mutateAsync({
          title: meetingTitle.trim(),
          meetingDate: meetingDate || todayISO,
          processId: presetProcessId,
          processStageId: presetStageId,
          qualityScore: quality.score,
          participants: participants.map((p) => ({
            userId: p.userId,
            guestName: p.isGuest ? p.name : null,
            guestEmail: p.isGuest ? p.email : null,
            guestCompany: p.isGuest ? p.company : null,
            isGuest: p.isGuest,
          })),
          transcript: approvedTranscript,
        });
      } catch (e) {
        console.warn("[minuta] no se pudo crear la sesión:", e);
      }

      const payload = basePayload.map((p) => ({ ...p, meeting_session_id: sessionId }));
      const res = await importMutation.mutateAsync(payload);
      const notified = payload.filter((p) => p.responsible_user_id).length;
      toast.success(
        `✅ ${res.inserted} compromiso${res.inserted === 1 ? "" : "s"} importado${res.inserted === 1 ? "" : "s"}. Se enviaron alertas WhatsApp a ${notified} responsable${notified === 1 ? "" : "s"}.`,
      );
      setFinalScore(quality.score);
      setImportedCount(res.inserted);
      if (isStandaloneApp) setImportDone(true);
      else navigate("/commitments");
    } catch {
      // Fallback: si falla online, guardar en cola offline para reintento automático
      enqueueCommitments(basePayload, meetingTitle.trim());
      toast.error("Error al importar. Los compromisos se guardaron localmente y se enviarán automáticamente.");
      setFinalScore(quality.score);
      setImportedCount(basePayload.length);
      if (isStandaloneApp) setImportDone(true);
      else navigate("/commitments");
    }
  };

  const startNewCapture = () => {
    voice.reset();
    setImportDone(false);
    setPhase("dashboard");
    setDraft([]);
    setRawTranscript("");
    setApprovedTranscript("");
    setNoDetected(false);
    setMeetingTitle("");
    setManualText("");
    setElapsed(0);
    setStartedAt(null);
    setPresetProcessId(null);
    setPresetStageId(null);
    setParticipants((prev) => prev.filter((p) => p.locked));
  };

  const handleDownloadPdf = () => {
    downloadMinutaPdf({
      title: meetingTitle.trim() || "Minuta",
      meetingDate: meetingDate || todayISO,
      createdBy: myProfile?.full_name ?? myProfile?.email ?? "—",
      participants: participants.map((p) => ({
        name: p.name,
        role: p.role ?? undefined,
        email: p.email ?? undefined,
        company: p.company ?? undefined,
        isGuest: p.isGuest,
      })),
      transcript: approvedTranscript || rawTranscript,
      commitments: draft
        .filter((d) => d.included && d.text.trim())
        .map((d) => ({
          text: d.text.trim(),
          responsible: d.userId
            ? (users.find((u) => u.id === d.userId)?.full_name ?? d.responsible ?? "")
            : (d.responsible ?? ""),
          dueDate: d.dueDate,
          priority: d.priority,
        })),
      qualityScore: finalScore || quality.score,
    });
  };

  /* --------------------- ÉXITO (PWA dedicada) --------------------- */
  if (importDone) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <CheckCircle2 className="w-16 h-16 text-success" />
        <h2 className="text-xl font-bold">¡Compromisos importados!</h2>
        <QualityGauge score={finalScore} threshold={qualityThreshold} size={130} />
        <p className="text-sm text-muted-foreground text-center">
          {importedCount} compromiso{importedCount === 1 ? "" : "s"} registrado
          {importedCount === 1 ? "" : "s"} con {finalScore}% de calidad. Se enviaron alertas
          WhatsApp a los responsables.
        </p>
        <Button size="lg" variant="outline" onClick={handleDownloadPdf}>
          📄 Descargar Acta (PDF)
        </Button>
        <Button size="lg" onClick={startNewCapture}>
          🎙️ Nueva captura
        </Button>
      </div>
    );
  }


  /* ------------------------------ FASE 0 ------------------------------ */
  if (phase === "dashboard") {
    return (
      <div className="max-w-lg mx-auto pt-6 animate-fade-in">
        <SEO title="Minuta Activa | Pro.Curem Flow" description="Captura compromisos de reunión con voz desde terreno." path="/minuta" />
        <Card className="overflow-hidden">
          <div className="h-24 flex items-end px-5 pb-3" style={{ background: "var(--sidebar-gradient)" }}>
            <div className="flex items-center gap-2 text-sidebar-foreground">
              <Mic className="w-5 h-5" />
              <h1 className="text-lg font-bold">Minuta Activa</h1>
            </div>
          </div>
          <CardContent className="p-6 space-y-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <QualityGauge score={blankQuality.score} threshold={qualityThreshold} size={180} />
              <h2 className="text-base font-semibold">Estándar de Minuta</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                Completa cada criterio durante la reunión. El indicador se actualiza en tiempo real
                y habilita el envío al alcanzar el mínimo de {qualityThreshold}%.
              </p>
            </div>

            <div className="rounded-lg border border-border p-4">
              <QualityChecklist items={blankQuality.breakdown} />
            </div>

            <Button size="lg" className="w-full" onClick={() => setPhase("setup")}>
              🎙️ Iniciar Minuta
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }





  /* ------------------------------ FASE 1 ------------------------------ */
  if (phase === "setup") {
    return (
      <div className="max-w-lg mx-auto pt-6">
        <SEO title="Minuta Activa | Pro.Curem Flow" description="Captura compromisos de reunión con voz desde terreno." path="/minuta" />
        <Card className="overflow-hidden">
          <div className="h-24 flex items-end px-5 pb-3" style={{ background: "var(--sidebar-gradient)" }}>
            <div className="flex items-center gap-2 text-sidebar-foreground">
              <Mic className="w-5 h-5" />
              <h1 className="text-lg font-bold">Minuta Activa</h1>
            </div>
          </div>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-4 rounded-lg border border-border p-3">
              <QualityGauge score={quality.score} threshold={qualityThreshold} size={72} />
              <p className="text-sm text-muted-foreground">
                Configura la reunión y captura los compromisos con tu voz. El indicador sube a
                medida que completas el estándar.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minuta-title">
                Título de la reunión <span className="text-danger">*</span>
              </Label>
              <Input
                id="minuta-title"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="Ej: Reunión de obra semana 34"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minuta-date">
                Fecha <span className="text-danger">*</span>
              </Label>
              <Input id="minuta-date" type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>
                Proceso vinculado <span className="text-danger">*</span>
              </Label>
              <Select value={presetProcessId ?? "none"} onValueChange={(v) => setPresetProcessId(v === "none" ? null : v)}>
                <SelectTrigger className={!presetProcessId ? "border-danger/50" : undefined}>
                  <SelectValue placeholder="Vincular todos los compromisos a un proceso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecciona un proceso</SelectItem>
                  {processes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.process_number} · {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                Etapa principal de la reunión <span className="text-danger">*</span>
              </Label>
              <Select
                value={presetStageId ?? "none"}
                onValueChange={(v) => setPresetStageId(v === "none" ? null : v)}
                disabled={!presetProcessId}
              >
                <SelectTrigger className={!presetStageId ? "border-danger/50" : undefined}>
                  <SelectValue placeholder={presetProcessId ? "Selecciona una etapa" : "Selecciona primero un proceso"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecciona una etapa</SelectItem>
                  {sortedStages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.status === "in_progress" ? "🔵 " : ""}{s.sort_order}. {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {presetProcessId && sortedStages.length === 0 && (
                <p className="text-xs text-muted-foreground">Este proceso aún no tiene etapas definidas.</p>
              )}
            </div>

            <ParticipantsPicker value={participants} onChange={setParticipants} />

            {!voice.isSupported && (
              <p className="text-xs text-warning bg-warning/10 border border-warning/30 rounded-md p-2">
                Tu navegador no soporta reconocimiento de voz. Se habilitará la entrada manual de texto.
              </p>
            )}
            <Button size="lg" className="w-full" onClick={startCapture} disabled={!setupValid}>
              🎙️ Iniciar Captura
            </Button>
            {!setupValid && (
              <p className="text-xs text-muted-foreground text-center">
                Completa título (mín. 3 caracteres), fecha, proceso, etapa principal y al menos un participante.
              </p>
            )}
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setPhase("dashboard")}>
              Volver al panel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ------------------------------ FASE 2 ------------------------------ */
  if (phase === "capture") {
    return (
      <div className="fixed inset-0 z-40 bg-background flex flex-col">
        <SEO title="Capturando… | Minuta Activa" description="Captura de voz en curso." />

        {/* Header fijo */}
        <header className="shrink-0 flex items-center gap-3 px-4 h-14 border-b border-border bg-card">
          <Mic className={`w-5 h-5 shrink-0 ${voice.isListening ? "text-danger" : "text-muted-foreground"}`} />
          <h1 className="text-sm font-semibold truncate flex-1">{meetingTitle}</h1>
          <span className="text-sm font-mono tabular-nums text-muted-foreground">⏱ {formatTimer(elapsed)}</span>
          <Button size="sm" variant="outline" onClick={closeCapture}>Finalizar</Button>
        </header>

        {/* Área de transcripción */}
        <div ref={transcriptRef} className="flex-1 overflow-y-auto px-4 py-4">
          {voice.isSupported ? (
            <>
              {voice.error && (
                <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-md p-3 mb-3">{voice.error}</p>
              )}
              {!voice.transcript && !voice.interimText && (
                <p className="text-sm text-muted-foreground text-center mt-10">
                  {voice.isListening ? "Escuchando… comienza a hablar." : "Presiona el micrófono para comenzar."}
                </p>
              )}
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{voice.transcript}</p>
              {voice.interimText && (
                <p className="text-sm text-muted-foreground/70 italic whitespace-pre-wrap">{voice.interimText}</p>
              )}
              {manualText && (
                <div className="mt-4 border-t border-dashed border-border pt-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">— Notas manuales —</p>
                  <p className="text-sm whitespace-pre-wrap">{manualText}</p>
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex flex-col">
              <p className="text-sm text-muted-foreground mb-2">Tu navegador no soporta reconocimiento de voz. Usa la entrada manual.</p>
              <Textarea
                className="flex-1 min-h-[40vh] text-sm"
                placeholder="Escribe o pega la transcripción de la reunión aquí…"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Barra inferior de controles */}
        <div
          className="shrink-0 border-t border-border bg-card px-4 pt-3"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        >
          <div className="flex items-center justify-between max-w-md mx-auto">
            <Button variant="outline" size="sm" onClick={() => setTextSheetOpen(true)}>
              <FileText className="w-4 h-4 mr-1" /> Texto
            </Button>

            {voice.isSupported && (
              <button
                onClick={() => (voice.isListening ? voice.pause() : voice.isPaused ? voice.resume() : void voice.start())}
                aria-label={voice.isListening ? "Pausar grabación" : "Iniciar grabación"}
                className={`relative w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-colors ${
                  voice.isListening ? "bg-danger text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                {voice.isListening && (
                  <span className="absolute inset-0 rounded-full bg-danger/40 animate-ping" />
                )}
                {voice.isListening ? <Pause className="w-7 h-7 relative" /> : <Mic className="w-7 h-7 relative" />}
              </button>
            )}

            <Button variant="default" size="sm" onClick={closeCapture}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> Cerrar Captura
            </Button>
          </div>
        </div>

        {/* Sheet de nota manual */}
        <Sheet open={textSheetOpen} onOpenChange={setTextSheetOpen}>
          <SheetContent side="bottom" className="h-[60vh]">
            <SheetHeader>
              <SheetTitle>Agregar nota manual</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-3 h-full flex flex-col">
              <Textarea
                className="flex-1 min-h-[30vh]"
                placeholder="Escribe notas que el micrófono no captó…"
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
              />
              <Button
                onClick={() => {
                  if (noteDraft.trim()) {
                    setManualText((prev) => (prev ? prev.trimEnd() + "\n" : "") + noteDraft.trim());
                    setNoteDraft("");
                  }
                  setTextSheetOpen(false);
                }}
              >
                Agregar nota
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  /* ------------------------------ FASE 3 ------------------------------ */
  const selectedCount = draft.filter((d) => d.included && d.text.trim()).length;

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-28">
      <SEO title="Revisar compromisos | Minuta Activa" description="Revisa y confirma los compromisos detectados." />
      <header>
        <h1 className="text-xl font-bold">Revisión de compromisos</h1>
        <p className="text-sm text-muted-foreground">
          {meetingTitle} · {meetingDate}
        </p>
      </header>

      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
          <QualityGauge score={quality.score} threshold={qualityThreshold} />
          <div className="flex-1 w-full">
            <QualityChecklist items={quality.breakdown} />
          </div>
        </CardContent>
      </Card>

      {!isOnline && (
        <p className="text-sm text-warning bg-warning/10 border border-warning/30 rounded-md p-3 flex items-center gap-2">
          <WifiOff className="w-4 h-4" /> Estás sin conexión. Al importar, los compromisos quedarán en cola y se enviarán automáticamente.
        </p>
      )}

      {noDetected && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              No se detectaron compromisos automáticamente. Puedes agregarlos manualmente o editar la transcripción y reprocesar.
            </p>
            <Textarea
              rows={10}
              value={approvedTranscript}
              onChange={(e) => setApprovedTranscript(e.target.value)}
              className="text-sm"
            />
            <Button variant="secondary" onClick={reprocess}>
              <RefreshCw className="w-4 h-4 mr-1" /> Reprocesar
            </Button>
          </CardContent>
        </Card>
      )}

      {draft.map((d, i) => (
        <Card key={i} className={d.included ? undefined : "opacity-50"}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-2">
              <Checkbox
                checked={d.included}
                onCheckedChange={(v) => updateDraft(i, { included: v === true })}
                className="mt-1"
                aria-label="Incluir compromiso"
              />
              <Textarea
                rows={2}
                value={d.text}
                onChange={(e) => updateDraft(i, { text: e.target.value })}
                className="text-sm flex-1"
                placeholder="Texto del compromiso"
              />
              <button
                onClick={() => removeDraft(i)}
                aria-label="Eliminar compromiso"
                className="p-1.5 rounded-md text-muted-foreground hover:text-danger hover:bg-danger/10"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Responsable{d.responsible && !d.userId ? ` (detectado: ${d.responsible})` : ""}</Label>
                <Select value={d.userId ?? "none"} onValueChange={(v) => updateDraft(i, { userId: v === "none" ? null : v })}>
                  <SelectTrigger className={!d.userId ? "border-warning/50 bg-warning/5" : undefined}>
                    <SelectValue placeholder="Sin vincular" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin vincular</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name ?? u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!d.userId && (
                  <Input
                    value={d.responsible}
                    onChange={(e) => updateDraft(i, { responsible: e.target.value })}
                    placeholder="Nombre libre del responsable"
                    className="text-xs"
                  />
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Proceso{d.processReference && !d.processId ? ` (detectado: ${d.processReference})` : ""}</Label>
                <Select value={d.processId ?? "none"} onValueChange={(v) =>
                    updateDraft(i, { processId: v === "none" ? null : v, stageId: null, activityRef: null })
                  }>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin proceso" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin proceso</SelectItem>
                    {processes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.process_number} · {p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Etapa <span className="text-danger">*</span></Label>
                <Select
                  value={d.stageId ?? "none"}
                  onValueChange={(v) => updateDraft(i, { stageId: v === "none" ? null : v, activityRef: null })}
                  disabled={!d.processId}
                >
                  <SelectTrigger className={!d.stageId ? "border-danger/50 bg-danger/5" : undefined}>
                    <SelectValue placeholder={d.processId ? "Sin etapa" : "Selecciona primero un proceso"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin etapa</SelectItem>
                    {stagesFor(d.processId).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.status === "in_progress" ? "🔵 " : ""}{s.sort_order}. {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Actividad (opcional)</Label>
                <Select
                  value={d.activityRef ?? "none"}
                  onValueChange={(v) => updateDraft(i, { activityRef: v === "none" ? null : v })}
                  disabled={!d.stageId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin actividad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin actividad</SelectItem>
                    {(d.stageId ? stagesFor(d.processId).find((s) => s.id === d.stageId)?.activities.tasks ?? [] : []).map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fecha límite</Label>
                <Input
                  type="date"
                  value={d.dueDate ?? ""}
                  onChange={(e) => updateDraft(i, { dueDate: e.target.value || null })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Prioridad</Label>
                <Select
                  value={d.priority ?? "none"}
                  onValueChange={(v) => updateDraft(i, { priority: v === "none" ? null : (v as CommitmentPriority) })}
                >
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="baja">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Barra inferior sticky */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur px-4 pt-3"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <div className="max-w-2xl mx-auto space-y-2">
          {!qualityOk && (
            <p className="text-xs text-center text-danger">
              Calidad {quality.score}% · se requiere al menos {qualityThreshold}% para importar.
            </p>
          )}
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={addManualDraft}>
              <Plus className="w-4 h-4 mr-1" /> Agregar compromiso manual
            </Button>
            <Button
              className="flex-1"
              onClick={handleImport}
              disabled={importMutation.isPending || selectedCount === 0 || !qualityOk}
            >
              {importMutation.isPending ? "Importando…" : `📥 Importar ${selectedCount} compromiso${selectedCount === 1 ? "" : "s"}`}
            </Button>
          </div>
        </div>
      </div>

      {/* Botón volver a captura */}
      <div className="flex justify-center">
        <Button variant="ghost" size="sm" onClick={() => { setPhase("capture"); }}>
          <Square className="w-3 h-3 mr-1" /> Volver a la captura
        </Button>
      </div>
    </div>
  );
}
