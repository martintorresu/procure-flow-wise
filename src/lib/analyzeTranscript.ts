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

interface AnalyzeParams {
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
