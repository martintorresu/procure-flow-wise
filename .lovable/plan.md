# Agregar ANTHROPIC_API_KEY y verificar analyze-transcript

## Contexto
La Edge Function `analyze-transcript` ya está desplegada y responde correctamente, pero devuelve `"ANTHROPIC_API_KEY not configured"` porque el secreto no existe en este proyecto. En Lovable Cloud los secretos se gestionan desde Lovable, no desde un dashboard externo de Supabase (este proyecto no tiene dashboard de Supabase accesible; la plataforma inyecta los secretos a las Edge Functions automáticamente).

## Qué hacer

1. **Agregas el secreto (solo tú puedes hacerlo):**
   - Abre **Project Settings → Secrets** (en Lovable, no en Supabase).
   - Crea un secreto con nombre exacto: `ANTHROPIC_API_KEY`
   - Valor: tu clave de Anthropic (formato `sk-ant-...`), obtenida desde https://console.anthropic.com/settings/api-keys
   - Guardar. No hace falta re-desplegar la función: los secretos se leen en tiempo de ejecución.

2. **Verificación (la hago yo al recibir tu confirmación):**
   - Invocar `analyze-transcript` con una transcripción de prueba.
   - Confirmar que responde con `analysisMode: "llm"`, resumen ejecutivo, compromisos y qualityScore.
   - Si falla, revisar el log de la función y reportar el error exacto.

## Alternativa sin secreto externo (opcional)
Si prefieres no depender de una clave de Anthropic, puedo adaptar la función para usar el gateway de IA de Lovable (`LOVABLE_API_KEY`, ya disponible), que no requiere ningún secreto adicional. Mantendría el mismo contrato JSON de respuesta. Dímelo si quieres esa variante.
