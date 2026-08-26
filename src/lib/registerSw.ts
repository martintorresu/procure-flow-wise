/**
 * Registro del Service Worker de la app (/sw.js, generado por vite-plugin-pwa).
 * NUNCA registra en dev ni en previews de Lovable; en esos contextos
 * des-registra cualquier SW de app que haya quedado pegado.
 * Kill switch manual: agregar ?sw=off a la URL.
 */
export function registerAppSW() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const host = window.location.hostname;
  const swOff = new URLSearchParams(window.location.search).get("sw") === "off";
  const inIframe = window.self !== window.top;
  const refused =
    !import.meta.env.PROD ||
    inIframe ||
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev") ||
    swOff;

  if (refused) {
    // Limpiar registros stale de /sw.js en contextos no productivos
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) =>
        regs.forEach((r) => {
          const url = r.active?.scriptURL ?? r.waiting?.scriptURL ?? r.installing?.scriptURL ?? "";
          if (url.endsWith("/sw.js")) void r.unregister();
        }),
      )
      .catch(() => {});
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((e) => {
      console.warn("[pwa] registro de SW falló:", e);
    });
  });
}
