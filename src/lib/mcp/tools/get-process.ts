import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_process",
  title: "Detalle de un proceso",
  description:
    "Devuelve el detalle de un proceso de compra (por id o por número de proceso) junto con sus etapas y comentarios recientes.",
  inputSchema: {
    id: z.string().uuid().optional().describe("Identificador único del proceso."),
    process_number: z.string().trim().min(1).optional().describe("Número del proceso, por ejemplo PC-0001."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id, process_number }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    if (!id && !process_number) {
      return { content: [{ type: "text", text: "Indica id o process_number" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase.from("processes").select("*").limit(1);
    query = id ? query.eq("id", id) : query.eq("process_number", process_number!);
    const { data: process, error } = await query.maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!process) return { content: [{ type: "text", text: "Proceso no encontrado" }], isError: true };

    const [{ data: stages }, { data: comments }] = await Promise.all([
      supabase
        .from("process_stages")
        .select("id, name, status, sort_order")
        .eq("process_id", process.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("process_comments")
        .select("id, body, created_at, author_user_id")
        .eq("process_id", process.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const payload = { process, stages: stages ?? [], comments: comments ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
