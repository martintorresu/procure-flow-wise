import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useImportCommitments } from "@/hooks/useCommitments";
import {
  clearOfflineQueue,
  getOfflineQueue,
  isFlushingQueue,
  setFlushingQueue,
  setOfflineQueue,
} from "@/lib/offlineQueue";

/**
 * Detecta el estado de conexión y, al volver online, procesa la cola
 * offline de compromisos usando useImportCommitments.
 * El lock de sincronización es un singleton de módulo: aunque el hook se monte
 * en varios lugares, el flush corre una sola vez.
 */
export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const importMutation = useImportCommitments();
  const mutateRef = useRef(importMutation.mutateAsync);
  mutateRef.current = importMutation.mutateAsync;

  useEffect(() => {
    const flush = async () => {
      if (isFlushingQueue()) return;
      const queue = getOfflineQueue();
      const total = queue.reduce((n, b) => n + b.items.length, 0);
      if (!total) return;
      setFlushingQueue(true);
      toast.info(`📡 Conexión restaurada. Sincronizando ${total} compromiso${total === 1 ? "" : "s"} pendiente${total === 1 ? "" : "s"}…`);
      try {
        let inserted = 0;
        for (let i = 0; i < queue.length; i++) {
          const res = await mutateRef.current(queue[i].items);
          inserted += res.inserted;
          // Limpieza incremental: quita el batch ya insertado de la cola persistida
          setOfflineQueue(queue.slice(i + 1));
        }
        clearOfflineQueue();
        toast.success(`✅ ${inserted} compromiso${inserted === 1 ? "" : "s"} sincronizado${inserted === 1 ? "" : "s"} desde la cola offline`);
      } catch (e) {
        toast.error(`No se pudo sincronizar la cola offline: ${(e as Error).message}`);
      } finally {
        setFlushingQueue(false);
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

/** Estado de conexión sin efectos de sincronización. */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return isOnline;
}
