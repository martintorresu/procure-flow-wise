// Edge function: send-whatsapp-alert
// Envía una alerta por WhatsApp usando la Meta WhatsApp Business API (templates aprobados).
// Requiere JWT válido del usuario que dispara la alerta; la config del tenant se lee con service role.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const GRAPH_VERSION = "v21.0";
const APP_BASE_URL = "https://app.pro-curem.com";
const TEMPLATE_NAME = "procurem_alerta";
const TEMPLATE_LANG = "es";

const ACTION_LABELS: Record<string, string> = {
  approval_required: "Aprobación requerida",
  et_pending: "Completar Especificación Técnica",
  milestone_overdue: "Hito atrasado",
  fat_pending: "Coordinar prueba de fábrica (FAT)",
  drawings_pending: "Revisión de planos",
  delivery_risk: "Riesgo de entrega",
};

const E164 = /^\+[1-9]\d{6,14}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "No autorizado" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const caller = userData?.user;
    if (!caller) return json({ error: "No autorizado" }, 401);

    const body = await req.json().catch(() => ({}));
    const isTest = body?.test === true;
    const alertId = typeof body?.alert_id === "string" ? body.alert_id : "";
    const userId = typeof body?.user_id === "string" && body.user_id ? body.user_id : (isTest ? caller.id : "");
    const tenantId = typeof body?.tenant_id === "string" ? body.tenant_id : "";
    if ((!alertId && !isTest) || !userId || !tenantId) {
      return json({ error: "alert_id, user_id y tenant_id son requeridos" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // El caller debe pertenecer al mismo tenant que la alerta.
    const { data: callerProfile } = await admin
      .from("profiles").select("tenant_id").eq("id", caller.id).maybeSingle();
    if (!callerProfile || callerProfile.tenant_id !== tenantId) {
      return json({ error: "Tenant no autorizado" }, 403);
    }

    // El modo prueba es sólo para administradores del tenant.
    if (isTest) {
      const { data: adminRole } = await admin
        .from("user_roles").select("role").eq("user_id", caller.id).eq("role", "admin").maybeSingle();
      if (!adminRole) return json({ error: "Sólo un administrador puede enviar pruebas" }, 403);
    }

    const [{ data: alert }, { data: profile }, { data: contact }, { data: config }] = await Promise.all([
      alertId
        ? admin.from("alerts")
            .select("id, tenant_id, pdc_id, type, message, due_date")
            .eq("id", alertId).eq("tenant_id", tenantId).maybeSingle()
        : Promise.resolve({ data: null }),
      admin.from("profiles")
        .select("id, full_name, email, tenant_id")
        .eq("id", userId).maybeSingle(),
      admin.from("profile_contacts")
        .select("id, phone, whatsapp_notifications_enabled")
        .eq("id", userId).maybeSingle(),
      admin.from("whatsapp_config")
        .select("phone_number_id, access_token, enabled")
        .eq("tenant_id", tenantId).maybeSingle(),
    ]);

    if (!alert && !isTest) return json({ error: "Alerta no encontrada" }, 404);
    if (!profile || profile.tenant_id !== tenantId) return json({ error: "Usuario no encontrado" }, 404);
    if (!config?.enabled) return json({ skipped: "whatsapp_disabled" });
    if (contact?.whatsapp_notifications_enabled === false) return json({ skipped: "user_opted_out" });

    const phone = (contact?.phone ?? "").trim();
    if (!phone) return json({ skipped: "no_phone" });
    if (!E164.test(phone)) return json({ skipped: "invalid_phone" });


    // Token: variable de entorno global (preferida) o el guardado en la config del tenant.
    const accessToken = Deno.env.get("META_WHATSAPP_ACCESS_TOKEN") || (config.access_token ?? "");
    const phoneNumberId = config.phone_number_id ?? "";
    if (!accessToken || !phoneNumberId) return json({ error: "Configuración de WhatsApp incompleta" }, 400);


    let pdcName = "Proceso";
    let currentStage = "Sin etapa";
    let actionType = "Prueba de configuración";
    let requiredAction = "Mensaje de verificación desde Pro.Curem. No requiere acción.";

    if (alert) {
      if (alert.pdc_id) {
        const { data: pdc } = await admin
          .from("purchase_processes").select("pdc_number, name, current_stage").eq("id", alert.pdc_id).maybeSingle();
        if (pdc) {
          pdcName = `${pdc.pdc_number} · ${pdc.name}`;
          if (pdc.current_stage) currentStage = String(pdc.current_stage);
        }
      }
      actionType = ACTION_LABELS[alert.type] ?? alert.type;
      const dueDate = alert.due_date
        ? new Date(alert.due_date).toLocaleDateString("es-CL")
        : "Sin fecha límite";
      // {{4}} = acción requerida
      requiredAction = alert.message?.trim()
        ? alert.message.trim()
        : `${actionType} (vence: ${dueDate})`;
    } else {
      pdcName = "Proceso de prueba";
      currentStage = "—";
    }



    const payload = {
      messaging_product: "whatsapp",
      to: phone,
      type: "template",
      template: {
        name: TEMPLATE_NAME,
        language: { code: TEMPLATE_LANG },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: actionType },      // {{1}} tipo de alerta
              { type: "text", text: pdcName },         // {{2}} nombre del proceso
              { type: "text", text: currentStage },    // {{3}} etapa actual
              { type: "text", text: requiredAction },  // {{4}} acción requerida
            ],
          },
        ],
      },
    };

    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(payload),
    });
    const result = await res.json().catch(() => ({}));

    const metaMessageId = result?.messages?.[0]?.id ?? null;
    const metaErrorCode = typeof result?.error?.code === "number" ? result.error.code : null;
    const recipientNotAllowed = metaErrorCode === 131030;
    const errorMessage = res.ok
      ? null
      : recipientNotAllowed
        ? "El número destinatario no está habilitado en la lista de números permitidos de Meta WhatsApp. Agrégalo y verifícalo en la configuración de la app de Meta, o pasa la cuenta a producción."
        : (result?.error?.message ?? `HTTP ${res.status}`);


    await admin.from("whatsapp_log").insert({
      tenant_id: tenantId,
      alert_id: alertId || null,
      user_id: userId,
      phone,
      status: res.ok ? "sent" : "failed",
      meta_message_id: metaMessageId,
      error_message: errorMessage,
    });

    // La restricción de destinatarios pertenece a la configuración de Meta,
    // no es una caída de la Edge Function. Se devuelve HTTP 200 para que el
    // cliente pueda mostrar la acción requerida sin provocar un error 502.
    if (!res.ok && recipientNotAllowed) {
      return json({
        ok: false,
        error: errorMessage,
        error_code: metaErrorCode,
        setup_required: "allow_recipient_in_meta",
        phone,
      });
    }
    if (!res.ok) return json({ ok: false, error: errorMessage, error_code: metaErrorCode }, 502);
    return json({
      ok: true,
      test: isTest,
      message_id: metaMessageId,
      phone,
      link: alert?.pdc_id ? `${APP_BASE_URL}/pdc/${alert.pdc_id}` : null,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Error desconocido" }, 500);
  }
});
