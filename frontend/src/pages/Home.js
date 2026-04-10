import { Link } from 'react-router-dom';
import { useAuth } from '@/App';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, Users, Music, Trophy, ArrowRight, Shield, TrendingUp, Zap } from 'lucide-react';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg" style={{fontFamily:'Space Grotesk'}}>Family Fans Mony</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/explorar">
              <Button variant="ghost" size="sm">Explorar</Button>
            </Link>
            <Link to="/rankings">
              <Button variant="ghost" size="sm">Rankings</Button>
            </Link>
            {user ? (
              <Link to="/dashboard">
                <Button size="sm" data-testid="home-dashboard-button">Mi Panel</Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="outline" size="sm" data-testid="home-login-button">Iniciar Sesión</Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" data-testid="home-register-button">Crear Cuenta</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center relative">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight mb-6" style={{fontFamily:'Space Grotesk'}}>
            Conecta marcas con creadores.
            <br />
            <span className="text-primary">Pagos verificados. Crecimiento real.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            Campañas publicitarias, financiación musical, curadores de Spotify y suscripciones premium — todo con control administrativo y pagos seguros.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" className="gap-2 text-base px-8">
                Crear Cuenta <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/explorar">
              <Button size="lg" variant="outline" className="text-base px-8">
                Explorar Talentos
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 border-t border-border/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-12" style={{fontFamily:'Space Grotesk'}}>Tres pilares, un ecosistema</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: DollarSign, title: 'Para Anunciantes', desc: 'Crea campañas segmentadas, paga solo por resultados aprobados. Depósitos verificados manualmente.', color: 'text-[hsl(174,72%,42%)]' },
              { icon: Users, title: 'Para Creadores', desc: 'Aplica a campañas, monetiza tu contenido con suscripciones premium y solicita financiamiento musical.', color: 'text-[hsl(199,78%,48%)]' },
              { icon: Music, title: 'Para Fans', desc: 'Descubre talentos, suscríbete a contenido exclusivo y gana micro-recompensas escuchando música.', color: 'text-[hsl(43,96%,56%)]' },
            ].map((f, i) => (
              <Card key={i} className="card-hover border-border/50 bg-card">
                <CardContent className="p-6">
                  <f.icon className={`w-10 h-10 mb-4 ${f.color}`} />
                  <h3 className="text-lg font-semibold mb-2" style={{fontFamily:'Space Grotesk'}}>{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="py-16 border-t border-border/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Shield, label: 'Pagos Verificados', desc: 'Cada depósito revisado manualmente' },
              { icon: Trophy, label: 'Rankings Top 10', desc: 'Destaca entre los mejores' },
              { icon: TrendingUp, label: 'Comisión Transparente', desc: '25% estándar / 35% Top 10' },
              { icon: DollarSign, label: 'Retiros Seguros', desc: 'KYC obligatorio, mínimo $10' },
            ].map((t, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-[hsl(var(--surface-2))]">
                <t.icon className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">Family Fans Mony — Plataforma de Publicidad</p>
          <div className="flex gap-4">
            <Link to="/explorar" className="text-sm text-muted-foreground hover:text-foreground">Explorar</Link>
            <Link to="/rankings" className="text-sm text-muted-foreground hover:text-foreground">Rankings</Link>
            <Link to="/register" className="text-sm text-muted-foreground hover:text-foreground">Registrarse</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
