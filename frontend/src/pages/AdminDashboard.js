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
CheckCircle2, XCircle, Clock, LogOut, Zap, ChevronRight, Eye, TrendingUp, AlertCircle, RefreshCw, ExternalLink, Search
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
return <span className={map[status] || 'status-badge-pending'}>{labels[status] || status};
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
<div className="w-64 bg-[hsl(var(--surface-2))] border-r border-border/50 h-screen p-4 flex flex-col">
<p className="font-semibold text-sm mb-6" style={{fontFamily:'Space Grotesk'}}>
Family Fans Mony<br/>Admin Panel
</p>
{links.map(l => {
const active = l.exact ? location.pathname === l.to : location.pathname.startsWith(l.to);
return (
<Link key={l.to} to={l.to} className={
`sidebar-link ${active ? 'active' : ''}`
} data-testid={
`admin-sidebar-nav-${l.key}`
}>
<l.icon className="w-4 h-4" />
{l.label}
{l.badge > 0 && <span className="ml-auto bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5">{l.badge}</span>}
</Link>
);
})}
<button onClick={() => { logout(); nav('/'); }} className="sidebar-link text-destructive mt-4">
<LogOut className="w-4 h-4 mr-2" /> Cerrar Sesion
</button>
</div>
);
}

function KPICard({ label, value, icon: Icon, color = 'text-primary' }) {
return (
<Card className="card-hover border-border/50">
<CardContent className="p-4">
<div className="flex items-center justify-between">
<p className="text-xs text-muted-foreground">{label}</p>
<Icon className={`w-4 h-4 ${color}`} />
</div>
<p className="text-2xl font-semibold tabular-nums mt-2" style={{fontFamily:'Space Grotesk'}}>
{typeof value === 'number'
? (label.includes('$') || label.includes('Comision') || label.includes('Deposit')
? `$${value.toLocaleString()}`
: value.toLocaleString())
: value}
</p>
</CardContent>
</Card>
);
}

function DashboardHome({ stats, refresh }) {
if (!stats) return <div>Cargando...</div>;
return (
<div>
<h1 className="text-2xl font-semibold mb-6" style={{fontFamily:'Space Grotesk'}}>Dashboard</h1>
<Button variant="outline" size="sm" onClick={refresh} className="mb-4">
<RefreshCw className="w-4 h-4 mr-2" /> Actualizar
</Button>
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
<KPICard label="Total Usuarios" value={stats.total_users} icon={Users} />
<KPICard label="Campanas Activas" value={stats.active_campaigns} icon={Megaphone} color="text-[hsl(199,78%,48%)]" />
<KPICard label="Total Depositado $" value={stats.total_deposited} icon={DollarSign} color="text-[hsl(152,58%,44%)]" />
<KPICard label="Comisiones Ganadas $" value={stats.total_commissions} icon={TrendingUp} color="text-[hsl(43,96%,56%)]" />
</div>

<div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
{[
{ label: 'Depositos Pendientes', v: stats.pending_deposits, icon: DollarSign, to: '/admin/deposits' },
{ label: 'Entregables Pendientes', v: stats.pending_deliverables, icon: FileCheck, to: '/admin/deliverables' },
{ label: 'Retiros Pendientes', v: stats.pending_withdrawals, icon: CreditCard, to: '/admin/withdrawals' },
{ label: 'KYC Pendientes', v: stats.pending_kyc, icon: ShieldCheck, to: '/admin/kyc' },
{ label: 'Financiamientos', v: stats.pending_financing, icon: Music, to: '/admin/financing' },
].map((p, i) => (
<Link key={i} to={p.to}>
<Card className={`card-hover border-border/50 ${p.v > 0 ? 'border-[hsl(var(--status-pending))]/30' : ''}`}>
<CardContent className="p-4">
<div className={`w-10 h-10 rounded-lg flex items-center justify-center ${p.v > 0 ? 'bg-[hsl(var(--status-pending))]/10' : 'bg-[hsl(var(--surface-2))]'}`}>
<p.icon className={`w-5 h-5 ${p.v > 0 ? 'text-[hsl(var(--status-pending))]' : 'text-muted-foreground'}`} />
</div>
<p className="text-xl font-semibold tabular-nums mt-2" style={{fontFamily:'Space Grotesk'}}>{p.v}</p>
<p className="text-xs text-muted-foreground">{p.label}</p>
</CardContent>
</Card>
</Link>
))}
</div>

<div className="grid grid-cols-3 gap-4">
<KPICard label="Creadores" value={stats.total_creators} icon={Users} color="text-[hsl(199,78%,48%)]" />
<KPICard label="Anunciantes" value={stats.total_advertisers} icon={Megaphone} color="text-primary" />
<KPICard label="Fans" value={stats.total_fans} icon={Users} color="text-[hsl(0,72%,52%)]" />
</div>
</div>
);
}

