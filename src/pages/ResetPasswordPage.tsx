import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import loginBg from "@/assets/login-bg.jpg";
import inhrLogo from "@/assets/inhr-logo.png";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase auto-procesa el token de recuperación al cargar la página
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2000);
    }
  };

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-[#0A1628] flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-cover bg-center scale-110 saturate-[1.35] brightness-[1.15]"
        style={{ backgroundImage: `url(${loginBg})` }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#1A3BB5]/25 via-transparent to-[#4ABFB5]/20" aria-hidden />
      <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-[#2255E8]/55 blur-[120px]" aria-hidden />
      <div className="absolute -bottom-40 -right-32 w-[520px] h-[520px] rounded-full bg-[#E8934A]/45 blur-[140px]" aria-hidden />

      <a href="https://www.inovahr.com" target="_blank" rel="noopener noreferrer" className="absolute top-5 right-5 sm:top-6 sm:right-6 z-10">
        <div className="rounded-xl bg-white/90 backdrop-blur-md px-2.5 py-1.5 sm:px-4 sm:py-3 shadow-lg border border-white/40">
          <img src={inhrLogo} alt="InHR" className="h-9 sm:h-16 w-auto object-contain" />
        </div>
      </a>

      <div className="relative w-full max-w-[400px] sm:max-w-md">
        <div className="relative rounded-2xl sm:rounded-[24px] border border-white/30 bg-[#0A1628]/85 backdrop-blur-2xl p-5 sm:p-8 md:p-10 shadow-[0_30px_80px_-15px_rgba(0,0,0,0.8)] ring-1 ring-white/15">
          <div className="flex flex-col items-center text-center mb-5 sm:mb-7">
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#2255E8] via-[#4ABFB5] to-[#E8934A] p-[1.5px] mb-3 sm:mb-4">
              <div className="w-full h-full rounded-[14px] bg-[#0A1628]/80 flex items-center justify-center">
                <Link2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2.2} />
              </div>
            </div>
            <h1 className="text-[22px] sm:text-[28px] font-bold text-white tracking-tight">
              Nueva contraseña
            </h1>
            <p className="mt-1.5 text-[13px] sm:text-[14px] text-[#7AD9CF]">
              Define tu nueva contraseña
            </p>
          </div>

          {success ? (
            <div className="flex items-start gap-2 text-[#7AD9CF] text-sm bg-[#4ABFB5]/10 border border-[#4ABFB5]/30 rounded-lg px-3 py-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <span>Contraseña actualizada. Redirigiendo al login…</span>
            </div>
          ) : !ready ? (
            <p className="text-center text-white/70 text-sm">Validando enlace…</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-white/90 uppercase tracking-wider">Nueva contraseña</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-11 sm:h-12 px-4 pr-12 rounded-xl bg-[#0A1628]/80 border border-white/20 text-white text-[15px] placeholder:text-[#94A3B8] outline-none focus:border-[#4ABFB5] focus:ring-2 focus:ring-[#4ABFB5]/40"
                  />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-[#4ABFB5]">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-white/90 uppercase tracking-wider">Confirmar contraseña</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 sm:h-12 px-4 rounded-xl bg-[#0A1628]/80 border border-white/20 text-white text-[15px] placeholder:text-[#94A3B8] outline-none focus:border-[#4ABFB5] focus:ring-2 focus:ring-[#4ABFB5]/40"
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
                className="group relative w-full h-11 sm:h-12 mt-1 rounded-xl bg-gradient-to-r from-[#1A3BB5] to-[#2255E8] text-white font-bold text-sm tracking-wide overflow-hidden hover:shadow-[0_10px_30px_-5px_rgba(34,85,232,0.7)] hover:-translate-y-[1px] disabled:opacity-60"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-[#2255E8] to-[#4ABFB5] opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative">{submitting ? "Actualizando…" : "Actualizar contraseña"}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
