import { Card } from "@/components/ui/card";
import { ArrowRight, Bell, CalendarClock, Handshake, MessagesSquare, Workflow } from "lucide-react";

const STEPS = [
  { icon: MessagesSquare, title: "Reunión de obra", desc: "Notas de voz o transcripción" },
  { icon: Handshake, title: "Acuerdos y medidas", desc: "Compromisos detectados" },
  { icon: Workflow, title: "Proceso y etapa", desc: "Vinculado automáticamente" },
  { icon: CalendarClock, title: "Responsables y fechas", desc: "Con plazo de cumplimiento" },
  { icon: Bell, title: "Alertas y seguimiento", desc: "In-app y WhatsApp" },
];

export function MeetingToActionHero() {
  return (
    <Card className="relative overflow-hidden border-0 shadow-lg">
      <div className="absolute inset-0" style={{ background: "var(--sidebar-gradient)" }} />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-16 -left-10 w-56 h-56 rounded-full bg-sidebar-primary/20 blur-3xl" />
        <div className="absolute -bottom-20 right-0 w-64 h-64 rounded-full bg-sidebar-accent/30 blur-3xl" />
      </div>

      <div className="relative p-6 space-y-5">
        <div className="max-w-2xl">
          <h2 className="text-xl sm:text-2xl font-bold text-sidebar-foreground">
            De la conversación a la acción
          </h2>
          <p className="text-sm text-sidebar-foreground/75 mt-1">
            Lo acordado en reuniones de obra entra directamente al sistema de gestión. Sin minutas
            manuales, sin seguimiento en planillas.
          </p>
        </div>

        <ol className="flex flex-col lg:flex-row lg:items-stretch gap-2">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex items-center gap-2 lg:flex-1">
              <div className="flex-1 rounded-lg border border-sidebar-border/60 bg-sidebar-accent/25 backdrop-blur-sm p-3 h-full">
                <s.icon className="w-4 h-4 text-sidebar-primary mb-1.5" aria-hidden />
                <p className="text-xs font-semibold text-sidebar-foreground leading-tight">{s.title}</p>
                <p className="text-[11px] text-sidebar-foreground/65 leading-tight mt-0.5">{s.desc}</p>
              </div>
              {i < STEPS.length - 1 && (
                <ArrowRight
                  className="w-4 h-4 shrink-0 text-sidebar-primary rotate-90 lg:rotate-0"
                  aria-hidden
                />
              )}
            </li>
          ))}
        </ol>
      </div>
    </Card>
  );
}
