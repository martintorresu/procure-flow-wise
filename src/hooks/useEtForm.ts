import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import {
  EMPTY_ET_FORM,
  type EtFormState,
  type EtSectionKey,
  SECTIONS,
} from "@/types/etForm";
import type { EtFieldDef } from "@/types/etForm";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface AuditEntry {
  id: string;
  action: string;
  details: string | null;
  user_name: string | null;
  user_area: string | null;
  created_at: string;
}

interface UseEtFormResult {
  loading: boolean;
  exists: boolean; // ¿hay registro real en BD?
  formId: string | null;
  processId: string | null;
  pdcNumber: string | null;
  processStage: string | null;
  status: string | null;
  equipmentTypeCode: string | null;
  equipmentSchema: EtFieldDef[] | null;
  equipmentTypes: { code: string; name: string }[];
  data: EtFormState;
  saveStatus: SaveStatus;
  lastSavedAt: Date | null;
  completionPct: number;
  isDirty: boolean;
  isReadOnly: boolean;
  canEdit: boolean;
  canReview: boolean;
  auditLog: AuditEntry[];
  alertLevel: "none" | "info" | "warning" | "critical";
  alertMessage: string | null;
  setSection: (key: EtSectionKey, value: unknown) => void;
  setEquipmentType: (code: string) => Promise<void>;
  saveNow: () => Promise<void>;
  submitForReview: () => Promise<{ ok: boolean; missing?: string[] }>;
  approve: () => Promise<{ ok: boolean; error?: string }>;
  reject: (reason: string) => Promise<{ ok: boolean; error?: string }>;
}

const AUTO_SAVE_MS = 30_000;

/** ¿Está "rellenado" un valor? Booleans cuentan, arrays vacíos no, strings vacíos no. */
function isFilled(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === "boolean") return true;
  if (Array.isArray(v)) return v.length > 0;
  return String(v).trim() !== "";
}

/**
 * % de completitud sumando obligatorios de TODAS las secciones (1..8).
 */
function calcCompletion(
  data: EtFormState,
  schema: EtFieldDef[] | null,
): number {
  let totalRequired = 0;
  let filledRequired = 0;

  const check = (section: Record<string, unknown>, keys: string[]) => {
    keys.forEach((k) => {
      totalRequired++;
      if (isFilled(section[k])) filledRequired++;
    });
  };

  // 1 — Identificación + descripción
  check(data.section_1, ["responsable", "fecha_solicitud", "tag_equipo", "ubicacion", "objetivo", "alcance"]);
  // 2 — Gestión de Compra
  check(data.section_2, ["criticidad", "plazo_entrega", "lugar_entrega", "area_solicitante"]);
  // 3 — Equipos (schema dinámico)
  if (schema && schema.length > 0) {
    const reqs = schema.filter((f) => f.required);
    const items = data.section_3;
    reqs.forEach((f) => {
      totalRequired++;
      const first = items[0] ?? {};
      if (isFilled(first[f.key])) filledRequired++;
    });
  } else {
    totalRequired++;
    if (data.section_3.length > 0) filledRequired++;
  }
  // 4 — Sitio
  check(data.section_4, ["temperatura_ambiente", "altitud"]);
  // 5 — Documentación: ≥1 documento
  totalRequired++;
  if (data.section_5.length > 0) filledRequired++;
  // 6 — FAT
  check(data.section_6, ["pruebas_seleccionadas", "lugar_fat"]);
  // 7 — Accesorios y repuestos: ≥1 ítem
  totalRequired++;
  if (data.section_7.length > 0) filledRequired++;
  // 8 — Comerciales
  check(data.section_8, ["garantia_meses", "forma_pago", "incoterm", "plazo_validez_oferta"]);

  if (totalRequired === 0) return 0;
  return Math.round((filledRequired / totalRequired) * 100);
}

/**
 * Carga (o crea si no existe) el ET form de un proceso.
 * Maneja estado por sección y auto-save cada 30s.
 */
