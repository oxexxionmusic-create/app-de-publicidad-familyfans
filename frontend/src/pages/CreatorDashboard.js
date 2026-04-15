import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/App';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI, campaignsAPI, applicationsAPI, deliverablesAPI, transactionsAPI, withdrawalsAPI, kycAPI, subscriptionsAPI, premiumContentAPI, musicFinancingAPI, curatorAPI, referralsAPI, levelRequestsAPI, profilePhotoAPI, deliverableActionsAPI, chatAPI, mediaAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Wallet, Megaphone, FileCheck, DollarSign, ShieldCheck, Music, Crown, Upload, Plus,
  LogOut, Zap, Eye, Users, TrendingUp, CreditCard, ArrowRight, CheckCircle2, Image, Video,
  Share2, Camera, Award, Clock, ExternalLink, MessageCircle, Send, Mic, Paperclip, Lock
} from 'lucide-react';
import ChatWindow from '@/components/Chat/ChatWindow';
import MediaUploader from '@/components/Media/MediaUploader';

function StatusBadge({ status }) {
  const map = { 
    pending: 'status-badge-pending', 
    approved: 'status-badge-approved', 
    rejected: 'status-badge-rejected', 
    active: 'status-badge-active', 
    completed: 'status-badge-approved', 
    cancelled: 'status-badge-rejected', 
    accepted: 'status-badge-approved', 
    verified: 'status-badge-approved', 
    none: 'status-badge-pending' 
  };
  const labels = { 
    pending: 'Pendiente', 
    approved: 'Aprobado', 
    rejected: 'Rechazado', 
    active: 'Activo', 
    completed: 'Completado', 
    cancelled: 'Cancelado', 
    accepted: 'Aceptado', 
    verified: 'Verificado', 
    none: 'Sin KYC' 
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
  
  // Chat state
  const [chatConversations, setChatConversations] = useState([]);
  const [selectedChatFan, setSelectedChatFan] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  
  // Media state
  const [showMediaUploader, setShowMediaUploader] = useState(false);
  const [mediaTargetFan, setMediaTargetFan] = useState(null);
  
  // Profile form
  const [showProfile, setShowProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ 
    content_type: '', region: '', gender: '', phone: '', country: '', 
    youtube_url: '', tiktok_url: '', instagram_url: '', facebook_url: '', 
    spotify_url: '', apple_music_url: '', bio: '', creator_level: 'standard', 
    niche: '', avg_views: 0, followers: 0 
  });
  const [profileScreenshot, setProfileScreenshot] = useState(null);
  
  // Deliverable form
  const [showDeliverable, setShowDeliverable] = useState(false);
  const [delForm, setDelForm] = useState({ application_id: '', video_url: '', notes: '' });
  const [delScreenshot, setDelScreenshot] = useState(null);
  
  // KYC
  const [showKYC, setShowKYC] = useState(false);
  const [kycDoc, setKycDoc] = useState(null);
  const [kycSelfie, setKycSelfie] = useState(null);
  
  // Withdrawal
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [wdForm, setWdForm] = useState({ amount: '', method: 'crypto', wallet_address: '', bank_details: '' });
  
  // Premium
  const [showPremium, setShowPremium] = useState(false);
  const [premiumPrice, setPremiumPrice] = useState('');
  const [premiumDesc, setPremiumDesc] = useState('');
  
  // Premium Content
  const [showContent, setShowContent] = useState(false);
  const [contentForm, setContentForm] = useState({ content_type: 'post', title: '', description: '', media_url: '' });
  const [contentMedia, setContentMedia] = useState(null);
  
  // Music Financing
  const [showFinancing, setShowFinancing] = useState(false);
  const [finForm, setFinForm] = useState({ title: '', description: '', amount_requested: '', genre: '', streaming_stats: '' });
  const [finAudio, setFinAudio] = useState(null);
  
  // Curator
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [playlistForm, setPlaylistForm] = useState({ playlist_url: '', playlist_name: '', song_count: 10, followers: 0 });
  const [playlists, setPlaylists] = useState([]);
  const [showCuratorPay, setShowCuratorPay] = useState(false);
  const [curatorPayForm, setCuratorPayForm] = useState({ playlist_id: '', listens_count: 0, evidence_description: '' });
  const [curatorEvidence, setCuratorEvidence] = useState(null);
  const [curatorRequests, setCuratorRequests] = useState([]);
  
  // Referrals
  const [referralInfo, setReferralInfo] = useState(null);
  
  // Level Request
  const [showLevelReq, setShowLevelReq] = useState(false);
  const [levelReqForm, setLevelReqForm] = useState({ requested_level: 'micro', justification: '', portfolio_links: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setChatLoading(true);
    try {
      const [camp, app, del, txn, wd, sub, chats, pl, cr] = await Promise.all([
        campaignsAPI.available(), 
        applicationsAPI.list(), 
        deliverablesAPI.list(),
        transactionsAPI.list(), 
        withdrawalsAPI.list(), 
        subscriptionsAPI.list(),
        chatAPI.getConversations(),
        curatorAPI.playlists(),
        curatorAPI.requests()
      ]);
      setCampaigns(camp.data); 
      setApplications(app.data); 
      setDeliverables(del.data);
      setTransactions(txn.data); 
      setWithdrawals(wd.data); 
      setSubscriptions(sub.data);
      setChatConversations(chats.data);
      setPlaylists(pl.data); 
      setCuratorRequests(cr.data);
      
      try { const ref = await referralsAPI.get(); setReferralInfo(ref.data); } catch {}
      await refreshUser();
    } catch (err) {
      console.error('Error loading dashboard:', err);
    }
    setLoading(false);
    setChatLoading(false);
  }, [refreshUser]);

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

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      Object.entries(profileForm).forEach(([k,v]) => fd.append(k, v));
      if (profileScreenshot) fd.append('metrics_screenshot', profileScreenshot);
      await authAPI.saveCreatorProfile(fd);
      toast.success('Perfil actualizado');
      setShowProfile(false);
      await refreshUser();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const handleApply = async (campaignId) => {
    try {
      const fd = new FormData();
      fd.append('campaign_id', campaignId);
      await applicationsAPI.create(fd);
      toast.success('Aplicacion enviada');
      load();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const handleDeliverable = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      fd.append('application_id', delForm.application_id);
      fd.append('video_url', delForm.video_url);
      fd.append('notes', delForm.notes);
      if (delScreenshot) fd.append('screenshot', delScreenshot);
      await deliverablesAPI.submit(fd);
      toast.success('Entregable enviado');
      setShowDeliverable(false);
      load();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const handleKYC = async (e) => {
    e.preventDefault();
    if (!kycDoc) { toast.error('Sube tu documento de identidad'); return; }
    try {
      const fd = new FormData();
      fd.append('document', kycDoc);
      if (kycSelfie) fd.append('selfie', kycSelfie);
      await kycAPI.submit(fd);
      toast.success('KYC enviado para revision');
      setShowKYC(false);
      await refreshUser();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const handleWithdrawal = async (e) => {
    e.preventDefault();
    try {
      await withdrawalsAPI.request({
        amount: parseFloat(wdForm.amount),
        method: wdForm.method,
        wallet_address: wdForm.wallet_address,
        bank_details: wdForm.bank_details,
      });
      toast.success('Solicitud de retiro enviada');
      setShowWithdrawal(false);
      load();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const handleSetPremium = async (e) => {
    e.preventDefault();
    try {
      await subscriptionsAPI.setPlan({ price: parseFloat(premiumPrice), description: premiumDesc });
      toast.success('Plan premium actualizado');
      setShowPremium(false);
      await refreshUser();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const handleAddContent = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      fd.append('content_type', contentForm.content_type);
      fd.append('title', contentForm.title);
      fd.append('description', contentForm.description);
      fd.append('media_url', contentForm.media_url);
      if (contentMedia) fd.append('media', contentMedia);
      await premiumContentAPI.create(fd);
      toast.success('Contenido premium creado');
      setShowContent(false);
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const handleFinancing = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      fd.append('title', finForm.title);
      fd.append('description', finForm.description);
      fd.append('amount_requested', finForm.amount_requested);
      fd.append('genre', finForm.genre);
      fd.append('streaming_stats', finForm.streaming_stats);
      if (finAudio) fd.append('audio', finAudio);
      await musicFinancingAPI.request(fd);
      toast.success('Solicitud de financiamiento enviada');
      setShowFinancing(false);
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const handleRegisterPlaylist = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      fd.append('playlist_url', playlistForm.playlist_url);
      fd.append('playlist_name', playlistForm.playlist_name);
      fd.append('song_count', playlistForm.song_count);
      fd.append('followers', playlistForm.followers);
      await curatorAPI.registerPlaylist(fd);
      toast.success('Playlist registrada');
      setShowPlaylist(false);
      load();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const handleCuratorPayment = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      fd.append('playlist_id', curatorPayForm.playlist_id);
      fd.append('listens_count', curatorPayForm.listens_count);
      fd.append('evidence_description', curatorPayForm.evidence_description);
      if (curatorEvidence) fd.append('evidence', curatorEvidence);
      await curatorAPI.requestPayment(fd);
      toast.success('Solicitud de pago enviada');
      setShowCuratorPay(false);
      load();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const handleLevelRequest = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      fd.append('requested_level', levelReqForm.requested_level);
      fd.append('justification', levelReqForm.justification);
      fd.append('portfolio_links', levelReqForm.portfolio_links);
      await levelRequestsAPI.request(fd);
      toast.success('Solicitud de nivel enviada');
      setShowLevelReq(false);
      await refreshUser();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const handleProfilePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('photo', file);
      await profilePhotoAPI.upload(fd);
      toast.success('Foto actualizada');
      await refreshUser();
    } catch (err) { toast.error('Error al subir foto'); }
  };

  const handleClaimBonus = async (delId) => {
    try {
      await deliverableActionsAPI.claimBonus(delId);
      toast.success('Bonus reclamado');
      load();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const handleSendMediaToFan = async (fanId, mediaData) => {
    try {
      const formData = new FormData();
      formData.append('recipient_id', fanId);
      formData.append('file', mediaData.file);
      formData.append('type', mediaData.type);
      formData.append('description', mediaData.description || '');
      formData.append('is_paid', mediaData.isPaid || false);
      if (mediaData.isPaid && mediaData.price) {
        formData.append('price', parseFloat(mediaData.price));
      }
      
      await mediaAPI.uploadToChat(formData);
      toast.success('Contenido enviado al fan');
      setShowMediaUploader(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al enviar contenido');
    }
  };

  const acceptedApps = applications.filter(a => a.status === 'accepted');
  const totalEarnings = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b border-border bg-[hsl(var(--surface-1))]">
        <div className="page-container py-3 flex items-center justify-between">
          <Link to="/" className="font-semibold text-lg" style={{fontFamily:'Space Grotesk'}}>
            Family Fans Mony
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm">Creador</span>
            {user?.is_top10 && <span className="text-xs bg-[hsl(43,96%,56%)]/20 text-[hsl(43,96%,56%)] px-2 py-0.5 rounded-full">Top 10</span>}
            <span className="font-semibold tabular-nums">${(user?.balance || 0).toFixed(2)}</span>
            <button onClick={() => { logout(); navigate('/'); }} className="text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="page-container">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="campaigns">Campanas</TabsTrigger>
            <TabsTrigger value="applications">Mis Aplicaciones</TabsTrigger>
            <TabsTrigger value="earnings">Ganancias</TabsTrigger>
            <TabsTrigger value="premium">Premium</TabsTrigger>
            <TabsTrigger value="curator">Curador</TabsTrigger>
            <TabsTrigger value="chat">Chats Privados</TabsTrigger>
            <TabsTrigger value="profile">Perfil</TabsTrigger>
          </TabsList>

          {/* ==================== RESUMEN ==================== */}
          <TabsContent value="overview">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="kpi-card">
                <p className="text-xs text-muted-foreground mb-1">Saldo</p>
                <p className="text-2xl font-semibold tabular-nums text-primary" style={{fontFamily:'Space Grotesk'}}>${(user?.balance || 0).toFixed(2)}</p>
              </div>
              <div className="kpi-card">
                <p className="text-xs text-muted-foreground mb-1">Ganancias Totales</p>
                <p className="text-2xl font-semibold tabular-nums" style={{fontFamily:'Space Grotesk'}}>${totalEarnings.toFixed(2)}</p>
              </div>
              <div className="kpi-card">
                <p className="text-xs text-muted-foreground mb-1">Aplicaciones Activas</p>
                <p className="text-2xl font-semibold tabular-nums" style={{fontFamily:'Space Grotesk'}}>{acceptedApps.length}</p>
              </div>
              <div className="kpi-card">
                <p className="text-xs text-muted-foreground mb-1">Suscriptores</p>
                <p className="text-2xl font-semibold tabular-nums" style={{fontFamily:'Space Grotesk'}}>{subscriptions.length}</p>
              </div>
            </div>
            
            <div className="flex gap-3 mb-6">
              <Button onClick={() => setShowProfile(true)} variant="outline"><Edit className="w-4 h-4 mr-1" /> Editar Perfil</Button>
              {user?.kyc_status !== 'verified' && (
                <Button onClick={() => setShowKYC(true)} variant="outline"><ShieldCheck className="w-4 h-4 mr-1" /> Completar KYC</Button>
              )}
              <Button onClick={() => setShowWithdrawal(true)} data-testid="creator-withdrawal-request-button"><CreditCard className="w-4 h-4 mr-1" /> Solicitar Retiro</Button>
              <Button onClick={() => setShowPremium(true)} variant="outline"><Crown className="w-4 h-4 mr-1" /> Config. Premium</Button>
              <Button onClick={() => setShowFinancing(true)} variant="outline"><DollarSign className="w-4 h-4 mr-1" /> Financiamiento</Button>
              {!user?.level_request_pending && (
                <Button onClick={() => setShowLevelReq(true)} variant="outline"><TrendingUp className="w-4 h-4 mr-1" /> Subir de Nivel</Button>
              )}
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={handleProfilePhoto} />
                <Button variant="outline"><Camera className="w-4 h-4 mr-1" /> Foto de Perfil</Button>
              </label>
            </div>

            {/* Programa de Referidos */}
            {referralInfo && (
              <Card className="border-border/50 mb-6">
                <CardHeader><CardTitle className="text-base" style={{fontFamily:'Space Grotesk'}}>Programa de Referidos</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm">Tu codigo de referido: <span className="font-mono bg-[hsl(var(--surface-2))] px-2 py-1 rounded">{referralInfo.referral_code}</span></p>
                  <p className="text-sm text-muted-foreground mt-1">{referralInfo.referrals_count} referidos · ${referralInfo.total_referral_earnings?.toFixed(4)} ganados</p>
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => { navigator.clipboard.writeText(referralInfo.referral_code); toast.success('Codigo copiado'); }}>
                    Copiar
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">Ganas 5% de la comision de la plataforma por cada ingreso de tus referidos, de por vida.</p>
                </CardContent>
              </Card>
            )}

            {/* Tiempo de Permanencia */}
            {deliverables.filter(d => d.status === 'approved' && !d.final_payment_released).length > 0 && (
              <Card className="border-border/50 mb-6">
                <CardHeader><CardTitle className="text-base" style={{fontFamily:'Space Grotesk'}}>Campanas Activas - Tiempo de Permanencia</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {deliverables.filter(d => d.status === 'approved' && !d.final_payment_released).map(d => {
                    const endDate = d.permanence_end ? new Date(d.permanence_end) : null;
                    const daysLeft = endDate ? Math.max(0, Math.ceil((endDate - new Date()) / (1000*60*60*24))) : 0;
                    return (
                      <div key={d.id} className="p-3 rounded-lg bg-[hsl(var(--surface-2))]">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{d.campaign_title}</p>
                            <p className="text-xs text-muted-foreground">40% liberado · 60% pendiente{d.held_payout ? ` ($${d.held_payout})` : ''}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">{daysLeft} dias restantes</p>
                            {!d.bonus_claimed && d.bonus_amount > 0 && (
                              <Button size="sm" variant="outline" className="mt-1" onClick={() => handleClaimBonus(d.id)}>
                                Reclamar Bonus ${d.bonus_amount}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Perfil incompleto */}
            {!user?.creator_profile && (
              <Card className="border-border/50 mb-6">
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground mb-3">Completa tu perfil de creador para aplicar a campanas</p>
                  <Button onClick={() => setShowProfile(true)}>Completar Perfil</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ==================== CAMPANAS ==================== */}
          <TabsContent value="campaigns">
            <h2 className="text-xl font-semibold mb-4" style={{fontFamily:'Space Grotesk'}}>Campanas Disponibles</h2>
            {campaigns.length === 0 ? (
              <Card className="border-border/50"><CardContent className="p-8 text-center text-muted-foreground">No hay campanas disponibles</CardContent></Card>
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
                          
                          {/* Vocaroo & Reference Links */}
                          {c.vocaroo_link && (
                            <div className="mt-2 text-xs">
                              <a href={c.vocaroo_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                                <Music className="w-3 h-3" /> Escuchar Instrucciones de Voz
                              </a>
                            </div>
                          )}
                          {c.reference_link && (
                            <div className="text-xs">
                              <a href={c.reference_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                                <ExternalLink className="w-3 h-3" /> Enlace de Referencia
                              </a>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Pago/video: <b className="text-foreground">${c.payment_per_video}</b></span>
                            <span>Videos: {c.videos_requested - c.videos_completed} restantes</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{c.niche}</span><span>{c.region}</span><span>{(c.social_networks||[]).join(', ')}</span>
                          </div>
                          {c.bonus_amount > 0 && (
                            <p className="text-xs text-primary mt-1">Bonus: ${c.bonus_amount} si superas {c.bonus_threshold_views} vistas</p>
                          )}
                        </div>
                        <div>
                          {c.already_applied ? (
                            <span className="status-badge-approved text-xs">Aplicado</span>
                          ) : (
                            <Button size="sm" onClick={() => handleApply(c.id)} data-testid="campaign-apply-button">
                              Aplicar
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ==================== MIS APLICACIONES ==================== */}
          <TabsContent value="applications">
            <h2 className="text-xl font-semibold mb-4" style={{fontFamily:'Space Grotesk'}}>Mis Aplicaciones</h2>
            {applications.length === 0 ? (
              <Card className="border-border/50"><CardContent className="p-8 text-center text-muted-foreground">Sin aplicaciones</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {applications.map(a => (
                  <Card key={a.id} className="border-border/50">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{a.campaign_title}</p>
                        <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString('es-ES')}</p>
                        <StatusBadge status={a.status} />
                      </div>
                      {a.status === 'accepted' && (
                        <Button size="sm" onClick={() => { setDelForm({...delForm, application_id: a.id}); setShowDeliverable(true); }}>
                          Subir Entregable
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ==================== GANANCIAS ==================== */}
          <TabsContent value="earnings">
            <h2 className="text-xl font-semibold mb-4" style={{fontFamily:'Space Grotesk'}}>Ganancias y Transacciones</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Ganado</p><p className="text-xl font-semibold">${totalEarnings.toFixed(2)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Retiros Realizados</p><p className="text-xl font-semibold">{withdrawals.filter(w=>w.status==='approved').length}</p></CardContent></Card>
            </div>
            <div className="space-y-1">
              {transactions.map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-[hsl(var(--surface-2))]">
                  <div><p className="text-sm">{t.description}</p><p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString('es-ES')}</p></div>
                  <p className={`font-semibold tabular-nums text-sm ${t.amount >= 0 ? 'text-[hsl(152,58%,44%)]' : 'text-[hsl(0,72%,52%)]'}`}>
                    {t.amount >= 0 ? '+' : ''}${t.amount?.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ==================== PREMIUM ==================== */}
          <TabsContent value="premium">
            <h2 className="text-xl font-semibold mb-4" style={{fontFamily:'Space Grotesk'}}>Contenido Premium</h2>
            <div className="flex gap-3 mb-6">
              <Button onClick={() => setShowPremium(true)} variant="outline"><Crown className="w-4 h-4 mr-1" /> Config. Plan</Button>
              <Button onClick={() => setShowContent(true)}><Plus className="w-4 h-4 mr-1" /> Nuevo Contenido</Button>
            </div>
            {user?.subscription_plan?.active ? (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4">
                  <p className="font-medium">Plan activo: ${user.subscription_plan.price}/mes</p>
                  <p className="text-sm text-muted-foreground">{user.subscription_plan.description}</p>
                  <p className="text-sm mt-2">{subscriptions.length} suscriptor(es)</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/50"><CardContent className="p-6 text-center text-muted-foreground">Configura tu plan premium para empezar a recibir suscriptores</CardContent></Card>
            )}
          </TabsContent>

          {/* ==================== CURADOR ==================== */}
          <TabsContent value="curator">
            <h2 className="text-xl font-semibold mb-4" style={{fontFamily:'Space Grotesk'}}>Curador de Spotify</h2>
            <div className="flex gap-3 mb-6">
              <Button onClick={() => setShowPlaylist(true)} variant="outline"><Plus className="w-4 h-4 mr-1" /> Registrar Playlist</Button>
              {playlists.length > 0 && <Button onClick={() => setShowCuratorPay(true)}>Solicitar Pago</Button>}
            </div>
            <Card className="border-border/50 mb-6">
              <CardContent className="p-4">
                <p className="font-medium mb-2">Tarifas de Pago:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 10 canciones, 1000 escuchas: $9.00</li>
                  <li>• 25 canciones, 1000 escuchas: $22.00</li>
                  <li>• 10 canciones, 500 escuchas: $4.00</li>
                  <li>• 5 canciones, 500 escuchas: $2.00</li>
                  <li>• 10 canciones, 100 escuchas: $0.30</li>
                </ul>
              </CardContent>
            </Card>
            {playlists.length > 0 && (
              <div className="mb-6">
                <p className="font-medium mb-2">Mis Playlists</p>
                <div className="space-y-2">
                  {playlists.map(p => (
                    <Card key={p.id} className="border-border/50">
                      <CardContent className="p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{p.playlist_name || 'Playlist'}</p>
                          <p className="text-xs text-muted-foreground">{p.song_count} canciones · {p.followers} seguidores</p>
                        </div>
                        <a href={p.playlist_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" /> Ver en Spotify
                        </a>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            {curatorRequests.length > 0 && (
              <div>
                <p className="font-medium mb-2">Solicitudes de Pago</p>
                <div className="space-y-2">
                  {curatorRequests.map(r => (
                    <Card key={r.id} className="border-border/50">
                      <CardContent className="p-3">
                        <p className="font-medium text-sm">{r.playlist_name} · {r.listens_count} escuchas</p>
                        <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString('es-ES')} · Pago: ${r.calculated_payout}</p>
                        <StatusBadge status={r.status} />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ==================== CHATS PRIVADOS ==================== */}
          <TabsContent value="chat">
            {selectedChatFan ? (
              <div className="h-[calc(100vh-200px)]">
                <ChatWindow
                  otherUserId={selectedChatFan.other_user_id}
                  otherUserName={selectedChatFan.other_user_name}
                  otherUserPhoto={selectedChatFan.other_user_photo}
                  onBack={() => setSelectedChatFan(null)}
                  isCreator={true}
                  onSendPremiumContent={(data) => handleSendMediaToFan(selectedChatFan.other_user_id, data)}
                />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold" style={{fontFamily:'Space Grotesk'}}>Chats con Fans</h2>
                </div>
                
                <Card className="border-primary/30 bg-primary/5 mb-6">
                  <CardContent className="p-4 flex items-start gap-3">
                    <MessageCircle className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Chat Exclusivo con Fans</p>
                      <p className="text-sm text-muted-foreground">
                        Responde mensajes de tus fans suscritos. Puedes enviar contenido exclusivo (imágenes, videos) que requiere pago para desbloquear.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {chatLoading ? (
                  <div className="space-y-3">
                    {[1,2,3].map(i => (
                      <Card key={i} className="border-border/50">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-[hsl(var(--surface-2))] animate-pulse" />
                            <div className="flex-1 space-y-2">
                              <div className="h-4 w-32 bg-[hsl(var(--surface-2))] rounded animate-pulse" />
                              <div className="h-3 w-48 bg-[hsl(var(--surface-2))] rounded animate-pulse" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : chatConversations.length === 0 ? (
                  <Card className="border-border/50">
                    <CardContent className="p-12 text-center">
                      <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-2">Aún no tienes conversaciones con fans</p>
                      <p className="text-sm text-muted-foreground">Los fans que se suscriban a ti podrán iniciar chat</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {chatConversations.map(conv => (
                      <Card 
                        key={conv.other_user_id} 
                        className="border-border/50 card-hover cursor-pointer"
                        onClick={() => setSelectedChatFan(conv)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={conv.other_user_photo || `https://ui-avatars.com/api/?name=${conv.other_user_name}&background=random`}
                              alt={conv.other_user_name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="font-medium truncate">{conv.other_user_name}</p>
                                {conv.unread_count > 0 && (
                                  <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                                    {conv.unread_count}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground truncate">
                                {conv.last_message || 'Esperando mensaje del fan...'}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(conv.last_message_at).toLocaleDateString('es-ES')}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* ==================== PERFIL ==================== */}
          <TabsContent value="profile">
            <h2 className="text-xl font-semibold mb-4" style={{fontFamily:'Space Grotesk'}}>Mi Perfil de Creador</h2>
            {user?.creator_profile ? (
              <Card className="border-border/50">
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-xs text-muted-foreground">Nicho</p><p className="font-medium capitalize">{user.creator_profile.niche}</p></div>
                    <div><p className="text-xs text-muted-foreground">Nivel</p><p className="font-medium capitalize">{user.creator_profile.creator_level}</p></div>
                    <div><p className="text-xs text-muted-foreground">Region</p><p className="font-medium">{user.creator_profile.region}</p></div>
                    <div><p className="text-xs text-muted-foreground">Seguidores</p><p className="font-medium">{user.creator_profile.followers?.toLocaleString()}</p></div>
                    <div><p className="text-xs text-muted-foreground">Vistas Prom</p><p className="font-medium">{user.creator_profile.avg_views?.toLocaleString()}</p></div>
                    <div><p className="text-xs text-muted-foreground">Contenido</p><p className="font-medium capitalize">{user.creator_profile.content_type}</p></div>
                  </div>
                  {user.creator_profile.bio && (
                    <div>
                      <p className="text-xs text-muted-foreground">Bio</p>
                      <p className="text-sm">{user.creator_profile.bio}</p>
                    </div>
                  )}
                  <Button onClick={() => setShowProfile(true)} variant="outline">Editar Perfil</Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/50"><CardContent className="p-6 text-center text-muted-foreground">No has completado tu perfil de creador<Button onClick={() => setShowProfile(true)} className="mt-4">Completar Ahora</Button></CardContent></Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ==================== DIALOGS ==================== */}
      
      {/* Profile Dialog */}
      <Dialog open={showProfile} onOpenChange={setShowProfile}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle style={{fontFamily:'Space Grotesk'}}>Perfil de Creador</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Nicho</Label><Input value={profileForm.niche} onChange={e => setProfileForm({...profileForm, niche: e.target.value})} placeholder="humor, baile, musica..." /></div>
              <div><Label>Tipo de Contenido</Label><Input value={profileForm.content_type} onChange={e => setProfileForm({...profileForm, content_type: e.target.value})} placeholder="Videos, fotos, musica..." /></div>
              <div><Label>Region</Label><Input value={profileForm.region} onChange={e => setProfileForm({...profileForm, region: e.target.value})} placeholder="LATAM" /></div>
              <div><Label>Pais</Label><Input value={profileForm.country} onChange={e => setProfileForm({...profileForm, country: e.target.value})} /></div>
              <div><Label>Genero</Label>
                <Select value={profileForm.gender} onValueChange={v => setProfileForm({...profileForm, gender: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="male">Masculino</SelectItem><SelectItem value="female">Femenino</SelectItem><SelectItem value="other">Otro</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Telefono</Label><Input value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} placeholder="+57..." /></div>
              <div><Label>Nivel</Label>
                <Select value={profileForm.creator_level} onValueChange={v => setProfileForm({...profileForm, creator_level: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="standard">Estandar</SelectItem><SelectItem value="micro">Micro-Influencer</SelectItem><SelectItem value="small">Influencer Pequeno</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Seguidores Totales</Label><Input type="number" value={profileForm.followers} onChange={e => setProfileForm({...profileForm, followers: parseInt(e.target.value)||0})} /></div>
              <div><Label>Vistas Promedio</Label><Input type="number" value={profileForm.avg_views} onChange={e => setProfileForm({...profileForm, avg_views: parseInt(e.target.value)||0})} /></div>
            </div>
            <div><Label>Bio</Label><Textarea value={profileForm.bio} onChange={e => setProfileForm({...profileForm, bio: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>YouTube</Label><Input value={profileForm.youtube_url} onChange={e => setProfileForm({...profileForm, youtube_url: e.target.value})} placeholder="https://youtube.com/..." /></div>
              <div><Label>TikTok</Label><Input value={profileForm.tiktok_url} onChange={e => setProfileForm({...profileForm, tiktok_url: e.target.value})} placeholder="https://tiktok.com/..." /></div>
              <div><Label>Instagram</Label><Input value={profileForm.instagram_url} onChange={e => setProfileForm({...profileForm, instagram_url: e.target.value})} /></div>
              <div><Label>Facebook</Label><Input value={profileForm.facebook_url} onChange={e => setProfileForm({...profileForm, facebook_url: e.target.value})} /></div>
              <div><Label>Spotify</Label><Input value={profileForm.spotify_url} onChange={e => setProfileForm({...profileForm, spotify_url: e.target.value})} /></div>
              <div><Label>Apple Music</Label><Input value={profileForm.apple_music_url} onChange={e => setProfileForm({...profileForm, apple_music_url: e.target.value})} /></div>
            </div>
            <div><Label>Captura de Metricas</Label><Input type="file" accept="image/*" onChange={e => setProfileScreenshot(e.target.files[0])} /><p className="text-xs text-muted-foreground mt-1">Captura de pantalla de tus estadisticas</p></div>
            <Button type="submit" className="w-full">Guardar Perfil</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deliverable Dialog */}
      <Dialog open={showDeliverable} onOpenChange={setShowDeliverable}>
        <DialogContent>
          <DialogHeader><DialogTitle style={{fontFamily:'Space Grotesk'}}>Subir Entregable</DialogTitle></DialogHeader>
          <form onSubmit={handleDeliverable} className="space-y-4">
            <div><Label>URL del Video</Label><Input value={delForm.video_url} onChange={e => setDelForm({...delForm, video_url: e.target.value})} placeholder="https://tiktok.com/..." /></div>
            <div><Label>Captura de Pantalla</Label><Input type="file" accept="image/*" onChange={e => setDelScreenshot(e.target.files[0])} /></div>
            <div><Label>Notas</Label><Textarea value={delForm.notes} onChange={e => setDelForm({...delForm, notes: e.target.value})} /></div>
            <Button type="submit" className="w-full">Enviar Entregable</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* KYC Dialog */}
      <Dialog open={showKYC} onOpenChange={setShowKYC}>
        <DialogContent>
          <DialogHeader><DialogTitle style={{fontFamily:'Space Grotesk'}}>Verificacion KYC</DialogTitle></DialogHeader>
          <form onSubmit={handleKYC} className="space-y-4">
            <div><Label>Documento de Identidad *</Label><Input type="file" accept="image/*,.pdf" onChange={e => setKycDoc(e.target.files[0])} required data-testid="kyc-upload-document-input" /></div>
            <div><Label>Selfie (opcional)</Label><Input type="file" accept="image/*" onChange={e => setKycSelfie(e.target.files[0])} /></div>
            <Button type="submit" className="w-full">Enviar KYC</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Withdrawal Dialog */}
      <Dialog open={showWithdrawal} onOpenChange={setShowWithdrawal}>
        <DialogContent>
          <DialogHeader><DialogTitle style={{fontFamily:'Space Grotesk'}}>Solicitar Retiro</DialogTitle></DialogHeader>
          <form onSubmit={handleWithdrawal} className="space-y-4">
            <p className="text-sm">Saldo disponible: ${(user?.balance || 0).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Minimo: $10 · Comision: {user?.is_top10 ? '35%' : '25%'} · Max: {user?.is_top10 ? '3' : '1'} retiros/mes</p>
            {user?.kyc_status !== 'verified' && <p className="text-xs text-destructive">Debes completar KYC para retirar</p>}
            <div><Label>Monto (USD)</Label><Input type="number" step="0.01" min="10" value={wdForm.amount} onChange={e => setWdForm({...wdForm, amount: e.target.value})} required /></div>
            <div><Label>Metodo</Label>
              <Select value={wdForm.method} onValueChange={v => setWdForm({...wdForm, method: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="crypto">Cripto</SelectItem><SelectItem value="bank">Banco</SelectItem></SelectContent>
              </Select>
            </div>
            {wdForm.method === 'crypto' && <div><Label>Wallet Address</Label><Input value={wdForm.wallet_address} onChange={e => setWdForm({...wdForm, wallet_address: e.target.value})} placeholder="0x..." /></div>}
            {wdForm.method === 'bank' && <div><Label>Datos Bancarios</Label><Textarea value={wdForm.bank_details} onChange={e => setWdForm({...wdForm, bank_details: e.target.value})} placeholder="Banco, titular, cuenta..." /></div>}
            <Button type="submit" className="w-full" disabled={user?.kyc_status !== 'verified'}>Solicitar Retiro</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Premium Config */}
      <Dialog open={showPremium} onOpenChange={setShowPremium}>
        <DialogContent>
          <DialogHeader><DialogTitle style={{fontFamily:'Space Grotesk'}}>Configurar Suscripcion Premium</DialogTitle></DialogHeader>
          <form onSubmit={handleSetPremium} className="space-y-4">
            <div><Label>Precio Mensual (USD)</Label><Input type="number" step="0.01" min="0.01" value={premiumPrice} onChange={e => setPremiumPrice(e.target.value)} required /></div>
            <div><Label>Descripcion</Label><Textarea value={premiumDesc} onChange={e => setPremiumDesc(e.target.value)} placeholder="Que incluye tu suscripcion..." /></div>
            <Button type="submit" className="w-full">Guardar Plan</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Premium Content */}
      <Dialog open={showContent} onOpenChange={setShowContent}>
        <DialogContent>
          <DialogHeader><DialogTitle style={{fontFamily:'Space Grotesk'}}>Nuevo Contenido Premium</DialogTitle></DialogHeader>
          <form onSubmit={handleAddContent} className="space-y-4">
            <div><Label>Tipo</Label>
              <Select value={contentForm.content_type} onValueChange={v => setContentForm({...contentForm, content_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="post">Post</SelectItem><SelectItem value="photo">Foto</SelectItem><SelectItem value="video">Video</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Titulo</Label><Input value={contentForm.title} onChange={e => setContentForm({...contentForm, title: e.target.value})} /></div>
            <div><Label>Descripcion</Label><Textarea value={contentForm.description} onChange={e => setContentForm({...contentForm, description: e.target.value})} /></div>
            <div><Label>URL del Media (opcional)</Label><Input value={contentForm.media_url} onChange={e => setContentForm({...contentForm, media_url: e.target.value})} /></div>
            <div><Label>Subir Archivo (opcional)</Label><Input type="file" accept="image/*,video/*" onChange={e => setContentMedia(e.target.files[0])} /></div>
            <Button type="submit" className="w-full">Publicar</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Music Financing */}
      <Dialog open={showFinancing} onOpenChange={setShowFinancing}>
        <DialogContent>
          <DialogHeader><DialogTitle style={{fontFamily:'Space Grotesk'}}>Solicitar Financiamiento Musical</DialogTitle></DialogHeader>
          <form onSubmit={handleFinancing} className="space-y-4">
            <div><Label>Titulo del Proyecto *</Label><Input value={finForm.title} onChange={e => setFinForm({...finForm, title: e.target.value})} required /></div>
            <div><Label>Descripcion</Label><Textarea value={finForm.description} onChange={e => setFinForm({...finForm, description: e.target.value})} /></div>
            <div><Label>Monto Solicitado ($)</Label><Input type="number" step="0.01" min="1" value={finForm.amount_requested} onChange={e => setFinForm({...finForm, amount_requested: e.target.value})} /></div>
            <div><Label>Genero Musical</Label><Input value={finForm.genre} onChange={e => setFinForm({...finForm, genre: e.target.value})} /></div>
            <div><Label>Estadisticas de Streaming</Label><Textarea value={finForm.streaming_stats} onChange={e => setFinForm({...finForm, streaming_stats: e.target.value})} placeholder="Oyentes mensuales, seguidores..." /></div>
            <div><Label>Audio/Demo (opcional)</Label><Input type="file" accept="audio/*" onChange={e => setFinAudio(e.target.files[0])} /></div>
            <Button type="submit" className="w-full">Enviar Solicitud</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Register Playlist */}
      <Dialog open={showPlaylist} onOpenChange={setShowPlaylist}>
        <DialogContent>
          <DialogHeader><DialogTitle style={{fontFamily:'Space Grotesk'}}>Registrar Playlist de Spotify</DialogTitle></DialogHeader>
          <form onSubmit={handleRegisterPlaylist} className="space-y-4">
            <div><Label>URL de la Playlist *</Label><Input value={playlistForm.playlist_url} onChange={e => setPlaylistForm({...playlistForm, playlist_url: e.target.value})} placeholder="https://open.spotify.com/playlist/..." required /></div>
            <div><Label>Nombre de la Playlist</Label><Input value={playlistForm.playlist_name} onChange={e => setPlaylistForm({...playlistForm, playlist_name: e.target.value})} /></div>
            <div><Label>Numero de Canciones (5-25)</Label><Input type="number" min="5" max="25" value={playlistForm.song_count} onChange={e => setPlaylistForm({...playlistForm, song_count: parseInt(e.target.value)||5})} /></div>
            <div><Label>Seguidores/Me gusta (min 10)</Label><Input type="number" min="10" value={playlistForm.followers} onChange={e => setPlaylistForm({...playlistForm, followers: parseInt(e.target.value)||0})} /></div>
            <Button type="submit" className="w-full">Registrar Playlist</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Curator Payment Request */}
      <Dialog open={showCuratorPay} onOpenChange={setShowCuratorPay}>
        <DialogContent>
          <DialogHeader><DialogTitle style={{fontFamily:'Space Grotesk'}}>Solicitar Pago de Curador</DialogTitle></DialogHeader>
          <form onSubmit={handleCuratorPayment} className="space-y-4">
            <div><Label>Playlist</Label>
              <Select value={curatorPayForm.playlist_id} onValueChange={v => setCuratorPayForm({...curatorPayForm, playlist_id: v})}>
                <SelectTrigger><SelectValue placeholder="Seleccionar playlist" /></SelectTrigger>
                <SelectContent>
                  {playlists.map(p => <SelectItem key={p.id} value={p.id}>{p.playlist_name || 'Playlist'} ({p.song_count} canciones)</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Numero de Escuchas Completas</Label><Input type="number" min="1" value={curatorPayForm.listens_count} onChange={e => setCuratorPayForm({...curatorPayForm, listens_count: parseInt(e.target.value)||0})} /></div>
            <div><Label>Descripcion de Evidencia</Label><Textarea value={curatorPayForm.evidence_description} onChange={e => setCuratorPayForm({...curatorPayForm, evidence_description: e.target.value})} placeholder="Describe las pruebas de escucha..." /></div>
            <div><Label>Captura de Evidencia</Label><Input type="file" accept="image/*" onChange={e => setCuratorEvidence(e.target.files[0])} /></div>
            <Button type="submit" className="w-full">Solicitar Pago</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Level Up Request */}
      <Dialog open={showLevelReq} onOpenChange={setShowLevelReq}>
        <DialogContent>
          <DialogHeader><DialogTitle style={{fontFamily:'Space Grotesk'}}>Solicitar Subir de Nivel</DialogTitle></DialogHeader>
          <form onSubmit={handleLevelRequest} className="space-y-4">
            <div><Label>Nivel Solicitado</Label>
              <Select value={levelReqForm.requested_level} onValueChange={v => setLevelReqForm({...levelReqForm, requested_level: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="micro">Micro-Influencer</SelectItem><SelectItem value="small">Influencer Pequeno</SelectItem><SelectItem value="top10">Top 10</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Justificacion</Label><Textarea value={levelReqForm.justification} onChange={e => setLevelReqForm({...levelReqForm, justification: e.target.value})} placeholder="Explica por que mereces subir de nivel..." /></div>
            <div><Label>Enlaces de Portafolio</Label><Textarea value={levelReqForm.portfolio_links} onChange={e => setLevelReqForm({...levelReqForm, portfolio_links: e.target.value})} placeholder="Enlace 1, Enlace 2..." /></div>
            <Button type="submit" className="w-full">Enviar Solicitud</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Media Uploader Dialog */}
      <Dialog open={showMediaUploader} onOpenChange={setShowMediaUploader}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle style={{fontFamily:'Space Grotesk'}}>Enviar Contenido al Fan</DialogTitle></DialogHeader>
          {mediaTargetFan && (
            <MediaUploader
              isChatUpload={true}
              maxDuration={40}
              isCreator={true}
              onSuccess={(data) => {
                handleSendMediaToFan(mediaTargetFan, data);
              }}
              onCancel={() => setShowMediaUploader(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
