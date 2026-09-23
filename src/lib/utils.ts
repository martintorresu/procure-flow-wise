import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Mayúsculas en español conservando tildes y eñes (solo presentación). */
export function upperEs(value?: string | null): string {
  return String(value ?? "").toLocaleUpperCase("es-CL");
}
