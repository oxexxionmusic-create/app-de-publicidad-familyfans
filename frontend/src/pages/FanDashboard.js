import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/App';
import { Link, useNavigate } from 'react-router-dom';
import { exploreAPI, subscriptionsAPI, transactionsAPI, depositsAPI, paymentInfoAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Search, Users, Eye, Crown, Heart, Wallet, Plus, LogOut, Zap, MapPin, DollarSign } from 'lucide-react';

export default function FanDashboard() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('explore');
  const [creators, setCreators] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Deposit
  const [showDeposit, setShowDeposit] = useState(false);
  const [depAmount, setDepAmount] = useState('');
  const [depMethod, setDepMethod] = useState('crypto');
  const [depRef, setDepRef] = useState('');
  const [depProof, setDepProof] = useState(null);
  const [depLoading, setDepLoading] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cr, sub, txn, pi] = await Promise.all([
        exploreAPI.creators(), subscriptionsAPI.list(), transactionsAPI.list(), paymentInfoAPI.get()
      ]);
      setCreators(cr.data); setSubscriptions(sub.data); setTransactions(txn.data); setPaymentInfo(pi.data);
      await refreshUser();
    } catch {}
    setLoading(false);
  }, [refreshUser]);

  useEffect(() => { load(); }, [load]);

  const filtered = creators.filter(c => {
    const q = search.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.creator_profile?.niche?.toLowerCase().includes(q);
  });

  const handleDeposit = async (e) => {
    e.preventDefault();
    setDepLoading(true);
    try {
      const fd = new FormData();
      fd.append('amount', depAmount);
      fd.append('method', depMethod);
      fd.append('reference', depRef);
      if (depProof) fd.append('proof', depProof);
      await depositsAPI.create(fd);
      toast.success('Deposito enviado');
      setShowDeposit(false);
      setDepAmount(''); setDepRef(''); setDepProof(null);
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
    setDepLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50 bg-[hsl(var(--surface-1))] sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center"><Zap className="w-5 h-5 text-primary-foreground" /></div>
              <span className="font-semibold" style={{fontFamily:'Space Grotesk'}}>Family Fans Mony</span>
            </Link>
            <span className="text-xs text-muted-foreground px-2 py-1 rounded-full bg-[hsl(var(--surface-3))]">Fan</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[hsl(var(--surface-2))]">
              <Wallet className="w-4 h-4 text-primary" />
              <span className="font-semibold tabular-nums text-sm">${(user?.balance || 0).toFixed(2)}</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowDeposit(true)}><Plus className="w-4 h-4 mr-1" /> Depositar</Button>
            <button onClick={() => { logout(); navigate('/'); }} className="text-muted-foreground hover:text-foreground"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </nav>

      <div className="page-container">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="explore">Explorar</TabsTrigger>
            <TabsTrigger value="subscriptions">Mis Suscripciones</TabsTrigger>
            <TabsTrigger value="transactions">Transacciones</TabsTrigger>
          </TabsList>

          <TabsContent value="explore">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold" style={{fontFamily:'Space Grotesk'}}>Explorar Creadores</h2>
              <div className="relative w-64">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
              </div>
            </div>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1,2,3].map(i => <div key={i} className="h-48 rounded-xl bg-[hsl(var(--surface-2))] animate-pulse" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(c => {
                  const cp = c.creator_profile || {};
                  const isSub = subscriptions.some(s => s.creator_id === c.id);
                  return (
                    <Card key={c.id} className="border-border/50 card-hover">
                      <CardContent className="p-5">
                        <Link to={`/creador/${c.id}`}>
                          <div className="flex items-start gap-4 mb-3">
                            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-lg">
                              {c.name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold">{c.name}</p>
                                {c.is_top10 && <span className="text-xs bg-[hsl(43,96%,56%)]/20 text-[hsl(43,96%,56%)] px-2 py-0.5 rounded-full">Top 10</span>}
                              </div>
                              <p className="text-xs text-muted-foreground capitalize">{cp.niche || 'Creador'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {(cp.followers || 0).toLocaleString()}</span>
                            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {(cp.avg_views || 0).toLocaleString()}</span>
                            {cp.region && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {cp.region}</span>}
                          </div>
                        </Link>
                        {c.subscription_plan?.active && (
                          <div className="mt-3 flex items-center justify-between p-2 rounded-lg bg-primary/5 border border-primary/20">
                            <span className="text-xs"><Crown className="w-3 h-3 inline mr-1" />${c.subscription_plan.price}/mes</span>
                            {isSub ? (
                              <span className="status-badge-approved text-[10px]">Suscrito</span>
                            ) : (
                              <Link to={`/creador/${c.id}`}><Button size="sm" className="h-7 text-xs">Suscribirme</Button></Link>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="subscriptions">
            <h2 className="text-xl font-semibold mb-4" style={{fontFamily:'Space Grotesk'}}>Mis Suscripciones</h2>
            {subscriptions.length === 0 ? (
              <Card className="border-border/50"><CardContent className="p-8 text-center"><Heart className="w-8 h-8 text-muted-foreground mx-auto mb-2" /><p className="text-muted-foreground">No tienes suscripciones activas</p></CardContent></Card>
            ) : (
              <div className="space-y-3">
                {subscriptions.map(s => (
                  <Card key={s.id} className="border-border/50">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Crown className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-medium text-sm">{s.creator_name}</p>
                          <p className="text-xs text-muted-foreground">${s.price}/mes · Desde {new Date(s.created_at).toLocaleDateString('es-ES')}</p>
                        </div>
                      </div>
                      <Link to={`/creador/${s.creator_id}`}><Button size="sm" variant="outline">Ver Contenido</Button></Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="transactions">
            <h2 className="text-xl font-semibold mb-4" style={{fontFamily:'Space Grotesk'}}>Transacciones</h2>
            {transactions.length === 0 ? (
              <Card className="border-border/50"><CardContent className="p-8 text-center text-muted-foreground">Sin transacciones</CardContent></Card>
            ) : (
              <div className="space-y-1">
                {transactions.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-[hsl(var(--surface-2))]">
                    <div><p className="text-sm">{t.description}</p><p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString('es-ES')}</p></div>
                    <p className={`font-semibold tabular-nums text-sm ${t.amount >= 0 ? 'text-[hsl(152,58%,44%)]' : 'text-[hsl(0,72%,52%)]'}`}>{t.amount >= 0 ? '+' : ''}${t.amount?.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Deposit Dialog */}
      <Dialog open={showDeposit} onOpenChange={setShowDeposit}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle style={{fontFamily:'Space Grotesk'}}>Depositar Fondos</DialogTitle></DialogHeader>
          {paymentInfo.crypto_wallet_address || paymentInfo.bank_name ? (
            <div className="mb-4 p-3 rounded-lg bg-[hsl(var(--surface-2))] text-sm space-y-2">
              <p className="font-medium text-xs text-muted-foreground">Datos de pago:</p>
              {paymentInfo.crypto_wallet_address && <div><p className="text-xs font-medium">Crypto ({paymentInfo.crypto_currency} - {paymentInfo.crypto_network})</p><p className="text-xs text-primary font-mono break-all">{paymentInfo.crypto_wallet_address}</p></div>}
              {paymentInfo.bank_name && <div><p className="text-xs font-medium">Banco: {paymentInfo.bank_name}</p><p className="text-xs">Titular: {paymentInfo.bank_account_holder}</p><p className="text-xs">Cuenta: {paymentInfo.bank_account_number}</p></div>}
              {paymentInfo.instructions && <p className="text-xs text-muted-foreground">{paymentInfo.instructions}</p>}
            </div>
          ) : null}
          <form onSubmit={handleDeposit} className="space-y-4">
            <div><Label>Monto (USD)</Label><Input type="number" step="0.01" min="1" value={depAmount} onChange={e => setDepAmount(e.target.value)} required /></div>
            <div><Label>Metodo</Label>
              <Select value={depMethod} onValueChange={setDepMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="crypto">Cripto (USDT/USDC)</SelectItem><SelectItem value="bank">Banco</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Referencia</Label><Input value={depRef} onChange={e => setDepRef(e.target.value)} /></div>
            <div><Label>Comprobante</Label><Input type="file" accept="image/*,.pdf" onChange={e => setDepProof(e.target.files[0])} /></div>
            <Button type="submit" className="w-full" disabled={depLoading}>{depLoading ? 'Enviando...' : 'Enviar Deposito'}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
