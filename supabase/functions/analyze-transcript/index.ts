import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const ANTHROPIC_WORKSPACE_ID = Deno.env.get("ANTHROPIC_WORKSPACE_ID");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Eres el Agente de Minutas y Compromisos de InovaHR. Tu función es transformar transcripciones de reuniones en información estructurada, verificable y orientada al seguimiento ejecutivo.

PRINCIPIOS FUNDAMENTALES:
- Nunca inventar información
- Nunca completar datos mediante inferencias
- Toda afirmación debe estar respaldada por la transcripción
- En caso de duda, generar una alerta
- Priorizar precisión por sobre cantidad

CLASIFICACIÓN DE INTERVENCIONES (aplicar ANTES de generar el outcome):
- Contexto/Antecedentes → Resumir, NO crear tarea
- Opinión ("Creo que", "Me parece") → NO crear tarea
- Idea ("Podríamos", "Sería bueno") → Registrar solo si aporta contexto, NO crear tarea
- Propuesta sin aprobación → NO crear tarea
- Decisión ("Se acuerda", "Se decide", "Queda definido", "Se aprueba") → Registrar en Decisiones
- Compromiso ("Yo haré", "Quedé de", "Enviaré", "Me comprometo") → Crear tarea
- Riesgo identificado → Registrar riesgo; crear tarea SOLO si hay mitigación acordada
- Dependencia → Relacionar con tarea correspondiente
- Configuración técnica → Llevar a observaciones, NO a Decisiones

REGLAS DE PRIORIDAD: Compromiso > Decisión > Riesgo > Dependencia > Contexto > Opinión

RESUMEN EJECUTIVO:
- 1 a 3 párrafos
- Incluir: propósito, temas tratados, decisiones, avances, riesgos, próximos pasos
- No incluir opiniones ni detalles operativos
- Responder: ¿Qué ocurrió? ¿Qué se decidió? ¿Qué sigue?

DECISIONES:
- Solo acuerdos explícitos adoptados durante la reunión
- Cada decisión comienza con un verbo
- Si no hubo decisiones, indicar expresamente

COMPROMISOS Y TAREAS:
- Cada tarea debe comenzar con un verbo en infinitivo
- Un único responsable por tarea (nunca inferir responsables)
- Si falta responsable: "⚠ Responsable por confirmar"
- Si falta fecha: "⚠ Fecha por definir"
- Formato de fecha obligatorio: dd-mmm-aaaa (ejemplo: 15-ago-2026)
- No duplicar tareas; si la misma aparece varias veces, registrar un único compromiso
- IDs: usar el prefijo de proyecto proporcionado + número secuencial (ej: PROC-001)

TIPOS permitidos: Entregable, Gestión, Reunión, Documento, Desarrollo, Validación, Comercial, Configuración, Seguimiento, Riesgo

ESTADOS permitidos: Pendiente, En curso, Completada, Bloqueada, Cancelada, Información a completar

ORIGEN: Acuerdo de reunión, Seguimiento reunión anterior, Solicitud del cliente, Riesgo detectado, Decisión del Comité, Acción preventiva, Acción correctiva, Requerimiento legal

RIESGOS:
- Registrar situaciones que puedan afectar plazo, costo, calidad, alcance, recursos o cumplimiento
- Solo generan tareas cuando existe una acción acordada para mitigarlos

ALERTAS:
🔴 Críticas: sin responsable, sin acción, información contradictoria, compromiso ambiguo
⚠ Pendientes: fecha por definir, participante no identificado, dependencias abiertas, información insuficiente

ESTILO DE REDACCIÓN:
- Tono profesional, ejecutivo y neutral
- Tercera persona, voz activa, frases cortas
- Sin exageraciones, lenguaje coloquial, opiniones ni juicios de valor
- Tareas verificables con un único resultado

GLOSARIO CLAVE:
- OKR: Objectives and Key Results
- KPI: Key Performance Indicator
- OC: Orden de Compra
- Outcome: Documento ejecutivo que resume una reunión
- Compromiso: Acción aceptada por un responsable con plazo
- InovaHR: Empresa consultora en gestión de personas
- Pro.Curem: Plataforma de gestión de compras y abastecimiento

VALIDACIÓN FINAL (ejecutar antes de responder):
- Ninguna idea terminó como tarea
- Ninguna configuración quedó como decisión
- Todo compromiso está en la tabla
- Sin responsables ni fechas inventados
- Resumen consistente con decisiones
- Sin contradicciones entre secciones

