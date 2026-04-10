import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/App';
import { authAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Zap, Mail, Lock } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authAPI.login({ email, password });
      login(res.data.token, res.data.user);
      toast.success('Sesión iniciada correctamente');
      // Redirect based on role
      const role = res.data.user.role;
      if (role === 'admin') navigate('/admin');
      else if (role === 'advertiser') navigate('/advertiser');
      else if (role === 'creator') navigate('/creator');
      else navigate('/fan');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al iniciar sesión');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-[hsl(var(--surface-2))] p-12">
        <div className="max-w-md">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-semibold" style={{fontFamily:'Space Grotesk'}}>Family Fans Mony</span>
          </div>
          <h2 className="text-3xl font-semibold mb-4" style={{fontFamily:'Space Grotesk'}}>Bienvenido de vuelta</h2>
          <p className="text-muted-foreground">Accede a tu panel para gestionar campañas, suscripciones y ganancias de forma segura.</p>
          <div className="mt-8 space-y-3">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-primary" />
              Pagos verificados manualmente
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-[hsl(199,78%,48%)]" />
              Rankings actualizados constantemente
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-[hsl(43,96%,56%)]" />
              Comisiones transparentes
            </div>
          </div>
        </div>
      </div>
      
      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-border/50">
          <CardHeader className="text-center">
            <div className="lg:hidden flex items-center justify-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg" style={{fontFamily:'Space Grotesk'}}>Family Fans Mony</span>
            </div>
            <CardTitle style={{fontFamily:'Space Grotesk'}}>Iniciar Sesión</CardTitle>
            <CardDescription>Ingresa tus credenciales para acceder</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" required data-testid="login-email-input" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input id="password" type="password" placeholder="Tu contraseña" value={password} onChange={e => setPassword(e.target.value)} className="pl-10" required data-testid="login-password-input" />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading} data-testid="login-form-submit-button">
                {loading ? 'Ingresando...' : 'Iniciar Sesión'}
              </Button>
            </form>
            <p className="text-sm text-muted-foreground text-center mt-4">
              ¿No tienes cuenta? <Link to="/register" className="text-primary hover:underline">Regístrate aquí</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
