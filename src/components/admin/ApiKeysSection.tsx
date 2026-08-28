import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Copy, KeyRound, Trash2 } from "lucide-react";
import { useApiKeys, useCreateApiKey, useDeleteApiKey, useToggleApiKey } from "@/hooks/useApiKeys";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;
const ENDPOINT = `https://${PROJECT_ID}.supabase.co/functions/v1/import-commitments`;

const SAMPLE_PAYLOAD = `{
  "api_key": "TU_API_KEY",
  "meeting_title": "Visita a obra — Torre B, piso 7",
  "meeting_date": "2026-08-20",
  "commitments": [
    {
      "text": "Reparar filtración en losa del piso 7 antes del hormigonado",
      "responsible": "Juan Pérez (jefe de obra)",
      "due_date": "2026-08-25",
      "priority": "alta",
      "process_reference": "PC-2024-0045"
    },
    {
      "text": "Enviar certificado de calidad del hormigón del lote 12",
      "responsible": "María Soto",
      "due_date": "2026-08-27",
      "priority": "media",
      "process_reference": "CT-2024-0012"
    }
  ]
}`;

function copy(text: string, label: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success(`${label} copiado`),
    () => toast.error("No se pudo copiar"),
  );
}

export function ApiKeysSection() {
  const { data: keys = [], isLoading } = useApiKeys();
  const createKey = useCreateApiKey();
  const toggleKey = useToggleApiKey();
  const deleteKey = useDeleteApiKey();
  const [name, setName] = useState("");
  const [plainKey, setPlainKey] = useState<string | null>(null);

  const handleCreate = async () => {
    try {
      const { plain } = await createKey.mutateAsync(name);
      setPlainKey(plain);
      setName("");
      toast.success("API key generada — cópiala ahora, no se vuelve a mostrar");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="w-4 h-4" /> Integraciones · API Keys
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
          <h3 className="text-sm font-semibold">Conecta tu agente de minutas</h3>
          <p className="text-sm text-muted-foreground">
            Configura tu agente GPT (o cualquier herramienta de transcripción) para enviar los
            compromisos detectados a este endpoint. Pro.Curem los vinculará automáticamente con los
            procesos y responsables correctos.
          </p>
          <p className="text-sm text-muted-foreground">
            Flujo típico: reunión de obra → transcripción o notas de voz → el agente extrae los
            acuerdos → POST al endpoint → compromisos con responsable, fecha y alertas dentro del
            proceso.
          </p>
        </div>

        <p className="text-sm text-muted-foreground">
          Genera claves para que un agente externo importe compromisos de reuniones. La clave se
          muestra una sola vez; en la base solo se guarda su huella cifrada.
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <Label htmlFor="apikey-name">Nombre de la clave</Label>
            <Input
              id="apikey-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Agente GPT de reuniones"
            />
          </div>
          <Button onClick={handleCreate} disabled={createKey.isPending}>
            Generar API key
          </Button>
        </div>

        {plainKey && (
          <div className="rounded-lg border border-warning/50 bg-warning/10 p-4 space-y-2">
            <p className="text-sm font-semibold">Copia esta clave ahora — no volverá a mostrarse</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs break-all bg-background rounded px-3 py-2 border">{plainKey}</code>
              <Button size="sm" variant="outline" onClick={() => copy(plainKey, "API key")}>
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setPlainKey(null)}>Ya la copié</Button>
          </div>
        )}

        <div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Prefijo</TableHead>
                <TableHead>Último uso</TableHead>
                <TableHead>Activa</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={5} className="text-muted-foreground">Cargando…</TableCell></TableRow>
              )}
              {!isLoading && keys.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-muted-foreground">Sin claves generadas.</TableCell></TableRow>
              )}
              {keys.map((k) => (
                <TableRow key={k.id}>
                  <TableCell className="font-medium">{k.name}</TableCell>
                  <TableCell><code className="text-xs">{k.key_prefix ?? "—"}…</code></TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {k.last_used_at ? new Date(k.last_used_at).toLocaleString("es-CL") : "Nunca"}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={k.enabled}
                      onCheckedChange={(v) => toggleKey.mutate({ id: k.id, enabled: v })}
                      aria-label="Activar clave"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteKey.mutate(k.id)}
                      aria-label="Eliminar clave"
                    >
                      <Trash2 className="w-4 h-4 text-danger" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="space-y-2">
          <Label>Endpoint</Label>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs break-all bg-muted rounded px-3 py-2">{ENDPOINT}</code>
            <Button size="sm" variant="outline" onClick={() => copy(ENDPOINT, "Endpoint")}>
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </div>
          <Label>Ejemplo de payload (POST · JSON)</Label>
          <div className="flex items-start gap-2">
            <pre className="flex-1 text-xs bg-muted rounded p-3 overflow-x-auto">{SAMPLE_PAYLOAD}</pre>
            <Button size="sm" variant="outline" onClick={() => copy(SAMPLE_PAYLOAD, "Payload")}>
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
