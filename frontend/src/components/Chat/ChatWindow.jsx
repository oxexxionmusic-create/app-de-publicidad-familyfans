import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/App';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Send, 
  Paperclip, 
  Smile, 
  MoreVertical, 
  Phone, 
  Video, 
  Search,
  X,
  Check,
  CheckCheck,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

// Componente de mensaje individual
function MessageBubble({ message, isOwn }) {
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex max-w-[70%] ${isOwn ? 'flex-row-reverse' : 'flex-row'} gap-2`}>
        {/* Avatar */}
        {!isOwn && (
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-primary/20 text-primary text-xs">
              {message.senderName?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        )}
        
        {/* Burbuja de mensaje */}
        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
          <div 
            className={`px-4 py-2 rounded-2xl ${
              isOwn 
                ? 'bg-primary text-primary-foreground rounded-br-sm' 
                : 'bg-muted rounded-bl-sm'
            }`}
          >
            {message.content && <p className="text-sm">{message.content}</p>}
            
            {/* Adjuntos */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2 space-y-1">
                {message.attachments.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs opacity-90">
                    <Paperclip className="w-3 h-3" />
                    <span>{file.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Metadata */}
          <div className="flex items-center gap-1 mt-1 px-1">
            <span className="text-[10px] text-muted-foreground">
              {formatTime(message.timestamp)}
            </span>
            {isOwn && (
              <span>
                {message.status === 'sent' && <Check className="w-3 h-3 text-muted-foreground" />}
                {message.status === 'delivered' && <CheckCheck className="w-3 h-3 text-muted-foreground" />}
                {message.status === 'read' && <CheckCheck className="w-3 h-3 text-blue-400" />}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente de conversación en la lista lateral
function ConversationItem({ conversation, isActive, onClick }) {
  const formatLastMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 86400000) { // Menos de 24 horas
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 604800000) { // Menos de 7 días
      return date.toLocaleDateString('es-ES', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
    }
  };

  const unreadCount = conversation.unreadCount || 0;

  return (
    <button
      onClick={onClick}
      className={`w-full p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors ${
        isActive ? 'bg-muted' : ''
      }`}
    >
      <Avatar className="w-12 h-12">
        <AvatarFallback className="bg-primary/20 text-primary">
          {conversation.name?.charAt(0).toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm truncate">{conversation.name}</h3>
          <span className="text-xs text-muted-foreground">
            {formatLastMessageTime(conversation.lastMessageAt)}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-muted-foreground truncate">
            {conversation.lastMessage || 'Sin mensajes'}
          </p>
          {unreadCount > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-primary text-primary-foreground text-[10px] rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// Componente principal ChatWindow
export default function ChatWindow() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Cargar conversaciones al montar
  useEffect(() => {
    loadConversations();
  }, []);

  // Scroll al último mensaje
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Simular carga de conversaciones (reemplazar con API real)
  const loadConversations = async () => {
    setIsLoading(true);
    try {
      // TODO: Reemplazar con llamada API real
      // const response = await chatAPI.getConversations();
      
      // Datos de ejemplo
      const mockConversations = [
        {
          id: '1',
          name: 'Soporte Técnico',
          avatar: null,
          lastMessage: '¿En qué podemos ayudarte?',
          lastMessageAt: new Date().toISOString(),
          unreadCount: 2,
          type: 'support'
        },
        {
          id: '2',
          name: 'Anunciante - Coca Cola',
          avatar: null,
          lastMessage: 'Revisamos tu entregable',
          lastMessageAt: new Date(Date.now() - 3600000).toISOString(),
          unreadCount: 0,
          type: 'advertiser'
        }
      ];
      
      setConversations(mockConversations);
    } catch (error) {
      toast.error('Error al cargar conversaciones');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar mensajes de una conversación
  const loadMessages = async (conversationId) => {
    setIsLoading(true);
    try {
      // TODO: Reemplazar con llamada API real
      // const response = await chatAPI.getMessages(conversationId);
      
      // Datos de ejemplo
      const mockMessages = [
        {
          id: '1',
          content: '¡Hola! Bienvenido al chat de soporte',
          senderId: 'system',
          senderName: 'Soporte',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          status: 'read',
          type: 'text'
        },
        {
          id: '2',
          content: 'Tengo una pregunta sobre mi campaña',
          senderId: user?.id,
          senderName: user?.name,
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          status: 'read',
          type: 'text'
        },
        {
          id: '3',
          content: 'Claro, ¿en qué puedo ayudarte?',
          senderId: 'support',
          senderName: 'Soporte',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          status: 'read',
          type: 'text'
        }
      ];
      
      setMessages(mockMessages);
    } catch (error) {
      toast.error('Error al cargar mensajes');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Seleccionar conversación
  const handleSelectConversation = (conversation) => {
    setActiveConversation(conversation);
    loadMessages(conversation.id);
    
    // Marcar como leídos
    setConversations(prev => 
      prev.map(c => 
        c.id === conversation.id ? { ...c, unreadCount: 0 } : c
      )
    );
  };

  // Enviar mensaje
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !activeConversation) return;

    const message = {
      id: Date.now().toString(),
      content: newMessage.trim(),
      senderId: user?.id,
      senderName: user?.name,
      timestamp: new Date().toISOString(),
      status: 'sent',
      type: 'text'
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
    
    // Actualizar última mensaje de la conversación
    setConversations(prev =>
      prev.map(c =>
        c.id === activeConversation.id
          ? { ...c, lastMessage: message.content, lastMessageAt: message.timestamp }
          : c
      )
    );

    try {
      // TODO: Reemplazar con llamada API real
      // await chatAPI.sendMessage(activeConversation.id, message.content);
      
      // Simular respuesta
      setTimeout(() => {
        setMessages(prev => 
          prev.map(m => 
            m.id === message.id ? { ...m, status: 'delivered' } : m
          )
        );
      }, 1000);
      
    } catch (error) {
      toast.error('Error al enviar mensaje');
      console.error(error);
    }
  };

  // Filtrar conversaciones
  const filteredConversations = conversations.filter(c =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card className="h-[calc(100vh-8rem)] flex overflow-hidden">
      {/* Sidebar - Lista de conversaciones */}
      <div className="w-80 border-r flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold mb-3">Mensajes</h2>
          
          {/* Buscador */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversaciones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Lista de conversaciones */}
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Cargando...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              {searchQuery ? 'No se encontraron conversaciones' : 'No hay conversaciones'}
            </div>
          ) : (
            filteredConversations.map(conversation => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isActive={activeConversation?.id === conversation.id}
                onClick={() => handleSelectConversation(conversation)}
              />
            ))
          )}
        </ScrollArea>
      </div>

      {/* Área de chat */}
      <div className="flex-1 flex flex-col">
        {activeConversation ? (
          <>
            {/* Header del chat */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {activeConversation.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{activeConversation.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {activeConversation.type === 'support' ? 'Soporte Técnico' : 'En línea'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                  <Phone className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Video className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Mensajes */}
            <ScrollArea className="flex-1 p-4">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No hay mensajes aún. ¡Escribe el primero!
                </div>
              ) : (
                messages.map(message => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isOwn={message.senderId === user?.id}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Input de mensaje */}
            <form onSubmit={handleSendMessage} className="p-4 border-t">
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="icon">
                  <Paperclip className="w-4 h-4" />
                </Button>
                
                <Input
                  ref={inputRef}
                  placeholder="Escribe un mensaje..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1"
                  disabled={isLoading}
                />
                
                <Button type="button" variant="ghost" size="icon">
                  <Smile className="w-4 h-4" />
                </Button>
                
                <Button 
                  type="submit" 
                  size="icon"
                  disabled={!newMessage.trim() || isLoading}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </>
        ) : (
          /* Estado vacío - Sin conversación seleccionada */
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm">Selecciona una conversación para empezar</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
