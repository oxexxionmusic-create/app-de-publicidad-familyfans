// src/pages/Rankings.js
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { rankingsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Users, Eye, TrendingUp, Zap, ArrowLeft, Medal } from 'lucide-react';

export default function Rankings() {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    rankingsAPI.get()
      .then(res => {
        setRankings(res.data);
      })
      .catch(err => {
        console.error('Error cargando rankings:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const categoryIcons = {
    most_viewed: Eye,
    most_followers: Users,
  };

  const getMedalColor = (index) => {
    switch (index) {
      case 0: return 'bg-[hsl(43,96%,56%)] text-black'; // Oro
      case 1: return 'bg-gray-400 text-black'; // Plata
      case 2: return 'bg-[hsl(25,80%,50%)] text-white'; // Bronce
      default: return 'bg-[hsl(var(--surface-3))] text-muted-foreground';
    }
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
            <Link to="/explorar">
              <Button variant="ghost" size="sm">Explorar</Button>
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
        <div className="flex items-center gap-3 mb-8">
          <Trophy className="w-8 h-8 text-[hsl(43,96%,56%)]" />
          <h1 className="text-3xl font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
            Rankings Top 10
          </h1>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map(i => (
              <Card key={i} className="border-border/50">
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent className="space-y-3">
                  {[1, 2, 3, 4, 5].map(j => (
                    <div key={j} className="flex items-center gap-3">
                      <Skeleton className="w-7 h-7 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : rankings.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="p-12 text-center">
              <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Aún no hay rankings disponibles. Los rankings se actualizan periódicamente.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="rankings-top10-list">
            {rankings.map((cat, idx) => {
              const Icon = categoryIcons[cat.category] || TrendingUp;
              return (
                <Card key={idx} className="border-border/50 card-hover">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}>
                      <Icon className="w-5 h-5 text-primary" />
                      {cat.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(cat.entries || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Sin datos aún</p>
                    ) : (
                      <div className="space-y-2">
                        {cat.entries.map((entry, i) => (
                          <Link key={i} to={`/creador/${entry.user_id}`}>
                            <div
                              className={`flex items-center justify-between p-3 rounded-lg transition-all hover:shadow-md ${
                                i < 3
                                  ? 'bg-primary/5 border border-primary/20'
                                  : 'bg-[hsl(var(--surface-2))] hover:bg-[hsl(var(--surface-3))]'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span
                                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${getMedalColor(i)}`}
                                >
                                  {i + 1}
                                </span>
                                <Avatar className="w-8 h-8 border-2 border-background">
                                  <AvatarImage src={entry.profile_photo_url} alt={entry.name} />
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                    {entry.name?.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium">{entry.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {entry.niche} · {entry.region}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold tabular-nums">
                                  {cat.category === 'most_viewed'
                                    ? (entry.avg_views || 0).toLocaleString()
                                    : (entry.followers || 0).toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {cat.category === 'most_viewed' ? 'vistas prom.' : 'seguidores'}
                                </p>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
