import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, AlertCircle, Link2 } from "lucide-react";
import loginBg from "@/assets/login-bg.jpg";
import inhrLogo from "@/assets/inhr-logo.png";
import { useTenant } from "@/config/tenants";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const tenant = useTenant();
  const [email, setEmail] = useState("carlos@procurement.cl");
  const [password, setPassword] = useState("demo123");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(email, password)) {
      navigate("/");
    } else {
      setError("Credenciales inválidas. Use un email de la lista demo.");
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0A1628] flex items-center justify-center p-4">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center scale-110 animate-bg-drift"
        style={{ backgroundImage: `url(${loginBg})` }}
        aria-hidden
      />
      {/* Soft dark overlay for legibility */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A1628]/40 via-transparent to-[#1A3BB5]/30" aria-hidden />

      {/* Floating glow orbs for extra depth */}
      <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-[#2255E8]/30 blur-[120px] animate-orb-1" aria-hidden />
      <div className="absolute -bottom-40 -right-32 w-[520px] h-[520px] rounded-full bg-[#E8934A]/20 blur-[140px] animate-orb-2" aria-hidden />
      <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] rounded-full bg-[#4ABFB5]/20 blur-[100px] animate-orb-3" aria-hidden />

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
      <div className="relative w-full max-w-md">
        <div
          className="relative rounded-[24px] border border-white/15 bg-white/[0.08] backdrop-blur-2xl p-8 sm:p-10 shadow-[0_20px_70px_-15px_rgba(26,59,181,0.6)] animate-fade-in-up"
        >
          {/* Logo */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-[#2255E8] via-[#4ABFB5] to-[#E8934A] p-[1.5px] mb-5 shadow-[0_8px_24px_rgba(34,85,232,0.4)]">
              <div className="w-full h-full rounded-[14px] bg-[#0A1628]/60 backdrop-blur-md flex items-center justify-center">
                <Link2 className="w-6 h-6 text-white" strokeWidth={2.2} />
              </div>
            </div>
            <h1 className="text-[32px] font-bold text-white tracking-tight leading-none">
              {tenant.name}
            </h1>
            <p className="mt-2 text-[16px] font-light text-[#4ABFB5]">
              by <span className="font-medium">InHR</span>
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-xs font-medium text-white/70 uppercase tracking-wider">
                Correo
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@empresa.com"
                className="w-full h-12 px-4 rounded-xl bg-[#0A1628]/60 border border-white/10 text-white placeholder:text-[#7A8AA8] outline-none transition-all focus:border-[#4ABFB5] focus:ring-2 focus:ring-[#4ABFB5]/30 focus:bg-[#0A1628]/80"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-xs font-medium text-white/70 uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 px-4 pr-12 rounded-xl bg-[#0A1628]/60 border border-white/10 text-white placeholder:text-[#7A8AA8] outline-none transition-all focus:border-[#4ABFB5] focus:ring-2 focus:ring-[#4ABFB5]/30 focus:bg-[#0A1628]/80"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-[#4ABFB5] transition-colors"
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
              className="group relative w-full h-12 rounded-xl bg-gradient-to-r from-[#1A3BB5] to-[#2255E8] text-white font-bold text-sm tracking-wide overflow-hidden transition-all hover:shadow-[0_10px_30px_-5px_rgba(34,85,232,0.7)] hover:-translate-y-[1px] active:translate-y-0"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-[#2255E8] to-[#4ABFB5] opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative">Ingresar</span>
            </button>

            <div className="text-center">
              <a href="#" className="text-sm text-[#4ABFB5] hover:text-[#7AD9CF] transition-colors">
                ¿Olvidaste tu contraseña?
              </a>
            </div>
          </form>

          {/* Demo users hint */}
          <div className="mt-6 p-3 rounded-xl bg-[#0A1628]/40 border border-white/5">
            <p className="text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-1.5">Usuarios demo</p>
            <div className="text-[11px] text-white/60 space-y-0.5 leading-relaxed">
              <p>carlos@procurement.cl · admin</p>
              <p>maria@procurement.cl · compras</p>
              <p>juan@procurement.cl · ingeniería</p>
            </div>
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-[11px] text-white/30 tracking-wider">
            Powered by <span className="text-white/50 font-medium">InHR</span>
          </p>
        </div>
      </div>
    </div>
  );
}
