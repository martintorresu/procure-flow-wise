import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { groupPositionsForProcess, usePositions } from "@/hooks/usePositions";
import { PROCESS_TYPE_LABELS } from "@/lib/processTypes";

const NONE = "__none__";

interface Props {
  value: string | null;
  onChange: (id: string | null) => void;
  /** Tipo del proceso en curso: solo ordena las sugerencias. */
  processType?: string | null;
  label?: string;
  id?: string;
}

/** Selector de cargo (opcional). Sugiere los del tipo de proceso primero. */
export function PositionSelect({ value, onChange, processType, label = "Cargo (opcional)", id }: Props) {
  const { data: positions = [] } = usePositions();
  const { ofType, transversal, others } = groupPositionsForProcess(positions, processType);

  return (
    <div className="space-y-1.5">
      {label && <Label htmlFor={id}>{label}</Label>}
      <Select value={value ?? NONE} onValueChange={(v) => onChange(v === NONE ? null : v)}>
        <SelectTrigger id={id}><SelectValue placeholder="Sin cargo" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Sin cargo</SelectItem>
          {ofType.length > 0 && (
            <SelectGroup>
              <SelectLabel>
                {PROCESS_TYPE_LABELS[processType as keyof typeof PROCESS_TYPE_LABELS] ?? "Este proceso"}
              </SelectLabel>
              {ofType.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectGroup>
          )}
          {transversal.length > 0 && (
            <SelectGroup>
              <SelectLabel>Transversales</SelectLabel>
              {transversal.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectGroup>
          )}
          {others.length > 0 && (
            <>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>Otros cargos</SelectLabel>
                {others.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectGroup>
            </>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
