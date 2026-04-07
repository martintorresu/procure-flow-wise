import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Package, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("carlos@procurement.cl");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(email, password)) {
      navigate("/");
    } else {
      setError("Credenciales inválidas. Use un email de la lista de demo.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary p-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary rounded-xl flex items-center justify-center">
            <Package className="w-9 h-9 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Procurement Insight</h1>
          <p className="text-sm text-muted-foreground">Gestión de Procesos de Compra Industrial</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-danger text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            <Button type="submit" className="w-full">Iniciar Sesión</Button>
          </form>
          <div className="mt-6 p-3 rounded-lg bg-muted">
            <p className="text-xs font-medium text-muted-foreground mb-2">Usuarios demo:</p>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>carlos@procurement.cl — Admin</p>
              <p>maria@procurement.cl — Compras</p>
              <p>juan@procurement.cl — Ingeniería</p>
              <p>pedro@procurement.cl — Planificación</p>
              <p>lucia@procurement.cl — Logística</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
