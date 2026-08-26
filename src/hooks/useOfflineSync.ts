import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useImportCommitments } from "@/hooks/useCommitments";
import { clearOfflineQueue, getOfflineQueue } from "@/lib/offlineQueue";

/**
 * Detecta el estado de conexión y, al volver online, procesa la cola
 * offline de compromisos usando useImportCommitments.
 */
export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const importMutation = useImportCommitments();
  const syncingRef = useRef(false);
  const mutateRef = useRef(importMutation.mutateAsync);
  mutateRef.current = importMutation.mutateAsync;

  useEffect(() => {
    const flush = async () => {
      if (syncingRef.current) return;
      const queue = getOfflineQueue();
      const total = queue.reduce((n, b) => n + b.items.length, 0);
      if (!total) return;
      syncingRef.current = true;
      toast.info(`📡 Conexión restaurada. Sincronizando ${total} compromiso${total === 1 ? "" : "s"} pendiente${total === 1 ? "" : "s"}…`);
      try {
        let inserted = 0;
        for (const batch of queue) {
          const res = await mutateRef.current(batch.items);
          inserted += res.inserted;
        }
        clearOfflineQueue();
        toast.success(`✅ ${inserted} compromiso${inserted === 1 ? "" : "s"} sincronizado${inserted === 1 ? "" : "s"} desde la cola offline`);
      } catch (e) {
        toast.error(`No se pudo sincronizar la cola offline: ${(e as Error).message}`);
      } finally {
        syncingRef.current = false;
      }
    };

    const onOnline = () => {
      setIsOnline(true);
      void flush();
    };
    const onOffline = () => setIsOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    // Intento inicial por si había cola pendiente al cargar
    if (navigator.onLine) void flush();
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return { isOnline };
}
