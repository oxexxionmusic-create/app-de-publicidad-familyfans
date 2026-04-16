// src/pages/AdvertiserDashboard.js
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/App';
import { Link, useNavigate } from 'react-router-dom';
import {
  depositsAPI, campaignsAPI, applicationsAPI, deliverablesAPI, transactionsAPI,
  paymentInfoAPI
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { API_BASE } from '@/lib/api';
import {
  DollarSign, Plus, Upload, Megaphone, FileCheck, LogOut, Zap, Wallet, CreditCard,
  CheckCircle2, XCircle, Clock, Eye, TrendingUp, ExternalLink, Music, Mic, Image as ImageIcon
} from 'lucide-react';

// Componente simple para previsualizar comprobante (sin dependencias extra)
function DepositProofPreview({ file, onRemove }) {
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!file) return;
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  }, [file]);

  if (!file) return null;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-[hsl(var(--surface-2))]">
      {preview ? (
        <img src={preview} alt="Preview" className="w-12 h-12 object-cover rounded" />
      ) : (
        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
          <FileCheck className="w-5 h-5 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
      </div>
      <Button variant="ghost" size="icon" onClick={onRemove}>
        <XCircle className="w-4 h-4" />
      </Button>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending: 'status-badge-pending', approved: 'status-badge-approved',
    rejected: 'status-badge-rejected', active: 'status-badge-active',
    completed: 'status-badge-approved', cancelled: 'status-badge-rejected',
    accepted: 'status-badge-approved'
  };
  const labels = {
    pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado',
    active: 'Activo', completed: 'Completado', cancelled: 'Cancelado',
    accepted: 'Aceptado'
  };
  return <span className={map[status] || 'status-badge-pending'}>{labels[status] || status}</span>;
}

