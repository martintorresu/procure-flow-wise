import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WhatsappConfig {
  id: string;
  tenant_id: string;
  phone_number_id: string;
  access_token: string;
  business_account_id: string;
  enabled: boolean;
}

export type WhatsappConfigInput = Pick<
  WhatsappConfig,
  "phone_number_id" | "access_token" | "business_account_id" | "enabled"
>;

const KEY = ["whatsapp-config"] as const;

/** Config de WhatsApp del tenant (solo admin la puede leer por RLS). */
export function useWhatsappConfig(): UseQueryResult<WhatsappConfig | null, Error> {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_config")
        .select("id, tenant_id, phone_number_id, access_token, business_account_id, enabled")
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data ?? null) as WhatsappConfig | null;
    },
  });
}

/** Crea o actualiza la config del tenant (el trigger asigna tenant_id en el insert). */
export function useSaveWhatsappConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: WhatsappConfigInput & { id?: string }) => {
      if (id) {
        const { error } = await supabase.from("whatsapp_config").update(values).eq("id", id);
        if (error) throw new Error(error.message);
        return;
      }
      const { data: prof } = await supabase
        .from("profiles").select("tenant_id").eq("id", (await supabase.auth.getUser()).data.user?.id ?? "")
        .maybeSingle();
      const { error } = await supabase
        .from("whatsapp_config")
        .insert({ ...values, tenant_id: prof?.tenant_id ?? "" });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export interface WhatsappLogRow {
  id: string;
  phone: string | null;
  status: string;
  meta_message_id: string | null;
  error_message: string | null;
  created_at: string;
}

/** Últimos envíos registrados (solo admin). */
export function useWhatsappLog(limit = 10): UseQueryResult<WhatsappLogRow[], Error> {
  return useQuery({
    queryKey: ["whatsapp-log", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_log")
        .select("id, phone, status, meta_message_id, error_message, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return (data ?? []) as WhatsappLogRow[];
    },
  });
}
