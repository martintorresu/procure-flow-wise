import { CheckCircle2, XCircle } from "lucide-react";
import type { QualityBreakdownItem } from "@/lib/minutaQuality";

interface Props {
  items: QualityBreakdownItem[];
}

/** Checklist de ítems del estándar de minuta. */
export function QualityChecklist({ items }: Props) {
  return (
    <ul className="space-y-1.5 w-full">
      {items.map((item) => (
        <li key={item.key} className="flex items-start gap-2 text-sm">
          {item.ok ? (
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-success" />
          ) : (
            <XCircle className="w-4 h-4 mt-0.5 shrink-0 text-danger" />
          )}
          <span className={item.ok ? "text-muted-foreground" : "font-medium"}>{item.label}</span>
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">{item.weight}%</span>
        </li>
      ))}
    </ul>
  );
}
