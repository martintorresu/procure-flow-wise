import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Cargos (positions): catálogo abierto por tenant, puramente descriptivo.
 * NUNCA participa en RLS ni en decisiones de permisos: eso lo define el
 * nivel de acceso (app_role).
 */
export interface Position {
  id: string;
  tenant_id: string;
  name: string;
  /** obra | licitacion | contrato | compra_industrial | null (transversal) */
  process_type: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

const KEY = ["positions"] as const;

export function usePositions(): UseQueryResult<Position[], Error> {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("positions")
        .select("*")
        .order("process_type", { ascending: true, nullsFirst: true })
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as Position[];
    },
  });
}

export function useCreatePosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { tenantId: string; name: string; processType: string | null }) => {
      const { data, error } = await supabase
        .from("positions")
        .insert({
          tenant_id: input.tenantId,
          name: input.name.trim(),
          process_type: input.processType,
        })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data as Position;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdatePosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; name?: string; is_active?: boolean; process_type?: string | null }) => {
      const { id, ...values } = input;
      const { error } = await supabase.from("positions").update(values).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/**
 * Ordena los cargos activos sugiriendo primero los del tipo de proceso,
 * luego los transversales y al final el resto. Es sugerencia, no restricción.
 */
export function groupPositionsForProcess(positions: Position[], processType?: string | null) {
  const active = positions.filter((p) => p.is_active);
  const byOrder = (a: Position, b: Position) => a.sort_order - b.sort_order || a.name.localeCompare(b.name);
  return {
    ofType: processType ? active.filter((p) => p.process_type === processType).sort(byOrder) : [],
    transversal: active.filter((p) => p.process_type === null).sort(byOrder),
    others: active
      .filter((p) => p.process_type !== null && p.process_type !== processType)
      .sort((a, b) => (a.process_type ?? "").localeCompare(b.process_type ?? "") || byOrder(a, b)),
  };
}
