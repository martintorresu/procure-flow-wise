interface ProcuremMarkProps {
  className?: string;
}

/** Isotipo de pro·curem: punto verde con halos concéntricos y centro blanco. */
export function ProcuremMark({ className }: ProcuremMarkProps) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={className}>
      <circle cx="50" cy="50" r="46" fill="#00D95F" opacity="0.18" />
      <circle cx="50" cy="50" r="36" fill="#00D95F" opacity="0.28" />
      <circle cx="50" cy="50" r="24" fill="#00C853" />
      <circle cx="50" cy="50" r="10" fill="#FFFFFF" />
    </svg>
  );
}

/** Lockup completo: pro · punto verde · curem, en una línea centrada verticalmente. */
export function ProcuremLockup({ className }: ProcuremMarkProps) {
  return (
    <span
      className="inline-flex items-center lowercase text-white"
      style={{
        fontFamily: "'Poppins', 'Montserrat', system-ui, sans-serif",
        fontWeight: 300,
        letterSpacing: "0.4px",
        lineHeight: 1,
      }}
    >
      <span>pro</span>
      <ProcuremMark className="h-[0.62em] w-[0.62em] mx-[0.13em] shrink-0" />
      <span>curem</span>
    </span>
  );
}
