import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/App';
import { exploreAPI, subscriptionsAPI, premiumContentAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Users, Eye, MapPin, Zap, Crown, ExternalLink, Lock, Image, Video, FileText } from 'lucide-react';

export default function CreatorProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const [creator, setCreator] = useState(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState([]);
  const [subscribed, setSubscribed] = useState(false);
  const [subLoading, setSubLoading] = useState(false);

  useEffect(() => {
    exploreAPI.creator(id).then(res => {
      setCreator(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
    // Try to load premium content
    if (user) {
      premiumContentAPI.get(id).then(res => { setContent(res.data); setSubscribed(true); }).catch(() => {});
    }
  }, [id, user]);

  const handleSubscribe = async () => {
    if (!user) { toast.error('Debes iniciar sesión para suscribirte'); return; }
    setSubLoading(true);
    try {
      const fd = new FormData();
      fd.append('creator_id', id);
      await subscriptionsAPI.subscribe(fd);
      toast.success('Suscripción exitosa');
      setSubscribed(true);
      const res = await premiumContentAPI.get(id);
      setContent(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al suscribirse');
    }
    setSubLoading(false);
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!creator) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Creador no encontrado</p></div>;

  const cp = creator.creator_profile || {};
  const socialLinks = cp.social_links || {};

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center"><Zap className="w-5 h-5 text-primary-foreground" /></div>
            <span className="font-semibold text-lg" style={{fontFamily:'Space Grotesk'}}>Family Fans Mony</span>
          </Link>
          <Link to="/explorar"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Volver</Button></Link>
        </div>
      </nav>

      <div className="page-container">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-5">
                  <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl">
                    {creator.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h1 className="text-2xl font-semibold" style={{fontFamily:'Space Grotesk'}}>{creator.name}</h1>
                      {creator.is_top10 && <span className="flex items-center gap-1 text-xs bg-[hsl(43,96%,56%)]/20 text-[hsl(43,96%,56%)] px-2 py-0.5 rounded-full"><Crown className="w-3 h-3" /> Top 10</span>}
                    </div>
                    <p className="text-sm text-muted-foreground capitalize">{cp.niche || 'Creador'} · {cp.content_type || ''} · {cp.region || ''}</p>
                    {cp.bio && <p className="text-sm mt-3">{cp.bio}</p>}
                    <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {(cp.followers || 0).toLocaleString()} seguidores</span>
                      <span className="flex items-center gap-1"><Eye className="w-4 h-4" /> {(cp.avg_views || 0).toLocaleString()} vistas prom.</span>
                      {cp.region && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {cp.region}</span>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Social Links */}
            {Object.values(socialLinks).some(v => v) && (
              <Card className="border-border/50">
                <CardHeader><CardTitle className="text-base" style={{fontFamily:'Space Grotesk'}}>Redes Sociales</CardTitle></CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {Object.entries(socialLinks).filter(([,v]) => v).map(([k,v]) => (
                    <a key={k} href={v} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[hsl(var(--surface-2))] text-sm hover:bg-[hsl(var(--surface-3))] transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" /> {k}
                    </a>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Premium Content */}
            {subscribed && content.length > 0 && (
              <Card className="border-border/50">
                <CardHeader><CardTitle className="text-base" style={{fontFamily:'Space Grotesk'}}>Contenido Premium</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {content.map(c => (
                    <div key={c.id} className="p-4 rounded-lg bg-[hsl(var(--surface-2))]">
                      <div className="flex items-center gap-2 mb-1">
                        {c.content_type === 'photo' ? <Image className="w-4 h-4 text-primary" /> : c.content_type === 'video' ? <Video className="w-4 h-4 text-primary" /> : <FileText className="w-4 h-4 text-primary" />}
                        <p className="font-medium text-sm">{c.title || 'Sin título'}</p>
                      </div>
                      {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                      {c.media_url && <a href={c.media_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 inline-block">Ver contenido</a>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {creator.subscription_plan?.active && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-5 text-center">
                  <Crown className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-1" style={{fontFamily:'Space Grotesk'}}>Suscripción Premium</h3>
                  <p className="text-2xl font-bold text-primary tabular-nums mb-1">${creator.subscription_plan.price}<span className="text-sm font-normal text-muted-foreground">/mes</span></p>
                  {creator.subscription_plan.description && <p className="text-xs text-muted-foreground mb-3">{creator.subscription_plan.description}</p>}
                  {subscribed ? (
                    <div className="status-badge-approved inline-block">Suscrito</div>
                  ) : (
                    <Button className="w-full" onClick={handleSubscribe} disabled={subLoading}>
                      {subLoading ? 'Procesando...' : 'Suscribirme'}
                    </Button>
                  )}
                  {!subscribed && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
                      <Lock className="w-3 h-3" /> Accede a contenido exclusivo
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
            <Card className="border-border/50">
              <CardContent className="p-5">
                <h3 className="font-semibold mb-3 text-sm" style={{fontFamily:'Space Grotesk'}}>Información</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Nivel</span><span className="capitalize">{cp.creator_level || 'Estándar'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Género</span><span className="capitalize">{creator.gender || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">País</span><span>{creator.country || 'N/A'}</span></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
