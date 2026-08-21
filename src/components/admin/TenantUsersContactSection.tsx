import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users } from "lucide-react";
import { toast } from "sonner";
import { useTenantUsers, useUpdateProfileContact, isValidE164, type TenantUser } from "@/hooks/useTenantUsers";

export function TenantUsersContactSection() {
  const { data: users = [], isLoading } = useTenantUsers();
  const update = useUpdateProfileContact();
  const [draft, setDraft] = useState<Record<string, TenantUser>>({});

  useEffect(() => {
    if (users.length) {
      setDraft((prev) => {
        const next = { ...prev };
        users.forEach((u) => { if (!next[u.id]) next[u.id] = u; });
        return next;
      });
    }
  }, [users]);

  const setField = <K extends keyof TenantUser>(id: string, k: K, v: TenantUser[K]) =>
    setDraft((p) => ({ ...p, [id]: { ...p[id], [k]: v } }));

  const isDirty = (u: TenantUser) => {
    const d = draft[u.id];
    return !!d && (
      (d.phone ?? "") !== (u.phone ?? "") ||
      (d.rut ?? "") !== (u.rut ?? "") ||
      d.whatsapp_notifications_enabled !== u.whatsapp_notifications_enabled
    );
  };

  const save = async () => {
    const changed = users.filter(isDirty);
    const invalid = changed.find((u) => {
      const phone = (draft[u.id].phone ?? "").trim();
      return phone !== "" && !isValidE164(phone);
    });
    if (invalid) {
      toast.error(`Teléfono inválido para ${invalid.email}. Usa formato E.164 (+56912345678).`);
      return;
    }
    try {
      await Promise.all(changed.map((u) => {
        const d = draft[u.id];
        return update.mutateAsync({
          id: u.id,
          phone: (d.phone ?? "").trim() || null,
          rut: (d.rut ?? "").trim() || null,
          whatsapp_notifications_enabled: d.whatsapp_notifications_enabled,
        });
      }));
      toast.success(`${changed.length} usuario(s) actualizado(s)`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const dirty = users.some(isDirty);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4" /> Contacto de usuarios (teléfono y RUT)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          El teléfono debe estar en formato E.164: <code className="bg-muted px-1 rounded">+56912345678</code>.
          Es obligatorio para recibir alertas por WhatsApp.
        </p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando usuarios…</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead className="w-[180px]">Teléfono (E.164)</TableHead>
                  <TableHead className="w-[150px]">RUT</TableHead>
                  <TableHead className="w-[90px]">WhatsApp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const d = draft[u.id] ?? u;
                  const phone = d.phone ?? "";
                  const bad = phone.trim() !== "" && !isValidE164(phone);
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="text-xs">
                        <div className="font-medium">{u.full_name ?? "—"}</div>
                        <div className="text-muted-foreground">{u.email}</div>
                      </TableCell>
                      <TableCell>
                        <Input
                          className={`h-8 ${bad ? "border-destructive" : ""}`}
                          value={phone}
                          placeholder="+56912345678"
                          onChange={(e) => setField(u.id, "phone", e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8"
                          value={d.rut ?? ""}
                          placeholder="12.345.678-9"
                          onChange={(e) => setField(u.id, "rut", e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={d.whatsapp_notifications_enabled}
                          onCheckedChange={(v) => setField(u.id, "whatsapp_notifications_enabled", v)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Button onClick={save} disabled={!dirty || update.isPending}>
              {update.isPending ? "Guardando…" : "Guardar cambios"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
