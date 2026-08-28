import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TenantUser {
  id: string;
  email: string;
  full_name: string | null;
  area: string | null;
  /** Cargo por defecto (catálogo positions). Descriptivo, no da permisos. */
  default_position_id: string | null;
  phone: string | null;
  rut: string | null;
  whatsapp_notifications_enabled: boolean;
}

const KEY = ["tenant-users"] as const;

/**
 * Perfiles visibles para el usuario actual (RLS: mismo tenant / admin).
 * Los datos de contacto sensibles (teléfono/RUT) viven en `profile_contacts`
 * y sólo son legibles por el propio usuario o un admin.
 */
export function useTenantUsers(): UseQueryResult<TenantUser[], Error> {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const [{ data, error }, { data: contacts }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, email, full_name, area, default_position_id")
          .order("full_name"),
        supabase
          .from("profile_contacts")
          .select("id, phone, rut, whatsapp_notifications_enabled"),
      ]);
      if (error) throw new Error(error.message);
      const byId = new Map((contacts ?? []).map((c) => [c.id, c]));
      return (data ?? []).map((p) => ({
        ...p,
        phone: byId.get(p.id)?.phone ?? null,
        rut: byId.get(p.id)?.rut ?? null,
        whatsapp_notifications_enabled:
          byId.get(p.id)?.whatsapp_notifications_enabled ?? true,
      })) as TenantUser[];
    },
  });
}

/** Actualiza el cargo por defecto de un perfil (propio o, si es admin, de otro). */
export function useUpdateDefaultPosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; default_position_id: string | null }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ default_position_id: input.default_position_id })
        .eq("id", input.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["my-profile"] });
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
      const { error } = await supabase
        .from("profile_contacts")
        .upsert({ id, ...values }, { onConflict: "id" });
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
      const [{ data, error }, { data: contact }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, email, full_name, area")
          .eq("id", userId!)
          .maybeSingle(),
        supabase
          .from("profile_contacts")
          .select("id, phone, rut, whatsapp_notifications_enabled")
          .eq("id", userId!)
          .maybeSingle(),
      ]);
      if (error) throw new Error(error.message);
      if (!data) return null;
      return {
        ...data,
        phone: contact?.phone ?? null,
        rut: contact?.rut ?? null,
        whatsapp_notifications_enabled: contact?.whatsapp_notifications_enabled ?? true,
      } as TenantUser;
    },
  });
}


/** Valida formato E.164: '+' seguido de 7 a 15 dígitos, sin espacios ni signos. */
export const E164_REGEX = /^\+[1-9]\d{6,14}$/;
export const isValidE164 = (v: string) => E164_REGEX.test(v.trim());
