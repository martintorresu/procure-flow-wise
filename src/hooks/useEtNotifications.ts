import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/**
 * Suscripción Realtime a cambios de estado en et_forms.
 * Notifica:
 *  - A Programación / Admin cuando un ET pasa a "en_revision".
 *  - A Ingeniería / Admin cuando un ET pasa a "aprobado" o vuelve a "borrador" (rechazado).
 */
export function useEtNotifications() {
  const { user, isAuthenticated } = useAuth();
  const previousStatuses = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const role = user.role;

    const channel = supabase
      .channel("et-forms-notifications")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "et_forms" },
        async (payload) => {
          const newRow = payload.new as {
            id: string;
            status: string;
            process_id: string;
            submitted_by: string | null;
            approved_by: string | null;
          };
          const oldRow = payload.old as { status?: string; id?: string };

          // Evitar duplicados (algunos eventos pueden repetirse)
          const lastSeen = previousStatuses.current.get(newRow.id);
          if (lastSeen === newRow.status) return;
          previousStatuses.current.set(newRow.id, newRow.status);

          // Ignorar si no hubo cambio real de estado
          if (oldRow.status === newRow.status) return;

          // Buscar el PdC para mostrar contexto
          const { data: process } = await supabase
            .from("purchase_processes")
            .select("pdc_number, name")
            .eq("id", newRow.process_id)
            .maybeSingle();

          const label = process
            ? `${process.pdc_number} — ${process.name}`
            : "Proceso de compra";

          // No notificar al actor que disparó el cambio
          const actorId =
            newRow.status === "aprobado"
              ? newRow.approved_by
              : newRow.status === "en_revision"
                ? newRow.submitted_by
                : null;
          if (actorId && actorId === user.id) return;

          // ➜ Para Programación / Admin: ET enviado a revisión
          if (
            newRow.status === "en_revision" &&
            (role === "programacion" || role === "admin")
          ) {
            toast.info("Nuevo ET para revisar", {
              description: `${label} fue enviado a Programación.`,
              duration: 8000,
            });
          }

          // ➜ Para Ingeniería / Admin: ET aprobado
          if (
            newRow.status === "aprobado" &&
            (role === "ingenieria" || role === "admin")
          ) {
            toast.success("ET aprobado", {
              description: `${label} fue aprobado por Programación.`,
              duration: 8000,
            });
          }

          // ➜ Para Ingeniería / Admin: ET rechazado (vuelve a borrador desde revisión)
          if (
            newRow.status === "borrador" &&
            oldRow.status === "en_revision" &&
            (role === "ingenieria" || role === "admin")
          ) {
            toast.warning("ET rechazado", {
              description: `${label} fue devuelto a borrador. Revisa el historial para ver el motivo.`,
              duration: 10000,
            });
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isAuthenticated, user]);
}
