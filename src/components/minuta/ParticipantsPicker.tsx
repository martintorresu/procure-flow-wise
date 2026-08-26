import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { UserPlus, X } from "lucide-react";
import { useTenantUsers } from "@/hooks/useTenantUsers";

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

/** Selector de participantes: usuarios del tenant + invitados externos. */
export function ParticipantsPicker({ value, onChange }: Props) {
  const { data: users = [] } = useTenantUsers();
  const [search, setSearch] = useState("");
  const [guestOpen, setGuestOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestCompany, setGuestCompany] = useState("");

  const selectedIds = new Set(value.map((p) => p.userId).filter(Boolean) as string[]);

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

  const addUser = (u: { id: string; full_name: string | null; email: string; area: string | null }) => {
    onChange([
      ...value,
      {
        key: u.id,
        userId: u.id,
        name: u.full_name ?? u.email,
        role: u.area,
        email: u.email,
        company: null,
        isGuest: false,
      },
    ]);
    setSearch("");
  };

  const addGuest = () => {
    if (guestName.trim().length < 2 || !guestEmail.trim()) return;
    onChange([
      ...value,
      {
        key: `guest-${guestEmail.trim().toLowerCase()}`,
        userId: null,
        name: guestName.trim(),
        role: guestCompany.trim() || "Invitado externo",
        email: guestEmail.trim(),
        company: guestCompany.trim() || null,
        isGuest: true,
      },
    ]);
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
              {u.area && <span className="text-muted-foreground"> — {u.area}</span>}
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
