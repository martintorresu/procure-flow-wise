import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, UserPlus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PositionSelect } from "@/components/PositionSelect";
import { usePositions } from "@/hooks/usePositions";
import { useTenantUsers } from "@/hooks/useTenantUsers";
import {
  EXTERNAL_ROLE_LABELS,
  sendInviteEmail,
  useAddTeamMember,
  useInviteParticipant,
  useProcessParticipants,
  useResendInvite,
  type ExternalRole,
} from "@/hooks/useProcessParticipants";

interface Props {
  processId: string;
  tenantId: string;
  invitedBy: string;
  /** Tipo del proceso: solo ordena las sugerencias de cargo. */
  processType?: string | null;
}

export function InviteExternalDialog({ processId, tenantId, invitedBy, processType }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [externalRole, setExternalRole] = useState<ExternalRole>("proveedor");
  const [permission, setPermission] = useState<"view" | "comment">("view");
  const [externalPositionId, setExternalPositionId] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const [resendingId, setResendingId] = useState<string | null>(null);

  const [memberId, setMemberId] = useState<string>("");
  const [memberPositionId, setMemberPositionId] = useState<string | null>(null);

  const invite = useInviteParticipant();
  const addMember = useAddTeamMember();
  const resend = useResendInvite();
  const { data: participants = [] } = useProcessParticipants(open ? processId : undefined);
  const { data: users = [] } = useTenantUsers();
  const { data: positions = [] } = usePositions();

  const positionName = (id: string | null) => positions.find((p) => p.id === id)?.name ?? null;

  const alreadyIn = useMemo(
    () => new Set(participants.map((p) => p.user_id).filter(Boolean) as string[]),
    [participants],
  );
  const availableUsers = users.filter((u) => !alreadyIn.has(u.id));

  const selectMember = (id: string) => {
    setMemberId(id);
    // Propone el cargo por defecto del perfil; se puede cambiar para este proceso.
    setMemberPositionId(users.find((u) => u.id === id)?.default_position_id ?? null);
  };

  const handleAddMember = () => {
    const u = users.find((x) => x.id === memberId);
    if (!u) {
      toast.error("Elige un miembro del equipo");
      return;
    }
    addMember.mutate(
      { processId, tenantId, userId: u.id, email: u.email, invitedBy, positionId: memberPositionId },
      {
        onSuccess: () => {
          toast.success(`${u.full_name ?? u.email} agregado al proceso`);
          setMemberId("");
          setMemberPositionId(null);
        },
        onError: (e) => toast.error((e as Error).message),
      },
    );
  };

  const handleInvite = () => {
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      toast.error("Email inválido");
      return;
    }
    invite.mutate(
      {
        processId, tenantId, email: clean, externalCompany: company,
        externalRole, permissionLevel: permission, invitedBy, positionId: externalPositionId,
      },
      {
        onSuccess: async (participant) => {
          setLink(`${window.location.origin}/signup?invited_email=${encodeURIComponent(clean)}`);
          setEmail("");
          setCompany("");
          setExternalPositionId(null);
          // Envío best-effort: la invitación ya quedó guardada.
          const res = await sendInviteEmail(participant.id);
          if (res.ok) {
            toast.success("Invitación creada y email enviado.");
          } else {
            toast.warning("Invitación creada, pero el email no pudo enviarse. Comparte el link manualmente.");
            console.error("send-invite-email:", res.error);
          }
        },
        onError: (e) => toast.error((e as Error).message),
      },
    );
  };

  const handleResend = (participantId: string) => {
    setResendingId(participantId);
    resend.mutate(participantId, {
      onSuccess: () => toast.success("Invitación reenviada"),
      onError: (e) => toast.error(`No se pudo reenviar: ${(e as Error).message}`),
      onSettled: () => setResendingId(null),
    });
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(link);
    toast.success("Link copiado");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UserPlus className="w-4 h-4" /> Participantes
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Participantes del proceso</DialogTitle>
          <DialogDescription>
            Suma a un miembro del equipo o invita a alguien externo. El cargo es descriptivo y opcional:
            los permisos los define el nivel de acceso.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="team">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="team">Miembro del equipo</TabsTrigger>
            <TabsTrigger value="external">Invitado externo</TabsTrigger>
          </TabsList>

          <TabsContent value="team" className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label>Persona</Label>
              <Select value={memberId} onValueChange={selectMember}>
                <SelectTrigger><SelectValue placeholder="Selecciona un usuario del equipo" /></SelectTrigger>
                <SelectContent>
                  {availableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name ?? u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableUsers.length === 0 && (
                <p className="text-xs text-muted-foreground">Todos los usuarios ya participan en este proceso.</p>
              )}
            </div>
            <PositionSelect
              value={memberPositionId}
              onChange={setMemberPositionId}
              processType={processType}
            />
            <Button onClick={handleAddMember} disabled={!memberId || addMember.isPending} className="w-full">
              {addMember.isPending ? "Agregando…" : "Agregar al proceso"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Su acceso lo define su nivel de acceso global; sumarlo aquí no lo cambia.
            </p>
          </TabsContent>

          <TabsContent value="external" className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="inv-email">Email</Label>
              <Input id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="persona@empresa.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-company">Empresa (opcional)</Label>
              <Input id="inv-company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Constructora XYZ" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo de parte</Label>
                <Select value={externalRole} onValueChange={(v) => setExternalRole(v as ExternalRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(EXTERNAL_ROLE_LABELS) as ExternalRole[]).map((r) => (
                      <SelectItem key={r} value={r}>{EXTERNAL_ROLE_LABELS[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Nivel de permiso</Label>
                <Select value={permission} onValueChange={(v) => setPermission(v as "view" | "comment")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">Ver</SelectItem>
                    <SelectItem value="comment">Ver + Comentar</SelectItem>
                    <SelectItem value="upload" disabled>Subir documentos (próximamente)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <PositionSelect
              value={externalPositionId}
              onChange={setExternalPositionId}
              processType={processType}
            />

            <Button onClick={handleInvite} disabled={invite.isPending} className="w-full">
              {invite.isPending ? "Creando…" : "Crear invitación"}
            </Button>

            {link && (
              <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
                <p className="text-xs text-muted-foreground">Link de acceso — compártelo manualmente:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate text-xs bg-background rounded px-2 py-1.5 border">{link}</code>
                  <Button size="sm" variant="outline" className="gap-1" onClick={copyLink}>
                    <Copy className="w-3.5 h-3.5" /> Copiar
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {participants.length > 0 && (
          <div className="space-y-2 pt-3 border-t">
            <p className="text-xs font-medium text-muted-foreground">Participantes del proceso</p>
            {participants.map((p) => {
              const displayName = p.user_id
                ? (users.find((u) => u.id === p.user_id)?.full_name ?? p.email ?? "Usuario")
                : (p.email ?? "Invitado");
              const cargo = positionName(p.position_id);
              const meta = [cargo, EXTERNAL_ROLE_LABELS[p.external_role], p.external_company]
                .filter(Boolean)
                .join(" · ");
              return (
                <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{meta}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {p.status === "pending" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 h-7 px-2 text-xs"
                        disabled={resendingId === p.id}
                        onClick={() => handleResend(p.id)}
                      >
                        <Send className="w-3.5 h-3.5" />
                        {resendingId === p.id ? "Enviando…" : "Reenviar"}
                      </Button>
                    )}
                    <Badge variant={p.status === "accepted" ? "default" : "outline"} className="text-xs">
                      {p.status === "accepted" ? "Aceptada" : "Pendiente"}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
