import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { NotificationPreferences } from "@/types/process";

const KEY = (userId?: string) => ["notification-preferences", userId] as const;

/** Defaults que se aplican en el frontend cuando aún no existe fila. */
export const DEFAULT_PREFS: Omit<NotificationPreferences, "id" | "user_id" | "tenant_id"> = {
  channel_inapp: true,
  channel_email: true,
  channel_whatsapp: true,
  quiet_start: "22:00",
  quiet_end: "07:00",
  quiet_enabled: false,
  email_grouping: "immediate",
  min_severity_email: "medium",
  min_severity_whatsapp: "high",
};

/** Preferencias de notificación del usuario. null si aún no existen (usar DEFAULT_PREFS). */
export function useNotificationPreferences(
  userId?: string,
): UseQueryResult<NotificationPreferences | null, Error> {
  return useQuery({
    queryKey: KEY(userId),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as NotificationPreferences | null) ?? null;
    },
  });
}

type UpsertInput = Omit<NotificationPreferences, "id" | "user_id" | "tenant_id">;

/** Inserta o actualiza las preferencias (upsert por user_id + tenant_id). */
export function useUpsertNotificationPreferences(userId?: string, tenantId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: UpsertInput) => {
      if (!userId || !tenantId) throw new Error("Falta usuario o tenant");
      const { error } = await supabase
        .from("notification_preferences")
        .upsert(
          { user_id: userId, tenant_id: tenantId, ...values },
          { onConflict: "user_id,tenant_id" },
        );
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(userId) }),
  });
}
