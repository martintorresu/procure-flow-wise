import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EtFieldDef } from "@/types/etForm";

interface DynamicFieldProps {
  field: EtFieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
}

export function DynamicField({ field, value, onChange, disabled }: DynamicFieldProps) {
  const id = `et-field-${field.key}`;
  const baseLabel = (
    <Label htmlFor={id} className="flex items-center gap-1">
      {field.label}
      {field.required && <span className="text-danger">*</span>}
    </Label>
  );

  switch (field.type) {
    case "textarea":
      return (
        <div className="space-y-1.5">
          {baseLabel}
          <Textarea
            id={id}
            value={(value as string) ?? ""}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            rows={3}
          />
          {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
        </div>
      );

    case "select":
      return (
        <div className="space-y-1.5">
          {baseLabel}
          <Select
            value={(value as string) ?? ""}
            onValueChange={onChange}
            disabled={disabled}
          >
            <SelectTrigger id={id}>
              <SelectValue placeholder="Selecciona…" />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case "checkbox":
    case "boolean":
      return (
        <div className="flex items-center gap-2 pt-6">
          <Checkbox
            id={id}
            checked={Boolean(value)}
            onCheckedChange={(c) => onChange(Boolean(c))}
            disabled={disabled}
          />
          <Label htmlFor={id} className="cursor-pointer">
            {field.label}
            {field.required && <span className="text-danger ml-0.5">*</span>}
          </Label>
        </div>
      );

    case "number":
      return (
        <div className="space-y-1.5">
          {baseLabel}
          <Input
            id={id}
            type="number"
            step="any"
            value={(value as string | number) ?? ""}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
            disabled={disabled}
          />
        </div>
      );

    case "unit_value": {
      const v = (value as { value?: number | string; unit?: string } | null) ?? {};
      const units = field.unitOptions ?? [];
      return (
        <div className="space-y-1.5">
          {baseLabel}
          <div className="flex gap-2">
            <Input
              id={id}
              type="number"
              step="any"
              className="flex-1"
              value={v.value ?? ""}
              placeholder={field.placeholder}
              onChange={(e) =>
                onChange({ value: e.target.value === "" ? "" : Number(e.target.value), unit: v.unit ?? units[0] ?? "" })
              }
              disabled={disabled}
            />
            <Select
              value={v.unit ?? ""}
              onValueChange={(u) => onChange({ value: v.value ?? "", unit: u })}
              disabled={disabled}
            >
              <SelectTrigger className="w-24">
                <SelectValue placeholder="Ud." />
              </SelectTrigger>
              <SelectContent>
                {units.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      );
    }

    case "date":
      return (
        <div className="space-y-1.5">
          {baseLabel}
          <Input
            id={id}
            type="date"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
          />
        </div>
      );

    case "text":
    default:
      return (
        <div className="space-y-1.5">
          {baseLabel}
          <Input
            id={id}
            value={(value as string) ?? ""}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
          />
        </div>
      );
  }
}
