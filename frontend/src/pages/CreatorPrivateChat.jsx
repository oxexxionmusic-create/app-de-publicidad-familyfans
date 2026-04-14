import { useState, useEffect } from 'react';
import { useAuth } from '@/App';
import { useNavigate, useParams } from 'react-router-dom';
import { chatAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, MessageCircle, ArrowLeft, Users } from 'lucide-react';
import ChatWindow from '@/components/Chat/ChatWindow';

export default function CreatorPrivateChat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { fanId } = useParams();
  
  const [conversations, setConversations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFan, setSelectedFan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'creator') {
      navigate('/creator');
      return;
    }
    loadConversations();
  }, [user, navigate]);

  useEffect(() => {
    if (fanId) {
      // Cargar información del fan seleccionado
      const fan = conversations.find(c => c.other_user_id === fanId);
      if (fan) setSelectedFan(fan);
    }
  }, [fanId, conversations]);

  const loadConversations = async () => {
    try {
      const res = await chatAPI.getConversations();
      setConversations(res.data);
    } catch (err) {
      console.error('Error loading conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.other_user_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedFan) {
    return (
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar móvil */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-10 bg-background border-b p-3 flex items-center gap-2">
          <Button size="icon" variant="ghost" onClick={() => setSelectedFan(null)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="font-semibold">Chat con {selectedFan.other_user_name}</span>
        </div>
        
        {/* Chat Window */}
        <div className="flex-1 pt-12 md:pt-0">
          <ChatWindow
            otherUserId={selectedFan.other_user_id}
            otherUserName={selectedFan.other_user_name}
            otherUserPhoto={selectedFan.other_user_photo}
            onBack={() => setSelectedFan(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/creator')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-semibold" style={{fontFamily:'Space Grotesk'}}>
            Chats Privados
          </h1>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar fan..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 max-w-md"
        />
      </div>

      {/* Conversations List */}
      {loading ? (
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
      ) : filteredConversations.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="p-12 text-center">
            <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">
              {searchTerm ? 'No se encontraron resultados' : 'Aún no tienes conversaciones'}
            </p>
            <p className="text-sm text-muted-foreground">
              Los fans que se suscriban a ti aparecerán aquí para chatear
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredConversations.map(conv => (
            <Card 
              key={conv.other_user_id} 
              className="border-border/50 card-hover cursor-pointer"
              onClick={() => setSelectedFan(conv)}
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
                      {conv.last_message || 'Sin mensajes aún'}
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
    </div>
  );
}
