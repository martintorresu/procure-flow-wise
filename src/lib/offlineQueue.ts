import type { NewCommitment } from "@/hooks/useCommitments";

/** Cola offline simple en localStorage para compromisos capturados sin conexión. */

const KEY = "minuta-offline-queue";

export interface QueuedBatch {
  items: NewCommitment[];
  queuedAt: string;
}

export function getOfflineQueue(): QueuedBatch[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QueuedBatch[]) : [];
  } catch {
    return [];
  }
}

export function enqueueCommitments(items: NewCommitment[]): number {
  const queue = getOfflineQueue();
  queue.push({ items, queuedAt: new Date().toISOString() });
  try {
    localStorage.setItem(KEY, JSON.stringify(queue));
  } catch {
    /* storage lleno o no disponible */
  }
  return queue.reduce((n, b) => n + b.items.length, 0);
}

export function clearOfflineQueue() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}

export function offlineQueueCount(): number {
  return getOfflineQueue().reduce((n, b) => n + b.items.length, 0);
}
