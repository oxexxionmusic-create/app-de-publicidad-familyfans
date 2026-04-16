// src/pages/FanDashboard.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/App';
import { Link, useNavigate } from 'react-router-dom';
import {
  exploreAPI, subscriptionsAPI, transactionsAPI, depositsAPI, paymentInfoAPI,
  microTasksAPI, premiumContentAPI, chatAPI, mediaAPI
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import {
  Search, Users, Eye, Crown, Heart, Wallet, Plus, LogOut, Zap, MapPin,
  DollarSign, Music, Upload, MessageCircle, Send, Lock, Unlock, Image as ImageIcon,
  Video, Mic, Play, Pause
} from 'lucide-react';

function StatusBadge({ status }) {
  const map = {
    pending: 'status-badge-pending', approved: 'status-badge-approved',
    rejected: 'status-badge-rejected', active: 'status-badge-active'
  };
  const labels = {
    pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado', active: 'Activo'
  };
  return <span className={map[status] || 'status-badge-pending'}>{labels[status] || status}</span>;
}

// Componente para mostrar contenido multimedia (imagen/video/audio) con posibilidad de blur
function MediaContent({ item, isSubscribed, isPaid }) {
  const [signedUrl, setSignedUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [blurred, setBlurred] = useState(!isSubscribed && !isPaid && item.is_premium);

  useEffect(() => {
    const fetchUrl = async () => {
      if (!item.cloudinary_public_id) {
        setSignedUrl(item.media_url || item.url);
        setLoading(false);
        return;
      }
      try {
        const res = await premiumContentAPI.getSignedUrl(
          item.cloudinary_public_id,
          item.type === 'video' ? 'video' : 'image'
        );
        setSignedUrl(res.data.url);
      } catch (error) {
        console.error('Error getting signed URL:', error);
        setSignedUrl(item.media_url || item.url);
      } finally {
        setLoading(false);
      }
    };
    fetchUrl();
  }, [item]);

  if (loading) {
    return <div className="w-full h-32 bg-muted animate-pulse rounded" />;
  }

  const needsBlur = blurred && item.is_premium;

  return (
    <div className="relative">
      {item.type === 'image' || item.content_type === 'photo' ? (
        <img
          src={signedUrl}
          alt={item.title || 'Contenido'}
          className={`w-full h-48 object-cover rounded ${needsBlur ? 'blur-xl' : ''}`}
        />
      ) : item.type === 'video' || item.content_type === 'video' ? (
        <video
          src={signedUrl}
          controls={!needsBlur}
          className={`w-full h-48 object-cover rounded ${needsBlur ? 'blur-xl' : ''}`}
        />
      ) : item.type === 'audio' ? (
        <audio src={signedUrl} controls className="w-full" />
      ) : (
        <div className="p-4 bg-muted rounded">{item.content || item.description}</div>
      )}
      {needsBlur && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded">
          <div className="text-center text-white">
            <Lock className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm font-medium">Contenido Premium</p>
            <p className="text-xs">Suscríbete para ver</p>
          </div>
        </div>
      )}
    </div>
  );
}

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

  // Micro Tasks
  const [showMicroTask, setShowMicroTask] = useState(false);
  const [microTasks, setMicroTasks] = useState([]);
  const [mtComment, setMtComment] = useState('');
  const [mtEvidence, setMtEvidence] = useState(null);
  const [mtLoading, setMtLoading] = useState(false);

  // Chat
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef(null);
  const [activeChatTab, setActiveChatTab] = useState('conversations'); // 'conversations' or 'creators'

  // Premium Content viewing
  const [selectedCreatorContent, setSelectedCreatorContent] = useState([]);
  const [viewingContentCreator, setViewingContentCreator] = useState(null);
  const [showContentModal, setShowContentModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cr, sub, txn, pi] = await Promise.all([
        exploreAPI.creators(),
        subscriptionsAPI.list(),
        transactionsAPI.list(),
        paymentInfoAPI.get()
      ]);
      setCreators(cr.data);
      setSubscriptions(sub.data);
      setTransactions(txn.data);
      setPaymentInfo(pi.data);

      try {
        const mt = await microTasksAPI.list();
        setMicroTasks(mt.data);
      } catch { }

      // Cargar conversaciones de chat
      try {
        const conv = await chatAPI.getConversations();
        setConversations(conv.data);
      } catch { }

      await refreshUser();
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  }, [refreshUser]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    // Scroll al final de los mensajes
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredCreators = creators.filter(c => {
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.creator_profile?.niche?.toLowerCase().includes(q)
    );
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
      toast.success('Depósito enviado');
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

  const handleMicroTask = async (e) => {
    e.preventDefault();
    setMtLoading(true);
    try {
      const fd = new FormData();
      fd.append('songs_listened', 5);
      fd.append('comment', mtComment);
      if (mtEvidence) fd.append('evidence', mtEvidence);
      await microTasksAPI.submit(fd);
      toast.success('Tarea enviada. Ganarás $0.02 al ser aprobada.');
      setShowMicroTask(false);
      setMtComment('');
      setMtEvidence(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error');
    }
    setMtLoading(false);
  };

  const handleSubscribe = async (creatorId) => {
    try {
      const fd = new FormData();
      fd.append('creator_id', creatorId);
      await subscriptionsAPI.subscribe(fd);
      toast.success('Suscripción exitosa');
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al suscribirse');
    }
  };

  const handleViewCreatorContent = async (creatorId, creatorName) => {
    try {
      const res = await premiumContentAPI.get(creatorId);
      setSelectedCreatorContent(res.data);
      setViewingContentCreator(creatorName);
      setShowContentModal(true);
    } catch (err) {
      toast.error('No se pudo cargar el contenido');
    }
  };

  // Chat functions
  const loadConversation = async (otherUserId) => {
    setChatLoading(true);
    try {
      const res = await chatAPI.getMessages(otherUserId);
      setMessages(res.data);
      setSelectedConversation(otherUserId);
      setActiveChatTab('conversations');
    } catch (error) {
      toast.error('Error al cargar mensajes');
    } finally {
      setChatLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;
    setSendingMessage(true);
    try {
      const payload = {
        recipient_id: selectedConversation,
        type: 'text',
        content: newMessage.trim()
      };
      const res = await chatAPI.sendMessage(payload);
      setMessages(prev => [...prev, res.data]);
      setNewMessage('');
      // Actualizar conversaciones
      const conv = await chatAPI.getConversations();
      setConversations(conv.data);
    } catch (error) {
      toast.error('Error al enviar mensaje');
    } finally {
      setSendingMessage(false);
    }
  };

  const startChatWithCreator = (creator) => {
    setSelectedConversation(creator.id);
    loadConversation(creator.id);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="border-b border-border/50 bg-[hsl(var(--surface-1))] sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
                Family Fans Mony
              </span>
            </Link>
            <span className="text-xs text-muted-foreground px-2 py-1 rounded-full bg-[hsl(var(--surface-3))]">
              Fan
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[hsl(var(--surface-2))]">
              <Wallet className="w-4 h-4 text-primary" />
              <span className="font-semibold tabular-nums text-sm">
                ${(user?.balance || 0).toFixed(2)}
              </span>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowDeposit(true)}>
              <Plus className="w-4 h-4 mr-1" /> Depositar
            </Button>
            <button
              onClick={() => {
                logout();
                navigate('/');
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <div className="page-container">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="explore">Explorar</TabsTrigger>
            <TabsTrigger value="subscriptions">Mis Suscripciones</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="music">Escuchar y Ganar</TabsTrigger>
            <TabsTrigger value="transactions">Transacciones</TabsTrigger>
          </TabsList>

          {/* ==================== EXPLORE ==================== */}
          <TabsContent value="explore">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
                Explorar Creadores
              </h2>
              <div className="relative w-64">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-48 rounded-xl bg-[hsl(var(--surface-2))] animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCreators.map(c => {
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
                                {c.is_top10 && (
                                  <span className="text-xs bg-[hsl(43,96%,56%)]/20 text-[hsl(43,96%,56%)] px-2 py-0.5 rounded-full">
                                    Top 10
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground capitalize">
                                {cp.niche || 'Creador'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" /> {(cp.followers || 0).toLocaleString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" /> {(cp.avg_views || 0).toLocaleString()}
                            </span>
                            {cp.region && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {cp.region}
                              </span>
                            )}
                          </div>
                        </Link>
                        {c.subscription_plan?.active && (
                          <div className="mt-3 flex items-center justify-between p-2 rounded-lg bg-primary/5 border border-primary/20">
                            <span className="text-xs">
                              <Crown className="w-3 h-3 inline mr-1" />$
                              {c.subscription_plan.price}/mes
                            </span>
                            {isSub ? (
                              <span className="status-badge-approved text-[10px]">Suscrito</span>
                            ) : (
                              <Button
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => handleSubscribe(c.id)}
                              >
                                Suscribirme
                              </Button>
                            )}
                          </div>
                        )}
                        <div className="mt-2 flex gap-2">
                          {isSub && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => handleViewCreatorContent(c.id, c.name)}
                            >
                              Ver Contenido
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => startChatWithCreator(c)}
                          >
                            <MessageCircle className="w-3 h-3 mr-1" /> Chat
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ==================== SUBSCRIPTIONS ==================== */}
          <TabsContent value="subscriptions">
            <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: 'Space Grotesk' }}>
              Mis Suscripciones
            </h2>
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
                          <p className="text-xs text-muted-foreground">
                            ${s.price}/mes · Desde{' '}
                            {new Date(s.created_at).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewCreatorContent(s.creator_id, s.creator_name)}
                        >
                          Ver Contenido
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startChatWithCreator({ id: s.creator_id, name: s.creator_name })}
                        >
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ==================== CHAT ==================== */}
          <TabsContent value="chat">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
              {/* Lista de conversaciones / creadores */}
              <Card className="border-border/50 md:col-span-1 flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Conversaciones</CardTitle>
                </CardHeader>
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-1">
                    {conversations.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No hay conversaciones
                      </p>
                    ) : (
                      conversations.map(conv => (
                        <div
                          key={conv.other_user_id}
                          className={`p-3 rounded-lg cursor-pointer hover:bg-[hsl(var(--surface-2))] transition-colors ${
                            selectedConversation === conv.other_user_id ? 'bg-[hsl(var(--surface-2))]' : ''
                          }`}
                          onClick={() => loadConversation(conv.other_user_id)}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={conv.other_user_photo} />
                              <AvatarFallback>{conv.other_user_name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-sm truncate">
                                  {conv.other_user_name}
                                </p>
                                {conv.unread_count > 0 && (
                                  <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                                    {conv.unread_count}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {conv.last_message || 'Inicia una conversación'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </Card>

              {/* Área de mensajes */}
              <Card className="border-border/50 md:col-span-2 flex flex-col">
                {selectedConversation ? (
                  <>
                    <CardHeader className="pb-2 border-b">
                      <CardTitle className="text-base">
                        {conversations.find(c => c.other_user_id === selectedConversation)?.other_user_name || 'Chat'}
                      </CardTitle>
                    </CardHeader>
                    <ScrollArea className="flex-1 p-4">
                      {chatLoading ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                        </div>
                      ) : messages.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No hay mensajes aún. ¡Envía el primero!
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {messages.map(msg => {
                            const isOwn = msg.sender_id === user?.sub;
                            return (
                              <div
                                key={msg.id}
                                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                              >
                                <div
                                  className={`max-w-[70%] rounded-lg p-3 ${
                                    isOwn
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-[hsl(var(--surface-2))]'
                                  }`}
                                >
                                  {msg.type === 'text' && <p className="text-sm">{msg.content}</p>}
                                  {msg.type === 'image' && (
                                    <MediaContent
                                      item={{ ...msg, type: 'image', media_url: msg.content }}
                                      isSubscribed={true}
                                      isPaid={msg.is_paid ? true : false}
                                    />
                                  )}
                                  {msg.type === 'video' && (
                                    <MediaContent
                                      item={{ ...msg, type: 'video', media_url: msg.content }}
                                      isSubscribed={true}
                                      isPaid={msg.is_paid ? true : false}
                                    />
                                  )}
                                  {msg.type === 'audio' && (
                                    <audio src={msg.content} controls className="max-w-full" />
                                  )}
                                  {msg.is_blurred && !msg.is_paid && (
                                    <div className="mt-2">
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={async () => {
                                          try {
                                            await chatAPI.payForContent(msg.id);
                                            toast.success('Contenido desbloqueado');
                                            loadConversation(selectedConversation);
                                          } catch (error) {
                                            toast.error('Error al pagar');
                                          }
                                        }}
                                      >
                                        <Lock className="w-3 h-3 mr-1" /> Pagar ${msg.price}
                                      </Button>
                                    </div>
                                  )}
                                  <p className="text-xs opacity-70 mt-1">
                                    {new Date(msg.created_at).toLocaleTimeString('es-ES', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                          <div ref={messagesEndRef} />
                        </div>
                      )}
                    </ScrollArea>
                    <div className="p-3 border-t">
                      <form onSubmit={sendMessage} className="flex gap-2">
                        <Input
                          placeholder="Escribe un mensaje..."
                          value={newMessage}
                          onChange={e => setNewMessage(e.target.value)}
                          disabled={sendingMessage}
                        />
                        <Button type="submit" size="icon" disabled={sendingMessage}>
                          <Send className="w-4 h-4" />
                        </Button>
                      </form>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">
                      Selecciona una conversación o inicia un chat desde el perfil de un creador
                    </p>
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* ==================== MUSIC ==================== */}
          <TabsContent value="music">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
                Escuchar Música y Ganar
              </h2>
              <Button onClick={() => setShowMicroTask(true)}>
                <Music className="w-4 h-4 mr-1" /> Enviar Tarea
              </Button>
            </div>
            <Card className="border-border/50 mb-4">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Music className="w-8 h-8 text-primary mt-1" />
                  <div>
                    <p className="font-medium">Cómo funciona</p>
                    <p className="text-sm text-muted-foreground">
                      1. Escucha 5 canciones completas
                    </p>
                    <p className="text-sm text-muted-foreground">
                      2. Deja un comentario sobre las canciones
                    </p>
                    <p className="text-sm text-muted-foreground">
                      3. Sube una captura como evidencia
                    </p>
                    <p className="text-sm text-muted-foreground">
                      4. Gana <b className="text-primary">$0.02</b> por cada bloque de 5 canciones
                    </p>
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
                        <p className="text-sm">
                          {t.songs_listened} canciones · ${t.calculated_payout}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(t.created_at).toLocaleDateString('es-ES')}
                        </p>
                        {t.comment && (
                          <p className="text-xs text-muted-foreground mt-1">{t.comment}</p>
                        )}
                      </div>
                      <StatusBadge status={t.status} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ==================== TRANSACTIONS ==================== */}
          <TabsContent value="transactions">
            <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: 'Space Grotesk' }}>
              Transacciones
            </h2>
            {transactions.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="p-8 text-center text-muted-foreground">
                  Sin transacciones
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-1">
                {transactions.map(t => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-[hsl(var(--surface-2))]"
                  >
                    <div>
                      <p className="text-sm">{t.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(t.created_at).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                    <p
                      className={`font-semibold tabular-nums text-sm ${
                        t.amount >= 0
                          ? 'text-[hsl(152,58%,44%)]'
                          : 'text-[hsl(0,72%,52%)]'
                      }`}
                    >
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
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Space Grotesk' }}>
              Enviar Tarea de Escucha
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleMicroTask} className="space-y-4">
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
              <p>
                Escucha 5 canciones completas y gana{' '}
                <b className="text-primary">$0.02</b>
              </p>
            </div>
            <div>
              <Label>Tu Comentario sobre las Canciones *</Label>
              <Textarea
                value={mtComment}
                onChange={e => setMtComment(e.target.value)}
                placeholder="Describe qué te parecieron las canciones..."
                required
              />
            </div>
            <div>
              <Label>Evidencia (captura de pantalla)</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={e => setMtEvidence(e.target.files[0])}
              />
            </div>
            <Button type="submit" className="w-full" disabled={mtLoading}>
              {mtLoading ? 'Enviando...' : 'Enviar Tarea'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deposit Dialog */}
      <Dialog open={showDeposit} onOpenChange={setShowDeposit}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Space Grotesk' }}>
              Depositar Fondos
            </DialogTitle>
          </DialogHeader>
          {paymentInfo.crypto_wallet_address || paymentInfo.bank_name ? (
            <div className="mb-4 p-3 rounded-lg bg-[hsl(var(--surface-2))] text-sm space-y-2">
              <p className="font-medium text-xs text-muted-foreground">Datos de pago:</p>
              {paymentInfo.crypto_wallet_address && (
                <div>
                  <p className="text-xs font-medium">
                    Crypto ({paymentInfo.crypto_currency} - {paymentInfo.crypto_network})
                  </p>
                  <p className="text-xs text-primary font-mono break-all">
                    {paymentInfo.crypto_wallet_address}
                  </p>
                </div>
              )}
              {paymentInfo.bank_name && (
                <div>
                  <p className="text-xs font-medium">Banco: {paymentInfo.bank_name}</p>
                  <p className="text-xs">Titular: {paymentInfo.bank_account_holder}</p>
                  <p className="text-xs">Cuenta: {paymentInfo.bank_account_number}</p>
                  {paymentInfo.bank_details && (
                    <p className="text-xs">{paymentInfo.bank_details}</p>
                  )}
                </div>
              )}
              {paymentInfo.instructions && (
                <p className="text-xs text-muted-foreground">{paymentInfo.instructions}</p>
              )}
            </div>
          ) : null}
          <form onSubmit={handleDeposit} className="space-y-4">
            <div>
              <Label>Monto (USD)</Label>
              <Input
                type="number"
                step="0.01"
                min="1"
                value={depAmount}
                onChange={e => setDepAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Método</Label>
              <Select value={depMethod} onValueChange={setDepMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="crypto">Cripto (USDT/USDC)</SelectItem>
                  <SelectItem value="bank">Banco</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Referencia</Label>
              <Input value={depRef} onChange={e => setDepRef(e.target.value)} />
            </div>
            <div>
              <Label>Comprobante</Label>
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={e => setDepProof(e.target.files[0])}
              />
            </div>
            <Button type="submit" className="w-full" disabled={depLoading}>
              {depLoading ? 'Enviando...' : 'Enviar Depósito'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Premium Content Modal */}
      <Dialog open={showContentModal} onOpenChange={setShowContentModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Contenido Premium de {viewingContentCreator}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {selectedCreatorContent.length === 0 ? (
              <p className="text-muted-foreground col-span-2 text-center py-8">
                Este creador aún no ha publicado contenido premium.
              </p>
            ) : (
              selectedCreatorContent.map(item => {
                const isSub = subscriptions.some(s => s.creator_id === item.creator_id);
                return (
                  <Card key={item.id} className="border-border/50 overflow-hidden">
                    <MediaContent
                      item={item}
                      isSubscribed={isSub}
                      isPaid={false} // Fan no ha pagado por este contenido individual
                    />
                    <CardContent className="p-3">
                      <p className="font-medium text-sm">{item.title || 'Sin título'}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
