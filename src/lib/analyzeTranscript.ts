import { supabase } from "@/integrations/supabase/client";

export interface LLMAnalysis {
  resumenEjecutivo: string;
  decisiones: string[];
  compromisos: Array<{
    id: string;
    tipo: string;
    tarea: string;
    responsable: string;
    fechaCompromiso: string;
    estado: string;
    origen: string;
    observaciones: string;
    processId?: string | null;
    stageId?: string | null;
    confidence?: "alta" | "media" | "baja";
    reason?: string;
  }>;
  riesgos: string[];
  alertas: {
    criticas: string[];
    pendientes: string[];
  };
  proximaReunion: {
    fecha?: string;
    hora?: string;
    objetivo?: string;
  } | null;
  qualityScore: number;
  analysisMode: "llm" | "regex" | "error";
}

export interface CatalogStage {
  id: string;
  sort_order: number;
  name: string;
  status: string;
  activities: string[];
}
export interface CatalogProcess {
  id: string;
  process_number: string;
  name: string;
  process_type: string | null;
  stages: CatalogStage[];
}
export interface AnalyzeCatalog {
  projectName: string | null;
  processes: CatalogProcess[];
}

interface AnalyzeParams {
  catalog?: AnalyzeCatalog | null;
  transcript: string;
  meetingTitle: string;
  meetingDate: string;
  participants: string[];
  projectPrefix?: string;
  knownPeople?: Array<{ name: string; company?: string; role?: string }>;
}

export async function analyzeTranscriptWithLLM(params: AnalyzeParams): Promise<LLMAnalysis> {
  const { data, error } = await supabase.functions.invoke("analyze-transcript", {
    body: params,
  });

  if (error) {
    throw new Error(`Edge Function error: ${error.message}`);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as LLMAnalysis;
}
