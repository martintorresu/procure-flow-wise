import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const DEFAULT_QUALITY_THRESHOLD = 60;
export const DEFAULT_MAX_DELIVERY_DAYS = 90;

const KEY = ["minuta-config"] as const;
const CACHE_KEY = "minuta-config-cache";

export interface MinutaConfig {
  qualityThreshold: number;
  maxDeliveryDays: number;
}

function readCache(): MinutaConfig | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as MinutaConfig) : null;
  } catch {
    return null;
  }
}

/** Configuración del estándar de minuta del tenant (con caché local para modo offline). */
export function useMinutaConfig() {
  const fallback = readCache() ?? {
    qualityThreshold: DEFAULT_QUALITY_THRESHOLD,
    maxDeliveryDays: DEFAULT_MAX_DELIVERY_DAYS,
  };

  const query = useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<MinutaConfig> => {
      const { data, error } = await supabase
        .from("tenant_settings")
        .select("minuta_quality_threshold, minuta_max_delivery_days")
        .maybeSingle();
      if (error) throw new Error(error.message);
      const cfg: MinutaConfig = {
        qualityThreshold: data?.minuta_quality_threshold ?? DEFAULT_QUALITY_THRESHOLD,
        maxDeliveryDays: data?.minuta_max_delivery_days ?? DEFAULT_MAX_DELIVERY_DAYS,
      };
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cfg));
      } catch {
        /* noop */
      }
      return cfg;
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    qualityThreshold: query.data?.qualityThreshold ?? fallback.qualityThreshold,
    maxDeliveryDays: query.data?.maxDeliveryDays ?? fallback.maxDeliveryDays,
    isLoading: query.isLoading,
  };
}

/** Guarda la configuración (solo admin por RLS). */
export function useSaveMinutaConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: MinutaConfig) => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id ?? "";
      const { data: prof } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", uid)
        .maybeSingle();
      if (!prof?.tenant_id) throw new Error("No se pudo determinar la organización");

      const { error } = await supabase.from("tenant_settings").upsert(
        {
          tenant_id: prof.tenant_id,
          minuta_quality_threshold: values.qualityThreshold,
          minuta_max_delivery_days: values.maxDeliveryDays,
        },
        { onConflict: "tenant_id" },
      );
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
