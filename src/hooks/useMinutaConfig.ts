import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const DEFAULT_QUALITY_THRESHOLD = 60;
export const DEFAULT_MAX_DELIVERY_DAYS = 90;
export const DEFAULT_START_SCOPE: MinutaStartScope = "proceso";

export type MinutaStartScope = "proyecto" | "proceso";

const CACHE_PREFIX = "minuta-config-cache";

export interface MinutaConfig {
  qualityThreshold: number;
  maxDeliveryDays: number;
  startScope: MinutaStartScope;
}

const cacheKey = (uid: string | undefined) => `${CACHE_PREFIX}:${uid ?? "anon"}`;

function readCache(uid: string | undefined): MinutaConfig | null {
  if (!uid) return null;
  try {
    const raw = localStorage.getItem(cacheKey(uid));
    return raw ? (JSON.parse(raw) as MinutaConfig) : null;
  } catch {
    return null;
  }
}

/** Configuración del estándar de minuta del tenant (caché local por usuario para modo offline). */
export function useMinutaConfig() {
  const { user } = useAuth();
  const uid = user?.id;
  const cached = readCache(uid);
  const fallback: MinutaConfig = {
    qualityThreshold: cached?.qualityThreshold ?? DEFAULT_QUALITY_THRESHOLD,
    maxDeliveryDays: cached?.maxDeliveryDays ?? DEFAULT_MAX_DELIVERY_DAYS,
    startScope: cached?.startScope ?? DEFAULT_START_SCOPE,
  };

  const query = useQuery({
    queryKey: ["minuta-config", uid ?? "anon"],
    enabled: !!uid,
    queryFn: async (): Promise<MinutaConfig> => {
      const { data, error } = await supabase
        .from("tenant_settings")
        .select("minuta_quality_threshold, minuta_max_delivery_days, minuta_start_scope")
        .maybeSingle();
      if (error) throw new Error(error.message);
      const cfg: MinutaConfig = {
        qualityThreshold: data?.minuta_quality_threshold ?? DEFAULT_QUALITY_THRESHOLD,
        maxDeliveryDays: data?.minuta_max_delivery_days ?? DEFAULT_MAX_DELIVERY_DAYS,
        startScope: data?.minuta_start_scope === "proyecto" ? "proyecto" : "proceso",
      };
      try {
        localStorage.removeItem(CACHE_PREFIX); // caché antiguo sin distinción de usuario
        localStorage.setItem(cacheKey(uid), JSON.stringify(cfg));
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
    startScope: query.data?.startScope ?? fallback.startScope,
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
          minuta_start_scope: values.startScope,
        },
        { onConflict: "tenant_id" },
      );
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["minuta-config"] }),
  });
}