// Componente para buscar Campañas por ID
function CampaignsList({ searchId }) {
const [items, setItems] = useState([]);
const [loading, setLoading] = useState(true);
const load = useCallback(() => {
setLoading(true);
campaignsAPI.list().then(res => { setItems(res.data); setLoading(false); }).catch(() => setLoading(false));
}, []);
useEffect(() => { load(); }, [load]);

const handleCancel = async (id) => {
if (!window.confirm('Cancelar esta campana?')) return;
try {
await campaignsAPI.cancel(id);
toast.success('Campana cancelada');
load();
} catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
};

const filtered = items.filter(item => {
if (!searchId) return true;
return item.id?.toLowerCase().includes(searchId.toLowerCase()) || 
item.campaign_unique_id?.toLowerCase().includes(searchId.toLowerCase());
});

return (
<div>
{loading ? (
<div className="space-y-2">
{[1,2,3].map(i => <div key={i} className="h-24 rounded-lg bg-[hsl(var(--surface-2))] animate-pulse" />)}
</div>
) : filtered.length === 0 ? (
<Card className="border-border/50"><CardContent className="p-8 text-center text-muted-foreground">No hay elementos</CardContent></Card>
) : (
<div className="space-y-2" data-testid="admin-campaigns-table">
{filtered.map(item => (
<Card key={item.id} className="border-border/50">
<CardContent className="p-4">
<div className="flex items-start justify-between gap-4">
<div className="flex-1">
<div className="flex items-center gap-2 mb-1">
<p className="font-semibold">{item.title}</p>
<StatusBadge status={item.status} />
</div>
<p className="text-xs text-muted-foreground mb-2">{item.description}</p>
<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-2">
<span>Presupuesto: <b className="text-foreground">${item.budget}</b></span>
<span>·</span>
<span>Restante: <b className="text-foreground">${item.budget_remaining}</b></span>
<span>·</span>
<span>Videos: {item.videos_completed}/{item.videos_requested}</span>
<span>·</span>
<span>{item.advertiser_name}</span>
<span>·</span>
<span>ID: {item.id || 'N/A'}</span>
</div>
<div className="text-xs text-muted-foreground mb-2">
{item.niche} · {item.region} · {(item.social_networks || []).join(', ')}
</div>

{/* --- MOSTRAR ENLACES DE VOCAROO Y REFERENCIA --- */}
{item.vocaroo_link && (
<div className="mb-2 p-2 rounded bg-[hsl(var(--surface-2))]">
<p className="text-xs font-medium flex items-center gap-1 mb-1">
<Music className="w-3 h-3 text-primary" /> Audio de instrucciones (Vocaroo):
</p>
<a href={item.vocaroo_link} target="_blank" rel="noopener noreferrer" 
className="text-xs text-primary hover:underline flex items-center gap-1">
{item.vocaroo_link} <ExternalLink className="w-3 h-3" />
</a>
</div>
)}
{item.reference_link && (
<div className="mb-2 p-2 rounded bg-[hsl(var(--surface-2))]">
<p className="text-xs font-medium flex items-center gap-1 mb-1">
<ExternalLink className="w-3 h-3 text-primary" /> Enlace de referencia:
</p>
<a href={item.reference_link} target="_blank" rel="noopener noreferrer" 
className="text-xs text-primary hover:underline flex items-center gap-1">
{item.reference_link} <ExternalLink className="w-3 h-3" />
</a>
</div>
)}

</div>
<div className="flex flex-col items-end gap-2">
{item.status === 'active' && (
<Button size="sm" variant="destructive" onClick={() => handleCancel(item.id)}>
<XCircle className="w-4 h-4 mr-1" /> Cancelar
</Button>
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
<div>
<h2 className="text-xl font-semibold mb-4" style={{fontFamily:'Space Grotesk'}}>{title}</h2>
<Input placeholder="Buscar..." value={filter} onChange={e => setFilter(e.target.value)}
className="w-48 mb-4" data-testid={`admin-${type}-search-input`} />
<Button variant="outline" size="sm" onClick={load} className="mb-4">
<RefreshCw className="w-4 h-4 mr-1" /> Actualizar
</Button>
{loading ? (
<div className="space-y-2">
{[1,2,3].map(i => <div key={i} className="h-16 rounded-lg bg-[hsl(var(--surface-2))] animate-pulse" />)}
</div>
) : filtered.length === 0 ? (
<Card className="border-border/50"><CardContent className="p-8 text-center text-muted-foreground">No hay elementos</CardContent></Card>
) : (
<div className="space-y-2" data-testid={`admin-${type}-table`}>
{filtered.map(item => (
<Card key={item.id} className="border-border/50">
<CardContent className="p-4">
<div className="flex items-start justify-between gap-4">
<div className="flex-1">
<div className="flex flex-wrap items-center gap-2">
{columns.map((col, i) => (
<span key={i} className={i === 0 ? 'font-medium text-sm' : 'text-xs text-muted-foreground'}>
{col.render ? col.render(item) : item[col.key] || ''}
{i < columns.length - 1 && i > 0 && ' · '}
</span>
))}
</div>
<div className="flex items-center gap-2 mt-1">
<StatusBadge status={item.status} />
<span className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString('es-ES')}</span>
</div>
{item.amount !== undefined && (
<p className={`text-sm font-semibold tabular-nums mt-1 ${item.amount >= 0 ? 'text-[hsl(152,58%,44%)]' : 'text-[hsl(0,72%,52%)]'}`}>
${item.amount}
</p>
)}
{item.user_email && <p className="text-xs text-muted-foreground mt-1">{item.user_email}</p>}

{/* MOSTRAR ENLACES DE VOCAROO Y REFERENCIA SI EXISTEN */}
{item.vocaroo_link && (
<a href={item.vocaroo_link} target="_blank" rel="noopener noreferrer" 
className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
<Music className="w-3 h-3" /> Audio de instrucciones (Vocaroo)
</a>
)}
{item.reference_link && (
<a href={item.reference_link} target="_blank" rel="noopener noreferrer" 
className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
<ExternalLink className="w-3 h-3" /> Enlace de referencia
</a>
)}

{item.proof_url && (
<a href={`${API_BASE.replace('/api','')}${item.proof_url}`} target="_blank" rel="noopener noreferrer" 
className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
<Eye className="w-3 h-3" /> Ver comprobante
</a>
)}
{item.document_url && (
<a href={`${API_BASE.replace('/api','')}${item.document_url}`} target="_blank" rel="noopener noreferrer" 
className="text-xs text-primary hover:underline flex items-center gap-1 mr-2">
<Eye className="w-3 h-3" /> Documento
</a>
)}
{item.selfie_url && (
<a href={`${API_BASE.replace('/api','')}${item.selfie_url}`} target="_blank" rel="noopener noreferrer" 
className="text-xs text-primary hover:underline flex items-center gap-1">
<Eye className="w-3 h-3" /> Selfie
</a>
)}
{item.video_url && (
<a href={item.video_url} target="_blank" rel="noopener noreferrer" 
className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
<Music className="w-3 h-3" /> Video
</a>
)}
{item.audio_url && (
<a href={`${API_BASE.replace('/api','')}${item.audio_url}`} target="_blank" rel="noopener noreferrer" 
className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
<Music className="w-3 h-3" /> Audio
</a>
)}
{item.admin_message && (
<p className="text-xs text-muted-foreground mt-1">Admin: {item.admin_message}</p>
)}
</div>

<div className="flex flex-col items-end gap-2">
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
<div className="text-right">
<p className="text-xs text-muted-foreground">40% liberado · 60% retenido</p>
{item.permanence_end && (
<p className="text-xs text-muted-foreground">Permanencia hasta: {new Date(item.permanence_end).toLocaleDateString('es-ES')}</p>
)}
<Button size="sm" variant="outline" onClick={async () => {
try { 
await (await import('@/lib/api')).deliverableActionsAPI.releaseFinal(item.id); 
toast.success('Pago final liberado'); 
load(); 
} catch(e) { 
toast.error(e.response?.data?.detail || 'Error'); 
}
}}>
Liberar 60%
</Button>
</div>
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
<div>
<h2 className="text-xl font-semibold mb-4" style={{fontFamily:'Space Grotesk'}}>Usuarios</h2>
{['', 'advertiser', 'creator', 'fan'].map(r => (
<Button key={r} variant={roleFilter === r ? 'default' : 'outline'} size="sm" onClick={() => setRoleFilter(r)} className="mr-2 mb-2">
{r || 'Todos'}
</Button>
))}
{loading ? (
<div className="space-y-2">
{[1,2,3].map(i => <div key={i} className="h-16 rounded-lg bg-[hsl(var(--surface-2))] animate-pulse" />)}
</div>
) : (
<div className="space-y-2">
{users.map(u => (
<Card key={u.id} className="border-border/50">
<CardContent className="p-4">
<div className="flex items-start justify-between">
<div>
<div className="flex items-center gap-2">
{u.profile_photo_url && (
<img src={u.profile_photo_url.startsWith('/') ? 
`${window.location.origin}${u.profile_photo_url}`
: u.profile_photo_url}
className="w-8 h-8 rounded-full object-cover" alt="" />
)}
<p className="font-medium">{u.name}</p>
<span className="text-xs px-2 py-0.5 rounded bg-[hsl(var(--surface-3))">{u.role}</span>
<StatusBadge status={u.kyc_status || 'none'} />
{u.is_top10 && <span className="text-xs px-2 py-0.5 rounded bg-[hsl(43,96%,56%)]/20 text-[hsl(43,96%,56%)]">Top 10</span>}
</div>
<p className="text-xs text-muted-foreground mt-1">
{u.email} · Saldo: ${(u.balance || 0).toFixed(2)} · {new Date(u.created_at).toLocaleDateString('es-ES')}
</p>
{u.referred_by && (
<p className="text-xs text-muted-foreground">Referido por: {u.referred_by}</p>
)}
</div>
<div className="flex flex-col items-end gap-2">
{u.role === 'creator' && (
<Button size="sm" variant={u.is_top10 ? 'destructive' : 'outline'} onClick={() => toggleTop10(u.id, u.is_top10)}>
{u.is_top10 ? 'Quitar Top 10' : 'Marcar Top 10'}
</Button>
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

function AdminTransactions() {
const [txns, setTxns] = useState([]);
const [loading, setLoading] = useState(true);
useEffect(() => {
transactionsAPI.list().then(res => { setTxns(res.data); setLoading(false); }).catch(() => setLoading(false));
}, []);
return (
<div>
<h2 className="text-xl font-semibold mb-4" style={{fontFamily:'Space Grotesk'}}>Transacciones</h2>
{loading ? (
<div className="space-y-2">
{[1,2,3].map(i => <div key={i} className="h-12 rounded-lg bg-[hsl(var(--surface-2))] animate-pulse" />)}
</div>
) : txns.length === 0 ? (
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

function AdminSettings() {
const [s, setS] = useState({});
const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);
useEffect(() => {
adminAPI.settings().then(res => { setS(res.data); setLoading(false); }).catch(() => setLoading(false));
}, []);
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
if (loading) return <div>Cargando...</div>;
return (
<div>
<h2 className="text-xl font-semibold mb-4" style={{fontFamily:'Space Grotesk'}}>Configuracion de Pagos</h2>
<Card className="mb-4">
<CardHeader>
<CardTitle className="text-base" style={{fontFamily:'Space Grotesk'}}>Wallet Criptomonedas</CardTitle>
</CardHeader>
<CardContent className="space-y-4">
<div>
<Label>Direccion Wallet</Label>
<Input value={s.crypto_wallet_address || ''} onChange={e => setS({...s, crypto_wallet_address: e.target.value})} placeholder="0x..." />
</div>
<div className="grid grid-cols-2 gap-4">
<div>
<Label>Red</Label>
<Input value={s.crypto_network || ''} onChange={e => setS({...s, crypto_network: e.target.value})} />
</div>
<div>
<Label>Moneda</Label>
<Input value={s.crypto_currency || ''} onChange={e => setS({...s, crypto_currency: e.target.value})} />
</div>
</div>
</CardContent>
</Card>

<Card className="mb-4">
<CardHeader>
<CardTitle className="text-base" style={{fontFamily:'Space Grotesk'}}>Datos Bancarios</CardTitle>
</CardHeader>
<CardContent className="space-y-4">
<div>
<Label>Nombre del Banco</Label>
<Input value={s.bank_name || ''} onChange={e => setS({...s, bank_name: e.target.value})} />
</div>
<div>
<Label>Titular</Label>
<Input value={s.bank_account_holder || ''} onChange={e => setS({...s, bank_account_holder: e.target.value})} />
</div>
<div>
<Label>Numero de Cuenta</Label>
<Input value={s.bank_account_number || ''} onChange={e => setS({...s, bank_account_number: e.target.value})} />
</div>
<div>
<Label>Detalles Adicionales</Label>
<Textarea value={s.bank_details || ''} onChange={e => setS({...s, bank_details: e.target.value})} />
</div>
<div>
<Label>Instrucciones para Usuarios</Label>
<Textarea value={s.instructions || ''} onChange={e => setS({...s, instructions: e.target.value})} className="mt-2" rows={3} />
</div>
</CardContent>
</Card>

<Button onClick={handleSave} disabled={saving}>
{saving ? 'Guardando...' : 'Guardar Configuracion'}
</Button>
</div>
);
}

function AdminWallet() {
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
useEffect(() => {
adminWalletAPI.get().then(res => { setData(res.data); setLoading(false); }).catch(() => setLoading(false));
}, []);
if (loading) return <div>Cargando...</div>;
return (
<div>
<h2 className="text-xl font-semibold mb-4" style={{fontFamily:'Space Grotesk'}}>Billetera de la Plataforma</h2>
<Card className="mb-4">
<CardContent className="p-6">
<p className="text-sm text-muted-foreground mb-1">Total Comisiones Acumuladas</p>
<p className="text-3xl font-semibold tabular-nums text-primary" style={{fontFamily:'Space Grotesk'}}>
${data?.total_commissions?.toFixed(2) || '0.00'}
</p>
</CardContent>
</Card>

<Card>
<CardHeader>
<CardTitle className="text-base" style={{fontFamily:'Space Grotesk'}}>Historial de Comisiones</CardTitle>
</CardHeader>
<CardContent className="space-y-2">
{(data?.transactions || []).map(t => (
<div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-[hsl(var(--surface-2))]">
<div>
<p className="text-sm">{t.description}</p>
<p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString('es-ES')}</p>
</div>
<p className="font-semibold tabular-nums text-[hsl(152,58%,44%)]">+${t.amount?.toFixed(2)}</p>
</div>
))}
</CardContent>
</Card>
</div>
);
}

function AdminRankingBoards() {
const [boards, setBoards] = useState([]);
const [loading, setLoading] = useState(true);
const [newName, setNewName] = useState('');
const [newDesc, setNewDesc] = useState('');
const load = () => {
rankingBoardsAPI.list().then(res => { setBoards(res.data); setLoading(false); }).catch(() => setLoading(false));
};
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
<div>
<h2 className="text-xl font-semibold mb-4" style={{fontFamily:'Space Grotesk'}}>Tableros de Ranking Personalizados</h2>
<Card className="mb-4">
<CardContent className="p-4 space-y-4">
<h3 className="font-medium">Crear Nuevo Tablero</h3>
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
<Input placeholder="Nombre del tablero" value={newName} onChange={e => setNewName(e.target.value)} />
<Input placeholder="Descripcion (opcional)" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
</div>
<Button onClick={handleCreate}>Crear</Button>
</CardContent>
</Card>

{loading ? (
<div className="space-y-2">
{[1,2,3].map(i => <div key={i} className="h-24 rounded-lg bg-[hsl(var(--surface-2))] animate-pulse" />)}
</div>
) : boards.length === 0 ? (
<Card className="border-border/50"><CardContent className="p-8 text-center text-muted-foreground">Sin tableros personalizados</CardContent></Card>
) : (
<div className="space-y-3">
{boards.map(b => (
<Card key={b.id} className="border-border/50">
<CardContent className="p-4">
<p className="font-semibold">{b.name}</p>
{b.description && <p className="text-sm text-muted-foreground mt-1">{b.description}</p>}
<p className="text-xs text-muted-foreground mt-2">{(b.entries || []).length} creadores</p>
<div className="flex flex-wrap gap-1 mt-2">
{(b.entries || []).map((e, i) => (
<span key={i} className="inline-block text-xs bg-[hsl(var(--surface-3))] px-2 py-1 rounded">{e.name}</span>
))}
</div>
</CardContent>
</Card>
))}
</div>
)}
</div>
);
}

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
try { await adminAPI.toggleTop10(userId, fd); toast.success(`Top 10 ${!current ? 'activado' : 'desactivado'}`); load(); }
catch { toast.error('Error'); }
};
const setLevel = async (userId, level) => {
const fd = new FormData();
fd.append('level', level);
try { await adminLevelAPI.setLevel(userId, fd); toast.success(`Nivel actualizado a ${level}`); load(); }
catch { toast.error('Error'); }
};
return (
<div>
<h2 className="text-xl font-semibold mb-4" style={{fontFamily:'Space Grotesk'}}>Usuarios</h2>
{['', 'advertiser', 'creator', 'fan'].map(r => (
<Button key={r} variant={roleFilter === r ? 'default' : 'outline'} size="sm" onClick={() => setRoleFilter(r)} className="mr-2 mb-2">
{r || 'Todos'}
</Button>
))}
{loading ? (
<div className="space-y-2">
{[1,2,3].map(i => <div key={i} className="h-16 rounded-lg bg-[hsl(var(--surface-2))] animate-pulse" />)}
</div>
) : (
<div className="space-y-2">
{users.map(u => (
<Card key={u.id} className="border-border/50">
<CardContent className="p-4">
<div className="flex items-start justify-between">
<div>
<div className="flex items-center gap-2">
{u.profile_photo_url && (
<img src={u.profile_photo_url.startsWith('/') ? 
`${window.location.origin}${u.profile_photo_url}`
: u.profile_photo_url}
className="w-8 h-8 rounded-full object-cover" alt="" />
)}
<p className="font-medium">{u.name}</p>
<span className="text-xs px-2 py-0.5 rounded bg-[hsl(var(--surface-3))">{u.role}</span>
{u.is_top10 && <span className="text-xs px-2 py-0.5 rounded bg-[hsl(43,96%,56%)]/20 text-[hsl(43,96%,56%)]">Top 10</span>}
{u.creator_profile?.creator_level && (
<span className="text-xs px-2 py-0.5 rounded bg-[hsl(199,78%,48%)]/20 text-[hsl(199,78%,48%)] capitalize">
{u.creator_profile.creator_level}
</span>
)}
</div>
<p className="text-xs text-muted-foreground mt-1">
{u.email} · Saldo: ${(u.balance || 0).toFixed(2)} · Ref: {u.referral_code || 'N/A'}
</p>
{u.referred_by && (
<p className="text-xs text-muted-foreground">Referido por: {u.referred_by}</p>
)}
</div>
<div className="flex flex-col items-end gap-2">
{u.role === 'creator' && (
<>
<select 
className="text-xs bg-[hsl(var(--surface-2))] border border-border rounded px-2 py-1" 
defaultValue={u.creator_profile?.creator_level || 'standard'} 
onChange={e => setLevel(u.id, e.target.value)}
>
<option value="standard">Estandar</option>
<option value="micro">Micro</option>
<option value="small">Pequeno</option>
<option value="top10">Top 10</option>
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
// State para buscar campañas por ID
const [searchCampaignId, setSearchCampaignId] = useState('');
const load = useCallback(() => {
adminAPI.stats().then(res => setStats(res.data)).catch(() => {});
}, []);
useEffect(() => { load(); }, [load]);
return (
<div className="flex min-h-screen bg-background">
<Sidebar stats={stats} />
<div className="flex-1 p-6">
<Routes>
<Route index element={<DashboardHome stats={stats} refresh={load} />} />

<Route path="deposits" element={
<AdminList title="Depositos" fetchFn={depositsAPI.list} approveFn={depositsAPI.approve} rejectFn={depositsAPI.reject} type="deposits"
columns={[{key:'user_email'}, {render: i => i.method}, {render: i => `$${i.amount}`}]} />
} />

<Route path="campaigns" element={
<div>
<div className="flex items-center justify-between mb-4">
<h2 className="text-xl font-semibold" style={{fontFamily:'Space Grotesk'}}>Campanas</h2>
<div className="relative w-64">
<Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
<Input
placeholder="Buscar ID de Campaña..."
value={searchCampaignId}
onChange={(e) => setSearchCampaignId(e.target.value)}
className="pl-10"
/>
</div>
</div>
<CampaignsList searchId={searchCampaignId} />
</div>
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
<Route path="transactions" element={<AdminTransactions />} />
<Route path="settings" element={<AdminSettings />} />
</Routes>
</div>
</div>
);
}
