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
  auditLog: AuditEntry[];
  alertLevel: "none" | "info" | "warning" | "critical";
  alertMessage: string | null;
  setSection: (key: EtSectionKey, value: unknown) => void;
  setEquipmentType: (code: string) => Promise<void>;
  saveNow: () => Promise<void>;
  submitForReview: () => Promise<{ ok: boolean; missing?: string[] }>;
}

const AUTO_SAVE_MS = 30_000;

/**
 * Calcula % de completitud del formulario sumando claves no vacías
 * sobre un total estimado (10 obligatorios mínimos por defecto).
 */
function calcCompletion(
  data: EtFormState,
  schema: EtFieldDef[] | null,
): number {
  let totalRequired = 0;
  let filledRequired = 0;

  // Sección 1 — campos base
  const baseRequired = [
    "responsable",
    "fecha_solicitud",
    "tag_equipo",
    "ubicacion",
  ];
  baseRequired.forEach((k) => {
    totalRequired++;
    const v = (data.section_1 as Record<string, unknown>)[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") filledRequired++;
  });

  // Sección 2 — alcance
  ["objetivo", "alcance"].forEach((k) => {
    totalRequired++;
    const v = (data.section_2 as Record<string, unknown>)[k];
    if (v && String(v).trim() !== "") filledRequired++;
  });

  // Sección 3 — campos del equipment_type_schema
  if (schema && schema.length > 0) {
    const reqs = schema.filter((f) => f.required);
    reqs.forEach((f) => {
      totalRequired++;
      const items = data.section_3 as Record<string, unknown>[];
      const first = items[0] ?? {};
      const v = first[f.key];
      if (v !== undefined && v !== null && String(v).trim() !== "") filledRequired++;
    });
  }

  // Sección 4 — sitio
  ["temperatura_ambiente", "altitud"].forEach((k) => {
    totalRequired++;
    const v = (data.section_4 as Record<string, unknown>)[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") filledRequired++;
  });

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
          const loaded: EtFormState = {
            section_1: (fdata.section_1 as Record<string, unknown>) ?? {},
            section_2: (fdata.section_2 as Record<string, unknown>) ?? {},
            section_3: (fdata.section_3 as Record<string, unknown>[]) ?? [],
            section_4: (fdata.section_4 as Record<string, unknown>) ?? {},
            section_5: (fdata.section_5 as Record<string, unknown>[]) ?? [],
            section_6: (fdata.section_6 as Record<string, unknown>) ?? {},
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
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [processId]);

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
      }
      dirtyRef.current = true;
      setIsDirty(true);
    },
    [formId],
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
    return created.id;
  }, [formId, processId, user, equipmentTypeCode]);

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

  return {
    loading,
    exists,
    formId,
    processId,
    pdcNumber,
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
    setSection,
    setEquipmentType,
    saveNow,
  };
}

export { SECTIONS };
