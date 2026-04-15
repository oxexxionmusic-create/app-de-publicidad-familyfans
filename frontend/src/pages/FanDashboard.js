import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/App";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  exploreAPI,
  subscriptionsAPI,
  transactionsAPI,
  depositsAPI,
  paymentInfoAPI,
  microTasksAPI,
  chatAPI,
  mediaAPI,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Search,
  Users,
  Eye,
  Crown,
  Heart,
  Wallet,
  Plus,
  LogOut,
  Zap,
  MapPin,
  DollarSign,
  Music,
  Upload,
  MessageCircle,
  Send,
  Mic,
  Lock,
  Image as ImageIcon,
  Video,
  X,
} from "lucide-react";
import SecureVideoPlayer from "@/components/Media/SecureVideoPlayer";
import SecureImageViewer from "@/components/Media/SecureImageViewer";

export default function FanDashboard() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { creatorId } = useParams();
  const [tab, setTab] = useState("explore");
  const [creators, setCreators] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Deposit
  const [showDeposit, setShowDeposit] = useState(false);
  const [depAmount, setDepAmount] = useState("");
  const [depMethod, setDepMethod] = useState("crypto");
  const [depRef, setDepRef] = useState("");
  const [depProof, setDepProof] = useState(null);
  const [depLoading, setDepLoading] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState({});

  // Micro Tasks
  const [showMicroTask, setShowMicroTask] = useState(false);
  const [microTasks, setMicroTasks] = useState([]);
  const [mtComment, setMtComment] = useState("");
  const [mtEvidence, setMtEvidence] = useState(null);
  const [mtLoading, setMtLoading] = useState(false);

  // Chat Privado
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [selectedCreator, setSelectedCreator] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [recordingAudio, setRecordingAudio] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const messagesEndRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cr, sub, txn, pi] = await Promise.all([
        exploreAPI.creators(),
        subscriptionsAPI.list(),
        transactionsAPI.list(),
        paymentInfoAPI.get(),
      ]);
      setCreators(cr.data);
      setSubscriptions(sub.data);
      setTransactions(txn.data);
      setPaymentInfo(pi.data);
      try {
        const mt = await microTasksAPI.list();
        setMicroTasks(mt.data);
      } catch {}
      await refreshUser();
    } catch {}
    setLoading(false);
  }, [refreshUser]);

  useEffect(() => {
    load();
  }, [load]);

  // Cargar mensajes cuando se selecciona un creador
  useEffect(() => {
    if (selectedCreator && tab === "chat") {
      loadMessages(selectedCreator.id);
    }
  }, [selectedCreator, tab]);

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filtered = creators.filter((c) => {
    const q = search.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.creator_profile?.niche?.toLowerCase().includes(q);
  });

  const handleDeposit = async (e) => {
    e.preventDefault();
    setDepLoading(true);
    try {
      const fd = new FormData();
      fd.append("amount", depAmount);
      fd.append("method", depMethod);
      fd.append("reference", depRef);
      if (depProof) fd.append("proof", depProof);
      await depositsAPI.create(fd);
      toast.success("Deposito enviado");
      setShowDeposit(false);
      setDepAmount("");
      setDepRef("");
      setDepProof(null);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error");
    }
    setDepLoading(false);
  };

  const handleMicroTask = async (e) => {
    e.preventDefault();
    setMtLoading(true);
    try {
      const fd = new FormData();
      fd.append("songs_listened", 5);
      fd.append("comment", mtComment);
      if (mtEvidence) fd.append("evidence", mtEvidence);
      await microTasksAPI.submit(fd);
      toast.success("Tarea enviada. Ganaras $0.02 al ser aprobada.");
      setShowMicroTask(false);
      setMtComment("");
      setMtEvidence(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error");
    }
    setMtLoading(false);
  };

  // Funciones de Chat
  const loadMessages = async (creatorId) => {
    setChatLoading(true);
    try {
      const res = await chatAPI.getMessages(creatorId);
      setMessages(res.data);
    } catch (err) {
      toast.error("Error al cargar mensajes");
    }
    setChatLoading(false);
  };

  const sendMessage = async (type = "text", content = null, audioBlob = null) => {
    if (type === "text" && !messageText.trim()) return;
    if (!selectedCreator) return;

    setSendingMessage(true);
    try {
      const fd = new FormData();
      fd.append("creator_id", selectedCreator.id);
      fd.append("type", type);

      if (type === "text") {
        fd.append("content", messageText);
      } else if (type === "audio" && audioBlob) {
        fd.append("audio", audioBlob, "recording.webm");
      }

      await chatAPI.sendMessage(fd);
      setMessageText("");
      setAudioBlob(null);
      loadMessages(selectedCreator.id);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error al enviar");
    }
    setSendingMessage(false);
  };

  // Grabar audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      const chunks = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setAudioBlob(blob);
        // Auto-enviar si es menor a 40 segundos
        if (blob.size > 0) {
          sendMessage("audio", null, blob);
        }
      };

      mediaRecorderRef.current.start();
      setRecordingAudio(true);

      // Detener automáticamente después de 40 segundos
      setTimeout(() => {
        if (mediaRecorderRef.current && recordingAudio) {
          stopRecording();
        }
      }, 40000);
    } catch (err) {
      toast.error("No se pudo acceder al micrófono");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingAudio) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setRecordingAudio(false);
    }
  };

  // Pagar contenido personalizado
  const unlockContent = async (messageId, price) => {
    try {
      await chatAPI.unlockContent(messageId);
      toast.success("Contenido desbloqueado");
      loadMessages(selectedCreator.id);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error al desbloquear");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-lg" style={{ fontFamily: "Space Grotesk" }}>
              Family Fans Mony
            </span>
            <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">Fan</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-sm">
              <Wallet className="w-4 h-4" />
              <span className="font-semibold">${(user?.balance || 0).toFixed(2)}</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowDeposit(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Depositar
            </Button>
            <button onClick={() => { logout(); navigate("/"); }} className="text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="explore">Explorar</TabsTrigger>
            <TabsTrigger value="subscriptions">Mis Suscripciones</TabsTrigger>
            <TabsTrigger value="chat">Chat Privado</TabsTrigger>
            <TabsTrigger value="music">Escuchar y Ganar</TabsTrigger>
            <TabsTrigger value="transactions">Transacciones</TabsTrigger>
          </TabsList>

          {/* TAB: EXPLORAR */}
          <TabsContent value="explore">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold" style={{ fontFamily: "Space Grotesk" }}>
                Explorar Creadores
              </h2>
              <div className="relative w-64">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
              </div>
            </div>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-48 rounded-xl bg-[hsl(var(--surface-2))] animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((c) => {
                  const cp = c.creator_profile || {};
                  const isSub = subscriptions.some((s) => s.creator_id === c.id);
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
                              <p className="text-xs text-muted-foreground capitalize">{cp.niche || "Creador"}</p>
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
                              <Crown className="w-3 h-3 inline mr-1" />${c.subscription_plan.price}/mes
                            </span>
                            {isSub ? (
                              <span className="status-badge-approved text-[10px]">Suscrito</span>
                            ) : (
                              <Link to={`/creador/${c.id}`}>
                                <Button size="sm" className="h-7 text-xs">
                                  Suscribirme
                                </Button>
                              </Link>
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

          {/* TAB: SUSCRIPCIONES */}
          <TabsContent value="subscriptions">
            <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: "Space Grotesk" }}>
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
                {subscriptions.map((s) => (
                  <Card key={s.id} className="border-border/50">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Crown className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-medium text-sm">{s.creator_name}</p>
                          <p className="text-xs text-muted-foreground">
                            ${s.price}/mes · Desde {new Date(s.created_at).toLocaleDateString("es-ES")}
                          </p>
                        </div>
                      </div>
                      <Link to={`/creador/${s.creator_id}`}>
                        <Button size="sm" variant="outline">
                          Ver Contenido
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB: CHAT PRIVADO - NUEVO */}
          <TabsContent value="chat">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Lista de creadores suscritos */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-base" style={{ fontFamily: "Space Grotesk" }}>
                    Mis Creadores
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {subscriptions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center">
                      Suscríbete a creadores para chatear
                    </p>
                  ) : (
                    subscriptions.map((sub) => (
                      <button
                        key={sub.creator_id}
                        onClick={() => setSelectedCreator(sub)}
                        className={`w-full p-3 rounded-lg text-left transition-colors ${
                          selectedCreator?.creator_id === sub.creator_id
                            ? "bg-primary/10 border border-primary"
                            : "bg-[hsl(var(--surface-2))] hover:bg-[hsl(var(--surface-3))]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
                            {sub.creator_name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{sub.creator_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(sub.created_at).toLocaleDateString("es-ES")}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Área de chat */}
              <Card className="border-border/50 lg:col-span-2">
                {selectedCreator ? (
                  <>
                    <CardHeader className="border-b">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
                            {selectedCreator.creator_name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold">{selectedCreator.creator_name}</p>
                            <p className="text-xs text-muted-foreground">Chat Privado</p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => setSelectedCreator(null)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      {/* Mensajes */}
                      <div className="h-96 overflow-y-auto p-4 space-y-3">
                        {chatLoading ? (
                          <div className="text-center text-muted-foreground">Cargando mensajes...</div>
                        ) : messages.length === 0 ? (
                          <div className="text-center text-muted-foreground text-sm">
                            No hay mensajes aún. ¡Inicia la conversación!
                          </div>
                        ) : (
                          messages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex ${msg.sender_type === "fan" ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[70%] p-3 rounded-lg ${
                                  msg.sender_type === "fan"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-[hsl(var(--surface-2))]"
                                }`}
                              >
                                {msg.type === "text" && <p className="text-sm">{msg.content}</p>}
                                
                                {msg.type === "audio" && (
                                  <audio controls src={msg.content} className="w-full h-8" />
                                )}
                                
                                {msg.type === "custom_content" && msg.is_paid && (
                                  <div className="space-y-2">
                                    {msg.media_type === "image" && (
                                      <SecureImageViewer src={msg.content} watermark={user?.email} />
                                    )}
                                    {msg.media_type === "video" && (
                                      <SecureVideoPlayer src={msg.content} watermark={user?.email} />
                                    )}
                                  </div>
                                )}
                                
                                {msg.type === "custom_content" && !msg.is_paid && (
                                  <div className="text-center p-4 bg-muted/50 rounded">
                                    <Lock className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                                    <p className="text-sm font-medium mb-2">Contenido Personalizado</p>
                                    <p className="text-xs text-muted-foreground mb-3">
                                      Precio: ${msg.price}
                                    </p>
                                    <Button
                                      size="sm"
                                      onClick={() => unlockContent(msg.id, msg.price)}
                                      disabled={user?.balance < msg.price}
                                    >
                                      Desbloquear por ${msg.price}
                                    </Button>
                                  </div>
                                )}
                                
                                <p className="text-xs mt-1 opacity-70">
                                  {new Date(msg.created_at).toLocaleTimeString("es-ES", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Input de mensajes */}
                      <div className="border-t p-4">
                        <div className="flex items-end gap-2">
                          {/* Botón de audio */}
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={recordingAudio ? stopRecording : startRecording}
                            className={recordingAudio ? "bg-red-500 hover:bg-red-600 text-white" : ""}
                            disabled={!selectedCreator}
                          >
                            <Mic className="w-4 h-4" />
                          </Button>

                          {/* Input de texto */}
                          <div className="flex-1">
                            <Textarea
                              value={messageText}
                              onChange={(e) => setMessageText(e.target.value)}
                              placeholder="Escribe un mensaje..."
                              className="min-h-[60px] resize-none"
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  sendMessage("text");
                                }
                              }}
                            />
                          </div>

                          {/* Botón enviar */}
                          <Button
                            size="icon"
                            onClick={() => sendMessage("text")}
                            disabled={!messageText.trim() || sendingMessage}
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                        {recordingAudio && (
                          <p className="text-xs text-center mt-2 text-red-500">
                            Grabando... (máx 40 segundos)
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </>
                ) : (
                  <div className="h-96 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Selecciona un creador para empezar a chatear</p>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* TAB: ESCUCHAR MÚSICA */}
          <TabsContent value="music">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold" style={{ fontFamily: "Space Grotesk" }}>
                Escuchar Musica y Ganar
              </h2>
              <Button onClick={() => setShowMicroTask(true)}>
                <Music className="w-4 h-4 mr-1" />
                Enviar Tarea
              </Button>
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
                {microTasks.map((t) => (
                  <Card key={t.id} className="border-border/50">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm">
                          {t.songs_listened} canciones · ${t.calculated_payout}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(t.created_at).toLocaleDateString("es-ES")}
                        </p>
                        {t.comment && (
                          <p className="text-xs text-muted-foreground mt-1">{t.comment}</p>
                        )}
                      </div>
                      <span
                        className={
                          t.status === "approved"
                            ? "status-badge-approved"
                            : t.status === "rejected"
                            ? "status-badge-rejected"
                            : "status-badge-pending"
                        }
                      >
                        {t.status === "approved"
                          ? "Aprobado"
                          : t.status === "rejected"
                          ? "Rechazado"
                          : "Pendiente"}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB: TRANSACCIONES */}
          <TabsContent value="transactions">
            <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: "Space Grotesk" }}>
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
                {transactions.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-[hsl(var(--surface-2))]"
                  >
                    <div>
                      <p className="text-sm">{t.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(t.created_at).toLocaleDateString("es-ES")}
                      </p>
                    </div>
                    <p
                      className={`font-semibold tabular-nums text-sm ${
                        t.amount >= 0 ? "text-[hsl(152,58%,44%)]" : "text-[hsl(0,72%,52%)]"
                      }`}
                    >
                      {t.amount >= 0 ? "+" : ""}${t.amount?.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs existentes (MicroTask, Deposit) */}
      <Dialog open={showMicroTask} onOpenChange={setShowMicroTask}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "Space Grotesk" }}>Enviar Tarea de Escucha</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleMicroTask} className="space-y-4">
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
              <p>
                Escucha 5 canciones completas y gana <b className="text-primary">$0.02</b>
              </p>
            </div>
            <div>
              <Label>Tu Comentario sobre las Canciones *</Label>
              <Textarea
                value={mtComment}
                onChange={(e) => setMtComment(e.target.value)}
                placeholder="Describe que te parecieron las canciones..."
                required
              />
            </div>
            <div>
              <Label>Evidencia (captura de pantalla)</Label>
              <Input type="file" accept="image/*" onChange={(e) => setMtEvidence(e.target.files[0])} />
            </div>
            <Button type="submit" className="w-full" disabled={mtLoading}>
              {mtLoading ? "Enviando..." : "Enviar Tarea"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeposit} onOpenChange={setShowDeposit}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "Space Grotesk" }}>Depositar Fondos</DialogTitle>
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
                onChange={(e) => setDepAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Metodo</Label>
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
              <Input value={depRef} onChange={(e) => setDepRef(e.target.value)} />
            </div>
            <div>
              <Label>Comprobante</Label>
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setDepProof(e.target.files[0])}
              />
            </div>
            <Button type="submit" className="w-full" disabled={depLoading}>
              {depLoading ? "Enviando..." : "Enviar Deposito"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