export function useEtForm(processId: string | null): UseEtFormResult {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [exists, setExists] = useState(false);
  const [formId, setFormId] = useState<string | null>(null);
  const [pdcNumber, setPdcNumber] = useState<string | null>(null);
  const [processStage, setProcessStage] = useState<string | null>(null);
  const [requestingArea, setRequestingArea] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [equipmentTypeCode, setEquipmentTypeCode] = useState<string | null>(null);
  const [equipmentSchema, setEquipmentSchema] = useState<EtFieldDef[] | null>(null);
  const [equipmentTypes, setEquipmentTypes] = useState<{ code: string; name: string }[]>([]);
  const [data, setData] = useState<EtFormState>(EMPTY_ET_FORM);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const dirtyRef = useRef(false);
  const [isDirty, setIsDirty] = useState(false);
  const dataRef = useRef<EtFormState>(EMPTY_ET_FORM);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);

  // Permisos: ingeniería puede editar solo en stage 'ingenieria'
  const userRole = user?.role;
  const canEdit =
    !!user &&
    (userRole === "admin" ||
      (userRole === "ingenieria" && processStage === "ingenieria"));
  // Programación (o admin) revisa cuando el ET está en_revision
  const canReview =
    !!user && (userRole === "admin" || userRole === "programacion");
  // Sólo lectura si está enviado/aprobado/cerrado o sin permiso
  const isReadOnly =
    !canEdit ||
    status === "en_revision" ||
    status === "aprobado" ||
    status === "cerrado";

  // ---- Carga inicial ----
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      // 1. Cargar todos los tipos de equipo
      const { data: types } = await supabase
        .from("equipment_type_schemas")
        .select("code, name")
        .eq("is_active", true)
        .order("name");
      if (!cancelled) setEquipmentTypes(types ?? []);

      if (!processId) {
        setLoading(false);
        return;
      }

      // 2. Buscar el proceso (para pdc_number) — sólo si es UUID válido
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(processId);
      if (!isUuid) {
        setLoading(false);
        return;
      }

      const { data: process } = await supabase
        .from("purchase_processes")
        .select("pdc_number, current_stage, requesting_area")
        .eq("id", processId)
        .maybeSingle();
      if (!cancelled && process) {
        setPdcNumber(process.pdc_number);
        setProcessStage(process.current_stage);
        setRequestingArea(process.requesting_area);
      }

      // 3. Buscar et_form existente
      const { data: form } = await supabase
        .from("et_forms")
        .select("*")
        .eq("process_id", processId)
        .maybeSingle();

      if (cancelled) return;

      if (form) {
        setExists(true);
        setFormId(form.id);
        setStatus(form.status);
        setEquipmentTypeCode(form.equipment_type_code);
        // Cargar datos
        const { data: fdata } = await supabase
          .from("et_form_data")
          .select("*")
          .eq("et_form_id", form.id)
          .maybeSingle();
        if (cancelled) return;
        if (fdata) {
          const f = fdata as unknown as Record<string, unknown>;
          const loaded: EtFormState = {
            section_1: (f.section_1 as Record<string, unknown>) ?? {},
            section_2: (f.section_2 as Record<string, unknown>) ?? {},
            section_3: (f.section_3 as Record<string, unknown>[]) ?? [],
            section_4: (f.section_4 as Record<string, unknown>) ?? {},
            section_5: (f.section_5 as Record<string, unknown>[]) ?? [],
            section_6: (f.section_6 as Record<string, unknown>) ?? {},
            section_7: (f.section_7 as Record<string, unknown>[]) ?? [],
            section_8: (f.section_8 as Record<string, unknown>) ?? {},
          };
          setData(loaded);
          dataRef.current = loaded;
          setLastSavedAt(new Date(fdata.last_saved_at));
        }
        // Cargar schema del tipo de equipo
        if (form.equipment_type_code) {
          const { data: schema } = await supabase
            .from("equipment_type_schemas")
            .select("fields_schema")
            .eq("code", form.equipment_type_code)
            .maybeSingle();
          if (!cancelled && schema) {
            setEquipmentSchema(schema.fields_schema as unknown as EtFieldDef[]);
          }
        }
        // Cargar audit log
        const { data: audits } = await supabase
          .from("et_audit_log")
          .select("id, action, details, user_name, user_area, created_at")
          .eq("et_form_id", form.id)
          .order("created_at", { ascending: false })
          .limit(50);
        if (!cancelled && audits) setAuditLog(audits as AuditEntry[]);
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [processId]);

  // ---- Auditoría ----
  const logAudit = useCallback(
    async (etFormId: string, action: string, details?: string) => {
      const entry = {
        et_form_id: etFormId,
        action,
        details: details ?? null,
        user_id: user?.id ?? null,
        user_name: user?.name ?? null,
        user_area: user?.role ?? null,
      };
      const { data: created } = await supabase
        .from("et_audit_log")
        .insert(entry)
        .select("id, action, details, user_name, user_area, created_at")
        .single();
      if (created) setAuditLog((prev) => [created as AuditEntry, ...prev]);
    },
    [user],
  );

  // ---- Helpers ----
  const setSection = useCallback((key: EtSectionKey, value: unknown) => {
    setData((prev) => {
      const next = { ...prev, [key]: value } as EtFormState;
      dataRef.current = next;
      return next;
    });
    dirtyRef.current = true;
    setIsDirty(true);
  }, []);

  const setEquipmentType = useCallback(
    async (code: string) => {
      setEquipmentTypeCode(code);
      const { data: schema } = await supabase
        .from("equipment_type_schemas")
        .select("fields_schema")
        .eq("code", code)
        .maybeSingle();
      if (schema) {
        setEquipmentSchema(schema.fields_schema as unknown as EtFieldDef[]);
      }
      // Si ya existe el form, persistir el cambio
      if (formId) {
        await supabase.from("et_forms").update({ equipment_type_code: code }).eq("id", formId);
        void logAudit(formId, "tipo_equipo_cambiado", `Tipo: ${code}`);
      }
      dirtyRef.current = true;
      setIsDirty(true);
    },
    [formId, logAudit],
  );

  // Crea form + form_data si no existen aún
  const ensureRecord = useCallback(async (): Promise<string | null> => {
    if (formId) return formId;
    if (!processId || !user) return null;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(processId);
    if (!isUuid) return null;

    const { data: created, error } = await supabase
      .from("et_forms")
      .insert({
        process_id: processId,
        created_by: user.id,
        equipment_type_code: equipmentTypeCode,
        status: "borrador",
      })
      .select()
      .single();
    if (error || !created) return null;

    await supabase.from("et_form_data").insert({
      et_form_id: created.id,
    });

    setFormId(created.id);
    setExists(true);
    setStatus(created.status);
    void logAudit(created.id, "creado", "Formulario ET inicializado");
    return created.id;
  }, [formId, processId, user, equipmentTypeCode, logAudit]);

  const saveNow = useCallback(async () => {
    if (isReadOnly) return;
    if (!dirtyRef.current && formId) return;
    setSaveStatus("saving");
    const id = await ensureRecord();
    if (!id) {
      setSaveStatus("error");
      return;
    }
    const pct = calcCompletion(dataRef.current, equipmentSchema);
    const { error: dataErr } = await supabase
      .from("et_form_data")
      .update({
        section_1: dataRef.current.section_1 as unknown as Json,
        section_2: dataRef.current.section_2 as unknown as Json,
        section_3: dataRef.current.section_3 as unknown as Json,
        section_4: dataRef.current.section_4 as unknown as Json,
        section_5: dataRef.current.section_5 as unknown as Json,
        section_6: dataRef.current.section_6 as unknown as Json,
        last_saved_at: new Date().toISOString(),
        last_saved_by: user?.id ?? null,
      })
      .eq("et_form_id", id);

    const { error: formErr } = await supabase
      .from("et_forms")
      .update({ completion_percentage: pct })
      .eq("id", id);

    if (dataErr || formErr) {
      setSaveStatus("error");
      return;
    }
    setSaveStatus("saved");
    setLastSavedAt(new Date());
    dirtyRef.current = false;
    setIsDirty(false);
  }, [ensureRecord, equipmentSchema, formId, isReadOnly, user]);

  // ---- Auto-save loop cada 30s ----
  useEffect(() => {
    if (!processId) return;
    const interval = setInterval(() => {
      if (dirtyRef.current && !isReadOnly) {
        void saveNow();
      }
    }, AUTO_SAVE_MS);
    return () => clearInterval(interval);
  }, [processId, isReadOnly, saveNow]);

  // Guardar al cerrar pestaña
  useEffect(() => {
    const handler = () => {
      if (dirtyRef.current) void saveNow();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [saveNow]);

  const completionPct = calcCompletion(data, equipmentSchema);

  // ---- submitForReview: borrador/completo → en_revision ----
  const submitForReview = useCallback(async (): Promise<{ ok: boolean; missing?: string[] }> => {
    if (!formId) return { ok: false, missing: ["Formulario no inicializado"] };
    if (!canEdit) return { ok: false, missing: ["Sin permisos para enviar"] };

    // Validar campos mínimos
    const missing: string[] = [];
    const s1 = dataRef.current.section_1 as Record<string, string>;
    if (!s1.responsable) missing.push("Responsable Técnico");
    if (!s1.fecha_solicitud) missing.push("Fecha Solicitud");
    if (!s1.tag_equipo) missing.push("TAG / Identificador");
    if (!s1.ubicacion) missing.push("Ubicación / Área");
    const s2 = dataRef.current.section_2 as Record<string, string>;
    if (!s2.objetivo) missing.push("Objetivo");
    if (!s2.alcance) missing.push("Alcance del Suministro");
    if (!equipmentTypeCode) missing.push("Tipo de Equipo");
    const items = dataRef.current.section_3 as Record<string, unknown>[];
    if (items.length === 0) missing.push("Al menos un equipo en sección 3");
    if (equipmentSchema && items[0]) {
      equipmentSchema.filter((f) => f.required).forEach((f) => {
        const v = items[0][f.key];
        if (v === undefined || v === null || String(v).trim() === "") {
          missing.push(`Equipo: ${f.label}`);
        }
      });
    }
    if (missing.length > 0) return { ok: false, missing };

    const { error } = await supabase
      .from("et_forms")
      .update({
        status: "en_revision",
        submitted_at: new Date().toISOString(),
        submitted_by: user?.id ?? null,
      })
      .eq("id", formId);
    if (error) return { ok: false, missing: [error.message] };
    setStatus("en_revision");
    await logAudit(formId, "enviado_a_programacion", "ET enviado para revisión");
    return { ok: true };
  }, [canEdit, equipmentSchema, equipmentTypeCode, formId, logAudit, user]);

  // ---- Aprobar (Programación / Admin) ----
  const approve = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    if (!formId) return { ok: false, error: "Formulario no inicializado" };
    if (!canReview) return { ok: false, error: "Sin permisos para aprobar" };
    if (status !== "en_revision") return { ok: false, error: "El ET no está en revisión" };

    const { error } = await supabase
      .from("et_forms")
      .update({
        status: "aprobado",
        approved_at: new Date().toISOString(),
        approved_by: user?.id ?? null,
      })
      .eq("id", formId);
    if (error) return { ok: false, error: error.message };
    setStatus("aprobado");
    await logAudit(formId, "aprobado", "ET aprobado por Programación");
    return { ok: true };
  }, [canReview, formId, logAudit, status, user]);

  // ---- Rechazar (vuelve a borrador) ----
  const reject = useCallback(
    async (reason: string): Promise<{ ok: boolean; error?: string }> => {
      if (!formId) return { ok: false, error: "Formulario no inicializado" };
      if (!canReview) return { ok: false, error: "Sin permisos para rechazar" };
      if (status !== "en_revision") return { ok: false, error: "El ET no está en revisión" };
      if (!reason || reason.trim().length < 5) {
        return { ok: false, error: "Indica un motivo de al menos 5 caracteres" };
      }

      const { error } = await supabase
        .from("et_forms")
        .update({
          status: "borrador",
          submitted_at: null,
          submitted_by: null,
        })
        .eq("id", formId);
      if (error) return { ok: false, error: error.message };
      setStatus("borrador");
      await logAudit(formId, "rechazado", `Motivo: ${reason.trim()}`);
      return { ok: true };
    },
    [canReview, formId, logAudit, status],
  );

  // ---- Alertas: ET en borrador con tiempo sin guardar ----
  let alertLevel: "none" | "info" | "warning" | "critical" = "none";
  let alertMessage: string | null = null;
  if (exists && status === "borrador" && lastSavedAt) {
    const hoursSince = (Date.now() - lastSavedAt.getTime()) / 3_600_000;
    if (hoursSince >= 120) {
      alertLevel = "critical";
      alertMessage = `ET sin actividad hace ${Math.floor(hoursSince / 24)} días. Acción urgente.`;
    } else if (hoursSince >= 48) {
      alertLevel = "warning";
      alertMessage = `ET sin guardar hace ${Math.floor(hoursSince)} h. Riesgo de retraso.`;
    } else if (hoursSince >= 24) {
      alertLevel = "info";
      alertMessage = `ET sin actividad hace ${Math.floor(hoursSince)} h.`;
    }
  }

  return {
    loading,
    exists,
    formId,
    processId,
    pdcNumber,
    processStage,
    status,
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
  };
}

export { SECTIONS };
