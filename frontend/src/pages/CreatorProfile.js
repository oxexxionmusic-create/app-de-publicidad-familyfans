// src/pages/CreatorProfile.js
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/App';
import { exploreAPI, subscriptionsAPI, premiumContentAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  ArrowLeft, Users, Eye, MapPin, Zap, Crown, ExternalLink,
  Lock, Image as ImageIcon, Video, FileText, Loader2
} from 'lucide-react';

// Componente para mostrar contenido multimedia con seguridad Cloudinary
function MediaItem({ item, isSubscribed, isOwner }) {
  const [signedUrl, setSignedUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Determinar si el contenido debe mostrarse con blur
  const shouldBlur = !isSubscribed && !isOwner && item.is_premium;

  useEffect(() => {
    const fetchSignedUrl = async () => {
      if (!item.cloudinary_public_id) {
        // Si no hay public_id, usar la URL directa (legado)
        setSignedUrl(item.media_url || item.url);
        setLoading(false);
        return;
      }

      try {
        const res = await premiumContentAPI.getSignedUrl(
          item.cloudinary_public_id,
          item.type === 'video' ? 'video' : 'image'
        );
        setSignedUrl(res.data.url);
      } catch (err) {
        console.error('Error obteniendo URL firmada:', err);
        setError('No se pudo cargar el contenido');
        // Fallback a URL original si existe
        setSignedUrl(item.media_url || item.url);
      } finally {
        setLoading(false);
      }
    };

    fetchSignedUrl();
  }, [item]);

  if (loading) {
    return (
      <div className="w-full h-48 bg-muted animate-pulse rounded-lg flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !signedUrl) {
    return (
      <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  const mediaType = item.type || item.content_type;

  return (
    <div className="relative rounded-lg overflow-hidden bg-black/5">
      {mediaType === 'image' || mediaType === 'photo' ? (
        <img
          src={signedUrl}
          alt={item.title || 'Contenido'}
          className={`w-full h-48 object-cover transition-all ${shouldBlur ? 'blur-xl' : ''}`}
        />
      ) : mediaType === 'video' ? (
        <video
          src={signedUrl}
          controls={!shouldBlur}
          className={`w-full h-48 object-cover ${shouldBlur ? 'blur-xl' : ''}`}
        />
      ) : mediaType === 'audio' ? (
        <audio src={signedUrl} controls className="w-full mt-2" />
      ) : (
        <div className="p-4 bg-muted rounded-lg">
          <FileText className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-sm">{item.description || 'Contenido sin vista previa'}</p>
        </div>
      )}

      {shouldBlur && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white p-4">
          <Lock className="w-8 h-8 mb-2" />
          <p className="text-sm font-medium text-center">Contenido Premium</p>
          <p className="text-xs text-center mt-1">Suscríbete para ver este contenido</p>
        </div>
      )}
    </div>
  );
}

export default function CreatorProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const [creator, setCreator] = useState(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [subLoading, setSubLoading] = useState(false);

  // Determinar si el usuario actual es el dueño del perfil (creador)
  const isOwner = user?.sub === id;

  useEffect(() => {
    const fetchCreator = async () => {
      try {
        const res = await exploreAPI.creator(id);
        setCreator(res.data);
      } catch (err) {
        console.error('Error cargando creador:', err);
        toast.error('No se pudo cargar el perfil del creador');
      } finally {
        setLoading(false);
      }
    };

    fetchCreator();
  }, [id]);

  // Cargar contenido premium si el usuario está autenticado (para verificar suscripción)
  useEffect(() => {
    const fetchContent = async () => {
      if (!user) {
        // Usuario no autenticado: no puede ver contenido premium
        setContent([]);
        return;
      }

      setContentLoading(true);
      try {
        // Intentar obtener contenido (el backend verificará suscripción)
        const res = await premiumContentAPI.get(id);
        setContent(res.data);
        setSubscribed(true); // Si devuelve contenido, asumimos que está suscrito (el backend filtraría)
      } catch (err) {
        // Si falla por no estar suscrito, mostramos contenido vacío
        setContent([]);
        setSubscribed(false);
      } finally {
        setContentLoading(false);
      }
    };

    if (creator) {
      fetchContent();
    }
  }, [creator, user, id]);

  const handleSubscribe = async () => {
    if (!user) {
      toast.error('Debes iniciar sesión para suscribirte');
      return;
    }

    setSubLoading(true);
    try {
      const fd = new FormData();
      fd.append('creator_id', id);
      await subscriptionsAPI.subscribe(fd);
      toast.success('¡Suscripción exitosa!');
      setSubscribed(true);
      // Recargar contenido premium
      const res = await premiumContentAPI.get(id);
      setContent(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al suscribirse');
    } finally {
      setSubLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="page-container">
          <div className="animate-pulse space-y-6">
            <div className="h-40 bg-muted rounded-xl" />
            <div className="h-20 bg-muted rounded-xl" />
            <div className="grid grid-cols-3 gap-4">
              <div className="h-32 bg-muted rounded-xl" />
              <div className="h-32 bg-muted rounded-xl" />
              <div className="h-32 bg-muted rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Creador no encontrado</p>
          <Link to="/explorar">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-1" /> Volver a Explorar
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const cp = creator.creator_profile || {};
  const socialLinks = cp.social_links || {};
  const hasSocialLinks = Object.values(socialLinks).some(v => v);

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
          <Link to="/explorar">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" /> Volver
            </Button>
          </Link>
        </div>
      </nav>

      <div className="page-container">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna principal: perfil y contenido */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tarjeta de perfil */}
            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-5">
                  {creator.profile_photo_url ? (
                    <img
                      src={creator.profile_photo_url}
                      alt={creator.name}
                      className="w-20 h-20 rounded-full object-cover border-2 border-primary/20"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl">
                      {creator.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h1 className="text-2xl font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
                        {creator.name}
                      </h1>
                      {creator.is_top10 && (
                        <span className="flex items-center gap-1 text-xs bg-[hsl(43,96%,56%)]/20 text-[hsl(43,96%,56%)] px-2 py-0.5 rounded-full">
                          <Crown className="w-3 h-3" /> Top 10
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground capitalize">
                      {cp.niche || 'Creador'} · {cp.content_type || ''} · {cp.region || ''}
                    </p>
                    {cp.bio && <p className="text-sm mt-3">{cp.bio}</p>}
                    <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" /> {(cp.followers || 0).toLocaleString()} seguidores
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" /> {(cp.avg_views || 0).toLocaleString()} vistas prom.
                      </span>
                      {cp.region && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" /> {cp.region}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Redes sociales */}
            {hasSocialLinks && (
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-base" style={{ fontFamily: 'Space Grotesk' }}>
                    Redes Sociales
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {Object.entries(socialLinks).map(([platform, url]) => {
                    if (!url) return null;
                    return (
                      <a
                        key={platform}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[hsl(var(--surface-2))] text-sm hover:bg-[hsl(var(--surface-3))] transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        {platform.charAt(0).toUpperCase() + platform.slice(1)}
                      </a>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Contenido Premium */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base" style={{ fontFamily: 'Space Grotesk' }}>
                  Contenido Premium
                </CardTitle>
              </CardHeader>
              <CardContent>
                {contentLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[1, 2].map(i => (
                      <Skeleton key={i} className="h-48 rounded-lg" />
                    ))}
                  </div>
                ) : content.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {content.map(item => (
                      <div key={item.id} className="space-y-2">
                        <MediaItem
                          item={item}
                          isSubscribed={subscribed}
                          isOwner={isOwner}
                        />
                        <div>
                          <p className="font-medium text-sm">{item.title || 'Sin título'}</p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    {subscribed ? (
                      <p className="text-muted-foreground text-sm">
                        Este creador aún no ha publicado contenido premium.
                      </p>
                    ) : isOwner ? (
                      <div>
                        <p className="text-muted-foreground text-sm mb-3">
                          Aún no has publicado contenido premium.
                        </p>
                        <Link to="/creator">
                          <Button variant="outline" size="sm">
                            Ir al panel de creador
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div>
                        <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground text-sm">
                          Suscríbete para ver el contenido premium de {creator.name}.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar: suscripción e información */}
          <div className="space-y-6">
            {creator.subscription_plan?.active && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-5 text-center">
                  <Crown className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-1" style={{ fontFamily: 'Space Grotesk' }}>
                    Suscripción Premium
                  </h3>
                  <p className="text-2xl font-bold text-primary tabular-nums mb-1">
                    ${creator.subscription_plan.price}
                    <span className="text-sm font-normal text-muted-foreground">/mes</span>
                  </p>
                  {creator.subscription_plan.description && (
                    <p className="text-xs text-muted-foreground mb-3">
                      {creator.subscription_plan.description}
                    </p>
                  )}
                  {isOwner ? (
                    <div className="status-badge-approved inline-block">Tu plan</div>
                  ) : subscribed ? (
                    <div className="status-badge-approved inline-block">Suscrito</div>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={handleSubscribe}
                      disabled={subLoading}
                    >
                      {subLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Procesando...
                        </>
                      ) : (
                        'Suscribirme'
                      )}
                    </Button>
                  )}
                  {!subscribed && !isOwner && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
                      <Lock className="w-3 h-3" /> Accede a contenido exclusivo
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <Card className="border-border/50">
              <CardContent className="p-5">
                <h3 className="font-semibold mb-3 text-sm" style={{ fontFamily: 'Space Grotesk' }}>
                  Información
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nivel</span>
                    <span className="capitalize">{cp.creator_level || 'Estándar'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Género</span>
                    <span className="capitalize">{creator.gender || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">País</span>
                    <span>{creator.country || 'N/A'}</span>
                  </div>
                  {creator.referral_code && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Código de referido</span>
                      <span className="font-mono text-xs">{creator.referral_code}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
