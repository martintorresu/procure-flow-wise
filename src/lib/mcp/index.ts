import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listProcessesTool from "./tools/list-processes";
import getProcessTool from "./tools/get-process";
import listAlertsTool from "./tools/list-alerts";
import listProjectsTool from "./tools/list-projects";
import addProcessCommentTool from "./tools/add-process-comment";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "procurement-by-inhr",
  title: "Procurement by InHR",
  version: "0.1.0",
  instructions:
    "Herramientas de Procurement by InHR (Pro.Curem Flow) para procesos operacionales de construcción. Usa `list_processes` y `get_process` para consultar procesos, hitos y comentarios; `list_alerts` para alertas de seguimiento; `list_projects` para proyectos; y `add_process_comment` para dejar un comentario en un proceso. Todo se ejecuta como el usuario autenticado y respeta sus permisos.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listProcessesTool, getProcessTool, listAlertsTool, listProjectsTool, addProcessCommentTool],
});
