import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, CheckCircle2, AlertCircle, Plus, Trash2, Send, FileDown, History } from "lucide-react";
import { useEtForm, SECTIONS } from "@/hooks/useEtForm";
import { DynamicField } from "./DynamicField";
import type { EtSectionKey } from "@/types/etForm";
import { toast } from "sonner";
import { exportEtFormToPdf } from "@/lib/etPdfExport";

interface EtFormPanelProps {
  processId: string | null;
  /** Si true, no hay backend real (PdC mock). Muestra aviso. */
  demoMode?: boolean;
}

export function EtFormPanel({ processId, demoMode = false }: EtFormPanelProps) {
  const {
    loading,
    exists,
    pdcNumber,
    status,
    processStage,
    equipmentTypeCode,
    equipmentSchema,
    equipmentTypes,
    data,
    saveStatus,
    lastSavedAt,
    completionPct,
    isDirty,
    isReadOnly,
    canEdit,
    auditLog,
    alertLevel,
    alertMessage,
    setSection,
    setEquipmentType,
    saveNow,
    submitForReview,
  } = useEtForm(demoMode ? null : processId);

  const [activeSection, setActiveSection] = useState<EtSectionKey>("section_1");

  if (demoMode) {
    return (
      <Card>
        <CardContent className="p-6 space-y-3">
          <div className="flex items-start gap-3 p-4 bg-warning/10 border border-warning/20 rounded">
            <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Formulario ET disponible para Procesos de Compra reales</p>
              <p className="text-muted-foreground mt-1">
                Este PdC es de demostración (datos mock). Crea un nuevo Proceso de Compra desde
                "Nuevo PdC" para abrir el formulario de Especificaciones Técnicas con persistencia.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-10 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Helpers para campos base
  const s1 = data.section_1 as Record<string, string>;
  const s2 = data.section_2 as Record<string, string>;
  const s4 = data.section_4 as Record<string, string>;
  const s6 = data.section_6 as Record<string, string>;

  const updateS1 = (k: string, v: unknown) => setSection("section_1", { ...s1, [k]: v });
  const updateS2 = (k: string, v: unknown) => setSection("section_2", { ...s2, [k]: v });
  const updateS4 = (k: string, v: unknown) => setSection("section_4", { ...s4, [k]: v });
  const updateS6 = (k: string, v: unknown) => setSection("section_6", { ...s6, [k]: v });

  // Sección 3 — items técnicos
  const items = data.section_3 as Record<string, unknown>[];
  const addItem = () => setSection("section_3", [...items, {}]);
  const removeItem = (i: number) =>
    setSection("section_3", items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, k: string, v: unknown) => {
    const next = items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it));
    setSection("section_3", next);
  };

  // Sección 5 — documentos
  const docs = data.section_5 as Record<string, unknown>[];
  const addDoc = () => setSection("section_5", [...docs, { nombre: "", obligatorio: true }]);
  const removeDoc = (i: number) =>
    setSection("section_5", docs.filter((_, idx) => idx !== i));
  const updateDoc = (i: number, k: string, v: unknown) => {
    const next = docs.map((d, idx) => (idx === i ? { ...d, [k]: v } : d));
    setSection("section_5", next);
  };

  const handleSave = async () => {
    await saveNow();
    if (saveStatus !== "error") toast.success("Formulario guardado");
  };

  const handleSubmit = async () => {
    if (isDirty) await saveNow();
    const result = await submitForReview();
    if (result.ok) {
      toast.success("ET enviado a Programación");
    } else if (result.missing && result.missing.length > 0) {
      toast.error("Faltan campos obligatorios", {
        description: result.missing.slice(0, 5).join(" · ") + (result.missing.length > 5 ? "…" : ""),
      });
    }
  };

  const handleExportPdf = () => {
    const equipmentTypeName = equipmentTypes.find((t) => t.code === equipmentTypeCode)?.name ?? null;
    exportEtFormToPdf({
      pdcNumber,
      status,
      completionPct,
      equipmentTypeName,
      schema: equipmentSchema,
      data,
    });
  };

  const statusLabels: Record<string, string> = {
    borrador: "Borrador",
    incompleto: "Incompleto",
    completo: "Completo",
    en_revision: "En Revisión",
    aprobado: "Aprobado",
    rechazado: "Rechazado",
    cerrado: "Cerrado",
  };
  const statusVariant = (s: string | null) => {
    if (s === "aprobado" || s === "cerrado") return "default";
    if (s === "rechazado") return "destructive";
    return "outline";
  };

  return (
    <div className="space-y-4">
      {/* Alerta de inactividad */}
      {alertLevel !== "none" && alertMessage && (
        <div
          className={`flex items-start gap-3 p-3 rounded border ${
            alertLevel === "critical"
              ? "bg-danger/10 border-danger/30 text-danger"
              : alertLevel === "warning"
                ? "bg-warning/10 border-warning/30 text-warning"
                : "bg-muted/50 border-muted-foreground/20 text-muted-foreground"
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-sm">{alertMessage}</p>
        </div>
      )}

      {!canEdit && exists && (
        <div className="flex items-start gap-3 p-3 rounded border bg-muted/30 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
          <p>
            Modo lectura. Tu rol no puede editar este ET en la etapa actual
            ({processStage ?? "—"}).
          </p>
        </div>
      )}

      {/* Header con progreso y estado de guardado */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium">Completitud</span>
              <span className="text-sm text-muted-foreground">{completionPct}%</span>
              {exists && status && (
                <Badge variant={statusVariant(status)} className="text-xs">
                  {statusLabels[status] ?? status}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {saveStatus === "saving" && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Guardando…
                </span>
              )}
              {saveStatus === "saved" && !isDirty && (
                <span className="text-xs text-success flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Guardado
                  {lastSavedAt && ` ${lastSavedAt.toLocaleTimeString()}`}
                </span>
              )}
              {saveStatus === "error" && (
                <span className="text-xs text-danger flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Error al guardar
                </span>
              )}
              {isDirty && saveStatus !== "saving" && (
                <span className="text-xs text-warning">Cambios sin guardar</span>
              )}
              <Button size="sm" variant="outline" onClick={handleExportPdf} disabled={!exists}>
                <FileDown className="w-3.5 h-3.5" /> PDF
              </Button>
              <Button size="sm" variant="outline" onClick={handleSave} disabled={isReadOnly}>
                <Save className="w-3.5 h-3.5" /> Guardar
              </Button>
              {canEdit && status !== "en_revision" && status !== "aprobado" && status !== "cerrado" && (
                <Button size="sm" onClick={handleSubmit} disabled={completionPct < 100 && false}>
                  <Send className="w-3.5 h-3.5" /> Enviar a Programación
                </Button>
              )}
            </div>
          </div>
          <Progress value={completionPct} className="h-2" />
        </CardContent>
      </Card>
            <div className="flex items-center gap-2">
              {saveStatus === "saving" && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Guardando…
                </span>
              )}
              {saveStatus === "saved" && !isDirty && (
                <span className="text-xs text-success flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Guardado
                  {lastSavedAt && ` ${lastSavedAt.toLocaleTimeString()}`}
                </span>
              )}
              {saveStatus === "error" && (
                <span className="text-xs text-danger flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Error al guardar
                </span>
              )}
              {isDirty && saveStatus !== "saving" && (
                <span className="text-xs text-warning">Cambios sin guardar</span>
              )}
              <Button size="sm" variant="outline" onClick={handleSave} disabled={isReadOnly}>
                <Save className="w-3.5 h-3.5" /> Guardar
              </Button>
            </div>
          </div>
          <Progress value={completionPct} className="h-2" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
        {/* Sidebar de secciones */}
        <Card>
          <CardContent className="p-2">
            <nav className="space-y-1">
              {SECTIONS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setActiveSection(s.key)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    activeSection === s.key
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted text-muted-foreground"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </nav>
          </CardContent>
        </Card>

        {/* Contenido sección activa */}
        <Card>
          <CardContent className="p-6 space-y-4">
            {activeSection === "section_1" && (
              <>
                <div>
                  <h3 className="font-semibold">1. Identificación</h3>
                  <p className="text-sm text-muted-foreground">Datos generales del proceso</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Responsable Técnico *</Label>
                    <Input value={s1.responsable ?? ""} onChange={(e) => updateS1("responsable", e.target.value)} disabled={isReadOnly} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Fecha Solicitud *</Label>
                    <Input type="date" value={s1.fecha_solicitud ?? ""} onChange={(e) => updateS1("fecha_solicitud", e.target.value)} disabled={isReadOnly} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>TAG / Identificador del Equipo *</Label>
                    <Input value={s1.tag_equipo ?? ""} placeholder="ej. TR-001" onChange={(e) => updateS1("tag_equipo", e.target.value)} disabled={isReadOnly} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Ubicación / Área *</Label>
                    <Input value={s1.ubicacion ?? ""} onChange={(e) => updateS1("ubicacion", e.target.value)} disabled={isReadOnly} />
                  </div>
                </div>
              </>
            )}

            {activeSection === "section_2" && (
              <>
                <div>
                  <h3 className="font-semibold">2. Descripción y Alcance</h3>
                  <p className="text-sm text-muted-foreground">Qué se necesita comprar y su propósito</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Objetivo *</Label>
                  <Textarea rows={3} value={s2.objetivo ?? ""} onChange={(e) => updateS2("objetivo", e.target.value)} disabled={isReadOnly} />
                </div>
                <div className="space-y-1.5">
                  <Label>Alcance del Suministro *</Label>
                  <Textarea rows={4} value={s2.alcance ?? ""} onChange={(e) => updateS2("alcance", e.target.value)} disabled={isReadOnly} />
                </div>
                <div className="space-y-1.5">
                  <Label>Exclusiones</Label>
                  <Textarea rows={2} value={s2.exclusiones ?? ""} onChange={(e) => updateS2("exclusiones", e.target.value)} disabled={isReadOnly} />
                </div>
              </>
            )}

            {activeSection === "section_3" && (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">3. Especificaciones Técnicas</h3>
                    <p className="text-sm text-muted-foreground">Equipos a suministrar</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo de Equipo *</Label>
                  <Select value={equipmentTypeCode ?? ""} onValueChange={setEquipmentType} disabled={isReadOnly}>
                    <SelectTrigger><SelectValue placeholder="Selecciona tipo de equipo…" /></SelectTrigger>
                    <SelectContent>
                      {equipmentTypes.map((t) => (
                        <SelectItem key={t.code} value={t.code}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {equipmentSchema && equipmentSchema.length > 0 && (
                  <div className="space-y-3">
                    {items.length === 0 && (
                      <Button variant="outline" size="sm" onClick={addItem} disabled={isReadOnly}>
                        <Plus className="w-3.5 h-3.5" /> Agregar equipo
                      </Button>
                    )}
                    {items.map((item, idx) => (
                      <Card key={idx} className="border-dashed">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Equipo #{idx + 1}</span>
                            <Button variant="ghost" size="sm" onClick={() => removeItem(idx)} disabled={isReadOnly}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {equipmentSchema.map((f) => (
                              <DynamicField
                                key={f.key}
                                field={f}
                                value={item[f.key]}
                                onChange={(v) => updateItem(idx, f.key, v)}
                                disabled={isReadOnly}
                              />
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {items.length > 0 && (
                      <Button variant="outline" size="sm" onClick={addItem} disabled={isReadOnly}>
                        <Plus className="w-3.5 h-3.5" /> Agregar otro equipo
                      </Button>
                    )}
                  </div>
                )}

                {!equipmentSchema && (
                  <p className="text-sm text-muted-foreground">
                    Selecciona un tipo de equipo para ver los campos técnicos.
                  </p>
                )}
              </>
            )}

            {activeSection === "section_4" && (
              <>
                <div>
                  <h3 className="font-semibold">4. Condiciones de Sitio</h3>
                  <p className="text-sm text-muted-foreground">Ambiente, instalación y operación</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Temperatura Ambiente (°C) *</Label>
                    <Input value={s4.temperatura_ambiente ?? ""} placeholder="ej. -5 a 35" onChange={(e) => updateS4("temperatura_ambiente", e.target.value)} disabled={isReadOnly} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Altitud (msnm) *</Label>
                    <Input type="number" value={s4.altitud ?? ""} onChange={(e) => updateS4("altitud", e.target.value)} disabled={isReadOnly} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Humedad Relativa (%)</Label>
                    <Input value={s4.humedad ?? ""} onChange={(e) => updateS4("humedad", e.target.value)} disabled={isReadOnly} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Sismicidad / Zona</Label>
                    <Input value={s4.sismicidad ?? ""} onChange={(e) => updateS4("sismicidad", e.target.value)} disabled={isReadOnly} />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Condiciones especiales</Label>
                    <Textarea rows={2} value={s4.condiciones ?? ""} onChange={(e) => updateS4("condiciones", e.target.value)} disabled={isReadOnly} />
                  </div>
                </div>
              </>
            )}

            {activeSection === "section_5" && (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">5. Documentación Requerida</h3>
                    <p className="text-sm text-muted-foreground">Planos, manuales y certificaciones</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={addDoc} disabled={isReadOnly}>
                    <Plus className="w-3.5 h-3.5" /> Agregar documento
                  </Button>
                </div>
                {docs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin documentos agregados.</p>
                ) : (
                  <div className="space-y-2">
                    {docs.map((doc, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          placeholder="Nombre del documento (ej. Plano dimensional)"
                          value={(doc.nombre as string) ?? ""}
                          onChange={(e) => updateDoc(idx, "nombre", e.target.value)}
                          disabled={isReadOnly}
                        />
                        <Button variant="ghost" size="sm" onClick={() => removeDoc(idx)} disabled={isReadOnly}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeSection === "section_6" && (
              <>
                <div>
                  <h3 className="font-semibold">6. Observaciones</h3>
                  <p className="text-sm text-muted-foreground">Notas finales y aprobación</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Observaciones generales</Label>
                  <Textarea rows={5} value={s6.observaciones ?? ""} onChange={(e) => updateS6("observaciones", e.target.value)} disabled={isReadOnly} />
                </div>
                <div className="space-y-1.5">
                  <Label>Riesgos identificados</Label>
                  <Textarea rows={3} value={s6.riesgos ?? ""} onChange={(e) => updateS6("riesgos", e.target.value)} disabled={isReadOnly} />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
