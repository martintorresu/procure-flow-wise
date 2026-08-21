import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string | null;
  enabled: boolean;
  created_at: string;
  last_used_at: string | null;
}

const KEY = ["api-keys"] as const;
const PLACEHOLDER_TENANT = "00000000-0000-0000-0000-000000000000";

/** Genera una clave aleatoria de 48 caracteres con prefijo legible. */
export function generateApiKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const body = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `pck_${body}`;
}

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function useApiKeys() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<ApiKey[]> => {
      const { data, error } = await supabase
        .from("api_keys")
        .select("id, name, key_prefix, enabled, created_at, last_used_at")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as ApiKey[];
    },
  });
}

/** Crea una API key: guarda solo el hash y devuelve la clave en claro una única vez. */
export function useCreateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string): Promise<{ plain: string }> => {
      const plain = generateApiKey();
      const key_hash = await sha256Hex(plain);
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await supabase.from("api_keys").insert({
        name: name.trim() || "Agente GPT",
        key_hash,
        key_prefix: plain.slice(0, 12),
        enabled: true,
        created_by: userRes?.user?.id ?? null,
        tenant_id: PLACEHOLDER_TENANT,
      } as never);
      if (error) throw new Error(error.message);
      return { plain };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useToggleApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; enabled: boolean }) => {
      const { error } = await supabase.from("api_keys").update({ enabled: input.enabled }).eq("id", input.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("api_keys").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
