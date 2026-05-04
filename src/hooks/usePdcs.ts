import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Pdc, Criticality, PdcStatus } from "@/types/pdc";

// Mapea criticidad de BD (es) ↔ tipo del frontend (en)
const CRIT_DB_TO_FE: Record<string, Criticality> = { baja: "low", media: "medium", alta: "high" };
export const CRIT_FE_TO_DB: Record<Criticality, "baja" | "media" | "alta"> = {
  low: "baja", medium: "media", high: "alta",
};

// Mapea stage de BD → status del frontend (aproximación; nuevos PdCs arrancan en ingenieria → technical_definition)
const STAGE_TO_STATUS: Record<string, PdcStatus> = {
  ingenieria: "technical_definition",
  programacion: "planning",
  cotizacion: "quotation",
  evaluacion: "evaluation",
  adjudicacion: "awarded",
  oc: "po_issued",
  fat: "fat",
  logistica: "shipping",
  cerrado: "closed",
};

export interface PdcRow {
  id: string;
  pdc_number: string;
  name: string;
  project: string;
  description: string | null;
  category: string | null;
  criticality: string;
  estimated_amount: number | null;
  currency: string | null;
  required_on_site_date: string | null;
  current_stage: string;
  requesting_area: string | null;
  et_document_code: string | null;
  engineering_responsible: string | null;
  responsible_name: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function rowToPdc(r: PdcRow): Pdc {
  return {
    id: r.id,
    pdc_number: r.pdc_number,
    project: r.project,
    title: r.name,
    description: r.description ?? "",
    category: r.category ?? "",
    criticality: CRIT_DB_TO_FE[r.criticality] ?? "medium",
    estimated_amount: Number(r.estimated_amount ?? 0),
    currency: r.currency ?? "USD",
    required_on_site_date: r.required_on_site_date ?? "",
    current_status: STAGE_TO_STATUS[r.current_stage] ?? "draft",
    current_owner: r.responsible_name ?? "—",
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export function usePdcs() {
  const [pdcs, setPdcs] = useState<Pdc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("purchase_processes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      setError(error.message);
      setPdcs([]);
    } else {
      setError(null);
      setPdcs((data as unknown as PdcRow[]).map(rowToPdc));
    }
    setLoading(false);
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { pdcs, loading, error, refetch };
}

export function usePdc(id: string | undefined) {
  const [pdc, setPdc] = useState<Pdc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("purchase_processes")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      if (error) { setError(error.message); setPdc(null); }
      else if (data) { setPdc(rowToPdc(data as unknown as PdcRow)); setError(null); }
      else { setPdc(null); }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  return { pdc, loading, error };
}
