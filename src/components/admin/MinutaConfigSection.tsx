import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ClipboardCheck, Info } from "lucide-react";
import { toast } from "sonner";
import { useMinutaConfig, useSaveMinutaConfig } from "@/hooks/useMinutaConfig";

/** Configuración del "Estándar de Minuta" por tenant (solo admin). */
export function MinutaConfigSection() {
  const { qualityThreshold, maxDeliveryDays, isLoading } = useMinutaConfig();
  const save = useSaveMinutaConfig();
  const [threshold, setThreshold] = useState(qualityThreshold);
  const [maxDays, setMaxDays] = useState(maxDeliveryDays);

  useEffect(() => {
    if (!isLoading) {
      setThreshold(qualityThreshold);
      setMaxDays(maxDeliveryDays);
    }
  }, [isLoading, qualityThreshold, maxDeliveryDays]);

  const onSave = async () => {
    try {
      await save.mutateAsync({
        qualityThreshold: Math.max(0, Math.min(100, threshold)),
        maxDeliveryDays: Math.max(1, maxDays),
      });
      toast.success("Configuración de Minuta Activa guardada");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-primary" />
          Configuración Minuta Activa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="minuta-threshold">Umbral mínimo de calidad</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Porcentaje mínimo de calidad requerido para enviar compromisos desde Minuta Activa
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-4">
            <Slider
              id="minuta-threshold"
              value={[threshold]}
              min={0}
              max={100}
              step={5}
              onValueChange={(v) => setThreshold(v[0])}
              className="flex-1"
            />
            <Input
              type="number"
              min={0}
              max={100}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-20"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="minuta-maxdays">Máximo días de entrega</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Cantidad máxima de días permitidos para la fecha de entrega de compromisos, contados
                desde la fecha de la reunión
              </TooltipContent>
            </Tooltip>
          </div>
          <Input
            id="minuta-maxdays"
            type="number"
            min={1}
            value={maxDays}
            onChange={(e) => setMaxDays(Number(e.target.value))}
            className="w-32"
          />
        </div>

        <Button onClick={onSave} disabled={save.isPending}>
          {save.isPending ? "Guardando…" : "Guardar"}
        </Button>
      </CardContent>
    </Card>
  );
}
