import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ExternalContact {
  id: string;
  full_name: string;
  email: string;
  company: string | null;
}

/** Contactos externos guardados del tenant, reutilizables en minutas. */
export function useExternalContacts() {
  return useQuery({
    queryKey: ["external-contacts"],
    queryFn: async (): Promise<ExternalContact[]> => {
      const { data, error } = await supabase
        .from("external_contacts")
        .select("id, full_name, email, company")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Guarda (o actualiza) un contacto externo para reutilizarlo en futuras minutas. */
export function useSaveExternalContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { fullName: string; email: string; company: string | null }) => {
      const email = input.email.trim().toLowerCase();
      const { data: existing } = await supabase
        .from("external_contacts")
        .select("id")
        .ilike("email", email)
        .maybeSingle();

      if (existing?.id) {
        const { data, error } = await supabase
          .from("external_contacts")
          .update({ full_name: input.fullName.trim(), company: input.company })
          .eq("id", existing.id)
          .select("id, full_name, email, company")
          .single();
        if (error) throw error;
        return data as ExternalContact;
      }

      const { data, error } = await supabase
        .from("external_contacts")
        .insert({ full_name: input.fullName.trim(), email, company: input.company })
        .select("id, full_name, email, company")
        .single();
      if (error) throw error;
      return data as ExternalContact;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["external-contacts"] });
    },
  });
}