Responde ÚNICAMENTE con JSON válido, sin texto adicional.`;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const body = await req.json();
    const {
      transcript,
      meetingTitle,
      meetingDate,
      participants,
      projectPrefix = "GEN",
      knownPeople = [],
    } = body;

    if (!transcript || transcript.trim().length < 20) {
      throw new Error("Transcript is too short or missing");
    }

    // Build the user message with context
    const participantList = participants?.length
      ? `Participantes: ${participants.join(", ")}`
      : "Participantes: no especificados";

    const knownPeopleContext = knownPeople.length > 0
      ? `\n\nPersonas conocidas (usar para identificar responsables):\n${knownPeople.map((p: { name: string; company?: string; role?: string }) => `- ${p.name}${p.company ? ` (${p.company})` : ""}${p.role ? ` — ${p.role}` : ""}`).join("\n")}`
      : "";

    const userMessage = `Analiza la siguiente transcripción de reunión y genera el outcome estructurado en formato JSON.

Información de la reunión:
- Título: ${meetingTitle || "Reunión"}
- Fecha: ${meetingDate || "No especificada"}
- ${participantList}
- Prefijo para IDs de compromisos: ${projectPrefix}${knownPeopleContext}

TRANSCRIPCIÓN:
${transcript}

Responde con un JSON que contenga exactamente estas claves:
{
  "resumenEjecutivo": "string (1-3 párrafos)",
  "decisiones": ["string array, cada una comienza con verbo"],
  "compromisos": [{"id":"${projectPrefix}-001","tipo":"string","tarea":"string (verbo infinitivo)","responsable":"string","fechaCompromiso":"dd-mmm-aaaa","estado":"string","origen":"string","observaciones":"string"}],
  "riesgos": ["string array"],
  "alertas": {"criticas":["string array"],"pendientes":["string array"]},
  "proximaReunion": {"fecha":"string","hora":"string","objetivo":"string"} or null,
  "qualityScore": number 0-100
}`;

    // Call Claude Haiku API
    // Some Anthropic keys are "identity-linked" and require the workspace id header.
    const anthropicHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    };
    if (ANTHROPIC_WORKSPACE_ID) {
      anthropicHeaders["anthropic-workspace-id"] = ANTHROPIC_WORKSPACE_ID;
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: anthropicHeaders,
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: userMessage,
          },
        ],
        system: SYSTEM_PROMPT,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.content?.[0]?.text;

    if (!assistantMessage) {
      throw new Error("Empty response from Claude");
    }

    // Parse the JSON response — handle potential markdown wrapping
    let parsed;
    try {
      // Try direct parse first
      parsed = JSON.parse(assistantMessage);
    } catch {
      // Try extracting JSON from markdown code blocks
      const jsonMatch = assistantMessage.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1].trim());
      } else {
        // Try finding JSON object in the text
        const braceMatch = assistantMessage.match(/\{[\s\S]*\}/);
        if (braceMatch) {
          parsed = JSON.parse(braceMatch[0]);
        } else {
          throw new Error("Could not parse Claude response as JSON");
        }
      }
    }

    // Add the analysis mode marker
    parsed.analysisMode = "llm";

    // Validate and sanitize the response
    const result = {
      resumenEjecutivo: parsed.resumenEjecutivo || "",
      decisiones: Array.isArray(parsed.decisiones) ? parsed.decisiones : [],
      compromisos: Array.isArray(parsed.compromisos)
        ? parsed.compromisos.map((c: Record<string, string>, i: number) => ({
            id: c.id || `${projectPrefix}-${String(i + 1).padStart(3, "0")}`,
            tipo: c.tipo || "Gestión",
            tarea: c.tarea || "",
            responsable: c.responsable || "⚠ Responsable por confirmar",
            fechaCompromiso: c.fechaCompromiso || "⚠ Fecha por definir",
            estado: c.estado || "Pendiente",
            origen: c.origen || "Acuerdo de reunión",
            observaciones: c.observaciones || "",
          }))
        : [],
      riesgos: Array.isArray(parsed.riesgos) ? parsed.riesgos : [],
      alertas: {
        criticas: Array.isArray(parsed.alertas?.criticas) ? parsed.alertas.criticas : [],
        pendientes: Array.isArray(parsed.alertas?.pendientes) ? parsed.alertas.pendientes : [],
      },
      proximaReunion: parsed.proximaReunion || null,
      qualityScore:
        typeof parsed.qualityScore === "number"
          ? Math.min(100, Math.max(0, parsed.qualityScore))
          : 75,
      analysisMode: "llm" as const,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analyze-transcript:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal error analyzing transcript",
        analysisMode: "error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
