import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { PROFILE_SECTIONS, type ProfileField, type ProjectProfile } from "@/lib/projectProfile";
import { useMunicipalities, useProjectMeta, useSaveProjectProfile } from "@/hooks/useProjectRequirementItems";

const UNSET = "__unset";

function FieldInput({ f, value, onChange, disabled }: { f: ProfileField; value: unknown; onChange: (v: unknown) => void; disabled: boolean }) {
  if (f.kind === "bool") {
    const v = value === true ? "true" : value === false ? "false" : UNSET;
    return (
      <Select value={v} onValueChange={(x) => onChange(x === UNSET ? null : x === "true")} disabled={disabled}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={UNSET}>Sin responder</SelectItem>
          <SelectItem value="true">Sí</SelectItem>
          <SelectItem value="false">No</SelectItem>
        </SelectContent>
      </Select>
    );
  }
  if (f.kind === "select") {
    return (
      <Select value={(value as string) || UNSET} onValueChange={(x) => onChange(x === UNSET ? null : x)} disabled={disabled}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={UNSET}>Sin responder</SelectItem>
          {f.options!.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    );
  }
  return (
    <Input
      type={f.kind === "number" ? "number" : f.kind === "date" ? "date" : "text"}
      value={value == null ? "" : String(value)}
      disabled={disabled}
      onChange={(e) => {
        const raw = e.target.value;
        onChange(raw === "" ? null : f.kind === "number" ? Number(raw) : raw);
      }}
    />
  );
}

export function ProjectProfileForm({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const { data: meta, isLoading } = useProjectMeta(projectId);
  const { data: munis = [] } = useMunicipalities();
  const save = useSaveProjectProfile(projectId);
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProjectProfile>({});
  const [muni, setMuni] = useState<string | null>(null);

  useEffect(() => {
    if (meta) { setProfile(meta.profile ?? {}); setMuni(meta.municipality_id); }
  }, [meta]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const onSave = async () => {
    const clean = Object.fromEntries(Object.entries(profile).filter(([, v]) => v !== null && v !== undefined && v !== ""));
    try {
      await save.mutateAsync({ profile: clean, municipality_id: muni });
      toast({ title: "Perfil guardado" });
    } catch (e) {
      toast({ title: "No se pudo guardar el perfil", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Municipalidad</CardTitle>
          <CardDescription>Define qué exigencias municipales se ofrecen junto al catálogo legal.</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={muni ?? UNSET} onValueChange={(v) => setMuni(v === UNSET ? null : v)} disabled={!canEdit}>
            <SelectTrigger className="max-w-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={UNSET}>Sin municipalidad</SelectItem>
              {munis.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {PROFILE_SECTIONS.map((s) => (
        <Card key={s.title}>
          <CardHeader className="pb-3"><CardTitle className="text-base">{s.title}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {s.fields.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label className="text-sm">{f.label}</Label>
                <FieldInput f={f} value={profile[f.key]} disabled={!canEdit} onChange={(v) => setProfile((p) => ({ ...p, [f.key]: v }))} />
                {f.affects && <p className="text-xs text-muted-foreground">Afecta: {f.affects}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <p className="text-xs text-muted-foreground">
        De las personas del proyecto solo se guarda el nombre. Las preguntas sin responder dejan en revisión los trámites y requisitos que dependen de ellas.
      </p>
      {canEdit && (
        <div className="flex justify-end sticky bottom-2">
          <Button onClick={onSave} disabled={save.isPending}>{save.isPending ? "Guardando…" : "Guardar perfil"}</Button>
        </div>
      )}
    </div>
  );
}
