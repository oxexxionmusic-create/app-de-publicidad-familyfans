import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Lock, Play, Pause, Volume2 } from 'lucide-react';
import { useState } from 'react';

export default function MessageBubble({ message, isSender }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const audioRef = useState(null);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setAudioProgress(progress);
    }
  };

  if (message.is_deleted) {
    return (
      <div className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}>
        <p className="text-xs text-muted-foreground italic">Mensaje eliminado</p>
      </div>
    );
  }

  return (
    <div className={`flex ${isSender ? 'justify-end' : 'justify-start'} mb-2`}>
      <div 
        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
          isSender 
            ? 'bg-primary text-primary-foreground rounded-br-md' 
            : 'bg-[hsl(var(--surface-2))] rounded-bl-md'
        }`}
      >
        {/* Contenido según tipo */}
        {message.type === 'text' && (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        )}
        
        {message.type === 'audio' && (
          <div className="flex items-center gap-3 min-w-[200px]">
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8"
              onClick={toggleAudio}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            
            <div className="flex-1">
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all"
                  style={{ width: `${audioProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatTime(message.duration)}
              </p>
            </div>
            
            <audio
              ref={(el) => (audioRef.current = el)}
              src={message.content}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => { setIsPlaying(false); setAudioProgress(0); }}
              className="hidden"
            />
          </div>
        )}
        
        {message.type === 'image' && !message.is_blurred && (
          <img 
            src={message.content} 
            alt="Imagen" 
            className="max-w-full rounded-lg mt-2 cursor-pointer"
            onClick={() => window.open(message.content, '_blank')}
          />
        )}
        
        {message.type === 'image' && message.is_blurred && (
          <div className="relative mt-2">
            <img 
              src={message.content} 
              alt="Contenido bloqueado" 
              className="max-w-full rounded-lg filter blur-xl"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
              <div className="text-center text-white">
                <Lock className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm font-medium">Contenido Premium</p>
                {message.price && (
                  <p className="text-xs opacity-80">${message.price} USD</p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {message.type === 'video' && !message.is_blurred && (
          <video 
            src={message.content} 
            controls 
            className="max-w-full rounded-lg mt-2"
            onContextMenu={(e) => e.preventDefault()}
          />
        )}
        
        {message.type === 'video' && message.is_blurred && (
          <div className="relative mt-2">
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <Lock className="w-12 h-12 text-muted-foreground" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
              <div className="text-center text-white">
                <Lock className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm font-medium">Video Premium</p>
                {message.price && (
                  <p className="text-xs opacity-80">${message.price} USD</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-end gap-2 mt-2">
          {message.is_paid && !message.is_blurred && (
            <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
              Pagado
            </span>
          )}
          <span className="text-[10px] opacity-70">
            {formatDistanceToNow(new Date(message.created_at), { 
              addSuffix: true, 
              locale: es 
            })}
          </span>
          {message.read_at && isSender && (
            <span className="text-[10px] text-blue-400">✓✓</span>
          )}
        </div>
      </div>
    </div>
  );
}
