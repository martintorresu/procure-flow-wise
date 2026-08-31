import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { UserPlus, X, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useTenantUsers } from "@/hooks/useTenantUsers";
import { usePositions } from "@/hooks/usePositions";
import { useExternalContacts, useSaveExternalContact, type ExternalContact } from "@/hooks/useExternalContacts";

export interface MinutaParticipant {
  key: string;
  userId: string | null;
  name: string;
  role: string | null;
  email: string | null;
  company: string | null;
  isGuest: boolean;
  locked?: boolean;
}

interface Props {
  value: MinutaParticipant[];
  onChange: (next: MinutaParticipant[]) => void;
}

/** Selector de participantes: usuarios del tenant + invitados externos persistidos. */
export function ParticipantsPicker({ value, onChange }: Props) {
  const { data: users = [] } = useTenantUsers();
  const { data: positions = [] } = usePositions();
  const { data: externalContacts = [] } = useExternalContacts();
  const saveContact = useSaveExternalContact();
  const positionName = (id?: string | null) => positions.find((p) => p.id === id)?.name ?? null;
  const [search, setSearch] = useState("");
  const [guestOpen, setGuestOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestCompany, setGuestCompany] = useState("");

  const selectedIds = new Set(value.map((p) => p.userId).filter(Boolean) as string[]);
  const selectedEmails = new Set(
    value.map((p) => p.email?.trim().toLowerCase()).filter(Boolean) as string[],
  );

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return users
      .filter((u) => !selectedIds.has(u.id))
      .filter((u) =>
        `${u.full_name ?? ""} ${u.email} ${u.area ?? ""}`.toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [search, users, value]);

  const contactResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    return externalContacts
      .filter((c) => !selectedEmails.has(c.email.trim().toLowerCase()))
      .filter((c) =>
        !q ? true : `${c.full_name} ${c.email} ${c.company ?? ""}`.toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [search, externalContacts, value]);

  const addUser = (u: { id: string; full_name: string | null; email: string; area: string | null; default_position_id?: string | null }) => {
    onChange([
      ...value,
      {
        key: u.id,
        userId: u.id,
        name: u.full_name ?? u.email,
        role: positionName(u.default_position_id) ?? u.area,
        email: u.email,
        company: null,
        isGuest: false,
      },
    ]);
    setSearch("");
  };

  const addContact = (c: ExternalContact) => {
    onChange([
      ...value,
      {
        key: `guest-${c.email.trim().toLowerCase()}`,
        userId: null,
        name: c.full_name,
        role: c.company || "Invitado externo",
        email: c.email,
        company: c.company,
        isGuest: true,
      },
    ]);
    setSearch("");
  };

  const addGuest = async () => {
    if (guestName.trim().length < 2 || !guestEmail.trim()) return;
    const email = guestEmail.trim().toLowerCase();
    const company = guestCompany.trim() || null;
    onChange([
      ...value,
      {
        key: `guest-${email}`,
        userId: null,
        name: guestName.trim(),
        role: company || "Invitado externo",
        email,
        company,
        isGuest: true,
      },
    ]);
    try {
      await saveContact.mutateAsync({ fullName: guestName.trim(), email, company });
      toast.success("Contacto externo guardado para futuras minutas");
    } catch {
      toast.error("El participante se agregó, pero no se pudo guardar en contactos externos.");
    }
    setGuestName("");
    setGuestEmail("");
    setGuestCompany("");
    setGuestOpen(false);
  };

  const remove = (key: string) => onChange(value.filter((p) => p.key !== key));


  return (
    <div className="space-y-2">
      <Label htmlFor="minuta-participants">
        Participantes <span className="text-danger">*</span>
      </Label>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((p) => (
            <span
              key={p.key}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${
                p.isGuest
                  ? "border border-dashed border-primary/60 bg-primary/5 text-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              <span className="font-medium">{p.name}</span>
              {p.role && <span className="text-muted-foreground">— {p.role}</span>}
              {!p.locked && (
                <button
                  type="button"
                  onClick={() => remove(p.key)}
                  aria-label={`Quitar ${p.name}`}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-danger/10 hover:text-danger"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      <Input
        id="minuta-participants"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nombre, correo o área…"
      />
      {results.length > 0 && (
        <div className="rounded-md border border-border divide-y divide-border overflow-hidden">
          {results.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => addUser(u)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
            >
              <span className="font-medium">{u.full_name ?? u.email}</span>
              {(positionName(u.default_position_id) ?? u.area) && (
                <span className="text-muted-foreground"> — {positionName(u.default_position_id) ?? u.area}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {!guestOpen ? (
        <Button type="button" variant="outline" size="sm" onClick={() => setGuestOpen(true)}>
          <UserPlus className="w-4 h-4 mr-1" /> Invitado externo
        </Button>
      ) : (
        <div className="rounded-md border border-dashed border-border p-3 space-y-2">
          <Input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Nombre completo *"
          />
          <Input
            type="email"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            placeholder="Email *"
          />
          <Input
            value={guestCompany}
            onChange={(e) => setGuestCompany(e.target.value)}
            placeholder="Empresa (opcional)"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={addGuest}
              disabled={guestName.trim().length < 2 || !guestEmail.trim()}
            >
              Agregar
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setGuestOpen(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {value.length === 0 && (
        <p className="text-xs text-muted-foreground">Agrega al menos un participante.</p>
      )}
    </div>
  );
}
