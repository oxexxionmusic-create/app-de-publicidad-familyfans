import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/App';
import { chatAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Send, Mic, Paperclip, Image as ImageIcon, Video, X, Lock, DollarSign 
} from 'lucide-react';
import MessageBubble from './MessageBubble';
import CustomContentCard from './CustomContentCard';

export default function ChatWindow({ otherUserId, otherUserName, otherUserPhoto, onBack }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showPriceInput, setShowPriceInput] = useState(false);
  const [price, setPrice] = useState('');
  const [mediaPreview, setMediaPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (otherUserId) {
      loadMessages();
      // Polling para nuevos mensajes (en producción usar WebSockets)
      const interval = setInterval(loadMessages, 10000);
      return () => clearInterval(interval);
    }
  }, [otherUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      const res = await chatAPI.getMessages(otherUserId);
      setMessages(res.data);
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const handleSendText = async () => {
    if (!newMessage.trim()) return;
    
    setIsLoading(true);
    try {
      await chatAPI.sendMessage({
        recipient_id: otherUserId,
        type: 'text',
        content: newMessage
      });
      setNewMessage('');
      loadMessages();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al enviar mensaje');
    }
    setIsLoading(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await sendAudio(audioBlob);
        // Limpiar stream
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      toast.error('No se pudo acceder al micrófono');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendAudio = async (audioBlob) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('recipient_id', otherUserId);
      formData.append('audio', audioBlob, 'audio.wav');
      
      await chatAPI.sendAudio(formData);
      loadMessages();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al enviar audio');
    }
    setIsLoading(false);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validar tipo y tamaño
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/webm'];
    if (!validTypes.includes(file.type)) {
      toast.error('Formato no soportado');
      return;
    }
    
    if (file.size > 100 * 1024 * 1024) { // 100MB
      toast.error('El archivo es demasiado grande (máx 100MB)');
      return;
    }
    
    setSelectedFile(file);
    
    // Preview para imágenes
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setMediaPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSendMedia = async () => {
    if (!selectedFile) return;
    
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('recipient_id', otherUserId);
      formData.append('file', selectedFile);
      formData.append('type', selectedFile.type.startsWith('video/') ? 'video' : 'image');
      formData.append('is_paid', showPriceInput);
      if (showPriceInput && price) {
        formData.append('price', parseFloat(price));
      }
      
      await chatAPI.sendMedia(formData);
      setSelectedFile(null);
      setMediaPreview(null);
      setShowPriceInput(false);
      setPrice('');
      loadMessages();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al enviar archivo');
    }
    setIsLoading(false);
  };

  const handlePayForContent = async (messageId, price) => {
    try {
      await chatAPI.payForContent(messageId, { payment_method: 'balance' });
      toast.success('Contenido desbloqueado');
      loadMessages();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al procesar pago');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[hsl(var(--surface-1))]">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <X className="w-4 h-4" />
        </Button>
        <img 
          src={otherUserPhoto || `https://ui-avatars.com/api/?name=${otherUserName}&background=random`}
          alt={otherUserName}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div>
          <p className="font-semibold">{otherUserName}</p>
          <p className="text-xs text-muted-foreground">En línea</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.type === 'custom_content' ? (
              <CustomContentCard 
                message={msg}
                isSender={msg.sender_id === user?.id}
                onPay={() => handlePayForContent(msg.id, msg.price)}
              />
            ) : (
              <MessageBubble 
                message={msg}
                isSender={msg.sender_id === user?.id}
              />
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border space-y-3">
        {/* Media Preview */}
        {mediaPreview && (
          <div className="relative">
            <img src={mediaPreview} alt="Preview" className="max-h-32 rounded-lg" />
            <Button 
              size="icon" 
              variant="destructive" 
              className="absolute top-2 right-2 h-6 w-6"
              onClick={() => { setMediaPreview(null); setSelectedFile(null); }}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}

        {/* Price Input for Premium Content */}
        {showPriceInput && (
          <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
            <DollarSign className="w-4 h-4 text-primary" />
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Precio en USD"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="flex-1"
            />
            <Button size="sm" variant="ghost" onClick={() => setShowPriceInput(false)}>
              Cancelar
            </Button>
          </div>
        )}

        {/* Input Row */}
        <div className="flex items-center gap-2">
          <Input
            placeholder="Escribe un mensaje..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendText())}
            disabled={isLoading}
            className="flex-1"
          />
          
          <Button 
            size="icon" 
            variant="ghost"
            onClick={() => document.getElementById('file-input').click()}
            disabled={isLoading}
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          <input
            id="file-input"
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          
          {selectedFile ? (
            <>
              {user?.role === 'creator' && (
                <Button 
                  size="icon" 
                  variant={showPriceInput ? 'default' : 'outline'}
                  onClick={() => setShowPriceInput(!showPriceInput)}
                  title="Vender como contenido premium"
                >
                  <Lock className="w-4 h-4" />
                </Button>
              )}
              <Button 
                size="sm" 
                onClick={handleSendMedia}
                disabled={isLoading}
              >
                {isLoading ? 'Enviando...' : 'Enviar'}
              </Button>
            </>
          ) : (
            <>
              <Button 
                size="icon" 
                variant={isRecording ? 'destructive' : 'ghost'}
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={stopRecording}
                disabled={isLoading}
                title="Mantén presionado para grabar audio"
              >
                <Mic className={`w-4 h-4 ${isRecording ? 'animate-pulse' : ''}`} />
              </Button>
              <Button 
                size="icon" 
                onClick={handleSendText}
                disabled={isLoading || !newMessage.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
        
        {isRecording && (
          <p className="text-xs text-center text-muted-foreground animate-pulse">
            🎤 Grabando... Suelta para enviar
          </p>
        )}
      </div>
    </div>
  );
}
