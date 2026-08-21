import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, AlertCircle, Link2 } from "lucide-react";
import loginBg from "@/assets/login-bg.jpg";
import inhrLogo from "@/assets/inhr-logo.png";
import { useTenant } from "@/config/tenants";
import { SEO } from "@/components/SEO";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const tenant = useTenant();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const result = await login(email, password, tenant.slug);
    setSubmitting(false);
    if (result.ok) {
      const nextParam = new URLSearchParams(window.location.search).get("next");
      const safeNext = nextParam && /^\/(?!\/)/.test(nextParam) ? nextParam : null;
      navigate(safeNext ?? (tenant.slug === "default" ? "/" : `/t/${tenant.slug}`));
    } else {
      setError(result.message ?? "Credenciales inválidas.");
    }
  };

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-[#0A1628] flex items-center justify-center p-4 sm:p-6">
      <SEO title="Iniciar sesión" description="Accede a Pro.Curem Flow para gestionar tus procesos de compra industriales." path="/login" />
      {/* Background image — brighter, more vivid */}
      <div
        className="absolute inset-0 bg-cover bg-center scale-110 animate-bg-drift saturate-[1.35] brightness-[1.15] contrast-[1.05]"
        style={{ backgroundImage: `url(${loginBg})` }}
        aria-hidden
      />
      {/* Subtle color tint instead of heavy dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1A3BB5]/25 via-transparent to-[#4ABFB5]/20" aria-hidden />
      {/* Light vignette only on edges to keep center vivid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(10,22,40,0.45)_100%)]" aria-hidden />

      {/* Floating glow orbs — more vivid */}
      <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-[#2255E8]/55 blur-[120px] animate-orb-1" aria-hidden />
      <div className="absolute -bottom-40 -right-32 w-[520px] h-[520px] rounded-full bg-[#E8934A]/45 blur-[140px] animate-orb-2" aria-hidden />
      <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] rounded-full bg-[#4ABFB5]/45 blur-[100px] animate-orb-3" aria-hidden />

      {/* InHR logo top-right */}
      <a
        href="https://www.inovahr.com"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-5 right-5 sm:top-6 sm:right-6 z-10 group"
        aria-label="InovaHR"
      >
        <div className="rounded-xl bg-white/90 backdrop-blur-md px-2.5 py-1.5 sm:px-4 sm:py-3 shadow-lg border border-white/40 transition-all group-hover:bg-white group-hover:scale-105">
          <img src={inhrLogo} alt="InHR — Powered by InovaHR" className="h-9 sm:h-16 w-auto object-contain" />
        </div>
      </a>

      {/* Login card */}
      <div className="relative w-full max-w-[400px] sm:max-w-md">
        <div
          className="relative rounded-2xl sm:rounded-[24px] border border-white/30 bg-[#0A1628]/85 backdrop-blur-2xl p-5 sm:p-8 md:p-10 shadow-[0_30px_80px_-15px_rgba(0,0,0,0.8),0_0_0_1px_rgba(74,191,181,0.18)] ring-1 ring-white/15 animate-fade-in-up"
        >
          {/* Logo */}
          <div className="flex flex-col items-center text-center mb-5 sm:mb-7">
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#2255E8] via-[#4ABFB5] to-[#E8934A] p-[1.5px] mb-3 sm:mb-4 shadow-[0_8px_24px_rgba(34,85,232,0.4)]">
              <div className="w-full h-full rounded-[14px] bg-[#0A1628]/80 backdrop-blur-md flex items-center justify-center">
                <Link2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2.2} />
              </div>
            </div>
            <h1 className="text-[22px] sm:text-[28px] md:text-[32px] font-bold text-white tracking-tight leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
              {tenant.name}
            </h1>
            <p className="mt-1.5 text-[13px] sm:text-[15px] font-light text-[#7AD9CF]">
              by <span className="font-semibold text-white">InHR</span>
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-xs font-semibold text-white/90 uppercase tracking-wider">
                Correo
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@empresa.com"
                className="w-full h-11 sm:h-12 px-4 rounded-xl bg-[#0A1628]/80 border border-white/20 text-white text-[15px] sm:text-base placeholder:text-[#94A3B8] outline-none transition-all focus:border-[#4ABFB5] focus:ring-2 focus:ring-[#4ABFB5]/40 focus:bg-[#0A1628]/95"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-xs font-semibold text-white/90 uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 sm:h-12 px-4 pr-12 rounded-xl bg-[#0A1628]/80 border border-white/20 text-white text-[15px] sm:text-base placeholder:text-[#94A3B8] outline-none transition-all focus:border-[#4ABFB5] focus:ring-2 focus:ring-[#4ABFB5]/40 focus:bg-[#0A1628]/95"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-[#4ABFB5] transition-colors"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-[#FF8A8A] text-sm bg-[#FF8A8A]/10 border border-[#FF8A8A]/20 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="group relative w-full h-11 sm:h-12 mt-1 rounded-xl bg-gradient-to-r from-[#1A3BB5] to-[#2255E8] text-white font-bold text-sm tracking-wide overflow-hidden transition-all hover:shadow-[0_10px_30px_-5px_rgba(34,85,232,0.7)] hover:-translate-y-[1px] active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-[#2255E8] to-[#4ABFB5] opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative">{submitting ? "Ingresando…" : "Ingresar"}</span>
            </button>

            <div className="flex flex-col items-center gap-2">
              <Link to="/forgot-password" className="text-sm font-medium text-[#7AD9CF] hover:text-white transition-colors">
                ¿Olvidaste tu contraseña?
              </Link>
              <Link to="/signup" className="text-sm font-medium text-[#7AD9CF] hover:text-white transition-colors">
                ¿No tienes cuenta? Regístrate
              </Link>
            </div>
          </form>

          {/* Footer */}
          <p className="mt-4 sm:mt-6 text-center text-[10px] sm:text-[11px] text-white/60 tracking-wider">
            Powered by <span className="text-white/90 font-semibold">InHR</span>
          </p>
        </div>
      </div>
    </div>
  );
}
