import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useCreateProject, useProjects } from "@/hooks/useProjects";

interface ProjectSelectProps {
  value: string | null;
  onChange: (projectId: string, projectName: string) => void;
}

/** Dropdown de proyectos existentes + creación inline de uno nuevo. */
export function ProjectSelect({ value, onChange }: ProjectSelectProps) {
  const { data: projects = [], isLoading } = useProjects();
  const createProject = useCreateProject();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) {
      toast.error("Escribe el nombre del proyecto");
      return;
    }
    try {
      const p = await createProject.mutateAsync(name);
      onChange(p.id, p.name);
      setNewName("");
      setCreating(false);
      toast.success(`Proyecto "${p.name}" creado`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (creating) {
    return (
      <div className="flex gap-2">
        <Input
          autoFocus
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nombre del nuevo proyecto"
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); handleCreate(); }
          }}
        />
        <Button type="button" onClick={handleCreate} disabled={createProject.isPending}>
          {createProject.isPending ? "Creando…" : "Crear"}
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => setCreating(false)} aria-label="Cancelar">
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Select
        value={value ?? undefined}
        onValueChange={(v) => {
          const p = projects.find((x) => x.id === v);
          if (p) onChange(p.id, p.name);
        }}
      >
        <SelectTrigger className="flex-1">
          <SelectValue placeholder={isLoading ? "Cargando…" : "Seleccione un proyecto"} />
        </SelectTrigger>
        <SelectContent>
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="button" variant="outline" onClick={() => setCreating(true)} className="gap-1">
        <Plus className="w-4 h-4" /> Nuevo
      </Button>
    </div>
  );
}
