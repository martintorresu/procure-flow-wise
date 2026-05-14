import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowDown, ArrowUp, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  useAllEtFieldSchemas, useCreateEtField, useUpdateEtField, useToggleEtField, useReorderEtFields,
} from "@/hooks/useEtFieldSchemas";
import { slugifyKey } from "@/lib/etSchemaBuilder";
import type { EtFieldSchema, EtFieldType } from "@/types/etForm";

const SECTION_LABELS: Record<number, string> = {
  1: "1. Identificación",
  2: "2. Gestión de Compra",
  3: "3. Especificaciones Técnicas",
  4: "4. Condiciones de Sitio",
  5: "5. Documentación",
  6: "6. Protocolo FAT",
  7: "7. Accesorios y Repuestos",
  8: "8. Condiciones Comerciales",
};

const TYPE_LABELS: Record<EtFieldType, string> = {
  text: "Texto",
  textarea: "Texto largo",
  number: "Número",
  unit_value: "Valor + unidad",
  select: "Lista",
  boolean: "Sí / No",
  checkbox: "Checkbox",
  date: "Fecha",
};

export function EtFieldsAdminSection() {
  const { data: grouped, isLoading } = useAllEtFieldSchemas();
  const [activeSection, setActiveSection] = useState("3");

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" /> Campos de Especificación Técnica
          </CardTitle>
        </CardHeader>
        <CardContent>Cargando…</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="w-4 h-4" /> Campos de Especificación Técnica
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Define los campos que aparecen en cada sección del formulario ET para tu organización.
          Los campos del sistema no se pueden eliminar, solo desactivar.
        </p>
        <Tabs value={activeSection} onValueChange={setActiveSection}>
          <TabsList className="flex flex-wrap h-auto">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <TabsTrigger key={n} value={String(n)} className="text-xs">
                {n}
                {grouped?.[n]?.length ? (
                  <span className="ml-1.5 text-muted-foreground">({grouped[n].length})</span>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <TabsContent key={n} value={String(n)} className="mt-4">
              <SectionFieldsTable sectionNumber={n} fields={grouped?.[n] ?? []} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

function SectionFieldsTable({ sectionNumber, fields }: { sectionNumber: number; fields: EtFieldSchema[] }) {
  const updateMutation = useUpdateEtField();
  const toggleMutation = useToggleEtField();
  const reorderMutation = useReorderEtFields(sectionNumber);
  const [editingId, setEditingId] = useState<string | null>(null);

  const sorted = useMemo(() => [...fields].sort((a, b) => a.display_order - b.display_order), [fields]);

  const move = async (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= sorted.length) return;
    const a = sorted[idx], b = sorted[target];
    await reorderMutation.mutateAsync([
      { id: a.id, display_order: b.display_order },
      { id: b.id, display_order: a.display_order },
    ]);
  };

  const toggleActive = async (f: EtFieldSchema, next: boolean) => {
    if (f.is_system && !next) {
      if (!confirm(`"${f.label}" es un campo del sistema. ¿Desactivar?`)) return;
    }
    await toggleMutation.mutateAsync({ id: f.id, section_number: sectionNumber, active: next });
  };

  const toggleRequired = async (f: EtFieldSchema, next: boolean) => {
    await updateMutation.mutateAsync({ id: f.id, section_number: sectionNumber, required: next });
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium">{SECTION_LABELS[sectionNumber]}</h4>
        <AddFieldDialog sectionNumber={sectionNumber} />
      </div>
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Sin campos definidos.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Orden</TableHead>
              <TableHead>Etiqueta</TableHead>
              <TableHead className="w-[120px]">Tipo</TableHead>
              <TableHead className="w-[100px]">Requerido</TableHead>
              <TableHead className="w-[90px]">Sistema</TableHead>
              <TableHead className="w-[80px]">Activo</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((f, idx) => (
              <TableRow key={f.id}>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-mono w-6">{f.display_order}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => move(idx, -1)} disabled={idx === 0}>
                      <ArrowUp className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => move(idx, 1)} disabled={idx === sorted.length - 1}>
                      <ArrowDown className="w-3 h-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{f.label}</span>
                    <span className="text-xs text-muted-foreground font-mono">{f.field_key}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">{TYPE_LABELS[f.field_type]}</Badge>
                </TableCell>
                <TableCell>
                  <Switch checked={f.required} onCheckedChange={(v) => toggleRequired(f, v)} />
                </TableCell>
                <TableCell>
                  {f.is_system && <Badge variant="secondary" className="text-xs">Sistema</Badge>}
                </TableCell>
                <TableCell>
                  <Switch checked={f.active} onCheckedChange={(v) => toggleActive(f, v)} />
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(f.id)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {editingId && (
        <EditFieldDialog
          field={sorted.find((f) => f.id === editingId)!}
          open={!!editingId}
          onOpenChange={(o) => !o && setEditingId(null)}
        />
      )}
    </div>
  );
}

function AddFieldDialog({ sectionNumber }: { sectionNumber: number }) {
  const createMutation = useCreateEtField();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [type, setType] = useState<EtFieldType>("text");
  const [required, setRequired] = useState(false);
  const [placeholder, setPlaceholder] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [unitsText, setUnitsText] = useState("");

  const fieldKey = slugifyKey(label);

  const reset = () => {
    setLabel(""); setType("text"); setRequired(false); setPlaceholder("");
    setOptionsText(""); setUnitsText("");
  };

  const submit = async () => {
    if (!label.trim() || !fieldKey) {
      toast.error("La etiqueta es requerida");
      return;
    }
    try {
      await createMutation.mutateAsync({
        section_number: sectionNumber,
        field_key: fieldKey,
        label: label.trim(),
        field_type: type,
        placeholder: placeholder || null,
        required,
        options: type === "select" ? optionsText.split(",").map((s) => s.trim()).filter(Boolean) : null,
        unit_options: type === "unit_value" ? unitsText.split(",").map((s) => s.trim()).filter(Boolean) : null,
        display_order: 99,
      });
      toast.success(`Campo "${label}" creado`);
      reset();
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="w-3.5 h-3.5" /> Agregar campo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar campo — Sección {sectionNumber}</DialogTitle>
          <DialogDescription>
            Define un nuevo campo personalizado para tu organización.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Etiqueta *</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ej. Certificación requerida" />
            {fieldKey && (
              <p className="text-xs text-muted-foreground font-mono">field_key: {fieldKey}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Tipo *</Label>
            <Select value={type} onValueChange={(v) => setType(v as EtFieldType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["text","textarea","number","unit_value","select","boolean","date"] as EtFieldType[]).map((t) => (
                  <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {type === "select" && (
            <div className="space-y-1.5">
              <Label>Opciones (separadas por coma) *</Label>
              <Input value={optionsText} onChange={(e) => setOptionsText(e.target.value)} placeholder="CE, UL, CSA, IECEx" />
            </div>
          )}
          {type === "unit_value" && (
            <div className="space-y-1.5">
              <Label>Unidades disponibles (separadas por coma) *</Label>
              <Input value={unitsText} onChange={(e) => setUnitsText(e.target.value)} placeholder="bar, psi, MPa" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Placeholder (opcional)</Label>
            <Input value={placeholder} onChange={(e) => setPlaceholder(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={required} onCheckedChange={setRequired} id="req" />
            <Label htmlFor="req" className="cursor-pointer">Campo obligatorio</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditFieldDialog({
  field, open, onOpenChange,
}: { field: EtFieldSchema; open: boolean; onOpenChange: (o: boolean) => void }) {
  const updateMutation = useUpdateEtField();
  const [label, setLabel] = useState(field.label);
  const [placeholder, setPlaceholder] = useState(field.placeholder ?? "");
  const [required, setRequired] = useState(field.required);
  const [optionsText, setOptionsText] = useState((field.options ?? []).join(", "));
  const [unitsText, setUnitsText] = useState((field.unit_options ?? []).join(", "));

  const submit = async () => {
    try {
      await updateMutation.mutateAsync({
        id: field.id,
        section_number: field.section_number,
        label,
        placeholder: placeholder || null,
        required,
        options: field.field_type === "select" ? optionsText.split(",").map((s) => s.trim()).filter(Boolean) : null,
        unit_options: field.field_type === "unit_value" ? unitsText.split(",").map((s) => s.trim()).filter(Boolean) : null,
      });
      toast.success("Campo actualizado");
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar campo</DialogTitle>
          <DialogDescription>
            Tipo: <Badge variant="outline">{TYPE_LABELS[field.field_type]}</Badge> · Clave:{" "}
            <code className="text-xs">{field.field_key}</code> (no editables)
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Etiqueta *</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          {field.field_type === "select" && (
            <div className="space-y-1.5">
              <Label>Opciones (separadas por coma)</Label>
              <Input value={optionsText} onChange={(e) => setOptionsText(e.target.value)} />
            </div>
          )}
          {field.field_type === "unit_value" && (
            <div className="space-y-1.5">
              <Label>Unidades (separadas por coma)</Label>
              <Input value={unitsText} onChange={(e) => setUnitsText(e.target.value)} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Placeholder</Label>
            <Input value={placeholder} onChange={(e) => setPlaceholder(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={required} onCheckedChange={setRequired} id="req-edit" />
            <Label htmlFor="req-edit" className="cursor-pointer">Campo obligatorio</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
