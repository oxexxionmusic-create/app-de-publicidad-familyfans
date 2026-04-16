// src/pages/CreatorDashboard.js
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/App';
import { Link, useNavigate } from 'react-router-dom';
import {
  authAPI, campaignsAPI, applicationsAPI, deliverablesAPI, transactionsAPI,
  withdrawalsAPI, kycAPI, subscriptionsAPI, premiumContentAPI, musicFinancingAPI,
  curatorAPI, referralsAPI, levelRequestsAPI, profilePhotoAPI, deliverableActionsAPI,
  mediaAPI, storageAPI, // <-- NUEVOS
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import MediaUploader from '@/components/MediaUploader'; // <-- NUEVO COMPONENTE
import {
  Wallet, Megaphone, FileCheck, DollarSign, ShieldCheck, Music, Crown, Upload, Plus,
  LogOut, Zap, Eye, Users, TrendingUp, CreditCard, ArrowRight, CheckCircle2, Image, Video,
  Share2, Camera, Award, Clock, ExternalLink, HardDrive, Trash2, Play, File
} from 'lucide-react';

function StatusBadge({ status }) {
  const map = {
    pending: 'status-badge-pending', approved: 'status-badge-approved',
    rejected: 'status-badge-rejected', active: 'status-badge-active',
    completed: 'status-badge-approved', cancelled: 'status-badge-rejected',
    accepted: 'status-badge-approved', verified: 'status-badge-approved',
    none: 'status-badge-pending'
  };
  const labels = {
    pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado',
    active: 'Activo', completed: 'Completado', cancelled: 'Cancelado',
    accepted: 'Aceptado', verified: 'Verificado', none: 'Sin KYC'
  };
  return <span className={map[status] || 'status-badge-pending'}>{labels[status] || status}</span>;
}

export default function CreatorDashboard() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [campaigns, setCampaigns] = useState([]);
  const [applications, setApplications] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  // NUEVO: Estado para medios subidos a Cloudinary
  const [mediaItems, setMediaItems] = useState([]);
  const [storageUsage, setStorageUsage] = useState({ used_mb: 0, limit_mb: 600, available_mb: 600, usage_percent: 0 });

  // Profile form (sin cambios)
  const [showProfile, setShowProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ content_type: '', region: '', gender: '', phone: '', country: '', youtube_url: '', tiktok_url: '', instagram_url: '', facebook_url: '', spotify_url: '', apple_music_url: '', bio: '', creator_level: 'standard', niche: '', avg_views: 0, followers: 0 });
  const [profileScreenshot, setProfileScreenshot] = useState(null);

  // Deliverable form
  const [showDeliverable, setShowDeliverable] = useState(false);
  const [delForm, setDelForm] = useState({ application_id: '', video_url: '', notes: '' });
  const [delScreenshot, setDelScreenshot] = useState(null);

  // KYC, Withdrawal, Premium, Content (ahora con Cloudinary), Financing, Curator, Level...
  const [showKYC, setShowKYC] = useState(false);
  const [kycDoc, setKycDoc] = useState(null);
  const [kycSelfie, setKycSelfie] = useState(null);

  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [wdForm, setWdForm] = useState({ amount: '', method: 'crypto', wallet_address: '', bank_details: '' });

  const [showPremium, setShowPremium] = useState(false);
  const [premiumPrice, setPremiumPrice] = useState('');
  const [premiumDesc, setPremiumDesc] = useState('');

  // Contenido Premium: ahora con soporte para Cloudinary
  const [showContent, setShowContent] = useState(false);
  const [contentForm, setContentForm] = useState({ content_type: 'post', title: '', description: '' });
  const [contentMediaResult, setContentMediaResult] = useState(null); // resultado de Cloudinary

  const [showFinancing, setShowFinancing] = useState(false);
  const [finForm, setFinForm] = useState({ title: '', description: '', amount_requested: '', genre: '', streaming_stats: '' });
  const [finAudio, setFinAudio] = useState(null);

  const [showPlaylist, setShowPlaylist] = useState(false);
  const [playlistForm, setPlaylistForm] = useState({ playlist_url: '', playlist_name: '', song_count: 10, followers: 0 });
  const [playlists, setPlaylists] = useState([]);
  const [showCuratorPay, setShowCuratorPay] = useState(false);
  const [curatorPayForm, setCuratorPayForm] = useState({ playlist_id: '', listens_count: 0, evidence_description: '' });
  const [curatorEvidence, setCuratorEvidence] = useState(null);
  const [curatorRequests, setCuratorRequests] = useState([]);

  const [referralInfo, setReferralInfo] = useState(null);

  const [showLevelReq, setShowLevelReq] = useState(false);
  const [levelReqForm, setLevelReqForm] = useState({ requested_level: 'micro', justification: '', portfolio_links: '' });

  // Cargar todos los datos
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [camp, app, del, txn, wd, sub] = await Promise.all([
        campaignsAPI.available(), applicationsAPI.list(), deliverablesAPI.list(),
        transactionsAPI.list(), withdrawalsAPI.list(), subscriptionsAPI.list()
      ]);
      setCampaigns(camp.data); setApplications(app.data); setDeliverables(del.data);
      setTransactions(txn.data); setWithdrawals(wd.data); setSubscriptions(sub.data);
      try {
        const [pl, cr] = await Promise.all([curatorAPI.playlists(), curatorAPI.requests()]);
        setPlaylists(pl.data); setCuratorRequests(cr.data);
      } catch {}
      try { const ref = await referralsAPI.get(); setReferralInfo(ref.data); } catch {}
      
      // NUEVO: Cargar medios y almacenamiento
      if (user?.id) {
        try {
          const mediaRes = await mediaAPI.list(); // Asumiendo que existe endpoint /media?creator_id=...
          setMediaItems(mediaRes.data);
        } catch {}
        try {
          const storageRes = await storageAPI.getUsage(user.id);
          setStorageUsage(storageRes.data);
        } catch {}
      }
      
      await refreshUser();
    } catch (error) {
      console.error('Error loading creator data:', error);
    }
    setLoading(false);
  }, [refreshUser, user?.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (user?.creator_profile) {
      const cp = user.creator_profile;
      setProfileForm({
        content_type: cp.content_type || '', region: cp.region || '', gender: cp.gender || '',
        phone: user.phone || '', country: user.country || '',
        youtube_url: cp.social_links?.youtube || '', tiktok_url: cp.social_links?.tiktok || '',
        instagram_url: cp.social_links?.instagram || '', facebook_url: cp.social_links?.facebook || '',
        spotify_url: cp.social_links?.spotify || '', apple_music_url: cp.social_links?.apple_music || '',
        bio: cp.bio || '', creator_level: cp.creator_level || 'standard', niche: cp.niche || '',
        avg_views: cp.avg_views || 0, followers: cp.followers || 0,
      });
    }
  }, [user]);

  // Handlers existentes (handleSaveProfile, handleApply, handleDeliverable, etc.) se mantienen sin cambios
  // ... (omitidos por brevedad, pero se mantienen igual que en el código original)
  const handleSaveProfile = async (e) => { /* ... igual ... */ };
  const handleApply = async (campaignId) => { /* ... igual ... */ };
  const handleDeliverable = async (e) => { /* ... igual ... */ };
  const handleKYC = async (e) => { /* ... igual ... */ };
  const handleWithdrawal = async (e) => { /* ... igual ... */ };
  const handleSetPremium = async (e) => { /* ... igual ... */ };
  const handleFinancing = async (e) => { /* ... igual ... */ };
  const handleRegisterPlaylist = async (e) => { /* ... igual ... */ };
  const handleCuratorPayment = async (e) => { /* ... igual ... */ };
  const handleLevelRequest = async (e) => { /* ... igual ... */ };
  const handleProfilePhoto = async (e) => { /* ... igual ... */ };
  const handleClaimBonus = async (delId) => { /* ... igual ... */ };

  // NUEVO: Handler para subir contenido premium (usando Cloudinary)
  const handleAddContent = async (e) => {
    e.preventDefault();
    if (!contentMediaResult) {
      toast.error('Debes subir un archivo multimedia');
      return;
    }
    try {
      const payload = {
        content_type: contentForm.content_type,
        title: contentForm.title,
        description: contentForm.description,
        // Enviamos los datos de Cloudinary al backend para guardar en MongoDB
        cloudinary_public_id: contentMediaResult.public_id,
        cloudinary_url: contentMediaResult.url,
        secure_url: contentMediaResult.url, // Cloudinary ya devuelve secure_url
        type: contentForm.content_type === 'video' ? 'video' : 'image',
        size_mb: (contentMediaResult.bytes / (1024 * 1024)).toFixed(2),
        duration_seconds: contentMediaResult.duration || null,
      };
      await premiumContentAPI.create(payload); // El backend espera estos campos ahora
      toast.success('Contenido premium creado');
      setShowContent(false);
      setContentForm({ content_type: 'post', title: '', description: '' });
      setContentMediaResult(null);
      load(); // Recargar para ver el nuevo contenido
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al crear contenido');
    }
  };

  // NUEVO: Eliminar un medio
  const handleDeleteMedia = async (publicId, resourceType) => {
    if (!window.confirm('¿Eliminar este archivo permanentemente?')) return;
    try {
      await mediaAPI.deleteMedia(publicId, resourceType);
      toast.success('Archivo eliminado');
      load();
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  const acceptedApps = applications.filter(a => a.status === 'accepted');
  const totalEarnings = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar (sin cambios) */}
      <div className="border-b border-border/50">
        <div className="page-container flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold" style={{fontFamily:'Space Grotesk'}}>Family Fans Mony</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Creador</span>
              {user?.is_top10 && <span className="text-xs bg-[hsl(43,96%,56%)]/20 text-[hsl(43,96%,56%)] px-2 py-0.5 rounded-full">Top 10</span>}
              <span className="font-semibold">${(user?.balance || 0).toFixed(2)}</span>
              <StatusBadge status={user?.kyc_status || 'none'} />
            </div>
            <button onClick={() => { logout(); navigate('/'); }} className="text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="page-container">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="campaigns">Campañas</TabsTrigger>
            <TabsTrigger value="applications">Mis Aplicaciones</TabsTrigger>
            <TabsTrigger value="earnings">Ganancias</TabsTrigger>
            <TabsTrigger value="premium">Premium</TabsTrigger>
            <TabsTrigger value="media">Medios</TabsTrigger> {/* NUEVA PESTAÑA */}
            <TabsTrigger value="curator">Curador</TabsTrigger>
            <TabsTrigger value="profile">Perfil</TabsTrigger>
          </TabsList>

          {/* ==================== OVERVIEW (se añade tarjeta de almacenamiento) ==================== */}
          <TabsContent value="overview">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="kpi-card">
                <p className="text-xs text-muted-foreground mb-1">Saldo</p>
                <p className="text-2xl font-semibold tabular-nums text-primary" style={{fontFamily:'Space Grotesk'}}>
                  ${(user?.balance || 0).toFixed(2)}
                </p>
              </div>
              <div className="kpi-card">
                <p className="text-xs text-muted-foreground mb-1">Ganancias Totales</p>
                <p className="text-2xl font-semibold tabular-nums" style={{fontFamily:'Space Grotesk'}}>
                  ${totalEarnings.toFixed(2)}
                </p>
              </div>
              <div className="kpi-card">
                <p className="text-xs text-muted-foreground mb-1">Aplicaciones Activas</p>
                <p className="text-2xl font-semibold tabular-nums" style={{fontFamily:'Space Grotesk'}}>
                  {acceptedApps.length}
                </p>
              </div>
              <div className="kpi-card">
                <p className="text-xs text-muted-foreground mb-1">Suscriptores</p>
                <p className="text-2xl font-semibold tabular-nums" style={{fontFamily:'Space Grotesk'}}>
                  {subscriptions.length}
                </p>
              </div>
            </div>

            {/* NUEVO: Tarjeta de almacenamiento Cloudinary */}
            <Card className="mb-6 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <HardDrive className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-sm" style={{fontFamily:'Space Grotesk'}}>Almacenamiento Cloudinary</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Usado: {storageUsage.used_mb} MB</span>
                    <span>Límite: {storageUsage.limit_mb} MB</span>
                  </div>
                  <Progress value={storageUsage.usage_percent} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {storageUsage.available_mb} MB disponibles. Ganas 600 MB extra por cada 10 suscriptores.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-3 mb-6">
              <Button onClick={() => setShowProfile(true)} variant="outline">
                <Users className="w-4 h-4 mr-1" /> Editar Perfil
              </Button>
              {user?.kyc_status !== 'verified' && (
                <Button onClick={() => setShowKYC(true)} variant="outline">
                  <ShieldCheck className="w-4 h-4 mr-1" /> Completar KYC
                </Button>
              )}
              <Button onClick={() => setShowWithdrawal(true)} data-testid="creator-withdrawal-request-button">
                <CreditCard className="w-4 h-4 mr-1" /> Solicitar Retiro
              </Button>
              <Button onClick={() => setShowPremium(true)} variant="outline">
                <Crown className="w-4 h-4 mr-1" /> Config. Premium
              </Button>
              <Button onClick={() => setShowFinancing(true)} variant="outline">
                <Music className="w-4 h-4 mr-1" /> Financiamiento
              </Button>
              {!user?.level_request_pending && (
                <Button onClick={() => setShowLevelReq(true)} variant="outline">
                  <Award className="w-4 h-4 mr-1" /> Subir de Nivel
                </Button>
              )}
              <label className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border/50 text-sm cursor-pointer hover:bg-secondary">
                <Camera className="w-4 h-4" /> Foto de Perfil
                <input type="file" accept="image/*" className="hidden" onChange={handleProfilePhoto} />
              </label>
            </div>

            {/* Referidos y permanencia (sin cambios) */}
            {/* ... (código original de referidos y permanencia) ... */}
          </TabsContent>

          {/* ==================== CAMPAIGNS (sin cambios) ==================== */}
          <TabsContent value="campaigns">
            {/* ... (código original) ... */}
          </TabsContent>

          {/* ==================== APPLICATIONS (sin cambios) ==================== */}
          <TabsContent value="applications">
            {/* ... (código original) ... */}
          </TabsContent>

          {/* ==================== EARNINGS (sin cambios) ==================== */}
          <TabsContent value="earnings">
            {/* ... (código original) ... */}
          </TabsContent>

          {/* ==================== PREMIUM (actualizado con Cloudinary) ==================== */}
          <TabsContent value="premium">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold" style={{fontFamily:'Space Grotesk'}}>Contenido Premium</h2>
              <div className="flex gap-2">
                <Button onClick={() => setShowPremium(true)} variant="outline">
                  <Crown className="w-4 h-4 mr-1" /> Config. Plan
                </Button>
                <Button onClick={() => setShowContent(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Nuevo Contenido
                </Button>
              </div>
            </div>
            {user?.subscription_plan?.active ? (
              <Card className="border-primary/30 bg-primary/5 mb-4">
                <CardContent className="p-4">
                  <p className="text-sm">Plan activo: <b>${user.subscription_plan.price}/mes</b></p>
                  <p className="text-xs text-muted-foreground">{user.subscription_plan.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">{subscriptions.length} suscriptor(es)</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/50 mb-4">
                <CardContent className="p-8 text-center">
                  <Crown className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Configura tu plan premium para empezar a recibir suscriptores</p>
                </CardContent>
              </Card>
            )}
            {/* Listado de contenido premium (se mantiene similar, pero ahora usaremos mediaItems o un fetch específico) */}
            {/* ... (código original de listado de contenido) ... */}
          </TabsContent>

          {/* ==================== MEDIA (NUEVA PESTAÑA) ==================== */}
          <TabsContent value="media">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold" style={{fontFamily:'Space Grotesk'}}>Mis Archivos Multimedia</h2>
              <Button onClick={() => setShowContent(true)}>
                <Upload className="w-4 h-4 mr-1" /> Subir Nuevo
              </Button>
            </div>
            {mediaItems.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="p-8 text-center text-muted-foreground">
                  <File className="w-8 h-8 mx-auto mb-2" />
                  No has subido ningún archivo multimedia aún.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {mediaItems.map(item => (
                  <Card key={item.id} className="border-border/50 overflow-hidden">
                    <div className="aspect-video bg-muted relative">
                      {item.type === 'image' ? (
                        <img src={item.cloudinary_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <video src={item.cloudinary_url} controls className="w-full h-full object-cover" />
                      )}
                    </div>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium truncate">{item.public_id?.split('/').pop()}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.size_mb} MB · {item.type}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteMedia(item.cloudinary_public_id, item.type)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ==================== CURATOR (sin cambios) ==================== */}
          <TabsContent value="curator">
            {/* ... (código original) ... */}
          </TabsContent>

          {/* ==================== PROFILE (sin cambios) ==================== */}
          <TabsContent value="profile">
            {/* ... (código original) ... */}
          </TabsContent>
        </Tabs>
      </div>

      {/* ==================== DIALOGOS (algunos actualizados) ==================== */}
      
      {/* Profile Dialog (sin cambios) */}
      {/* Deliverable Dialog (sin cambios) */}
      {/* KYC Dialog (sin cambios) */}
      {/* Withdrawal Dialog (sin cambios) */}
      {/* Premium Config Dialog (sin cambios) */}

      {/* Add Premium Content Dialog (ACTUALIZADO CON MEDIAUPLOADER) */}
      <Dialog open={showContent} onOpenChange={setShowContent}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle style={{fontFamily:'Space Grotesk'}}>Nuevo Contenido Premium</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddContent} className="space-y-4">
            <div>
              <Label>Tipo</Label>
              <Select value={contentForm.content_type} onValueChange={v => setContentForm({...contentForm, content_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="post">Post (texto)</SelectItem>
                  <SelectItem value="image">Imagen</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Título</Label>
              <Input value={contentForm.title} onChange={e => setContentForm({...contentForm, title: e.target.value})} />
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea value={contentForm.description} onChange={e => setContentForm({...contentForm, description: e.target.value})} />
            </div>
            <div>
              <Label>Archivo Multimedia</Label>
              <MediaUploader
                onUploadSuccess={(result) => setContentMediaResult(result)}
                accept={contentForm.content_type === 'video' ? 'video/*' : 'image/*'}
                maxSizeMB={contentForm.content_type === 'video' ? 500 : 10}
                maxDuration={420}
                folder={`creators/${user?.id}/premium`}
                resourceType={contentForm.content_type === 'video' ? 'video' : 'image'}
              />
              {contentMediaResult && (
                <p className="text-xs text-green-600 mt-1">
                  Archivo subido: {contentMediaResult.public_id}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full">Publicar Contenido</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Financing Dialog (sin cambios) */}
      {/* Register Playlist Dialog (sin cambios) */}
      {/* Curator Payment Dialog (sin cambios) */}
      {/* Level Up Request Dialog (sin cambios) */}
    </div>
  );
}
