import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "minuta-install-dismissed-at";
const DISMISS_DAYS = 30;

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/** Banner de instalación para la PWA dedicada Minuta Activa (sin react-router). */
export function MinutaInstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandaloneDisplay()) return;
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 86_400_000) return;

    if (isIos()) {
      setVisible(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") setVisible(false);
    setDeferred(null);
  };

  return (
    <div className="fixed bottom-3 left-3 right-3 z-50 mx-auto max-w-md rounded-xl border border-border bg-card/95 backdrop-blur px-4 py-3 shadow-xl flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">📲 Instalar Minuta Activa</p>
        {deferred ? (
          <p className="text-xs text-muted-foreground">Captura reuniones desde tu pantalla de inicio</p>
        ) : (
          <p className="text-xs text-muted-foreground">Toca Compartir → «Agregar a pantalla de inicio»</p>
        )}
      </div>
      {deferred && (
        <Button size="sm" onClick={install}>
          Instalar
        </Button>
      )}
      <button
        onClick={dismiss}
        aria-label="Cerrar"
        className="p-1.5 rounded-full text-muted-foreground hover:bg-muted"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
