import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/** true si el usuario actual es administrador de plataforma (catálogo legal compartido). */
export function usePlatformAdmin() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["platform-admin", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_admins").select("user_id").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
}
