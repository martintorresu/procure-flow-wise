import { useEffect, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type SortDir = "asc" | "desc";
const KEY = "process-list-sort-dir";

function parse(num: string): [string, number, string] {
  const m = (num ?? "").match(/^(.*?)-?(\d+)$/);
  if (!m) return [num ?? "", Number.POSITIVE_INFINITY, num ?? ""];
  return [m[1], parseInt(m[2], 10), num];
}

/** Extrae el sufijo numérico de un process_number ("PROC-12" → "12"), con relleno mínimo de 2 dígitos. */
export function processNumberSuffix(processNumber: string | null | undefined): string {
  const m = (processNumber ?? "").match(/(\d+)$/);
  return m ? m[1].padStart(2, "0") : (processNumber ?? "");
}

/** Orden natural por número de proceso: agrupa por prefijo y ordena numéricamente dentro. */
export function sortByProcessNumber<T extends { process_number: string }>(list: T[], dir: SortDir): T[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...list].sort((a, b) => {
    const [pa, na, ra] = parse(a.process_number);
    const [pb, nb, rb] = parse(b.process_number);
    const c = pa.localeCompare(pb, "es") || (na - nb) || ra.localeCompare(rb, "es", { numeric: true });
    return c * sign;
  });
}

export function useProcessSortDir() {
  const [dir, setDir] = useState<SortDir>(() => {
    try { return localStorage.getItem(KEY) === "desc" ? "desc" : "asc"; } catch { return "asc"; }
  });
  useEffect(() => { try { localStorage.setItem(KEY, dir); } catch { /* noop */ } }, [dir]);
  const toggle = () => setDir((d) => (d === "asc" ? "desc" : "asc"));
  return { dir, toggle };
}

export function SortDirButton({ dir, onToggle, size = "default" }: { dir: SortDir; onToggle: () => void; size?: "default" | "sm" }) {
  const label = dir === "asc" ? "Nº ascendente" : "Nº descendente";
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onToggle}
            aria-label={`Orden: ${label}. Clic para invertir`}
            className={size === "sm" ? "h-7 text-xs font-normal" : "h-10"}
          >
            <ArrowUpDown className="w-4 h-4 mr-1.5" />{label}
          </Button>
        </TooltipTrigger>
        <TooltipContent className="text-xs">Invertir orden por número</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
