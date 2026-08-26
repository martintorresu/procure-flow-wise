import { toast } from "sonner";
import { Crown } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PLAN_LIMITS, PLAN_LABELS, usageLabel, type SubscriptionTier } from "@/lib/plans";
import { useTenantSubscriptions, useUpdateTenantTier } from "@/hooks/useTenantSubscription";

export function TierBadge({ tier }: { tier: SubscriptionTier }) {
  return tier === "pro" ? (
    <Badge className="bg-blue-600 text-white hover:bg-blue-600">
      <Crown className="mr-1 h-3 w-3" /> Pro
    </Badge>
  ) : (
    <Badge variant="secondary">Free</Badge>
  );
}

export function SubscriptionsSection() {
  const { user } = useAuth();
  const { data: tenants = [], isLoading } = useTenantSubscriptions();
  const update = useUpdateTenantTier();

  // SECURITY: además de las políticas RLS, la sección sólo se muestra a administradores.
  if (user?.role !== "admin") return null;


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Crown className="h-4 w-4" /> Planes de Suscripción
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Uso</TableHead>
                  <TableHead className="text-right">Cambiar plan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((t) => {
                  const limits = PLAN_LIMITS[t.subscription_tier];
                  return (
                    <TableRow key={t.id}>
                      <TableCell>
                        <div className="font-medium">{t.name}</div>
                        <div className="text-xs text-muted-foreground">{t.slug}</div>
                      </TableCell>
                      <TableCell>
                        <TierBadge tier={t.subscription_tier} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {usageLabel(t.processCount, limits.maxActiveProcesses, "procesos")}
                        {" · "}
                        {usageLabel(t.userCount, limits.maxUsers, "usuarios")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Select
                          value={t.subscription_tier}
                          onValueChange={(v) =>
                            update.mutate(
                              { id: t.id, tier: v as SubscriptionTier },
                              {
                                onSuccess: () =>
                                  toast.success(`${t.name} ahora está en plan ${PLAN_LABELS[v as SubscriptionTier]}`),
                                onError: (e: Error) => toast.error(e.message),
                              },
                            )
                          }
                        >
                          <SelectTrigger className="ml-auto w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">Free</SelectItem>
                            <SelectItem value="pro">Pro</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {tenants.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                      No hay empresas visibles.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
