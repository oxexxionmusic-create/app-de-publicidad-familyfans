// src/pages/Explore.js
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/App';
import { exploreAPI, subscriptionsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Search, Users, Eye, MapPin, Zap, ArrowLeft, Crown, Lock
} from 'lucide-react';

export default function Explore() {
  const { user } = useAuth();
  const [creators, setCreators] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [creatorsRes, subsRes] = await Promise.all([
          exploreAPI.creators(),
          user ? subscriptionsAPI.list().catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
        ]);
        setCreators(creatorsRes.data);
        setSubscriptions(subsRes.data);
      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const filteredCreators = creators.filter(c => {
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.creator_profile?.niche?.toLowerCase().includes(q) ||
      c.creator_profile?.region?.toLowerCase().includes(q)
    );
  });

  // Función helper para verificar suscripción
  const isSubscribed = (creatorId) => {
    return subscriptions.some(s => s.creator_id === creatorId);
  };

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
            <Link to="/rankings">
              <Button variant="ghost" size="sm">Rankings</Button>
            </Link>
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1" /> Inicio
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="page-container">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <h1 className="text-3xl font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
            Explorar Creadores
          </h1>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, nicho..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
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
        ) : filteredCreators.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="p-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No se encontraron creadores{search && ` para "${search}"`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCreators.map(c => {
              const cp = c.creator_profile || {};
              const subscribed = isSubscribed(c.id);
              const hasPremiumPlan = c.subscription_plan?.active;

              return (
                <Link key={c.id} to={`/creador/${c.id}`}>
                  <Card className="border-border/50 card-hover h-full transition-all hover:shadow-md">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        {c.profile_photo_url ? (
                          <img
                            src={c.profile_photo_url}
                            alt={c.name}
                            className="w-14 h-14 rounded-full object-cover border-2 border-primary/20"
                          />
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
                            {subscribed && (
                              <Badge variant="secondary" className="text-[10px] h-5">
                                Suscrito
                              </Badge>
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
                      {hasPremiumPlan && (
                        <div className="mt-3 p-2 rounded-lg bg-primary/5 border border-primary/20 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Lock className="w-3 h-3 text-primary" />
                              Contenido Premium
                            </span>
                            <span className="font-semibold text-primary">
                              ${c.subscription_plan.price}/mes
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
