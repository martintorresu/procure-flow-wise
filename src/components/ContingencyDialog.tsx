import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GitBranch, PauseCircle, Split } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCreateContingency } from "@/hooks/useProcessContingencies";
import { CONTINGENCY_MODE_DESCRIPTIONS, CONTINGENCY_MODE_LABELS, type ContingencyMode } from "@/lib/contingencies";
import type { Process } from "@/types/process";

/** Diálogo para bifurcar un proceso por contingencia (crea el sub-proceso hijo). */
export function ContingencyDialog({ process, createdBy }: { process: Process; createdBy: string }) {
  const navigate = useNavigate();
  const create = useCreateContingency();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [mode, setMode] = useState<ContingencyMode>("pause_and_attend");
  const [title, setTitle] = useState(`Contingencia: ${process.title}`);

  const submit = () => {
    if (!reason.trim()) {
      toast.error("Describe la razón de la contingencia.");
      return;
    }
    create.mutate(
      {
        parentProcessId: process.id,
        executionMode: mode,
        reason: reason.trim(),
        title: title.trim() || `Contingencia: ${process.title}`,
        createdBy,
      },
      {
        onSuccess: (res) => {
          toast.success(`Bifurcación creada (${res.childNumber})`);
          setOpen(false);
          setReason("");
          navigate(`/procesos/${res.childProcessId}`);
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  };

  const options: { value: ContingencyMode; icon: typeof PauseCircle; dot: string }[] = [
    { value: "pause_and_attend", icon: PauseCircle, dot: "text-amber-600 dark:text-amber-400" },
    { value: "parallel_effort", icon: Split, dot: "text-blue-600 dark:text-blue-400" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <GitBranch className="w-4 h-4" /> Bifurcar por Contingencia
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bifurcar por contingencia</DialogTitle>
          <DialogDescription>
            Se creará un sub-proceso vinculado a {process.process_number} para atender el imprevisto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cont-reason">Razón de contingencia</Label>
            <Textarea
              id="cont-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe el imprevisto que motiva la bifurcación…"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Modo de ejecución</Label>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as ContingencyMode)} className="gap-2">
              <TooltipProvider>
                {options.map((o) => (
                  <Tooltip key={o.value}>
                    <TooltipTrigger asChild>
                      <label
                        htmlFor={`mode-${o.value}`}
                        className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                          mode === o.value ? "border-accent bg-accent/5" : "hover:bg-muted/50"
                        }`}
                      >
                        <RadioGroupItem value={o.value} id={`mode-${o.value}`} className="mt-1" />
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <o.icon className={`w-4 h-4 ${o.dot}`} />
                            {CONTINGENCY_MODE_LABELS[o.value]}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {CONTINGENCY_MODE_DESCRIPTIONS[o.value]}
                          </p>
                        </div>
                      </label>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs text-xs">
                      {o.value === "pause_and_attend"
                        ? "El proceso padre queda congelado: no se puede editar ni avanzar de etapa hasta completar la contingencia."
                        : "El proceso padre sigue su curso normal y la contingencia avanza en paralelo como tarea vinculada."}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cont-title">Título del proceso de contingencia</Label>
            <Input id="cont-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              Hereda el proyecto ({process.project_name}) del proceso padre.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending ? "Creando…" : "Crear Bifurcación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
