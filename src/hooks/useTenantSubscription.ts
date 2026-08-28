import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PLAN_LIMITS, type PlanLimits, type SubscriptionTier } from "@/lib/plans";

export interface TenantSubscriptionRow {
  id: string;
  slug: string;
  name: string;
  subscription_tier: SubscriptionTier;
  subscription_updated_at: string;
  processCount: number;
  userCount: number;
}

const TENANT_SELECT = "id, slug, name, subscription_tier, subscription_updated_at";

export const subscriptionKeys = {
  mine: (tenantId: string) => ["tenant-subscription", tenantId] as const,
  all: ["tenant-subscriptions"] as const,
};

/** Cuenta procesos activos (no recepcionados) del tenant. */
async function countActiveProcesses(tenantId: string) {
  const { count } = await supabase
    .from("purchase_processes")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
  return count ?? 0;
}

async function countUsers(tenantId: string) {
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
  return count ?? 0;
}

export interface TenantSubscription {
  tier: SubscriptionTier;
  limits: PlanLimits;
  usage: { processes: number; users: number };
  isAtProcessLimit: boolean;
  isAtUserLimit: boolean;
  isLoading: boolean;
}

/** Plan, límites y uso del tenant del usuario autenticado. */
export function useTenantSubscription(): TenantSubscription {
  const { user } = useAuth();
  const tenantId = user?.tenantId ?? null;

  const { data, isLoading } = useQuery({
    queryKey: subscriptionKeys.mine(tenantId ?? ""),
    enabled: !!tenantId,
    queryFn: async () => {
      const [{ data: tenant }, processes, users] = await Promise.all([
        supabase.from("tenants").select(TENANT_SELECT).eq("id", tenantId!).maybeSingle(),
        countActiveProcesses(tenantId!),
        countUsers(tenantId!),
      ]);
      const tier = ((tenant as { subscription_tier?: string } | null)?.subscription_tier ??
        "free") as SubscriptionTier;
      return { tier, processes, users };
    },
  });

  const tier: SubscriptionTier = data?.tier ?? "free";
  const limits = PLAN_LIMITS[tier];
  const usage = { processes: data?.processes ?? 0, users: data?.users ?? 0 };

  return {
    tier,
    limits,
    usage,
    isAtProcessLimit:
      !isLoading && limits.maxActiveProcesses !== null && usage.processes >= limits.maxActiveProcesses,
    isAtUserLimit: !isLoading && limits.maxUsers !== null && usage.users >= limits.maxUsers,
    isLoading,
  };
}

/** Listado de tenants con su plan y uso (solo admin). */
export function useTenantSubscriptions() {
  return useQuery({
    queryKey: subscriptionKeys.all,
    queryFn: async (): Promise<TenantSubscriptionRow[]> => {
      const { data, error } = await supabase.from("tenants").select(TENANT_SELECT).order("name");
      if (error) throw new Error(error.message);
      const tenants = (data ?? []) as unknown as Omit<
        TenantSubscriptionRow,
        "processCount" | "userCount"
      >[];
      return Promise.all(
        tenants.map(async (t) => ({
          ...t,
          subscription_tier: (t.subscription_tier ?? "free") as SubscriptionTier,
          processCount: await countActiveProcesses(t.id),
          userCount: await countUsers(t.id),
        })),
      );
    },
  });
}

export function useUpdateTenantTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; tier: SubscriptionTier }) => {
      const { error } = await supabase
        .from("tenants")
        .update({
          subscription_tier: input.tier,
          subscription_updated_at: new Date().toISOString(),
        } as never)
        .eq("id", input.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: subscriptionKeys.all });
      qc.invalidateQueries({ queryKey: ["tenant-subscription"] });
    },
  });
}
