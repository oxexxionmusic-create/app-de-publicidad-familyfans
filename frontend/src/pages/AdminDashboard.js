import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/App';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { adminAPI, depositsAPI, kycAPI, deliverablesAPI, withdrawalsAPI, transactionsAPI, musicFinancingAPI, campaignsAPI, curatorAPI, microTasksAPI, levelRequestsAPI, adminWalletAPI, rankingBoardsAPI, deliverableActionsAPI, adminLevelAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { API_BASE } from '@/lib/api';
import {
  LayoutDashboard, Users, DollarSign, Megaphone, FileCheck, CreditCard, ShieldCheck, Music, Settings, List,
  CheckCircle2, XCircle, Clock, LogOut, Zap, ChevronRight, Eye, TrendingUp, AlertCircle, RefreshCw
} from 'lucide-react';

function StatusBadge({ status }) {
  const map = {
    pending: 'status-badge-pending', approved: 'status-badge-approved', rejected: 'status-badge-rejected',
    active: 'status-badge-active', completed: 'status-badge-approved', cancelled: 'status-badge-rejected',
    verified: 'status-badge-approved', none: 'status-badge-pending',
  };
  const labels = {
    pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado', active: 'Activo',
    completed: 'Completado', cancelled: 'Cancelado', verified: 'Verificado', none: 'Sin KYC',
  };
  return <span className={map[status] || 'status-badge-pending'}>{labels[status] || status}</span>;
}

function Sidebar({ stats }) {
  const location = useLocation();
  const { logout } = useAuth();
  const nav = useNavigate();
  const links = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', key: 'dashboard', exact: true },
    { to: '/admin/deposits', icon: DollarSign, label: 'Depositos', key: 'deposits', badge: stats?.pending_deposits },
    { to: '/admin/campaigns', icon: Megaphone, label: 'Campanas', key: 'campaigns' },
    { to: '/admin/deliverables', icon: FileCheck, label: 'Entregables', key: 'deliverables', badge: stats?.pending_deliverables },
    { to: '/admin/withdrawals', icon: CreditCard, label: 'Retiros', key: 'withdrawals', badge: stats?.pending_withdrawals },
    { to: '/admin/kyc', icon: ShieldCheck, label: 'KYC', key: 'kyc', badge: stats?.pending_kyc },
    { to: '/admin/financing', icon: Music, label: 'Financiamiento', key: 'financing', badge: stats?.pending_financing },
    { to: '/admin/curators', icon: Music, label: 'Curadores', key: 'curators', badge: stats?.pending_curator },
    { to: '/admin/microtasks', icon: Music, label: 'Micro-tareas', key: 'microtasks', badge: stats?.pending_micro_tasks },
    { to: '/admin/levels', icon: TrendingUp, label: 'Niveles', key: 'levels', badge: stats?.pending_level_requests },
    { to: '/admin/wallet', icon: DollarSign, label: 'Billetera', key: 'wallet' },
    { to: '/admin/ranking-boards', icon: TrendingUp, label: 'Tableros Ranking', key: 'ranking-boards' },
    { to: '/admin/users', icon: Users, label: 'Usuarios', key: 'users' },
    { to: '/admin/transactions', icon: List, label: 'Transacciones', key: 'transactions' },
    { to: '/admin/settings', icon: Settings, label: 'Configuracion', key: 'settings' },
  ];

  return (
    <aside className="w-64 min-h-screen border-r border-border/50 bg-[hsl(var(--surface-1))] p-4 flex flex-col fixed left-0 top-0">
      <div className="flex items-center gap-2 px-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center"><Zap className="w-5 h-5 text-primary-foreground" /></div>
        <div>
          <p className="font-semibold text-sm" style={{fontFamily:'Space Grotesk'}}>Family Fans Mony</p>
          <p className="text-xs text-muted-foreground">Admin Panel</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1">
        {links.map(l => {
          const active = l.exact ? location.pathname === l.to : location.pathname.startsWith(l.to);
          return (
            <Link key={l.to} to={l.to} className={`sidebar-link ${active ? 'active' : ''}`} data-testid={`admin-sidebar-nav-${l.key}`}>
              <l.icon className="w-4 h-4" />
              <span className="flex-1">{l.label}</span>
              {l.badge > 0 && <span className="bg-[hsl(var(--status-pending))]/20 text-[hsl(var(--status-pending))] text-xs px-2 py-0.5 rounded-full font-medium">{l.badge}</span>}
            </Link>
          );
        })}
      </nav>
      <button onClick={() => { logout(); nav('/'); }} className="sidebar-link text-destructive mt-4">
        <LogOut className="w-4 h-4" /> Cerrar Sesion
      </button>
    </aside>
  );
}

