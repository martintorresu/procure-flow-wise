import type { NewCommitment } from "@/hooks/useCommitments";

/** Cola offline simple en localStorage para compromisos capturados sin conexión. */

export const OFFLINE_KEY = "minuta-offline-queue";
const KEY = OFFLINE_KEY;

/** Lock singleton a nivel de módulo para evitar flush concurrente/duplicado. */
let _flushing = false;
export function isFlushingQueue(): boolean {
  return _flushing;
}
export function setFlushingQueue(v: boolean): void {
  _flushing = v;
}

export interface QueuedBatch {
  items: NewCommitment[];
  queuedAt: string;
  meetingTitle?: string;
}

export function getOfflineQueue(): QueuedBatch[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QueuedBatch[]) : [];
  } catch {
    return [];
  }
}

export function setOfflineQueue(queue: QueuedBatch[]): void {
  try {
    if (!queue.length) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(queue));
  } catch {
    /* storage lleno o no disponible */
  }
}

export function enqueueCommitments(items: NewCommitment[], meetingTitle?: string): number {
  const queue = getOfflineQueue();
  queue.push({ items, queuedAt: new Date().toISOString(), meetingTitle });
  setOfflineQueue(queue);
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
