# Configurar ANTHROPIC_API_KEY y dejar `analyze-transcript` operativo

## Cómo proporcionar la clave

La clave es un secreto y nunca debe ir hardcodeada. Hay dos formas válidas (elige una):

1. **Recomendada — Pegarla en el chat**: responde con el valor completo (empieza con `sk-ant-api03-...`). Yo lo guardo directamente en los secretos del proyecto con la herramienta de secretos, sin exposición en código.
2. **Manual**: Project Settings → Secrets → crear/actualizar el secreto `ANTHROPIC_API_KEY` con el valor y guardar.

No necesitas ningún dashboard externo ni re-desplegar la función: los secretos se leen en tiempo de ejecución.

## Qué haré al recibir la clave

1. Guardar el valor en el secreto `ANTHROPIC_API_KEY` (no se muestra nunca; solo se referencia por nombre).
2. Verificar que la clave sea estándar (`sk-ant-api03-`) y no "identity-linked": invocar la Edge Function `analyze-transcript` con una transcripción de prueba.
3. Confirmar que responde con `analysisMode: "llm"`, resumen ejecutivo, compromisos y `qualityScore`.
4. Si la API rechaza la clave (`anthropic-workspace-id` requerido u otro error), reportar el mensaje exacto y proponer las alternativas ya conocidas (clave clásica nueva o secreto `ANTHROPIC_WORKSPACE_ID` — la función ya soporta ese header opcionalmente).

## Notas

- La función `analyze-transcript` ya está desplegada y con CORS funcionando; no requiere cambios de código para este paso.
- Si el test de punta a punta pasa, el flujo LLM → fallback regex de Minuta Activa queda operativo.
