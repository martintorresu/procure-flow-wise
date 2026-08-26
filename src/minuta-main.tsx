import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import MinutaApp from "./MinutaApp";
import "./index.css";

// Registro del SW dedicado de Minuta Activa (nunca en dev ni en previews de Lovable)
if (typeof window !== "undefined" && "serviceWorker" in navigator && import.meta.env.PROD) {
  const host = window.location.hostname;
  const inIframe = window.self !== window.top;
  const swOff = new URLSearchParams(window.location.search).get("sw") === "off";
  const refused =
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
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) =>
        regs.forEach((r) => {
          const url = r.active?.scriptURL ?? r.waiting?.scriptURL ?? r.installing?.scriptURL ?? "";
          if (url.endsWith("/minuta-sw.js")) void r.unregister();
        }),
      )
      .catch(() => {});
  } else {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/minuta-sw.js", { scope: "/minuta.html" }).catch((e) => {
        console.warn("[minuta-pwa] SW registration failed:", e);
      });
    });
  }
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <MinutaApp />
  </HelmetProvider>,
);
