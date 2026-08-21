import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TenantUser {
  id: string;
  email: string;
  full_name: string | null;
  area: string | null;
  phone: string | null;
  rut: string | null;
  whatsapp_notifications_enabled: boolean;
}

const KEY = ["tenant-users"] as const;

/** Perfiles visibles para el usuario actual (RLS: mismo tenant / admin). */
export function useTenantUsers(): UseQueryResult<TenantUser[], Error> {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, area, phone, rut, whatsapp_notifications_enabled")
        .order("full_name");
      if (error) throw new Error(error.message);
      return (data ?? []) as TenantUser[];
    },
  });
}

/** Actualiza teléfono / RUT / preferencia de WhatsApp de un perfil. */
export function useUpdateProfileContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      phone?: string | null;
      rut?: string | null;
      whatsapp_notifications_enabled?: boolean;
    }) => {
      const { id, ...values } = input;
      const { error } = await supabase.from("profiles").update(values).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    },
  });
}

/** Perfil del usuario autenticado. */
export function useMyProfile(userId?: string): UseQueryResult<TenantUser | null, Error> {
  return useQuery({
    queryKey: ["my-profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, area, phone, rut, whatsapp_notifications_enabled")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data ?? null) as TenantUser | null;
    },
  });
}

/** Valida formato E.164: '+' seguido de 7 a 15 dígitos, sin espacios ni signos. */
export const E164_REGEX = /^\+[1-9]\d{6,14}$/;
export const isValidE164 = (v: string) => E164_REGEX.test(v.trim());
