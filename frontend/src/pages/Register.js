import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/App';
import { authAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Zap, User, Mail, Lock, Megaphone, Palette, Heart } from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('fan');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.register({ name, email, password, role, referral_code: referralCode });
      login(res.data.token, res.data.user);
      toast.success('Cuenta creada exitosamente');
      if (role === 'advertiser') navigate('/advertiser');
      else if (role === 'creator') navigate('/creator');
      else navigate('/fan');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al registrarse');
    }
    setLoading(false);
  };

  const roles = [
    { value: 'advertiser', label: 'Anunciante', desc: 'Promociona productos y crea campañas', icon: Megaphone, color: 'text-primary' },
    { value: 'creator', label: 'Creador', desc: 'Monetiza tu contenido e influencia', icon: Palette, color: 'text-[hsl(199,78%,48%)]' },
    { value: 'fan', label: 'Fan', desc: 'Explora y suscríbete a creadores', icon: Heart, color: 'text-[hsl(0,72%,52%)]' },
  ];

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
          <h2 className="text-3xl font-semibold mb-4" style={{fontFamily:'Space Grotesk'}}>Únete a la comunidad</h2>
          <p className="text-muted-foreground">Crea tu cuenta y comienza a conectar con marcas, creadores y fans en un ecosistema seguro y transparente.</p>
        </div>
      </div>
      
      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-border/50">
          <CardHeader className="text-center">
            <div className="lg:hidden flex items-center justify-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg" style={{fontFamily:'Space Grotesk'}}>Family Fans Mony</span>
            </div>
            <CardTitle style={{fontFamily:'Space Grotesk'}}>Crear Cuenta</CardTitle>
            <CardDescription>Selecciona tu rol y completa tus datos</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Role Selection */}
              <div className="space-y-2">
                <Label>Tipo de Cuenta</Label>
                <RadioGroup value={role} onValueChange={(val) => setRole(val)} className="grid grid-cols-1 gap-2">
                  {roles.map(r => (
                    <label key={r.value} htmlFor={`role-${r.value}`} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${role === r.value ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-border'}`}>
                      <RadioGroupItem value={r.value} id={`role-${r.value}`} data-testid={`register-role-radio-${r.value}`} />
                      <r.icon className={`w-5 h-5 ${r.color}`} />
                      <div>
                        <p className="text-sm font-medium">{r.label}</p>
                        <p className="text-xs text-muted-foreground">{r.desc}</p>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">Nombre Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input id="name" placeholder="Tu nombre" value={name} onChange={e => setName(e.target.value)} className="pl-10" required data-testid="register-name-input" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" required data-testid="register-email-input" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input id="password" type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} className="pl-10" required data-testid="register-password-input" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="referral">Codigo de Referido (opcional)</Label>
                <Input id="referral" placeholder="Ej: AB12CD34" value={referralCode} onChange={e => setReferralCode(e.target.value)} data-testid="register-referral-input" />
              </div>
              <Button type="submit" className="w-full" disabled={loading} data-testid="register-form-submit-button">
                {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
              </Button>
            </form>
            <p className="text-sm text-muted-foreground text-center mt-4">
              ¿Ya tienes cuenta? <Link to="/login" className="text-primary hover:underline">Inicia sesión</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