export default function AdvertiserDashboard() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [deposits, setDeposits] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [applications, setApplications] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [paymentInfo, setPaymentInfo] = useState({});
  const [loading, setLoading] = useState(true);

  // Deposit form
  const [showDeposit, setShowDeposit] = useState(false);
  const [depAmount, setDepAmount] = useState('');
  const [depMethod, setDepMethod] = useState('crypto');
  const [depRef, setDepRef] = useState('');
  const [depProof, setDepProof] = useState(null);
  const [depLoading, setDepLoading] = useState(false);

  // Campaign form
  const [showCampaign, setShowCampaign] = useState(false);
  const [campForm, setCampForm] = useState({
    title: '', description: '', budget: '', payment_per_video: '', niche: '', region: '',
    gender_preference: 'any', videos_requested: 1, social_networks: [], content_duration: '1_month',
    bonus_threshold_views: 0, bonus_amount: 0, influencer_level: 'any', external_link: '',
    max_videos_per_creator: 1,
    vocaroo_link: '',
    reference_link: ''
  });
  const [campLoading, setCampLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dep, camp, app, del, txn, pi] = await Promise.all([
        depositsAPI.list(),
        campaignsAPI.list(),
        applicationsAPI.list(),
        deliverablesAPI.list(),
        transactionsAPI.list(),
        paymentInfoAPI.get()
      ]);
      setDeposits(dep.data);
      setCampaigns(camp.data);
      setApplications(app.data);
      setDeliverables(del.data);
      setTransactions(txn.data);
      setPaymentInfo(pi.data);
      await refreshUser();
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  }, [refreshUser]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!depAmount || parseFloat(depAmount) <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }
    setDepLoading(true);
    try {
      const fd = new FormData();
      fd.append('amount', depAmount);
      fd.append('method', depMethod);
      fd.append('reference', depRef);
      if (depProof) fd.append('proof', depProof);
      await depositsAPI.create(fd);
      toast.success('Depósito enviado. Pendiente de aprobación.');
      setShowDeposit(false);
      setDepAmount('');
      setDepRef('');
      setDepProof(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error');
    }
    setDepLoading(false);
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    if (!campForm.title || !campForm.budget || !campForm.payment_per_video) {
      toast.error('Completa los campos obligatorios');
      return;
    }
    setCampLoading(true);
    try {
      const payload = {
        ...campForm,
        budget: parseFloat(campForm.budget),
        payment_per_video: parseFloat(campForm.payment_per_video),
        videos_requested: parseInt(campForm.videos_requested) || 1,
        bonus_threshold_views: parseInt(campForm.bonus_threshold_views) || 0,
        bonus_amount: parseFloat(campForm.bonus_amount) || 0,
        max_videos_per_creator: parseInt(campForm.max_videos_per_creator) || 1,
      };
      await campaignsAPI.create(payload);
      toast.success('Campaña creada exitosamente');
      setShowCampaign(false);
      setCampForm({
        title: '', description: '', budget: '', payment_per_video: '', niche: '', region: '',
        gender_preference: 'any', videos_requested: 1, social_networks: [], content_duration: '1_month',
        bonus_threshold_views: 0, bonus_amount: 0, influencer_level: 'any', external_link: '',
        max_videos_per_creator: 1, vocaroo_link: '', reference_link: ''
      });
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al crear campaña');
    }
    setCampLoading(false);
  };

  const handleAcceptApp = async (id) => {
    try {
      await applicationsAPI.accept(id);
      toast.success('Aplicación aceptada');
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error');
    }
  };

  const handleRejectApp = async (id) => {
    try {
      await applicationsAPI.reject(id);
      toast.success('Aplicación rechazada');
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error');
    }
  };

  const handleCancelCampaign = async (id) => {
    if (!window.confirm('¿Cancelar campaña? Se reembolsará el presupuesto no gastado.')) return;
    try {
      await campaignsAPI.cancel(id);
      toast.success('Campaña cancelada');
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error');
    }
  };

  const toggleNetwork = (net) => {
    setCampForm(prev => ({
      ...prev,
      social_networks: prev.social_networks.includes(net)
        ? prev.social_networks.filter(n => n !== net)
        : [...prev.social_networks, net]
    }));
  };

  // Abrir Vocaroo en nueva pestaña
  const openVocaroo = () => {
    window.open('https://vocaroo.com/', '_blank');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b border-border/50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-lg" style={{ fontFamily: 'Space Grotesk' }}>
            Family Fans Mony
          </span>
          <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">Anunciante</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">${(user?.balance || 0).toFixed(2)}</span>
          <Button size="sm" onClick={() => setShowDeposit(true)} data-testid="advertiser-deposit-button">
            Depositar
          </Button>
          <button
            onClick={() => { logout(); navigate('/'); }}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="page-container">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="campaigns">Campañas</TabsTrigger>
            <TabsTrigger value="applications">Aplicaciones</TabsTrigger>
            <TabsTrigger value="deliverables">Entregables</TabsTrigger>
            <TabsTrigger value="transactions">Transacciones</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="kpi-card">
                <p className="text-xs text-muted-foreground mb-1">Saldo Disponible</p>
                <p className="text-2xl font-semibold tabular-nums text-primary" style={{ fontFamily: 'Space Grotesk' }}>
                  ${(user?.balance || 0).toFixed(2)}
                </p>
              </div>
              <div className="kpi-card">
                <p className="text-xs text-muted-foreground mb-1">Campañas Activas</p>
                <p className="text-2xl font-semibold tabular-nums" style={{ fontFamily: 'Space Grotesk' }}>
                  {campaigns.filter(c => c.status === 'active').length}
                </p>
              </div>
              <div className="kpi-card">
                <p className="text-xs text-muted-foreground mb-1">Entregables Pendientes</p>
                <p className="text-2xl font-semibold tabular-nums" style={{ fontFamily: 'Space Grotesk' }}>
                  {deliverables.filter(d => d.status === 'pending').length}
                </p>
              </div>
              <div className="kpi-card">
                <p className="text-xs text-muted-foreground mb-1">Depósitos Pendientes</p>
                <p className="text-2xl font-semibold tabular-nums" style={{ fontFamily: 'Space Grotesk' }}>
                  {deposits.filter(d => d.status === 'pending').length}
                </p>
              </div>
            </div>
            <div className="flex gap-3 mb-6">
              <Button onClick={() => setShowCampaign(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Nueva Campaña
              </Button>
              <Button variant="outline" onClick={() => setShowDeposit(true)} className="gap-2">
                <DollarSign className="w-4 h-4" /> Depositar Fondos
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="campaigns">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold" style={{ fontFamily: 'Space Grotesk' }}>Mis Campañas</h2>
              <Button onClick={() => setShowCampaign(true)}>
                <Plus className="w-4 h-4 mr-1" /> Nueva
              </Button>
            </div>
            {campaigns.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="p-8 text-center">
                  <Megaphone className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No tienes campañas. Crea tu primera campaña.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {campaigns.map(c => (
                  <Card key={c.id} className="border-border/50 card-hover">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold">{c.title}</p>
                            <StatusBadge status={c.status} />
                          </div>
                          <p className="text-xs text-muted-foreground">{c.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Presupuesto: <b className="text-foreground">${c.budget}</b></span>
                            <span>Restante: <b className="text-foreground">${c.budget_remaining}</b></span>
                            <span>Videos: {c.videos_completed}/{c.videos_requested}</span>
                            <span>Pago/video: ${c.payment_per_video}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs bg-[hsl(var(--surface-3))] px-2 py-1 rounded font-mono">
                              ID: {c.id}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{c.niche}</span> <span>{c.region}</span> <span>{(c.social_networks||[]).join(', ')}</span>
                          </div>
                          {c.vocaroo_link && (
                            <div className="mt-2 text-xs">
                              <a href={c.vocaroo_link} target="_blank" rel="noopener noreferrer"
                                className="text-primary hover:underline flex items-center gap-1">
                                <Music className="w-3 h-3" /> Audio de instrucciones (Vocaroo)
                              </a>
                            </div>
                          )}
                          {c.reference_link && (
                            <div className="text-xs">
                              <a href={c.reference_link} target="_blank" rel="noopener noreferrer"
                                className="text-primary hover:underline flex items-center gap-1">
                                <ExternalLink className="w-3 h-3" /> Enlace de referencia
                              </a>
                            </div>
                          )}
                        </div>
                        {c.status === 'active' && (
                          <Button size="sm" variant="destructive" onClick={() => handleCancelCampaign(c.id)}>
                            Cancelar
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="applications">
            <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: 'Space Grotesk' }}>Aplicaciones de Creadores</h2>
            {applications.length === 0 ? (
              <Card className="border-border/50"><CardContent className="p-8 text-center text-muted-foreground">Sin aplicaciones</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {applications.map(a => (
                  <Card key={a.id} className="border-border/50">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{a.creator_name}</p>
                          <StatusBadge status={a.status} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Campaña: {a.campaign_title} · {a.creator_email} · {new Date(a.created_at).toLocaleDateString('es-ES')}
                        </p>
                        {a.message && <p className="text-xs mt-1">{a.message}</p>}
                      </div>
                      {a.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleAcceptApp(a.id)}>
                            <CheckCircle2 className="w-4 h-4 mr-1" /> Aceptar
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleRejectApp(a.id)}>
                            <XCircle className="w-4 h-4 mr-1" /> Rechazar
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="deliverables">
            <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: 'Space Grotesk' }}>Entregables</h2>
            {deliverables.length === 0 ? (
              <Card className="border-border/50"><CardContent className="p-8 text-center text-muted-foreground">Sin entregables</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {deliverables.map(d => (
                  <Card key={d.id} className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm">{d.creator_name}</p>
                        <StatusBadge status={d.status} />
                      </div>
                      <p className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString('es-ES')}</p>
                      {d.video_url && (
                        <a href={d.video_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                          <Eye className="w-3 h-3" /> Ver video
                        </a>
                      )}
                      {d.screenshot_url && (
                        <a href={`${API_BASE.replace('/api','')}${d.screenshot_url}`} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                          <Eye className="w-3 h-3" /> Ver captura
                        </a>
                      )}
                      {d.notes && <p className="text-xs mt-1">{d.notes}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="transactions">
            <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: 'Space Grotesk' }}>Transacciones</h2>
            {transactions.length === 0 ? (
              <Card className="border-border/50"><CardContent className="p-8 text-center text-muted-foreground">Sin transacciones</CardContent></Card>
            ) : (
              <div className="space-y-1">
                {transactions.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-[hsl(var(--surface-2))]">
                    <div>
                      <p className="text-sm">{t.description}</p>
                      <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString('es-ES')}</p>
                    </div>
                    <p className={`font-semibold tabular-nums text-sm ${t.amount >= 0 ? 'text-[hsl(152,58%,44%)]' : 'text-[hsl(0,72%,52%)]'}`}>
                      {t.amount >= 0 ? '+' : ''}${t.amount?.toFixed(2)}
                    </p>
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
          <DialogHeader><DialogTitle style={{ fontFamily: 'Space Grotesk' }}>Depositar Fondos</DialogTitle></DialogHeader>
          {paymentInfo.crypto_wallet_address || paymentInfo.bank_name ? (
            <div className="mb-4 p-3 rounded-lg bg-[hsl(var(--surface-2))] text-sm space-y-2">
              <p className="font-medium text-xs text-muted-foreground">Datos de pago:</p>
              {paymentInfo.crypto_wallet_address && (
                <div>
                  <p className="text-xs font-medium">Crypto ({paymentInfo.crypto_currency} - {paymentInfo.crypto_network})</p>
                  <p className="text-xs text-primary font-mono break-all">{paymentInfo.crypto_wallet_address}</p>
                </div>
              )}
              {paymentInfo.bank_name && (
                <div>
                  <p className="text-xs font-medium">Banco: {paymentInfo.bank_name}</p>
                  <p className="text-xs">Titular: {paymentInfo.bank_account_holder}</p>
                  <p className="text-xs">Cuenta: {paymentInfo.bank_account_number}</p>
                  {paymentInfo.bank_details && <p className="text-xs">{paymentInfo.bank_details}</p>}
                </div>
              )}
              {paymentInfo.instructions && <p className="text-xs text-muted-foreground">{paymentInfo.instructions}</p>}
            </div>
          ) : (
            <div className="mb-4 p-3 rounded-lg bg-[hsl(var(--status-pending))]/10 text-sm">
              <p className="text-[hsl(var(--status-pending))]">El administrador aún no ha configurado los datos de pago. Contacta al soporte.</p>
            </div>
          )}
          <form onSubmit={handleDeposit} className="space-y-4">
            <div>
              <Label>Monto (USD)</Label>
              <Input type="number" step="0.01" min="1" value={depAmount} onChange={e => setDepAmount(e.target.value)} placeholder="100.00" required data-testid="deposit-amount-input"/>
            </div>
            <div>
              <Label>Método de Pago</Label>
              <Select value={depMethod} onValueChange={setDepMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="crypto">Criptomoneda (USDT/USDC BEP20)</SelectItem>
                  <SelectItem value="bank">Transferencia Bancaria</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Referencia / Hash de transacción</Label>
              <Input value={depRef} onChange={e => setDepRef(e.target.value)} placeholder="Hash o referencia del pago"/>
            </div>
            <div>
              <Label>Comprobante de Pago</Label>
              {!depProof ? (
                <Input type="file" accept="image/*,.pdf" onChange={e => setDepProof(e.target.files[0])} data-testid="deposit-proof-upload-input"/>
              ) : (
                <DepositProofPreview file={depProof} onRemove={() => setDepProof(null)} />
              )}
              <p className="text-xs text-muted-foreground mt-1">Sube una captura o PDF del comprobante</p>
            </div>
            <Button type="submit" className="w-full" disabled={depLoading}>
              {depLoading ? 'Enviando...' : 'Enviar Depósito'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Campaign Dialog */}
      <Dialog open={showCampaign} onOpenChange={setShowCampaign}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle style={{ fontFamily: 'Space Grotesk' }}>Nueva Campaña</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateCampaign} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Título *</Label>
                <Input value={campForm.title} onChange={e => setCampForm({...campForm, title: e.target.value})} required/>
              </div>
              <div>
                <Label>Nicho</Label>
                <Input value={campForm.niche} onChange={e => setCampForm({...campForm, niche: e.target.value})} placeholder="humor, baile, musica..."/>
              </div>
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea value={campForm.description} onChange={e => setCampForm({...campForm, description: e.target.value})}/>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <Label>Presupuesto Total ($) *</Label>
                <Input type="number" step="0.01" min="1" value={campForm.budget} onChange={e => setCampForm({...campForm, budget: e.target.value})} required/>
              </div>
              <div>
                <Label>Pago por Video ($) *</Label>
                <Input type="number" step="0.01" min="0.01" value={campForm.payment_per_video} onChange={e => setCampForm({...campForm, payment_per_video: e.target.value})} required/>
              </div>
              <div>
                <Label>Videos Solicitados</Label>
                <Input type="number" min="1" value={campForm.videos_requested} onChange={e => setCampForm({...campForm, videos_requested: e.target.value})}/>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Región</Label>
                <Input value={campForm.region} onChange={e => setCampForm({...campForm, region: e.target.value})} placeholder="LATAM, Mexico, Colombia..."/>
              </div>
              <div>
                <Label>Género del Influencer</Label>
                <Select value={campForm.gender_preference} onValueChange={v => setCampForm({...campForm, gender_preference: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Indiferente</SelectItem>
                    <SelectItem value="male">Masculino</SelectItem>
                    <SelectItem value="female">Femenino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Redes Sociales</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {['tiktok', 'instagram', 'youtube', 'facebook'].map(net => (
                  <button key={net} type="button"
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      campForm.social_networks.includes(net)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-[hsl(var(--surface-2))] border-border/50 hover:border-border'
                    }`}
                    onClick={() => toggleNetwork(net)}
                  >
                    {net}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Duración del Contenido</Label>
                <Select value={campForm.content_duration} onValueChange={v => setCampForm({...campForm, content_duration: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1_week">1 Semana</SelectItem>
                    <SelectItem value="1_month">1 Mes</SelectItem>
                    <SelectItem value="6_months">6 Meses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nivel de Influencer</Label>
                <Select value={campForm.influencer_level} onValueChange={v => setCampForm({...campForm, influencer_level: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Cualquiera</SelectItem>
                    <SelectItem value="standard">Estándar</SelectItem>
                    <SelectItem value="micro">Micro-influencer</SelectItem>
                    <SelectItem value="small">Influencer Pequeño</SelectItem>
                    <SelectItem value="top10">Top 10</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Bonus: Umbral de Vistas</Label>
                <Input type="number" min="0" value={campForm.bonus_threshold_views} onChange={e => setCampForm({...campForm, bonus_threshold_views: e.target.value})} placeholder="1000"/>
              </div>
              <div>
                <Label>Bonus: Monto Extra ($)</Label>
                <Input type="number" step="0.01" min="0" value={campForm.bonus_amount} onChange={e => setCampForm({...campForm, bonus_amount: e.target.value})} placeholder="5.00"/>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Enlace Externo (opcional)</Label>
                <Input value={campForm.external_link} onChange={e => setCampForm({...campForm, external_link: e.target.value})} placeholder="https://..."/>
              </div>
              <div>
                <Label>Máx Videos por Creador</Label>
                <Input type="number" min="1" value={campForm.max_videos_per_creator} onChange={e => setCampForm({...campForm, max_videos_per_creator: e.target.value})}/>
              </div>
            </div>

            {/* Sección Multimedia e Instrucciones */}
            <div className="border-t pt-4 mt-2">
              <Label className="text-base font-semibold">Multimedia e Instrucciones</Label>

              {/* Botón y campo para Vocaroo */}
              <div className="mt-3 p-3 rounded-lg bg-[hsl(var(--surface-2))]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm flex items-center gap-2">
                      <Mic className="w-4 h-4 text-primary" /> Audio de Instrucciones (Vocaroo)
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Graba un audio en Vocaroo y pega el enlace aquí.
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={openVocaroo}>
                    <ExternalLink className="w-3 h-3 mr-1" /> Ir a Vocaroo
                  </Button>
                </div>
                <Input
                  type="url"
                  value={campForm.vocaroo_link}
                  onChange={e => setCampForm({...campForm, vocaroo_link: e.target.value})}
                  placeholder="https://vocaroo.com/..."
                  className="mt-2"
                />
              </div>

              {/* Enlace de referencia */}
              <div className="mt-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-primary" /> Enlace de Referencia (Doc, Web, etc.)
                </Label>
                <Input
                  type="url"
                  value={campForm.reference_link}
                  onChange={e => setCampForm({...campForm, reference_link: e.target.value})}
                  placeholder="https://..."
                />
              </div>
            </div>

            <Button type="submit" className="w-full mt-4" disabled={campLoading}>
              {campLoading ? 'Creando...' : 'Crear Campaña'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
