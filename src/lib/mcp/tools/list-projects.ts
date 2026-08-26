import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_projects",
  title: "Listar proyectos",
  description: "Lista los proyectos visibles para el usuario junto con su información básica.",
  inputSchema: {
    search: z.string().trim().min(1).optional().describe("Texto a buscar en el nombre del proyecto."),
    limit: z.number().int().min(1).max(100).default(25).describe("Máximo de proyectos a devolver."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase.from("projects").select("*").order("created_at", { ascending: false }).limit(limit ?? 25);
    const safeSearch = search?.replace(/[.,()]/g, "");
    if (safeSearch) query = query.ilike("name", `%${safeSearch}%`);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { projects: data ?? [] },
    };
  },
});
