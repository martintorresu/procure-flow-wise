import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_alerts",
  title: "Listar alertas",
  description: "Lista las alertas de seguimiento visibles para el usuario, opcionalmente filtradas por severidad o estado.",
  inputSchema: {
    severity: z.string().trim().min(1).optional().describe("Filtrar por severidad de la alerta."),
    status: z.string().trim().min(1).optional().describe("Filtrar por estado de la alerta."),
    limit: z.number().int().min(1).max(100).default(25).describe("Máximo de alertas a devolver."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ severity, status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);
    if (severity) query = query.eq("severity", severity);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { alerts: data ?? [] },
    };
  },
});
