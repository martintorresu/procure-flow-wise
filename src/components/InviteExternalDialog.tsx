import { useState } from "react";
import { toast } from "sonner";
import { Copy, UserPlus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  EXTERNAL_ROLE_LABELS,
  sendInviteEmail,
  useInviteParticipant,
  useProcessParticipants,
  useResendInvite,
  type ExternalRole,
} from "@/hooks/useProcessParticipants";

interface Props {
  processId: string;
  tenantId: string;
  invitedBy: string;
}

export function InviteExternalDialog({ processId, tenantId, invitedBy }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [externalRole, setExternalRole] = useState<ExternalRole>("proveedor");
  const [permission, setPermission] = useState<"view" | "comment">("view");
  const [link, setLink] = useState("");
  const [resendingId, setResendingId] = useState<string | null>(null);

  const invite = useInviteParticipant();
  const resend = useResendInvite();
  const { data: participants = [] } = useProcessParticipants(open ? processId : undefined);

  const handleInvite = () => {
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      toast.error("Email inválido");
      return;
    }
    invite.mutate(
      { processId, tenantId, email: clean, externalCompany: company, externalRole, permissionLevel: permission, invitedBy },
      {
        onSuccess: async (participant) => {
          setLink(`${window.location.origin}/signup?invited_email=${encodeURIComponent(clean)}`);
          setEmail("");
          setCompany("");
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
          <UserPlus className="w-4 h-4" /> Invitar externo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Invitar participante externo</DialogTitle>
          <DialogDescription>
            La persona invitada podrá ver únicamente este proceso, sin acceso al resto de la información.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
              <Label>Rol externo</Label>
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

          {participants.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground">Participantes invitados</p>
              {participants.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate">{p.email}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {EXTERNAL_ROLE_LABELS[p.external_role]}{p.external_company ? ` · ${p.external_company}` : ""}
                    </p>
                  </div>
                  <Badge variant={p.status === "accepted" ? "default" : "outline"} className="text-xs shrink-0">
                    {p.status === "accepted" ? "Aceptada" : "Pendiente"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
