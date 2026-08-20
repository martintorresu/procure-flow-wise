import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle2, Link2 } from "lucide-react";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import inhrLogo from "@/assets/inhr-logo.png";
import { SEO } from "@/components/SEO";

const schema = z.object({
  fullName: z.string().trim().min(2, "Nombre muy corto").max(100),
  email: z.string().trim().email("Email inválido").max(255),
  area: z.string().trim().min(2, "Indica tu área").max(60),
  password: z.string().min(8, "Mínimo 8 caracteres").max(72),
});

const AREAS = ["Ingeniería", "Operaciones", "Mantención", "Proyectos", "Compras", "Programación", "Logística"];

export default function SignUpPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [area, setArea] = useState("Ingeniería");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const parsed = schema.safeParse({ fullName, email, area, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const result = await signUp(parsed.data.email, parsed.data.password, parsed.data.fullName, parsed.data.area);
    setSubmitting(false);
    if (result.ok) {
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2200);
    } else {
      setError(result.message ?? "No se pudo crear la cuenta");
    }
  };

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-[#0A1628] flex items-center justify-center p-4 sm:p-6">
      <SEO title="Crear cuenta" description="Regístrate en Pro.Curem Flow para gestionar procesos de compra industriales con tu equipo." path="/signup" />
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A1628] via-[#1A3BB5]/30 to-[#0A1628]" aria-hidden />
      <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-[#2255E8]/40 blur-[120px]" aria-hidden />
      <div className="absolute -bottom-40 -right-32 w-[520px] h-[520px] rounded-full bg-[#4ABFB5]/30 blur-[140px]" aria-hidden />

      <a href="https://www.inovahr.com" target="_blank" rel="noopener noreferrer" className="absolute top-5 right-5 sm:top-6 sm:right-6 z-10">
        <div className="rounded-xl bg-white/90 backdrop-blur-md px-2.5 py-1.5 sm:px-4 sm:py-3 shadow-lg border border-white/40">
          <img src={inhrLogo} alt="InHR" className="h-9 sm:h-16 w-auto object-contain" />
        </div>
      </a>

      <div className="relative w-full max-w-[440px]">
        <div className="rounded-2xl border border-white/30 bg-[#0A1628]/85 backdrop-blur-2xl p-6 sm:p-8 shadow-[0_30px_80px_-15px_rgba(0,0,0,0.8)] animate-fade-in-up">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2255E8] via-[#4ABFB5] to-[#E8934A] p-[1.5px] mb-3">
              <div className="w-full h-full rounded-[14px] bg-[#0A1628]/80 flex items-center justify-center">
                <Link2 className="w-5 h-5 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white">Crear cuenta</h1>
            <p className="mt-1 text-sm text-[#7AD9CF]">Pro.Curem Flow <span className="font-semibold text-white">by InHR</span></p>
          </div>

          {success ? (
            <div className="flex flex-col items-center gap-3 text-center py-6">
              <CheckCircle2 className="w-12 h-12 text-[#4ABFB5]" />
              <p className="text-white font-semibold">¡Cuenta creada!</p>
              <p className="text-sm text-white/70">Revisa tu correo para confirmar y luego inicia sesión.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/90 uppercase tracking-wider">Nombre completo</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Juan Pérez"
                  className="w-full h-11 px-4 rounded-xl bg-[#0A1628]/80 border border-white/20 text-white text-sm placeholder:text-[#94A3B8] outline-none focus:border-[#4ABFB5] focus:ring-2 focus:ring-[#4ABFB5]/40"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/90 uppercase tracking-wider">Correo</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@empresa.com"
                  className="w-full h-11 px-4 rounded-xl bg-[#0A1628]/80 border border-white/20 text-white text-sm placeholder:text-[#94A3B8] outline-none focus:border-[#4ABFB5] focus:ring-2 focus:ring-[#4ABFB5]/40"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/90 uppercase tracking-wider">Área</label>
                <select
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-[#0A1628]/80 border border-white/20 text-white text-sm outline-none focus:border-[#4ABFB5] focus:ring-2 focus:ring-[#4ABFB5]/40"
                >
                  {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/90 uppercase tracking-wider">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full h-11 px-4 rounded-xl bg-[#0A1628]/80 border border-white/20 text-white text-sm placeholder:text-[#94A3B8] outline-none focus:border-[#4ABFB5] focus:ring-2 focus:ring-[#4ABFB5]/40"
                />
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
                className="w-full h-11 mt-2 rounded-xl bg-gradient-to-r from-[#1A3BB5] to-[#2255E8] text-white font-bold text-sm tracking-wide hover:shadow-[0_10px_30px_-5px_rgba(34,85,232,0.7)] transition-all disabled:opacity-60"
              >
                {submitting ? "Creando…" : "Crear cuenta"}
              </button>

              <div className="text-center pt-1">
                <Link to="/login" className="text-sm font-medium text-[#7AD9CF] hover:text-white">
                  ¿Ya tienes cuenta? Inicia sesión
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
