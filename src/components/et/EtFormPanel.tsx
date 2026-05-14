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
import { Loader2, Save, CheckCircle2, AlertCircle, Plus, Trash2, Send, FileDown, History, ThumbsUp, ThumbsDown, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEtForm, SECTIONS } from "@/hooks/useEtForm";
import { DynamicField } from "./DynamicField";
import { CustomFieldsBlock } from "./CustomFieldsBlock";
import { useEtFieldSchema, useAllEtFieldSchemas } from "@/hooks/useEtFieldSchemas";
import { schemaToFieldDef, buildZodSchema } from "@/lib/etSchemaBuilder";
import type { EtFieldSchema } from "@/types/etForm";
import { ZodError } from "zod";
import type { EtSectionKey } from "@/types/etForm";
import { CRITICALITY_OPTIONS, FAT_TEST_OPTIONS, PAYMENT_TERMS_OPTIONS, INCOTERM_OPTIONS } from "@/types/etForm";
import { Checkbox } from "@/components/ui/checkbox";
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
    canReview,
    auditLog,
    alertLevel,
    alertMessage,
    setSection,
    setEquipmentType,
    saveNow,
    submitForReview,
    approve,
    reject,
  } = useEtForm(demoMode ? null : processId);

  // Schema dinámico de Sección 3 del tenant (incluye base is_system + custom)
  const { data: tenantSection3 = [] } = useEtFieldSchema(3);
  // Custom fields por ítem (secciones 5 y 7) — sólo is_system=false
  const { data: tenantSection5 = [] } = useEtFieldSchema(5);
  const { data: tenantSection7 = [] } = useEtFieldSchema(7);
  const customSection5 = tenantSection5.filter((f) => !f.is_system);
  const customSection7 = tenantSection7.filter((f) => !f.is_system);
  // Todos los campos custom por sección, para validación Zod en submit
  const { data: allSchemas = {} } = useAllEtFieldSchemas();

  const [activeSection, setActiveSection] = useState<EtSectionKey>("section_1");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [customErrors, setCustomErrors] = useState<Record<number, Record<string, string>>>({});
  // Errores de campos custom por ítem en secciones 5 y 7: {5|7: {itemIdx: {field_key: msg}}}
  const [itemErrors, setItemErrors] = useState<Record<number, Record<number, Record<string, string>>>>({});
  const [flashItem, setFlashItem] = useState<string | null>(null);

  /** Cambia a la sección, hace scroll al ítem y aplica un flash visual breve. */
  const jumpToItem = (section: 5 | 7, idx: number) => {
    const key = `section_${section}` as EtSectionKey;
    setActiveSection(key);
    const elementId = `et-item-${section}-${idx}`;
    requestAnimationFrame(() => {
      const el = document.getElementById(elementId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setFlashItem(elementId);
        window.setTimeout(() => setFlashItem((curr) => (curr === elementId ? null : curr)), 1800);
      }
    });
  };

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
  const s6 = data.section_6 as Record<string, unknown>;
  const s8 = data.section_8 as Record<string, string>;

  const updateS1 = (k: string, v: unknown) => setSection("section_1", { ...s1, [k]: v });
  const updateS2 = (k: string, v: unknown) => setSection("section_2", { ...s2, [k]: v });
  const updateS4 = (k: string, v: unknown) => setSection("section_4", { ...s4, [k]: v });
  const updateS6 = (k: string, v: unknown) => setSection("section_6", { ...s6, [k]: v });
  const updateS8 = (k: string, v: unknown) => setSection("section_8", { ...s8, [k]: v });

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

  // Sección 7 — accesorios y repuestos
  const accs = data.section_7 as Record<string, unknown>[];
  const addAcc = () => setSection("section_7", [...accs, { nombre: "", cantidad: 1, tipo: "accesorio" }]);
  const removeAcc = (i: number) =>
    setSection("section_7", accs.filter((_, idx) => idx !== i));
  const updateAcc = (i: number, k: string, v: unknown) => {
    const next = accs.map((a, idx) => (idx === i ? { ...a, [k]: v } : a));
    setSection("section_7", next);
  };

  const updateDocCustom = (i: number, key: string, val: unknown) => {
    const next = docs.map((d, idx) => {
      if (idx !== i) return d;
      const cf = (d.custom_fields as Record<string, unknown> | undefined) ?? {};
      return { ...d, custom_fields: { ...cf, [key]: val } };
    });
    setSection("section_5", next);
  };
  const updateAccCustom = (i: number, key: string, val: unknown) => {
    const next = accs.map((a, idx) => {
      if (idx !== i) return a;
      const cf = (a.custom_fields as Record<string, unknown> | undefined) ?? {};
      return { ...a, custom_fields: { ...cf, [key]: val } };
    });
    setSection("section_7", next);
  };

  // Sección 6 — pruebas FAT (multi-select almacenado como array)
  const fatTests = (s6.pruebas_seleccionadas as string[] | undefined) ?? [];
  const toggleFatTest = (test: string) => {
    const next = fatTests.includes(test) ? fatTests.filter((t) => t !== test) : [...fatTests, test];
    updateS6("pruebas_seleccionadas", next);
  };

  const handleSave = async () => {
    await saveNow();
    if (saveStatus !== "error") toast.success("Formulario guardado");
  };

  /**
   * Valida con Zod los campos custom (is_system=false) en todas las secciones.
   * Setea customErrors / itemErrors y retorna true si todo OK.
   */
  const validateCustomFields = (): boolean => {
    const sectionValueMap: Record<number, Record<string, unknown>> = {
      1: s1, 2: s2, 4: s4, 6: s6, 8: s8,
    };
    const newErrors: Record<number, Record<string, string>> = {};
    let firstErrorSection: EtSectionKey | null = null;
    for (const sectionNumber of [1, 2, 4, 6, 8] as const) {
      const fields = (allSchemas[sectionNumber] ?? []).filter(
        (f: EtFieldSchema) => f.active && !f.is_system,
      );
      if (fields.length === 0) continue;
      const schema = buildZodSchema(fields);
      const values = sectionValueMap[sectionNumber] ?? {};
      const subset: Record<string, unknown> = {};
      fields.forEach((f) => { subset[f.field_key] = values[f.field_key]; });
      const res = schema.safeParse(subset);
      if (!res.success) {
        const errs: Record<string, string> = {};
        (res.error as ZodError).issues.forEach((iss) => {
          const key = String(iss.path[0] ?? "");
          if (key && !errs[key]) errs[key] = iss.message;
        });
        newErrors[sectionNumber] = errs;
        if (!firstErrorSection) firstErrorSection = `section_${sectionNumber}` as EtSectionKey;
      }
    }

    // Validación por ítem en secciones array (5 y 7)
    const newItemErrors: Record<number, Record<number, Record<string, string>>> = {};
    const arrayMap: Record<number, Record<string, unknown>[]> = { 5: docs, 7: accs };
    for (const sectionNumber of [5, 7] as const) {
      const fields = (allSchemas[sectionNumber] ?? []).filter(
        (f: EtFieldSchema) => f.active && !f.is_system,
      );
      if (fields.length === 0) continue;
      const schema = buildZodSchema(fields);
      const arr = arrayMap[sectionNumber] ?? [];
      arr.forEach((it, idx) => {
        const cf = (it.custom_fields as Record<string, unknown> | undefined) ?? {};
        const subset: Record<string, unknown> = {};
        fields.forEach((f) => { subset[f.field_key] = cf[f.field_key]; });
        const res = schema.safeParse(subset);
        if (!res.success) {
          const errs: Record<string, string> = {};
          (res.error as ZodError).issues.forEach((iss) => {
            const key = String(iss.path[0] ?? "");
            if (key && !errs[key]) errs[key] = iss.message;
          });
          if (!newItemErrors[sectionNumber]) newItemErrors[sectionNumber] = {};
          newItemErrors[sectionNumber][idx] = errs;
          if (!firstErrorSection) firstErrorSection = `section_${sectionNumber}` as EtSectionKey;
        }
      });
    }
    setCustomErrors(newErrors);
    setItemErrors(newItemErrors);

    const totalSectionErrors = Object.values(newErrors).reduce(
      (acc, e) => acc + Object.keys(e).length, 0,
    );
    const totalItemErrors = Object.values(newItemErrors).reduce(
      (acc, perIdx) => acc + Object.values(perIdx).reduce((s, e) => s + Object.keys(e).length, 0),
      0,
    );
    const totalErrors = totalSectionErrors + totalItemErrors;
    if (totalErrors > 0) {
      toast.error(`Hay ${totalErrors} campo(s) adicional(es) con errores`, {
        description: "Revisa los campos del tenant marcados en rojo.",
      });
      if (firstErrorSection) setActiveSection(firstErrorSection);
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateCustomFields()) return;
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

  const handleApprove = async () => {
    if (!validateCustomFields()) return;
    const r = await approve();
    if (r.ok) toast.success("ET aprobado");
    else toast.error(r.error ?? "No se pudo aprobar");
  };

  const handleReject = async () => {
    const r = await reject(rejectReason);
    if (r.ok) {
      toast.success("ET rechazado, vuelto a borrador");
      setRejectOpen(false);
      setRejectReason("");
    } else {
      toast.error(r.error ?? "No se pudo rechazar");
    }
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
                <Button size="sm" onClick={handleSubmit}>
                  <Send className="w-3.5 h-3.5" /> Enviar a Programación
                </Button>
              )}
              {canReview && status === "en_revision" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRejectOpen(true)}
                    className="text-danger border-danger/40 hover:bg-danger/10 hover:text-danger"
                  >
                    <ThumbsDown className="w-3.5 h-3.5" /> Rechazar
                  </Button>
                  <Button size="sm" onClick={handleApprove} className="bg-success hover:bg-success/90">
                    <ThumbsUp className="w-3.5 h-3.5" /> Aprobar
                  </Button>
                </>
              )}
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
                  <p className="text-sm text-muted-foreground">Datos generales y descripción del proceso</p>
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
                <div className="space-y-1.5">
                  <Label>Objetivo *</Label>
                  <Textarea rows={3} value={s1.objetivo ?? ""} onChange={(e) => updateS1("objetivo", e.target.value)} disabled={isReadOnly} />
                </div>
                <div className="space-y-1.5">
                  <Label>Alcance del Suministro *</Label>
                  <Textarea rows={4} value={s1.alcance ?? ""} onChange={(e) => updateS1("alcance", e.target.value)} disabled={isReadOnly} />
                </div>
                <div className="space-y-1.5">
                  <Label>Exclusiones</Label>
                  <Textarea rows={2} value={s1.exclusiones ?? ""} onChange={(e) => updateS1("exclusiones", e.target.value)} disabled={isReadOnly} />
                </div>
                <CustomFieldsBlock sectionNumber={1} values={s1} onChange={updateS1} disabled={isReadOnly} errors={customErrors[1]} />
              </>
            )}

            {activeSection === "section_2" && (
              <>
                <div>
                  <h3 className="font-semibold">2. Datos de Gestión de Compra</h3>
                  <p className="text-sm text-muted-foreground">Criticidad, plazo y lugar de entrega</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Criticidad *</Label>
                    <Select value={s2.criticidad ?? ""} onValueChange={(v) => updateS2("criticidad", v)} disabled={isReadOnly}>
                      <SelectTrigger><SelectValue placeholder="Selecciona criticidad…" /></SelectTrigger>
                      <SelectContent>
                        {CRITICALITY_OPTIONS.map((c) => (
                          <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Área Solicitante *</Label>
                    <Input value={s2.area_solicitante ?? ""} placeholder="ej. Mantenimiento" onChange={(e) => updateS2("area_solicitante", e.target.value)} disabled={isReadOnly} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Plazo de Entrega Requerido *</Label>
                    <Input type="date" value={s2.plazo_entrega ?? ""} onChange={(e) => updateS2("plazo_entrega", e.target.value)} disabled={isReadOnly} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Lugar de Entrega *</Label>
                    <Input value={s2.lugar_entrega ?? ""} placeholder="ej. Planta Norte, Bodega 3" onChange={(e) => updateS2("lugar_entrega", e.target.value)} disabled={isReadOnly} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Centro de Costo</Label>
                    <Input value={s2.centro_costo ?? ""} onChange={(e) => updateS2("centro_costo", e.target.value)} disabled={isReadOnly} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Presupuesto Estimado (USD)</Label>
                    <Input type="number" value={s2.presupuesto ?? ""} onChange={(e) => updateS2("presupuesto", e.target.value)} disabled={isReadOnly} />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Justificación / Notas para Compras</Label>
                    <Textarea rows={3} value={s2.justificacion ?? ""} onChange={(e) => updateS2("justificacion", e.target.value)} disabled={isReadOnly} />
                  </div>
                </div>
                <CustomFieldsBlock sectionNumber={2} values={s2} onChange={updateS2} disabled={isReadOnly} errors={customErrors[2]} />
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

                {/* Sección 3 dinámica: campos del tenant + (override) campos del tipo de equipo */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {items.length} ítem(s) definido(s) · {tenantSection3.length} campo(s) base del tenant
                      {equipmentSchema && equipmentSchema.length > 0 && ` · ${equipmentSchema.length} campo(s) por tipo de equipo`}
                    </p>
                    <Button variant="outline" size="sm" onClick={addItem} disabled={isReadOnly}>
                      <Plus className="w-3.5 h-3.5" /> Agregar ítem
                    </Button>
                  </div>
                  {items.length === 0 && (
                    <p className="text-sm text-muted-foreground">Aún no hay ítems. Agrega uno para comenzar.</p>
                  )}
                  {items.map((item, idx) => (
                    <Card key={idx} className="border-dashed">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            Ítem #{idx + 1}
                            {item.item_description ? ` — ${String(item.item_description).slice(0, 60)}` : ""}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const hasData = Object.values(item).some((v) => v !== undefined && v !== null && v !== "");
                              if (hasData && !confirm("Este ítem tiene datos. ¿Eliminar?")) return;
                              removeItem(idx);
                            }}
                            disabled={isReadOnly}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {tenantSection3.map((f) => (
                            <DynamicField
                              key={f.id}
                              field={schemaToFieldDef(f)}
                              value={item[f.field_key]}
                              onChange={(v) => updateItem(idx, f.field_key, v)}
                              disabled={isReadOnly}
                            />
                          ))}
                          {equipmentSchema?.map((f) => (
                            <DynamicField
                              key={`eq-${f.key}`}
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
                </div>
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
                <CustomFieldsBlock sectionNumber={4} values={s4} onChange={updateS4} disabled={isReadOnly} errors={customErrors[4]} />
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
                  <div className="space-y-3">
                    {docs.map((doc, idx) => (
                      <Card
                        key={idx}
                        id={`et-item-5-${idx}`}
                        className={`${customSection5.length > 0 ? "border-dashed" : "border-none shadow-none"} ${flashItem === `et-item-5-${idx}` ? "ring-2 ring-danger ring-offset-2 transition-shadow" : ""}`}
                      >
                        <CardContent className={customSection5.length > 0 ? "p-3 space-y-2" : "p-0"}>
                          <div className="flex items-center gap-2">
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
                          {customSection5.length > 0 && (
                            <CustomFieldsBlock
                              sectionNumber={5}
                              values={(doc.custom_fields as Record<string, unknown>) ?? {}}
                              onChange={(k, v) => updateDocCustom(idx, k, v)}
                              disabled={isReadOnly}
                              errors={itemErrors[5]?.[idx]}
                            />
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeSection === "section_6" && (
              <>
                <div>
                  <h3 className="font-semibold">6. Protocolo Prueba de Fábrica</h3>
                  <p className="text-sm text-muted-foreground">Pruebas en fábrica antes del despacho</p>
                </div>
                <div className="space-y-2">
                  <Label>Pruebas a Realizar *</Label>
                  <p className="text-xs text-muted-foreground">Marca todas las pruebas que el proveedor debe ejecutar.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                    {FAT_TEST_OPTIONS.map((test) => (
                      <label key={test} className="flex items-start gap-2 text-sm cursor-pointer p-2 rounded hover:bg-muted/50">
                        <Checkbox
                          checked={fatTests.includes(test)}
                          onCheckedChange={() => toggleFatTest(test)}
                          disabled={isReadOnly}
                          className="mt-0.5"
                        />
                        <span>{test}</span>
                      </label>
                    ))}
                  </div>
                  {fatTests.length > 0 && (
                    <p className="text-xs text-muted-foreground pt-1">{fatTests.length} prueba(s) seleccionada(s)</p>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Lugar de Prueba de Fábrica *</Label>
                    <Input value={(s6.lugar_fat as string) ?? ""} placeholder="ej. Fábrica del proveedor" onChange={(e) => updateS6("lugar_fat", e.target.value)} disabled={isReadOnly} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Asistencia del Cliente</Label>
                    <Select value={(s6.asistencia_cliente as string) ?? ""} onValueChange={(v) => updateS6("asistencia_cliente", v)} disabled={isReadOnly}>
                      <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="presencial">Presencial</SelectItem>
                        <SelectItem value="remota">Remota</SelectItem>
                        <SelectItem value="no_requerida">No requerida</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Criterios de Aceptación</Label>
                    <Textarea
                      rows={3}
                      value={(s6.criterios_aceptacion as string) ?? ""}
                      onChange={(e) => updateS6("criterios_aceptacion", e.target.value)}
                      placeholder="Tolerancias, normas aplicables, etc."
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Observaciones Prueba de Fábrica</Label>
                    <Textarea
                      rows={2}
                      value={(s6.observaciones_fat as string) ?? ""}
                      onChange={(e) => updateS6("observaciones_fat", e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
                <CustomFieldsBlock sectionNumber={6} values={s6 as Record<string, unknown>} onChange={updateS6} disabled={isReadOnly} errors={customErrors[6]} />
              </>
            )}

            {activeSection === "section_7" && (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">7. Accesorios y Repuestos</h3>
                    <p className="text-sm text-muted-foreground">Componentes mínimos a incluir con el suministro</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={addAcc} disabled={isReadOnly}>
                    <Plus className="w-3.5 h-3.5" /> Agregar ítem
                  </Button>
                </div>
                {accs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin accesorios ni repuestos cargados.</p>
                ) : (
                  <div className="space-y-3">
                    {customSection7.length === 0 && (
                      <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
                        <div className="col-span-5">Descripción</div>
                        <div className="col-span-2">Tipo</div>
                        <div className="col-span-2">Cantidad</div>
                        <div className="col-span-2">Unidad</div>
                        <div className="col-span-1"></div>
                      </div>
                    )}
                    {accs.map((a, idx) => {
                      const row = (
                        <div className="grid grid-cols-12 gap-2 items-center">
                          <Input
                            className="col-span-5"
                            placeholder="ej. Bushing de repuesto 36 kV"
                            value={(a.nombre as string) ?? ""}
                            onChange={(e) => updateAcc(idx, "nombre", e.target.value)}
                            disabled={isReadOnly}
                          />
                          <Select value={(a.tipo as string) ?? "accesorio"} onValueChange={(v) => updateAcc(idx, "tipo", v)} disabled={isReadOnly}>
                            <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="accesorio">Accesorio</SelectItem>
                              <SelectItem value="repuesto">Repuesto</SelectItem>
                              <SelectItem value="herramienta">Herramienta</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            className="col-span-2"
                            type="number"
                            min={1}
                            value={(a.cantidad as number | string) ?? 1}
                            onChange={(e) => updateAcc(idx, "cantidad", Number(e.target.value))}
                            disabled={isReadOnly}
                          />
                          <Input
                            className="col-span-2"
                            placeholder="ud / kg / m"
                            value={(a.unidad as string) ?? ""}
                            onChange={(e) => updateAcc(idx, "unidad", e.target.value)}
                            disabled={isReadOnly}
                          />
                          <Button variant="ghost" size="sm" className="col-span-1" onClick={() => removeAcc(idx)} disabled={isReadOnly}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      );
                      if (customSection7.length === 0) {
                        return (
                          <div key={idx} id={`et-item-7-${idx}`} className={flashItem === `et-item-7-${idx}` ? "ring-2 ring-danger ring-offset-2 rounded transition-shadow" : ""}>
                            {row}
                          </div>
                        );
                      }
                      return (
                        <Card
                          key={idx}
                          id={`et-item-7-${idx}`}
                          className={`border-dashed ${flashItem === `et-item-7-${idx}` ? "ring-2 ring-danger ring-offset-2 transition-shadow" : ""}`}
                        >
                          <CardContent className="p-3 space-y-2">
                            <span className="text-xs font-medium text-muted-foreground">Ítem #{idx + 1}</span>
                            {row}
                            <CustomFieldsBlock
                              sectionNumber={7}
                              values={(a.custom_fields as Record<string, unknown>) ?? {}}
                              onChange={(k, v) => updateAccCustom(idx, k, v)}
                              disabled={isReadOnly}
                              errors={itemErrors[7]?.[idx]}
                            />
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {activeSection === "section_8" && (
              <>
                <div>
                  <h3 className="font-semibold">8. Condiciones Comerciales</h3>
                  <p className="text-sm text-muted-foreground">Garantía, pago, plazos y observaciones finales</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Garantía (meses) *</Label>
                    <Input type="number" min={0} value={s8.garantia_meses ?? ""} placeholder="ej. 24" onChange={(e) => updateS8("garantia_meses", e.target.value)} disabled={isReadOnly} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Plazo de Validez de Oferta *</Label>
                    <Input value={s8.plazo_validez_oferta ?? ""} placeholder="ej. 30 días" onChange={(e) => updateS8("plazo_validez_oferta", e.target.value)} disabled={isReadOnly} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Forma de Pago *</Label>
                    <Select value={s8.forma_pago ?? ""} onValueChange={(v) => updateS8("forma_pago", v)} disabled={isReadOnly}>
                      <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
                      <SelectContent>
                        {PAYMENT_TERMS_OPTIONS.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Incoterm *</Label>
                    <Select value={s8.incoterm ?? ""} onValueChange={(v) => updateS8("incoterm", v)} disabled={isReadOnly}>
                      <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
                      <SelectContent>
                        {INCOTERM_OPTIONS.map((i) => (
                          <SelectItem key={i} value={i}>{i}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Multa por Atraso</Label>
                    <Input value={s8.multa_atraso ?? ""} placeholder="ej. 0.5% por día, máx 10%" onChange={(e) => updateS8("multa_atraso", e.target.value)} disabled={isReadOnly} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Moneda</Label>
                    <Select value={s8.moneda ?? "USD"} onValueChange={(v) => updateS8("moneda", v)} disabled={isReadOnly}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="CLP">CLP</SelectItem>
                        <SelectItem value="PEN">PEN</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Observaciones Generales</Label>
                  <Textarea rows={4} value={s8.observaciones ?? ""} onChange={(e) => updateS8("observaciones", e.target.value)} disabled={isReadOnly} />
                </div>
                <div className="space-y-1.5">
                  <Label>Riesgos Identificados</Label>
                  <Textarea rows={3} value={s8.riesgos ?? ""} onChange={(e) => updateS8("riesgos", e.target.value)} disabled={isReadOnly} />
                </div>
                <CustomFieldsBlock sectionNumber={8} values={s8} onChange={updateS8} disabled={isReadOnly} errors={customErrors[8]} />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Historial de auditoría */}
      {exists && auditLog.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <History className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-medium text-sm">Historial</h3>
              <span className="text-xs text-muted-foreground">({auditLog.length})</span>
            </div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {auditLog.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 text-xs border-l-2 border-muted pl-3 py-1">
                  <span className="text-muted-foreground shrink-0 w-32">
                    {new Date(entry.created_at).toLocaleString()}
                  </span>
                  <span className="font-medium shrink-0">{entry.action}</span>
                  <span className="text-muted-foreground">
                    {entry.user_name ?? "—"}
                    {entry.details && ` · ${entry.details}`}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diálogo de rechazo */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar formulario ET</DialogTitle>
            <DialogDescription>
              Indica el motivo. El ET volverá a estado "Borrador" y el responsable de Ingeniería podrá corregirlo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Motivo del rechazo *</Label>
            <Textarea
              id="reject-reason"
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ej. Faltan especificaciones de aislamiento del transformador…"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleReject}
              disabled={rejectReason.trim().length < 5}
              className="bg-danger hover:bg-danger/90 text-danger-foreground"
            >
              Confirmar rechazo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
