import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queryKeys";
import type { EtFieldSchema, EtFieldType } from "@/types/etForm";

type Row = {
  id: string;
  tenant_id: string;
  section_number: number;
  field_key: string;
  label: string;
  field_type: string;
  options: unknown;
  unit_options: unknown;
  placeholder: string | null;
  required: boolean;
  display_order: number;
  active: boolean;
  is_system: boolean;
};

const toSchema = (r: Row): EtFieldSchema => ({
  id: r.id,
  tenant_id: r.tenant_id,
  section_number: r.section_number,
  field_key: r.field_key,
  label: r.label,
  field_type: r.field_type as EtFieldType,
  options: Array.isArray(r.options) ? (r.options as string[]) : null,
  unit_options: Array.isArray(r.unit_options) ? (r.unit_options as string[]) : null,
  placeholder: r.placeholder,
  required: r.required,
  display_order: r.display_order,
  active: r.active,
  is_system: r.is_system,
});

/** Campos activos de una sección, ordenados. Si no se pasa section, devuelve todos los activos. */
export function useEtFieldSchema(sectionNumber?: number) {
  return useQuery({
    queryKey: queryKeys.etFieldSchema(sectionNumber),
    queryFn: async (): Promise<EtFieldSchema[]> => {
      let q = supabase
        .from("et_field_schemas")
        .select("*")
        .eq("active", true)
        .order("section_number", { ascending: true })
        .order("display_order", { ascending: true });
      if (sectionNumber !== undefined) q = q.eq("section_number", sectionNumber);
      const { data, error } = await q;
      if (error) throw error;
      return (data as Row[]).map(toSchema);
    },
  });
}

/** Devuelve TODOS los campos (activos e inactivos) agrupados por section_number 1-8. */
export function useAllEtFieldSchemas() {
  return useQuery({
    queryKey: queryKeys.etFieldSchemas(),
    queryFn: async (): Promise<Record<number, EtFieldSchema[]>> => {
      const { data, error } = await supabase
        .from("et_field_schemas")
        .select("*")
        .order("section_number", { ascending: true })
        .order("display_order", { ascending: true });
      if (error) throw error;
      const grouped: Record<number, EtFieldSchema[]> = {};
      for (let i = 1; i <= 8; i++) grouped[i] = [];
      (data as Row[]).forEach((r) => {
        const s = toSchema(r);
        grouped[s.section_number]?.push(s);
      });
      return grouped;
    },
  });
}

export interface CreateEtFieldInput {
  section_number: number;
  field_key: string;
  label: string;
  field_type: EtFieldType;
  options?: string[] | null;
  unit_options?: string[] | null;
  placeholder?: string | null;
  required?: boolean;
  display_order?: number;
}

export function useCreateEtField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateEtFieldInput) => {
      const { data, error } = await supabase
        .from("et_field_schemas")
        // tenant_id is filled by the set_tenant_id_from_user trigger
        .insert({
          tenant_id: "00000000-0000-0000-0000-000000000000",
          section_number: input.section_number,
          field_key: input.field_key,
          label: input.label,
          field_type: input.field_type,
          options: input.options ?? null,
          unit_options: input.unit_options ?? null,
          placeholder: input.placeholder ?? null,
          required: input.required ?? false,
          display_order: input.display_order ?? 0,
          is_system: false,
          active: true,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.etFieldSchemas() });
      qc.invalidateQueries({ queryKey: queryKeys.etFieldSchema(vars.section_number) });
      qc.invalidateQueries({ queryKey: queryKeys.etFieldSchema() });
    },
  });
}

export interface UpdateEtFieldInput {
  id: string;
  section_number: number;
  label?: string;
  placeholder?: string | null;
  required?: boolean;
  options?: string[] | null;
  unit_options?: string[] | null;
  display_order?: number;
}

export function useUpdateEtField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateEtFieldInput) => {
      const { id, section_number: _ignored, ...patch } = input;
      const { data, error } = await supabase
        .from("et_field_schemas")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.etFieldSchemas() });
      qc.invalidateQueries({ queryKey: queryKeys.etFieldSchema(vars.section_number) });
      qc.invalidateQueries({ queryKey: queryKeys.etFieldSchema() });
    },
  });
}

/** Activa/desactiva un campo. Para is_system=true solo permite desactivar (no eliminar). */
export function useToggleEtField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; section_number: number; active: boolean }) => {
      const { error } = await supabase
        .from("et_field_schemas")
        .update({ active: input.active })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.etFieldSchemas() });
      qc.invalidateQueries({ queryKey: queryKeys.etFieldSchema(vars.section_number) });
      qc.invalidateQueries({ queryKey: queryKeys.etFieldSchema() });
    },
  });
}

/** Reordena campos en batch. Recibe array {id, display_order}. */
export function useReorderEtFields(sectionNumber: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: { id: string; display_order: number }[]) => {
      // Updates en serie (RLS por fila); pequeño volumen.
      for (const it of items) {
        const { error } = await supabase
          .from("et_field_schemas")
          .update({ display_order: it.display_order })
          .eq("id", it.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.etFieldSchemas() });
      qc.invalidateQueries({ queryKey: queryKeys.etFieldSchema(sectionNumber) });
      qc.invalidateQueries({ queryKey: queryKeys.etFieldSchema() });
    },
  });
}
