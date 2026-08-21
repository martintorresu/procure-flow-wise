import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "add_process_comment",
  title: "Comentar un proceso",
  description: "Agrega un comentario al hilo de seguimiento de un proceso de compra, como el usuario autenticado.",
  inputSchema: {
    process_id: z.string().uuid().describe("Identificador del proceso a comentar."),
    body: z.string().trim().min(1).max(4000).describe("Texto del comentario."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ process_id, body }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data: process, error: processError } = await supabase
      .from("purchase_processes")
      .select("id, tenant_id")
      .eq("id", process_id)
      .maybeSingle();
    if (processError) return { content: [{ type: "text", text: processError.message }], isError: true };
    if (!process) return { content: [{ type: "text", text: "Proceso no encontrado o sin acceso" }], isError: true };

    const { data, error } = await supabase
      .from("process_comments")
      .insert({
        process_id: process.id,
        tenant_id: process.tenant_id,
        author_user_id: ctx.getUserId()!,
        body,
      })
      .select()
      .single();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Comentario agregado al proceso ${process.id}.` }],
      structuredContent: { comment: data },
    };
  },
});
