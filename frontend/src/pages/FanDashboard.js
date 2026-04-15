import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/App';
import { Link, useNavigate } from 'react-router-dom';
import { exploreAPI, subscriptionsAPI, transactionsAPI, depositsAPI, paymentInfoAPI, microTasksAPI, chatAPI, mediaAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Search, Users, Eye, Crown, Heart, Wallet, Plus, LogOut, Zap, MapPin, DollarSign, Music, Upload, MessageCircle, Video, Image as ImageIcon, Lock, Send, Mic, Paperclip } from 'lucide-react';
import ChatWindow from '@/components/Chat/ChatWindow';
import MediaUploader from '@/components/Media/MediaUploader';

export default function FanDashboard() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('explore');
  const [creators, setCreators] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Chat state
  const [chatConversations, setChatConversations] = useState([]);
  const [selectedChatUser, setSelectedChatUser] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  
  // Media state
  const [showMediaUploader, setShowMediaUploader] = useState(false);
  const [mediaTargetCreator, setMediaTargetCreator] = useState(null);
  
  // Deposit
  const [showDeposit, setShowDeposit] = useState(false);
  const [depAmount, setDepAmount] = useState('');
  const [depMethod, setDepMethod] = useState('crypto');
  const [depRef, setDepRef] = useState('');
  const [depProof, setDepProof] = useState(null);
  const [depLoading, setDepLoading] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState({});
  
  // Micro Tasks
  const [showMicroTask, setShowMicroTask] = useState(false);
  const [microTasks, setMicroTasks] = useState([]);
  const [mtComment, setMtComment] = useState('');
  const [mtEvidence, setMtEvidence] = useState(null);
  const [mtLoading, setMtLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setChatLoading(true);
    try {
      const [cr, sub, txn, pi, mt, chats] = await Promise.all([
        exploreAPI.creators(), 
        subscriptionsAPI.list(), 
        transactionsAPI.list(), 
        paymentInfoAPI.get(),
        microTasksAPI.list(),
        chatAPI.getConversations()
      ]);
      setCreators(cr.data); 
      setSubscriptions(sub.data); 
      setTransactions(txn.data); 
      setPaymentInfo(pi.data);
      setMicroTasks(mt.data);
      setChatConversations(chats.data);
      try { const mt = await microTasksAPI.list(); setMicroTasks(mt.data); } catch {}
      await refreshUser();
    } catch (err) {
      console.error('Error loading dashboard:', err);
    }
    setLoading(false);
    setChatLoading(false);
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
      load();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
    setDepLoading(false);
  };

  const handleMicroTask = async (e) => {
    e.preventDefault();
    setMtLoading(true);
    try {
      const fd = new FormData();
      fd.append('songs_listened', 5);
      fd.append('comment', mtComment);
      if (mtEvidence) fd.append('evidence', mtEvidence);
      await microTasksAPI.submit(fd);
      toast.success('Tarea enviada. Ganaras $0.02 al ser aprobada.');
      setShowMicroTask(false);
      setMtComment('');
      setMtEvidence(null);
      load();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
    setMtLoading(false);
  };

  const handleSendMediaToCreator = async (creatorId, mediaData) => {
    try {
      const formData = new FormData();
      formData.append('recipient_id', creatorId);
      formData.append('file', mediaData.file);
      formData.append('type', mediaData.type);
      formData.append('description', mediaData.description || '');
      
      await mediaAPI.uploadToChat(formData);
      toast.success('Contenido enviado al creador');
      setShowMediaUploader(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al enviar contenido');
    }
  };

  const handlePayForChatContent = async (messageId, price) => {
    try {
      await chatAPI.payForContent(messageId, { payment_method: 'balance' });
      toast.success('Contenido desbloqueado');
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al procesar pago');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b border-border bg-[hsl(var(--surface-1))]">
        <div className="page-container py-3 flex items-center justify-between">
          <Link to="/" className="font-semibold text-lg" style={{fontFamily:'Space Grotesk'}}>
            Family Fans Mony
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm">Fan</span>
            <span className="font-semibold tabular-nums">${(user?.balance || 0).toFixed(2)}</span>
            <Button size="sm" variant="outline" onClick={() => setShowDeposit(true)}>
              <Wallet className="w-4 h-4 mr-1" /> Depositar
            </Button>
            <button onClick={() => { logout(); navigate('/'); }} className="text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="page-container">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="explore">Explorar</TabsTrigger>
            <TabsTrigger value="subscriptions">Mis Suscripciones</TabsTrigger>
            <TabsTrigger value="music">Escuchar y Ganar</TabsTrigger>
            <TabsTrigger value="chat">Chats</TabsTrigger>
            <TabsTrigger value="transactions">Transacciones</TabsTrigger>
          </TabsList>

          {/* ==================== EXPLORAR ==================== */}
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
                        {/* Botón para enviar contenido al creador */}
                        {isSub && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="w-full mt-2 text-xs"
                            onClick={() => { setMediaTargetCreator(c.id); setShowMediaUploader(true); }}
                          >
                            <Upload className="w-3 h-3 mr-1" /> Enviar Contenido
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ==================== MIS SUSCRIPCIONES ==================== */}
          <TabsContent value="subscriptions">
            <h2 className="text-xl font-semibold mb-4" style={{fontFamily:'Space Grotesk'}}>Mis Suscripciones</h2>
            {subscriptions.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="p-8 text-center">
                  <Heart className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No tienes suscripciones activas</p>
                </CardContent>
              </Card>
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

          {/* ==================== ESCUCHAR Y GANAR ==================== */}
          <TabsContent value="music">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold" style={{fontFamily:'Space Grotesk'}}>Escuchar Musica y Ganar</h2>
              <Button onClick={() => setShowMicroTask(true)}><Music className="w-4 h-4 mr-1" /> Enviar Tarea</Button>
            </div>
            <Card className="border-border/50 mb-4">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Music className="w-8 h-8 text-primary mt-1" />
                  <div>
                    <p className="font-medium">Como funciona</p>
                    <p className="text-sm text-muted-foreground">1. Escucha 5 canciones completas</p>
                    <p className="text-sm text-muted-foreground">2. Deja un comentario sobre las canciones</p>
                    <p className="text-sm text-muted-foreground">3. Sube una captura como evidencia</p>
                    <p className="text-sm text-muted-foreground">4. Gana <b className="text-primary">$0.02</b> por cada bloque de 5 canciones</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            {microTasks.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Mis Tareas</p>
                {microTasks.map(t => (
                  <Card key={t.id} className="border-border/50">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm">{t.songs_listened} canciones · ${t.calculated_payout}</p>
                        <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString('es-ES')}</p>
                        {t.comment && <p className="text-xs text-muted-foreground mt-1">{t.comment}</p>}
                      </div>
                      <span className={t.status === 'approved' ? 'status-badge-approved' : t.status === 'rejected' ? 'status-badge-rejected' : 'status-badge-pending'}>
                        {t.status === 'approved' ? 'Aprobado' : t.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ==================== CHATS PRIVADOS ==================== */}
          <TabsContent value="chat">
            {selectedChatUser ? (
              <div className="h-[calc(100vh-200px)]">
                <ChatWindow
                  otherUserId={selectedChatUser.other_user_id}
                  otherUserName={selectedChatUser.other_user_name}
                  otherUserPhoto={selectedChatUser.other_user_photo}
                  onBack={() => setSelectedChatUser(null)}
                  onPayForContent={handlePayForChatContent}
                />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold" style={{fontFamily:'Space Grotesk'}}>Mis Chats con Creadores</h2>
                  <Button variant="outline" onClick={() => navigate('/explorar')}>
                    <Plus className="w-4 h-4 mr-1" /> Nuevo Chat
                  </Button>
                </div>
                
                <Card className="border-primary/30 bg-primary/5 mb-6">
                  <CardContent className="p-4 flex items-start gap-3">
                    <Crown className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Chat Exclusivo</p>
                      <p className="text-sm text-muted-foreground">
                        Chatea directamente con tus creadores favoritos. Algunos pueden enviar contenido exclusivo que requiere pago adicional.
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
                      <p className="text-muted-foreground mb-2">Aún no has chateado con ningún creador</p>
                      <Button variant="outline" onClick={() => navigate('/explorar')} className="mt-4">
                        Explorar Creadores
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {chatConversations.map(conv => (
                      <Card 
                        key={conv.other_user_id} 
                        className="border-border/50 card-hover cursor-pointer"
                        onClick={() => setSelectedChatUser(conv)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={conv.other_user_photo || `https://ui-avatars.com/api/?name=${conv.other_user_name}&background=random`}
                              alt={conv.other_user_name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium truncate">{conv.other_user_name}</p>
                                {conv.unread_count > 0 && (
                                  <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                                    {conv.unread_count}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground truncate">
                                {conv.last_message || 'Inicia la conversación'}
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

          {/* ==================== TRANSACCIONES ==================== */}
          <TabsContent value="transactions">
            <h2 className="text-xl font-semibold mb-4" style={{fontFamily:'Space Grotesk'}}>Transacciones</h2>
            {transactions.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="p-8 text-center text-muted-foreground">Sin transacciones</CardContent>
              </Card>
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

      {/* ==================== DIALOGS ==================== */}
      
      {/* Micro Task Dialog */}
      <Dialog open={showMicroTask} onOpenChange={setShowMicroTask}>
        <DialogContent>
          <DialogHeader><DialogTitle style={{fontFamily:'Space Grotesk'}}>Enviar Tarea de Escucha</DialogTitle></DialogHeader>
          <form onSubmit={handleMicroTask} className="space-y-4">
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
              <p>Escucha 5 canciones completas y gana <b className="text-primary">$0.02</b></p>
            </div>
            <div><Label>Tu Comentario sobre las Canciones *</Label><Textarea value={mtComment} onChange={e => setMtComment(e.target.value)} placeholder="Describe que te parecieron las canciones..." required /></div>
            <div><Label>Evidencia (captura de pantalla)</Label><Input type="file" accept="image/*" onChange={e => setMtEvidence(e.target.files[0])} /></div>
            <Button type="submit" className="w-full" disabled={mtLoading}>{mtLoading ? 'Enviando...' : 'Enviar Tarea'}</Button>
          </form>
        </DialogContent>
      </Dialog>

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

      {/* Media Uploader Dialog */}
      <Dialog open={showMediaUploader} onOpenChange={setShowMediaUploader}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle style={{fontFamily:'Space Grotesk'}}>Enviar Contenido al Creador</DialogTitle></DialogHeader>
          {mediaTargetCreator && (
            <MediaUploader
              isChatUpload={true}
              maxDuration={40}
              onSuccess={(data) => {
                handleSendMediaToCreator(mediaTargetCreator, data);
              }}
              onCancel={() => setShowMediaUploader(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