function KPICard({ label, value, icon: Icon, color = 'text-primary' }) {
  return (
    <div className="kpi-card">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className="text-2xl font-semibold tabular-nums" style={{fontFamily:'Space Grotesk'}}>{typeof value === 'number' ? (label.includes('$') || label.includes('Comision') || label.includes('Deposit') ? `$${value.toLocaleString()}` : value.toLocaleString()) : value}</p>
    </div>
  );
}

// Dashboard Overview
function DashboardHome({ stats, refresh }) {
  if (!stats) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold" style={{fontFamily:'Space Grotesk'}}>Dashboard</h1>
        <Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="w-4 h-4 mr-1" /> Actualizar</Button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Usuarios" value={stats.total_users} icon={Users} />
        <KPICard label="Campanas Activas" value={stats.active_campaigns} icon={Megaphone} color="text-[hsl(199,78%,48%)]" />
        <KPICard label="Total Depositado $" value={stats.total_deposited} icon={DollarSign} color="text-[hsl(152,58%,44%)]" />
        <KPICard label="Comisiones Ganadas $" value={stats.total_commissions} icon={TrendingUp} color="text-[hsl(43,96%,56%)]" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Depositos Pendientes', v: stats.pending_deposits, icon: DollarSign, to: '/admin/deposits' },
          { label: 'Entregables Pendientes', v: stats.pending_deliverables, icon: FileCheck, to: '/admin/deliverables' },
          { label: 'Retiros Pendientes', v: stats.pending_withdrawals, icon: CreditCard, to: '/admin/withdrawals' },
          { label: 'KYC Pendientes', v: stats.pending_kyc, icon: ShieldCheck, to: '/admin/kyc' },
          { label: 'Financiamientos', v: stats.pending_financing, icon: Music, to: '/admin/financing' },
        ].map((p, i) => (
          <Link key={i} to={p.to}>
            <Card className={`card-hover border-border/50 ${p.v > 0 ? 'border-[hsl(var(--status-pending))]/30' : ''}`}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${p.v > 0 ? 'bg-[hsl(var(--status-pending))]/10' : 'bg-[hsl(var(--surface-2))]'}`}>
                  <p.icon className={`w-5 h-5 ${p.v > 0 ? 'text-[hsl(var(--status-pending))]' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <p className="text-xl font-semibold tabular-nums" style={{fontFamily:'Space Grotesk'}}>{p.v}</p>
                  <p className="text-xs text-muted-foreground">{p.label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <KPICard label="Creadores" value={stats.total_creators} icon={Users} color="text-[hsl(199,78%,48%)]" />
        <KPICard label="Anunciantes" value={stats.total_advertisers} icon={Megaphone} color="text-primary" />
        <KPICard label="Fans" value={stats.total_fans} icon={Users} color="text-[hsl(0,72%,52%)]" />
      </div>
    </div>
  );
}

// Generic Admin List with approve/reject
function AdminList({ title, fetchFn, approveFn, rejectFn, columns, type }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    fetchFn().then(res => { setItems(res.data); setLoading(false); }).catch(() => setLoading(false));
  }, [fetchFn]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id) => {
    try {
      await approveFn(id);
      toast.success('Aprobado exitosamente');
      load();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const handleReject = async (id) => {
    const note = prompt('Motivo del rechazo (opcional):') || '';
    try {
      await rejectFn(id, note);
      toast.success('Rechazado');
      load();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const filtered = items.filter(item => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return JSON.stringify(item).toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold" style={{fontFamily:'Space Grotesk'}}>{title}</h2>
        <div className="flex items-center gap-2">
          <Input placeholder="Buscar..." value={filter} onChange={e => setFilter(e.target.value)} className="w-48" data-testid={`admin-${type}-search-input`} />
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
        </div>
      </div>
      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 rounded-lg bg-[hsl(var(--surface-2))] animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/50"><CardContent className="p-8 text-center"><AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">No hay elementos</p></CardContent></Card>
      ) : (
        <div className="space-y-2" data-testid={`admin-${type}-table`}>
          {filtered.map(item => (
            <Card key={item.id} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {columns.map((col, i) => (
                        <span key={i} className={i === 0 ? 'font-medium text-sm' : 'text-xs text-muted-foreground'}>
                          {col.render ? col.render(item) : item[col.key] || ''}
                          {i < columns.length - 1 && i > 0 && ' · '}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <StatusBadge status={item.status} />
                      <span>{new Date(item.created_at).toLocaleDateString('es-ES')}</span>
                      {item.amount !== undefined && <span className="font-semibold tabular-nums">${item.amount}</span>}
                      {item.user_email && <span>{item.user_email}</span>}
                    </div>
                    {item.proof_url && <a href={`${API_BASE.replace('/api','')}${item.proof_url}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1"><Eye className="w-3 h-3" /> Ver comprobante</a>}
                    {item.document_url && <a href={`${API_BASE.replace('/api','')}${item.document_url}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1 mr-2"><Eye className="w-3 h-3" /> Documento</a>}
                    {item.selfie_url && <a href={`${API_BASE.replace('/api','')}${item.selfie_url}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1"><Eye className="w-3 h-3" /> Selfie</a>}
                    {item.video_url && <a href={item.video_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1"><Eye className="w-3 h-3" /> Video</a>}
                    {item.audio_url && <a href={`${API_BASE.replace('/api','')}${item.audio_url}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1"><Eye className="w-3 h-3" /> Audio</a>}
                    {item.admin_message && <p className="text-xs text-muted-foreground mt-1">Admin: {item.admin_message}</p>}
                  </div>
                  {item.status === 'pending' && (
                    <div className="flex items-center gap-2" data-testid={`admin-${type}-row-actions`}>
                      <Button size="sm" onClick={() => handleApprove(item.id)} data-testid={`admin-${type}-approve-button`}>
                        <CheckCircle2 className="w-4 h-4 mr-1" /> Aprobar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleReject(item.id)}>
                        <XCircle className="w-4 h-4 mr-1" /> Rechazar
                      </Button>
                    </div>
                  )}
                  {item.status === 'approved' && item.final_payment_released === false && type === 'deliverables' && (
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-right">
                        <p className="text-[hsl(var(--status-pending))]">40% liberado · 60% retenido</p>
                        {item.permanence_end && <p className="text-muted-foreground">Permanencia hasta: {new Date(item.permanence_end).toLocaleDateString('es-ES')}</p>}
                      </div>
                      <Button size="sm" variant="outline" onClick={async () => {
                        try { await (await import('@/lib/api')).deliverableActionsAPI.releaseFinal(item.id); toast.success('Pago final liberado'); load(); } catch(e) { toast.error(e.response?.data?.detail || 'Error'); }
                      }}>Liberar 60%</Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Admin Users
function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');

  const load = () => {
    setLoading(true);
    adminAPI.users(roleFilter || undefined).then(res => { setUsers(res.data); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, [roleFilter]);

  const toggleTop10 = async (userId, current) => {
    const fd = new FormData();
    fd.append('is_top10', !current);
    try {
      await adminAPI.toggleTop10(userId, fd);
      toast.success(`Top 10 ${!current ? 'activado' : 'desactivado'}`);
      load();
    } catch (err) { toast.error('Error'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold" style={{fontFamily:'Space Grotesk'}}>Usuarios</h2>
        <div className="flex gap-2">
          {['', 'advertiser', 'creator', 'fan'].map(r => (
            <Button key={r} variant={roleFilter === r ? 'default' : 'outline'} size="sm" onClick={() => setRoleFilter(r)}>
              {r || 'Todos'}
            </Button>
          ))}
        </div>
      </div>
      {loading ? <div className="h-32 rounded-lg bg-[hsl(var(--surface-2))] animate-pulse" /> : (
        <div className="space-y-2">
          {users.map(u => (
            <Card key={u.id} className="border-border/50">
              <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{u.name}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[hsl(var(--surface-3))] capitalize">{u.role}</span>
                    <StatusBadge status={u.kyc_status || 'none'} />
                    {u.is_top10 && <span className="text-xs bg-[hsl(43,96%,56%)]/20 text-[hsl(43,96%,56%)] px-2 py-0.5 rounded-full">Top 10</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{u.email} · Saldo: ${(u.balance || 0).toFixed(2)} · {new Date(u.created_at).toLocaleDateString('es-ES')}</p>
                </div>
                <div className="flex items-center gap-2">
                  {u.role === 'creator' && (
                    <Button size="sm" variant={u.is_top10 ? 'destructive' : 'outline'} onClick={() => toggleTop10(u.id, u.is_top10)}>
                      {u.is_top10 ? 'Quitar Top 10' : 'Marcar Top 10'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Admin Transactions
function AdminTransactions() {
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { transactionsAPI.list().then(res => { setTxns(res.data); setLoading(false); }).catch(() => setLoading(false)); }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold" style={{fontFamily:'Space Grotesk'}}>Transacciones</h2>
      {loading ? <div className="h-32 rounded-lg bg-[hsl(var(--surface-2))] animate-pulse" /> : txns.length === 0 ? (
        <Card className="border-border/50"><CardContent className="p-8 text-center text-muted-foreground">Sin transacciones</CardContent></Card>
      ) : (
        <div className="space-y-1">
          {txns.map(t => (
            <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-[hsl(var(--surface-2))]">
              <div>
                <p className="text-sm">{t.description}</p>
                <p className="text-xs text-muted-foreground">{t.type} · {new Date(t.created_at).toLocaleDateString('es-ES')}</p>
              </div>
              <p className={`font-semibold tabular-nums text-sm ${t.amount >= 0 ? 'text-[hsl(152,58%,44%)]' : 'text-[hsl(0,72%,52%)]'}`}>
                {t.amount >= 0 ? '+' : ''}${t.amount?.toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Admin Settings
function AdminSettings() {
  const [s, setS] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { adminAPI.settings().then(res => { setS(res.data); setLoading(false); }).catch(() => setLoading(false)); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(s).forEach(([k, v]) => { if (k !== 'id' && k !== 'updated_at') fd.append(k, v || ''); });
      await adminAPI.updateSettings(fd);
      toast.success('Configuracion guardada');
    } catch (err) { toast.error('Error al guardar'); }
    setSaving(false);
  };

  if (loading) return <div className="h-32 rounded-lg bg-[hsl(var(--surface-2))] animate-pulse" />;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold" style={{fontFamily:'Space Grotesk'}}>Configuracion de Pagos</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardHeader><CardTitle className="text-base" style={{fontFamily:'Space Grotesk'}}>Wallet Criptomonedas</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Direccion Wallet</Label><Input value={s.crypto_wallet_address || ''} onChange={e => setS({...s, crypto_wallet_address: e.target.value})} placeholder="0x..." /></div>
            <div><Label>Red</Label><Input value={s.crypto_network || ''} onChange={e => setS({...s, crypto_network: e.target.value})} /></div>
            <div><Label>Moneda</Label><Input value={s.crypto_currency || ''} onChange={e => setS({...s, crypto_currency: e.target.value})} /></div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader><CardTitle className="text-base" style={{fontFamily:'Space Grotesk'}}>Datos Bancarios</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Nombre del Banco</Label><Input value={s.bank_name || ''} onChange={e => setS({...s, bank_name: e.target.value})} /></div>
            <div><Label>Titular</Label><Input value={s.bank_account_holder || ''} onChange={e => setS({...s, bank_account_holder: e.target.value})} /></div>
            <div><Label>Numero de Cuenta</Label><Input value={s.bank_account_number || ''} onChange={e => setS({...s, bank_account_number: e.target.value})} /></div>
            <div><Label>Detalles Adicionales</Label><Textarea value={s.bank_details || ''} onChange={e => setS({...s, bank_details: e.target.value})} /></div>
          </CardContent>
        </Card>
      </div>
      <Card className="border-border/50">
        <CardContent className="p-4">
          <Label>Instrucciones para Usuarios</Label>
          <Textarea value={s.instructions || ''} onChange={e => setS({...s, instructions: e.target.value})} className="mt-2" rows={3} />
        </CardContent>
      </Card>
      <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar Configuracion'}</Button>
    </div>
  );
}

// Admin Campaigns
function AdminCampaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { campaignsAPI.list().then(res => { setCampaigns(res.data); setLoading(false); }).catch(() => setLoading(false)); }, []);

  const handleCancel = async (id) => {
    if (!window.confirm('Cancelar esta campana?')) return;
    try {
      await campaignsAPI.cancel(id);
      toast.success('Campana cancelada');
      campaignsAPI.list().then(res => setCampaigns(res.data));
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold" style={{fontFamily:'Space Grotesk'}}>Campanas</h2>
      {loading ? <div className="h-32 rounded-lg bg-[hsl(var(--surface-2))] animate-pulse" /> : campaigns.length === 0 ? (
        <Card className="border-border/50"><CardContent className="p-8 text-center text-muted-foreground">Sin campanas</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {campaigns.map(c => (
            <Card key={c.id} className="border-border/50">
              <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm">{c.title}</p>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Presupuesto: ${c.budget} · Restante: ${c.budget_remaining} · Videos: {c.videos_completed}/{c.videos_requested} · {c.advertiser_name}
                  </p>
                  <p className="text-xs text-muted-foreground">{c.niche} · {c.region} · {(c.social_networks || []).join(', ')}</p>
                </div>
                {c.status === 'active' && (
                  <Button size="sm" variant="destructive" onClick={() => handleCancel(c.id)}>Cancelar</Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Admin Wallet
function AdminWallet() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { adminWalletAPI.get().then(res => { setData(res.data); setLoading(false); }).catch(() => setLoading(false)); }, []);

  if (loading) return <div className="h-32 rounded-lg bg-[hsl(var(--surface-2))] animate-pulse" />;
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold" style={{fontFamily:'Space Grotesk'}}>Billetera de la Plataforma</h2>
      <div className="kpi-card">
        <p className="text-xs text-muted-foreground mb-1">Total Comisiones Acumuladas</p>
        <p className="text-3xl font-semibold tabular-nums text-primary" style={{fontFamily:'Space Grotesk'}}>${data?.total_commissions?.toFixed(2) || '0.00'}</p>
      </div>
      <h3 className="text-base font-medium">Historial de Comisiones</h3>
      <div className="space-y-1">
        {(data?.transactions || []).map(t => (
          <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-[hsl(var(--surface-2))]">
            <div><p className="text-sm">{t.description}</p><p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString('es-ES')}</p></div>
            <p className="font-semibold tabular-nums text-sm text-[hsl(152,58%,44%)]">+${t.amount?.toFixed(2)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Admin Ranking Boards
function AdminRankingBoards() {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const load = () => { rankingBoardsAPI.list().then(res => { setBoards(res.data); setLoading(false); }).catch(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newName) return;
    const fd = new FormData();
    fd.append('name', newName);
    fd.append('description', newDesc);
    try {
      await rankingBoardsAPI.create(fd);
      toast.success('Tablero creado');
      setNewName(''); setNewDesc('');
      load();
    } catch (err) { toast.error('Error'); }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold" style={{fontFamily:'Space Grotesk'}}>Tableros de Ranking Personalizados</h2>
      <Card className="border-border/50">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-medium">Crear Nuevo Tablero</p>
          <div className="flex gap-2">
            <Input placeholder="Nombre del tablero" value={newName} onChange={e => setNewName(e.target.value)} />
            <Input placeholder="Descripcion (opcional)" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
            <Button onClick={handleCreate}>Crear</Button>
          </div>
        </CardContent>
      </Card>
      {loading ? <div className="h-32 rounded-lg bg-[hsl(var(--surface-2))] animate-pulse" /> : boards.length === 0 ? (
        <Card className="border-border/50"><CardContent className="p-8 text-center text-muted-foreground">Sin tableros personalizados</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {boards.map(b => (
            <Card key={b.id} className="border-border/50">
              <CardContent className="p-4">
                <p className="font-semibold">{b.name}</p>
                {b.description && <p className="text-xs text-muted-foreground">{b.description}</p>}
                <p className="text-xs text-muted-foreground mt-1">{(b.entries || []).length} creadores</p>
                {(b.entries || []).map((e, i) => (
                  <span key={i} className="inline-block text-xs bg-[hsl(var(--surface-3))] px-2 py-1 rounded mr-1 mt-1">{e.name}</span>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Enhanced Admin Users with level setting
function AdminUsersEnhanced() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');

  const load = () => {
    setLoading(true);
    adminAPI.users(roleFilter || undefined).then(res => { setUsers(res.data); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, [roleFilter]);

  const toggleTop10 = async (userId, current) => {
    const fd = new FormData();
    fd.append('is_top10', !current);
    try { await adminAPI.toggleTop10(userId, fd); toast.success(`Top 10 ${!current ? 'activado' : 'desactivado'}`); load(); } catch { toast.error('Error'); }
  };

  const setLevel = async (userId, level) => {
    const fd = new FormData();
    fd.append('level', level);
    try { await adminLevelAPI.setLevel(userId, fd); toast.success(`Nivel actualizado a ${level}`); load(); } catch { toast.error('Error'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold" style={{fontFamily:'Space Grotesk'}}>Usuarios</h2>
        <div className="flex gap-2">
          {['', 'advertiser', 'creator', 'fan'].map(r => (
            <Button key={r} variant={roleFilter === r ? 'default' : 'outline'} size="sm" onClick={() => setRoleFilter(r)}>{r || 'Todos'}</Button>
          ))}
        </div>
      </div>
      {loading ? <div className="h-32 rounded-lg bg-[hsl(var(--surface-2))] animate-pulse" /> : (
        <div className="space-y-2">
          {users.map(u => (
            <Card key={u.id} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      {u.profile_photo_url && <img src={u.profile_photo_url.startsWith('/') ? `${window.location.origin}${u.profile_photo_url}` : u.profile_photo_url} className="w-8 h-8 rounded-full object-cover" alt="" />}
                      <p className="font-medium text-sm">{u.name}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[hsl(var(--surface-3))] capitalize">{u.role}</span>
                      {u.is_top10 && <span className="text-xs bg-[hsl(43,96%,56%)]/20 text-[hsl(43,96%,56%)] px-2 py-0.5 rounded-full">Top 10</span>}
                      {u.creator_profile?.creator_level && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">{u.creator_profile.creator_level}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">{u.email} · Saldo: ${(u.balance || 0).toFixed(2)} · Ref: {u.referral_code || 'N/A'}</p>
                    {u.referred_by && <p className="text-xs text-muted-foreground">Referido por: {u.referred_by}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {u.role === 'creator' && (
                      <>
                        <select className="text-xs bg-[hsl(var(--surface-2))] border border-border rounded px-2 py-1" defaultValue={u.creator_profile?.creator_level || 'standard'} onChange={e => setLevel(u.id, e.target.value)}>
                          <option value="standard">Estandar</option>
                          <option value="micro">Micro</option>
                          <option value="small">Pequeno</option>
                          <option value="top10_level">Top 10</option>
                        </select>
                        <Button size="sm" variant={u.is_top10 ? 'destructive' : 'outline'} onClick={() => toggleTop10(u.id, u.is_top10)}>
                          {u.is_top10 ? 'Quitar Top 10' : 'Top 10'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const load = useCallback(() => { adminAPI.stats().then(res => setStats(res.data)).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar stats={stats} />
      <main className="flex-1 ml-64 p-6">
        <Routes>
          <Route index element={<DashboardHome stats={stats} refresh={load} />} />
          <Route path="deposits" element={
            <AdminList title="Depositos" fetchFn={depositsAPI.list} approveFn={depositsAPI.approve} rejectFn={depositsAPI.reject} type="deposits"
              columns={[{key:'user_email'}, {render: i => i.method}, {render: i => `$${i.amount}`}]} />
          } />
          <Route path="deliverables" element={
            <AdminList title="Entregables" fetchFn={deliverablesAPI.list} approveFn={deliverablesAPI.approve} rejectFn={deliverablesAPI.reject} type="deliverables"
              columns={[{key:'creator_name'}, {render: i => i.video_url ? 'Con video' : 'Sin video'}]} />
          } />
          <Route path="withdrawals" element={
            <AdminList title="Retiros" fetchFn={withdrawalsAPI.list} approveFn={withdrawalsAPI.approve} rejectFn={withdrawalsAPI.reject} type="withdrawals"
              columns={[{key:'user_name'}, {key:'user_email'}, {render: i => `$${i.amount} · ${i.method}`}]} />
          } />
          <Route path="kyc" element={
            <AdminList title="Verificaciones KYC" fetchFn={kycAPI.list} approveFn={kycAPI.approve} rejectFn={kycAPI.reject} type="kyc"
              columns={[{key:'user_email'}]} />
          } />
          <Route path="financing" element={
            <AdminList title="Financiamiento Musical" fetchFn={musicFinancingAPI.list} approveFn={(id) => musicFinancingAPI.approve(id, '', 0)} rejectFn={(id, note) => musicFinancingAPI.reject(id, note)} type="financing"
              columns={[{key:'title'}, {key:'creator_email'}, {render: i => i.amount_requested ? `$${i.amount_requested}` : ''}]} />
          } />
          <Route path="curators" element={
            <AdminList title="Solicitudes de Curadores" fetchFn={curatorAPI.requests} approveFn={curatorAPI.approveRequest} rejectFn={curatorAPI.rejectRequest} type="curators"
              columns={[{key:'playlist_name'}, {key:'user_email'}, {render: i => `${i.song_count} canciones · ${i.listens_count} escuchas · $${i.calculated_payout}`}]} />
          } />
          <Route path="microtasks" element={
            <AdminList title="Micro-tareas (Escuchar Musica)" fetchFn={microTasksAPI.list} approveFn={microTasksAPI.approve} rejectFn={microTasksAPI.reject} type="microtasks"
              columns={[{key:'user_email'}, {render: i => `${i.songs_listened} canciones · $${i.calculated_payout}`}]} />
          } />
          <Route path="levels" element={
            <AdminList title="Solicitudes de Nivel" fetchFn={levelRequestsAPI.list} approveFn={levelRequestsAPI.approve} rejectFn={levelRequestsAPI.reject} type="levels"
              columns={[{key:'user_name'}, {render: i => `${i.current_level} → ${i.requested_level}`}, {key:'justification'}]} />
          } />
          <Route path="wallet" element={<AdminWallet />} />
          <Route path="ranking-boards" element={<AdminRankingBoards />} />
          <Route path="users" element={<AdminUsersEnhanced />} />
          <Route path="campaigns" element={<AdminCampaigns />} />
          <Route path="transactions" element={<AdminTransactions />} />
          <Route path="settings" element={<AdminSettings />} />
        </Routes>
      </main>
    </div>
  );
}
