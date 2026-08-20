import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queryKeys";
import {
  Check,
  Circle,
  ClipboardList,
  FileText,
  Flag,
  Gavel,
  Package,
  Rocket,
  Truck,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/** Tipos de proceso configurables (compra usa un flujo fijo). */
export type ConfigurableProcessType = "licitacion" | "contrato" | "permiso" | "personalizado";

export const CONFIGURABLE_PROCESS_TYPES: ConfigurableProcessType[] = [
  "licitacion",
  "contrato",
  "permiso",
  "personalizado",
];

export interface StageTemplate {
  id: string;
  tenant_id: string;
  process_type: string;
  stage_key: string;
  label: string;
  order_index: number;
  icon_name: string;
  active: boolean;
}

/** Íconos disponibles para etapas (nombre en BD -> componente lucide). */
export const STAGE_ICONS: Record<string, LucideIcon> = {
  FileText,
  ClipboardList,
  Wrench,
  Check,
  Circle,
  Flag,
  Gavel,
  Package,
  Rocket,
  Truck,
};

export const stageIcon = (name?: string | null): LucideIcon => STAGE_ICONS[name ?? ""] ?? Circle;

export function useStageTemplates(processType?: string | null): UseQueryResult<StageTemplate[], Error> {
  const type = processType ?? "";
  return useQuery({
    queryKey: queryKeys.stageTemplates(type),
    enabled: CONFIGURABLE_PROCESS_TYPES.includes(type as ConfigurableProcessType),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("process_stage_templates")
        .select("id, tenant_id, process_type, stage_key, label, order_index, icon_name, active")
        .eq("process_type", type)
        .order("order_index");
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as StageTemplate[];
    },
  });
}

export function useUpdateStageTemplates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: Pick<StageTemplate, "id" | "label" | "order_index" | "active">[]) => {
      for (const r of rows) {
        const { error } = await supabase
          .from("process_stage_templates")
          .update({ label: r.label, order_index: r.order_index, active: r.active })
          .eq("id", r.id);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: (_d, rows) => {
      void rows;
      qc.invalidateQueries({ queryKey: ["stage_templates"] });
    },
  });
}

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "") || `etapa_${Date.now()}`;

export function useAddStageTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { processType: string; label: string; orderIndex: number; iconName?: string }) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id ?? "")
        .maybeSingle();
      if (!profile?.tenant_id) throw new Error("No se pudo determinar la organización.");
      const { error } = await supabase.from("process_stage_templates").insert({
        tenant_id: profile.tenant_id,
        process_type: input.processType,
        stage_key: `${slugify(input.label)}_${Math.random().toString(36).slice(2, 6)}`,
        label: input.label,
        order_index: input.orderIndex,
        icon_name: input.iconName ?? "Circle",
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stage_templates"] }),
  });
}

export function useDeleteStageTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("process_stage_templates").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stage_templates"] }),
  });
}
