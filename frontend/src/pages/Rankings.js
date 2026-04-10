import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { rankingsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Users, Eye, TrendingUp, Zap, ArrowLeft } from 'lucide-react';

export default function Rankings() {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    rankingsAPI.get().then(res => { setRankings(res.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const categoryIcons = { most_viewed: Eye, most_followers: Users };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center"><Zap className="w-5 h-5 text-primary-foreground" /></div>
            <span className="font-semibold text-lg" style={{fontFamily:'Space Grotesk'}}>Family Fans Mony</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/explorar"><Button variant="ghost" size="sm">Explorar</Button></Link>
            <Link to="/"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Inicio</Button></Link>
          </div>
        </div>
      </nav>

      <div className="page-container">
        <div className="flex items-center gap-3 mb-8">
          <Trophy className="w-8 h-8 text-[hsl(43,96%,56%)]" />
          <h1 className="text-3xl font-semibold" style={{fontFamily:'Space Grotesk'}}>Rankings Top 10</h1>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1,2].map(i => <div key={i} className="h-64 rounded-xl bg-[hsl(var(--surface-2))] animate-pulse" />)}
          </div>
        ) : rankings.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="p-12 text-center">
              <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aún no hay rankings disponibles. Los rankings se actualizan periódicamente.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="rankings-top10-list">
            {rankings.map((cat, idx) => {
              const Icon = categoryIcons[cat.category] || TrendingUp;
              return (
                <Card key={idx} className="border-border/50 card-hover">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2" style={{fontFamily:'Space Grotesk'}}>
                      <Icon className="w-5 h-5 text-primary" />
                      {cat.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(cat.entries || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sin datos aún</p>
                    ) : (
                      <div className="space-y-2">
                        {cat.entries.map((e, i) => (
                          <div key={i} className={`flex items-center justify-between p-3 rounded-lg ${i < 3 ? 'bg-primary/5 border border-primary/20' : 'bg-[hsl(var(--surface-2))]'}`}>
                            <div className="flex items-center gap-3">
                              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-[hsl(43,96%,56%)] text-black' : i === 1 ? 'bg-gray-400 text-black' : i === 2 ? 'bg-[hsl(25,80%,50%)] text-white' : 'bg-[hsl(var(--surface-3))] text-muted-foreground'}`}>
                                {i + 1}
                              </span>
                              <div>
                                <p className="text-sm font-medium">{e.name}</p>
                                <p className="text-xs text-muted-foreground">{e.niche} · {e.region}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold tabular-nums">{(e.followers || 0).toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">seguidores</p>
                            </div>
                          </div>
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
