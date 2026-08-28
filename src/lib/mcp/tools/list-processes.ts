import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_processes",
  title: "Listar procesos de compra",
  description:
    "Lista los procesos de compra visibles para el usuario, con filtros opcionales por tipo o texto de búsqueda.",
  inputSchema: {
    search: z.string().trim().min(1).optional().describe("Texto a buscar en el nombre o número del proceso."),
    process_type: z.string().trim().min(1).optional().describe("Filtrar por tipo de proceso (PC, CT, LT, PM)."),
    limit: z.number().int().min(1).max(100).default(20).describe("Máximo de procesos a devolver."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, process_type, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("purchase_processes")
      .select(
        "id, pdc_number, name, process_type, project_id, responsible_name, created_at, updated_at",
      )
      .order("updated_at", { ascending: false })
      .limit(limit ?? 20);

    if (process_type) query = query.eq("process_type", process_type);
    // Sanitiza metacaracteres de PostgREST para evitar inyección de filtros.
    const safeSearch = search?.replace(/[.,()]/g, "");
    if (safeSearch) query = query.or(`name.ilike.%${safeSearch}%,pdc_number.ilike.%${safeSearch}%`);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { processes: data ?? [] },
    };
  },
});
