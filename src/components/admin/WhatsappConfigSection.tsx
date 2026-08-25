import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import {
  useWhatsappConfig, useSaveWhatsappConfig, useWhatsappLog, useSendWhatsappTest,
  type WhatsappConfigInput,
} from "@/hooks/useWhatsappConfig";
import { useTenantUsers } from "@/hooks/useTenantUsers";
import { useAuth } from "@/contexts/AuthContext";

const EMPTY: WhatsappConfigInput = {
  phone_number_id: "", access_token: "", business_account_id: "", enabled: false,
};

const SKIP_LABELS: Record<string, string> = {
  whatsapp_disabled: "WhatsApp está desactivado para esta organización.",
  user_opted_out: "El destinatario tiene desactivadas las notificaciones por WhatsApp.",
  no_phone: "El destinatario no tiene teléfono cargado.",
  invalid_phone: "El teléfono del destinatario no está en formato E.164.",
};

export function WhatsappConfigSection() {
  const { data: config, isLoading } = useWhatsappConfig();
  const { data: logs = [] } = useWhatsappLog(10);
  const { data: users = [] } = useTenantUsers();
  const { user } = useAuth();
  const save = useSaveWhatsappConfig();
  const sendTest = useSendWhatsappTest();
  const [form, setForm] = useState<WhatsappConfigInput>(EMPTY);
  const [targetUser, setTargetUser] = useState<string>("");
  const [testResult, setTestResult] = useState<string | null>(null);


  useEffect(() => {
    if (config) {
      setForm({
        phone_number_id: config.phone_number_id ?? "",
        access_token: config.access_token ?? "",
        business_account_id: config.business_account_id ?? "",
        enabled: config.enabled,
      });
    }
  }, [config]);

  const onSave = async () => {
    if (form.enabled && (!form.phone_number_id.trim() || !form.access_token.trim())) {
      toast.error("Para activar necesitas Phone Number ID y Access Token");
      return;
    }
    try {
      await save.mutateAsync({ id: config?.id, ...form });
      toast.success("Configuración de WhatsApp guardada");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const onTest = async () => {
    const tenantId = config?.tenant_id;
    if (!tenantId) {
      toast.error("Guarda primero la configuración de WhatsApp");
      return;
    }
    setTestResult(null);
    try {
      const res = await sendTest.mutateAsync({ tenantId, userId: targetUser || user?.id });
      if (res?.skipped) {
        const msg = SKIP_LABELS[res.skipped] ?? `Envío omitido: ${res.skipped}`;
        setTestResult(msg);
        toast.error(msg);
      } else if (res?.ok) {
        const msg = `Enviado a ${res.phone} · ID Meta: ${res.message_id ?? "—"}`;
        setTestResult(msg);
        toast.success("Mensaje de prueba enviado");
      } else if (res?.setup_required === "allow_recipient_in_meta") {
        const msg = res.error ?? "El destinatario debe agregarse a la lista de números permitidos de Meta WhatsApp.";
        setTestResult(msg);
        toast.error("Destinatario no habilitado en Meta");
      } else {
        const msg = res?.error ?? "Respuesta inesperada";
        setTestResult(msg);
        toast.error(msg);
      }
    } catch (e) {
      const msg = (e as Error).message;
      setTestResult(msg);
      toast.error(msg);
    }
  };



  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageCircle className="w-4 h-4" /> WhatsApp (Meta Business API)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Credenciales de la app de WhatsApp Business de Meta para tu organización. Las alertas se envían
          con el template aprobado <code className="bg-muted px-1 rounded">procurem_alerta</code> (idioma es).
        </p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando configuración…</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone Number ID</Label>
                <Input
                  value={form.phone_number_id}
                  onChange={(e) => setForm({ ...form, phone_number_id: e.target.value })}
                  placeholder="1234567890"
                />
              </div>
              <div className="space-y-2">
                <Label>Business Account ID</Label>
                <Input
                  value={form.business_account_id}
                  onChange={(e) => setForm({ ...form, business_account_id: e.target.value })}
                  placeholder="0987654321"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Access Token permanente</Label>
                <Input
                  type="password"
                  value={form.access_token}
                  onChange={(e) => setForm({ ...form, access_token: e.target.value })}
                  placeholder="EAAG…"
                />
                <p className="text-[11px] text-muted-foreground">
                  Si existe el secret <code className="bg-muted px-1 rounded">META_WHATSAPP_ACCESS_TOKEN</code> en
                  el backend, ese tiene prioridad sobre este valor.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
              <span className="text-sm">Notificaciones por WhatsApp activas</span>
            </div>
            <Button onClick={onSave} disabled={save.isPending}>
              {save.isPending ? "Guardando…" : "Guardar configuración"}
            </Button>

            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-sm font-medium">Prueba de envío</p>
              <p className="text-xs text-muted-foreground">
                Envía la plantilla <code className="bg-muted px-1 rounded">procurem_alerta</code> con datos de
                ejemplo al teléfono del destinatario. Requiere la configuración guardada y activa.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                <div className="space-y-2 flex-1">
                  <Label>Destinatario</Label>
                  <Select value={targetUser || user?.id || ""} onValueChange={setTargetUser}>
                    <SelectTrigger><SelectValue placeholder="Selecciona un usuario" /></SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {(u.full_name ?? u.email)}{u.phone ? ` · ${u.phone}` : " · sin teléfono"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" onClick={onTest} disabled={sendTest.isPending || !config?.id}>
                  <Send className="w-4 h-4 mr-2" />
                  {sendTest.isPending ? "Enviando…" : "Enviar mensaje de prueba"}
                </Button>
              </div>
              {testResult && (
                <p className="text-xs font-mono bg-muted rounded p-2 break-all">{testResult}</p>
              )}
            </div>



            {logs.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-medium mb-2">Últimos envíos</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Detalle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="text-xs">{new Date(l.created_at).toLocaleString("es-CL")}</TableCell>
                        <TableCell className="text-xs font-mono">{l.phone ?? "—"}</TableCell>
                        <TableCell className={`text-xs font-medium ${l.status === "sent" ? "text-success" : "text-destructive"}`}>
                          {l.status === "sent" ? "Enviado" : "Fallido"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate max-w-[240px]">
                          {l.error_message ?? l.meta_message_id ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
