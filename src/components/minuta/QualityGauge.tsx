import { qualityColor } from "@/lib/minutaQuality";

interface Props {
  score: number;
  threshold?: number;
  size?: number;
}

/** Gauge circular con el puntaje de calidad de la minuta. */
export function QualityGauge({ score, threshold, size = 120 }: Props) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = qualityColor(clamped);
  const reached = typeof threshold === "number" && clamped >= threshold;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        width={size}
        height={size}
        role="img"
        aria-label={`Calidad de la minuta: ${clamped}%`}
        className={`-rotate-90 transition-all duration-500 ${reached ? "drop-shadow-[0_0_10px_hsl(var(--success)/0.55)]" : ""}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          stroke={color}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * clamped) / 100}
          style={{ transition: "stroke-dashoffset 500ms ease, stroke 500ms ease" }}
        />
      </svg>

      <div className="-mt-[calc(50%+0.5rem)] mb-[calc(50%-1rem)] flex flex-col items-center pointer-events-none">
        <span className="text-2xl font-bold tabular-nums" style={{ color }}>
          {clamped}%
        </span>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Calidad</span>
      </div>
      {typeof threshold === "number" && (
        <p className="text-xs text-muted-foreground">Mínimo requerido: {threshold}%</p>
      )}
    </div>
  );
}
