import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProcess, useUpdateProcess } from "@/hooks/useProcesses";
import { SEO } from "@/components/SEO";
import { ProjectSelect } from "@/components/ProjectSelect";
import { PROCESS_TYPES, PROCESS_TYPE_LABELS, type ProcessType } from "@/lib/processTypes";

export default function EditProcessPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const updateProcess = useUpdateProcess();
  const submitting = updateProcess.isPending;
  const isAdmin = user?.role === "admin";
  const { data: process, isLoading, isError } = useProcess(isAdmin ? id : undefined);
  const [processNumber, setProcessNumber] = useState<string>("");
  const [form, setForm] = useState({
    project_id: null as string | null,
    process_type: "compra" as ProcessType,
    name: "",
    description: "",
    responsible_name: "",
  });

  useEffect(() => {
    if (isError) toast.error("No se pudo cargar el proceso");
  }, [isError]);

  useEffect(() => {
    if (!process) return;
    setProcessNumber(process.process_number);
    setForm({
      project_id: process.project_id ?? null,
      process_type: (process.process_type ?? "compra") as ProcessType,
      name: process.title ?? "",
      description: process.description ?? "",
      responsible_name: process.current_owner === "—" ? "" : (process.current_owner ?? ""),
    });
  }, [process]);

  if (!isAdmin) {
    return (
      <Card className="max-w-xl mx-auto mt-10">
        <CardContent className="p-8 text-center space-y-3">
          <ShieldAlert className="w-10 h-10 mx-auto text-warning" />
          <h2 className="text-lg font-semibold">Acceso restringido</h2>
          <p className="text-sm text-muted-foreground">Solo el perfil Administrador puede editar procesos ya iniciados.</p>
          <Button variant="outline" onClick={() => navigate(-1)}>Volver</Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) return <div className="text-center py-20 text-muted-foreground">Cargando…</div>;

  const update = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.project_id || !form.name) {
      toast.error("Complete los campos obligatorios");
      return;
    }
    try {
      await updateProcess.mutateAsync({
        id: id!,
        patch: {
          name: form.name,
          project_id: form.project_id,
          process_type: form.process_type,
          description: form.description || null,
          responsible_name: form.responsible_name || null,
        },
      });
      toast.success("Proceso actualizado correctamente");
      navigate(`/procesos/${id}`);
    } catch (err) {
      toast.error(`Error al guardar: ${(err as Error).message}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <SEO title={processNumber ? `Editar Proceso ${processNumber}` : "Editar Proceso"} description="Actualiza los datos generales del proceso." />
      <div className="flex items-center gap-3">
        <Link to={`/procesos/${id}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Editar Proceso {processNumber}</h1>
          <p className="text-sm text-muted-foreground">Edición administrativa de un proceso ya iniciado</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Proyecto *</Label>
                <ProjectSelect
                  value={form.project_id}
                  onChange={(pid) => setForm((p) => ({ ...p, project_id: pid }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de proceso</Label>
                <Select value={form.process_type} onValueChange={(v) => update("process_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROCESS_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{PROCESS_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={form.name} onChange={(e) => update("name", e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={3} />
            </div>

            <div className="space-y-2">
              <Label>Responsable</Label>
              <Input value={form.responsible_name} onChange={(e) => update("responsible_name", e.target.value)} />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Guardando…" : "Guardar cambios"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(`/procesos/${id}`)}>Cancelar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
