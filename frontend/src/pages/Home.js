// src/pages/Home.js
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/App';
import { exploreAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DollarSign, Users, Music, Trophy, ArrowRight, Shield, TrendingUp, Zap,
  Crown, MapPin, Eye
} from 'lucide-react';

export default function Home() {
  const { user } = useAuth();
  const [featuredCreators, setFeaturedCreators] = useState([]);
  const [loadingCreators, setLoadingCreators] = useState(true);

  useEffect(() => {
    const fetchFeaturedCreators = async () => {
      try {
        const res = await exploreAPI.creators();
        // Tomar los primeros 3 creadores con perfil completo como destacados
        const creatorsWithProfile = (res.data || [])
          .filter(c => c.creator_profile)
          .slice(0, 3);
        setFeaturedCreators(creatorsWithProfile);
      } catch (error) {
        console.error('Error cargando creadores destacados:', error);
      } finally {
        setLoadingCreators(false);
      }
    };

    fetchFeaturedCreators();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg" style={{ fontFamily: 'Space Grotesk' }}>
              Family Fans Mony
            </span>
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
                  <Button variant="outline" size="sm" data-testid="home-login-button">
                    Iniciar Sesión
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" data-testid="home-register-button">
                    Crear Cuenta
                  </Button>
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
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight mb-6" style={{ fontFamily: 'Space Grotesk' }}>
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

      {/* Creadores Destacados (NUEVA SECCIÓN) */}
      <section className="py-16 border-t border-border/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-semibold mb-3" style={{ fontFamily: 'Space Grotesk' }}>
              Creadores Destacados
            </h2>
            <p className="text-muted-foreground">
              Descubre algunos de los talentos que ya forman parte de nuestra comunidad
            </p>
          </div>

          {loadingCreators ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <Card key={i} className="border-border/50">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <Skeleton className="w-14 h-14 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-4">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : featuredCreators.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredCreators.map(c => {
                const cp = c.creator_profile || {};
                return (
                  <Link key={c.id} to={`/creador/${c.id}`}>
                    <Card className="border-border/50 card-hover h-full transition-all hover:shadow-md">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          {c.profile_photo_url ? (
                            <Avatar className="w-14 h-14 border-2 border-primary/20">
                              <AvatarImage src={c.profile_photo_url} alt={c.name} />
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {c.name?.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-lg">
                              {c.name?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold truncate">{c.name}</p>
                              {c.is_top10 && (
                                <span className="text-xs bg-[hsl(43,96%,56%)]/20 text-[hsl(43,96%,56%)] px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Crown className="w-3 h-3" /> Top 10
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground capitalize">
                              {cp.niche || 'Creador'} · {cp.content_type || ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" /> {(cp.followers || 0).toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" /> {(cp.avg_views || 0).toLocaleString()} prom
                          </span>
                          {cp.region && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" /> {cp.region}
                            </span>
                          )}
                        </div>
                        {c.subscription_plan?.active && (
                          <div className="mt-3 p-2 rounded-lg bg-primary/5 border border-primary/20 text-xs">
                            Suscripción Premium: <span className="font-semibold text-primary">${c.subscription_plan.price}/mes</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <Card className="border-border/50">
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Próximamente podrás ver creadores destacados aquí.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="text-center mt-8">
            <Link to="/explorar">
              <Button variant="outline" size="lg">
                Ver todos los creadores <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 border-t border-border/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-12" style={{ fontFamily: 'Space Grotesk' }}>
            Tres pilares, un ecosistema
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: DollarSign, title: 'Para Anunciantes', desc: 'Crea campañas segmentadas, paga solo por resultados aprobados. Depósitos verificados manualmente.', color: 'text-[hsl(174,72%,42%)]' },
              { icon: Users, title: 'Para Creadores', desc: 'Aplica a campañas, monetiza tu contenido con suscripciones premium y solicita financiamiento musical.', color: 'text-[hsl(199,78%,48%)]' },
              { icon: Music, title: 'Para Fans', desc: 'Descubre talentos, suscríbete a contenido exclusivo y gana micro-recompensas escuchando música.', color: 'text-[hsl(43,96%,56%)]' },
            ].map((f, i) => (
              <Card key={i} className="card-hover border-border/50 bg-card">
                <CardContent className="p-6">
                  <f.icon className={`w-10 h-10 mb-4 ${f.color}`} />
                  <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'Space Grotesk' }}>{f.title}</h3>
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
