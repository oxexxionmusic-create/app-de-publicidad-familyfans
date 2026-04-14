import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Lock, Unlock, Eye, DollarSign, Check } from 'lucide-react';
import SecureVideoPlayer from '@/components/Media/SecureVideoPlayer';
import SecureImageViewer from '@/components/Media/SecureImageViewer';

export default function CustomContentCard({ message, isSender, onPay }) {
  const [isUnlocked, setIsUnlocked] = useState(!message.is_blurred);

  const handleUnlock = () => {
    if (onPay) {
      onPay();
      setIsUnlocked(true);
    }
  };

  return (
    <div className={`flex ${isSender ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className="max-w-md w-full">
        <div className={`rounded-2xl overflow-hidden border ${
          isSender 
            ? 'border-primary/30 bg-primary/5' 
            : 'border-border bg-[hsl(var(--surface-2))]'
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Lock className={`w-4 h-4 ${message.is_blurred ? 'text-yellow-500' : 'text-green-500'}`} />
              <span className="text-sm font-medium">
                {message.is_blurred ? 'Contenido Premium' : 'Contenido Desbloqueado'}
              </span>
            </div>
            {message.price && (
              <span className="text-sm font-bold text-primary">
                ${message.price} USD
              </span>
            )}
          </div>

          {/* Content */}
          <div className="p-4">
            {message.description && (
              <p className="text-sm text-muted-foreground mb-4">
                {message.description}
              </p>
            )}

            {message.is_blurred && !isSender ? (
              // Vista borrosa para fan no pagador
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                {message.type === 'video' ? (
                  <SecureVideoPlayer 
                    src={message.content} 
                    isBlurred={true}
                    showControls={false}
                  />
                ) : (
                  <SecureImageViewer 
                    src={message.content}
                    isBlurred={true}
                  />
                )}
                
                {/* Overlay de bloqueo */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                  <Lock className="w-12 h-12 text-white mb-3" />
                  <p className="text-white font-medium mb-1">Contenido Exclusivo</p>
                  <p className="text-white/70 text-sm mb-4 text-center px-4">
                    Este contenido es exclusivo para suscriptores premium
                  </p>
                  <button
                    onClick={handleUnlock}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-full font-medium transition-colors"
                  >
                    <Unlock className="w-4 h-4" />
                    Desbloquear por ${message.price}
                  </button>
                </div>
              </div>
            ) : (
              // Contenido visible
              <div className="relative">
                {message.type === 'video' ? (
                  <SecureVideoPlayer 
                    src={message.content}
                    watermark={isSender ? null : message.sender_name}
                  />
                ) : (
                  <SecureImageViewer 
                    src={message.content}
                    watermark={isSender ? null : message.sender_name}
                  />
                )}
                
                {/* Badge de desbloqueado */}
                {isUnlocked && !isSender && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 bg-green-500/90 text-white text-xs px-3 py-1 rounded-full">
                    <Check className="w-3 h-3" />
                    Desbloqueado
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-3 border-t border-border bg-[hsl(var(--surface-3))]">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(message.created_at), { 
                addSuffix: true, 
                locale: es 
              })}
            </span>
            {message.duration && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {message.duration}s
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
