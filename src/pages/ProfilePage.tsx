import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";
import { PositionSelect } from "@/components/PositionSelect";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useMyProfile, useUpdateProfileContact, useUpdateDefaultPosition, isValidE164,
} from "@/hooks/useTenantUsers";
import {
  useNotificationPreferences, useUpsertNotificationPreferences, DEFAULT_PREFS,
} from "@/hooks/useNotificationPreferences";

const SEVERITY_OPTIONS = [
  { value: "low", label: "Baja" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
  { value: "critical", label: "Crítica" },
];

export default function ProfilePage() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useMyProfile(user?.id);
  const update = useUpdateProfileContact();
  const updatePosition = useUpdateDefaultPosition();
  const [phone, setPhone] = useState("");
  const [rut, setRut] = useState("");
  const [waEnabled, setWaEnabled] = useState(true);
  const [positionId, setPositionId] = useState<string | null>(null);

  // Preferencias de notificación (capa adicional sobre profile_contacts)
  const { data: prefs } = useNotificationPreferences(user?.id);
  const upsertPrefs = useUpsertNotificationPreferences(user?.id, user?.tenantId);
  const [emailEnabled, setEmailEnabled] = useState(DEFAULT_PREFS.channel_email);
  const [whatsappEnabled, setWhatsappEnabled] = useState(DEFAULT_PREFS.channel_whatsapp);
  const [minSevEmail, setMinSevEmail] = useState(DEFAULT_PREFS.min_severity_email);
  const [minSevWa, setMinSevWa] = useState(DEFAULT_PREFS.min_severity_whatsapp);
  const [quietEnabled, setQuietEnabled] = useState(DEFAULT_PREFS.quiet_enabled);
  const [quietStart, setQuietStart] = useState(DEFAULT_PREFS.quiet_start ?? "22:00");
  const [quietEnd, setQuietEnd] = useState(DEFAULT_PREFS.quiet_end ?? "07:00");
  const [emailGrouping, setEmailGrouping] = useState<string>(DEFAULT_PREFS.email_grouping);

  useEffect(() => {
    if (profile) {
      setPhone(profile.phone ?? "");
      setRut(profile.rut ?? "");
      setWaEnabled(profile.whatsapp_notifications_enabled);
      setPositionId(profile.default_position_id ?? null);
    }
  }, [profile]);

  useEffect(() => {
    if (prefs) {
      setEmailEnabled(prefs.channel_email);
      setWhatsappEnabled(prefs.channel_whatsapp);
      setMinSevEmail(prefs.min_severity_email);
      setMinSevWa(prefs.min_severity_whatsapp);
      setQuietEnabled(prefs.quiet_enabled);
      setQuietStart(prefs.quiet_start?.slice(0, 5) ?? "22:00");
      setQuietEnd(prefs.quiet_end?.slice(0, 5) ?? "07:00");
      setEmailGrouping(prefs.email_grouping);
    }
  }, [prefs]);

  const savePrefs = async () => {
    try {
      await upsertPrefs.mutateAsync({
        channel_inapp: true,
        channel_email: emailEnabled,
        channel_whatsapp: whatsappEnabled,
        quiet_enabled: quietEnabled,
        quiet_start: quietEnabled ? quietStart : (quietStart || "22:00"),
        quiet_end: quietEnabled ? quietEnd : (quietEnd || "07:00"),
        email_grouping: (emailGrouping as "immediate" | "daily_digest"),
        min_severity_email: minSevEmail,
        min_severity_whatsapp: minSevWa,
      });
      toast.success("Preferencias de notificación guardadas");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };


  const save = async () => {
    if (phone.trim() !== "" && !isValidE164(phone)) {
      toast.error("Teléfono inválido. Usa formato E.164: +56912345678");
      return;
    }
    try {
      await update.mutateAsync({
        id: user!.id,
        phone: phone.trim() || null,
        rut: rut.trim() || null,
        whatsapp_notifications_enabled: waEnabled,
      });
      await updatePosition.mutateAsync({ id: user!.id, default_position_id: positionId });
      toast.success("Perfil actualizado");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };


  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <SEO title="Mi perfil" description="Datos de contacto y preferencias de notificación." path="/profile" />
      <div>
        <h1 className="text-2xl font-bold">Mi perfil</h1>
        <p className="text-sm text-muted-foreground">Datos de contacto y preferencias de notificación.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Datos de contacto</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={profile?.full_name ?? ""} disabled />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={profile?.email ?? ""} disabled />
              </div>
              <div className="space-y-2">
                <Label>Teléfono (formato E.164)</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+56912345678" />
                <p className="text-[11px] text-muted-foreground">Incluye el código de país, sin espacios ni guiones.</p>
              </div>
              <div className="space-y-2">
                <Label>RUT / Identificador fiscal</Label>
                <Input value={rut} onChange={(e) => setRut(e.target.value)} placeholder="12.345.678-9" />
              </div>
              <div className="space-y-2">
                <PositionSelect
                  id="default-position"
                  label="Cargo por defecto"
                  value={positionId}
                  onChange={setPositionId}
                />
                <p className="text-[11px] text-muted-foreground">
                  Describe qué haces; se propone al sumarte a un proceso. No define tus permisos.
                </p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Switch checked={waEnabled} onCheckedChange={setWaEnabled} />
                <span className="text-sm">Recibir alertas por WhatsApp</span>
              </div>
              <Button onClick={save} disabled={update.isPending || updatePosition.isPending}>
                {update.isPending || updatePosition.isPending ? "Guardando…" : "Guardar cambios"}
              </Button>
            </>

          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preferencias de notificación</CardTitle>
          <p className="text-sm text-muted-foreground">Configura cómo y cuándo recibes alertas.</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Canales */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Canales activos</Label>
            <div className="flex items-center gap-3">
              <Switch checked disabled />
              <span className="text-sm">In-app (siempre activo)</span>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
              <span className="text-sm">Email</span>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={whatsappEnabled} onCheckedChange={setWhatsappEnabled} />
              <span className="text-sm">WhatsApp</span>
            </div>
          </div>

          {/* Severidad mínima por canal */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Severidad mínima por canal</Label>
            <p className="text-[11px] text-muted-foreground">
              Solo recibirás notificaciones de esta severidad o superior.
            </p>
            {emailEnabled && (
              <div className="flex items-center gap-3">
                <span className="text-sm w-24">Email:</span>
                <Select value={minSevEmail} onValueChange={setMinSevEmail}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEVERITY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {whatsappEnabled && (
              <div className="flex items-center gap-3">
                <span className="text-sm w-24">WhatsApp:</span>
                <Select value={minSevWa} onValueChange={setMinSevWa}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEVERITY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Horario de silencio */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Switch checked={quietEnabled} onCheckedChange={setQuietEnabled} />
              <span className="text-sm font-medium">Horario de silencio</span>
            </div>
            {quietEnabled && (
              <div className="flex items-center gap-3">
                <Input
                  type="time"
                  value={quietStart}
                  onChange={(e) => setQuietStart(e.target.value)}
                  className="w-32"
                />
                <span className="text-sm">a</span>
                <Input
                  type="time"
                  value={quietEnd}
                  onChange={(e) => setQuietEnd(e.target.value)}
                  className="w-32"
                />
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Durante el horario de silencio, las alertas se acumulan y se entregan al terminar el período.
            </p>
          </div>

          {/* Agrupación email */}
          {emailEnabled && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Agrupación de emails</Label>
              <Select value={emailGrouping} onValueChange={setEmailGrouping}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Inmediata</SelectItem>
                  <SelectItem value="daily_digest">Resumen diario</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <Button onClick={savePrefs} disabled={upsertPrefs.isPending}>
            {upsertPrefs.isPending ? "Guardando…" : "Guardar preferencias"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
