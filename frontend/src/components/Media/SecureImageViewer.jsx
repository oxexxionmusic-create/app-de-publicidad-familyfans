import { useState, useEffect } from 'react';
import { useAuth } from '@/App';
import { EyeOff, Download, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SecureImageViewer({ 
  src, 
  isBlurred = false, 
  watermark = null,
  onContextMenu = null 
}) {
  const { user } = useAuth();
  const [showFull, setShowFull] = useState(false);

  // Prevenir acciones no deseadas
  const preventDefault = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Watermark overlay
  const renderWatermark = () => {
    if (!watermark) return null;
    
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <span
            key={i}
            className="absolute text-white/10 text-lg font-bold whitespace-nowrap select-none"
            style={{
              top: `${(i * 15) % 100}%`,
              left: `${(i * 12) % 100}%`,
              transform: 'rotate(-45deg)',
            }}
          >
            {watermark}
          </span>
        ))}
      </div>
    );
  };

  if (isBlurred) {
    return (
      <div 
        className="relative aspect-video bg-muted rounded-lg overflow-hidden"
        onContextMenu={preventDefault}
      >
        <img 
          src={src} 
          alt="Contenido bloqueado"
          className="w-full h-full object-cover filter blur-2xl scale-110"
          draggable={false}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <EyeOff className="w-16 h-16 text-muted-foreground/50" />
        </div>
        {renderWatermark()}
      </div>
    );
  }

  return (
    <>
      {/* Vista normal */}
      <div 
        className="relative rounded-lg overflow-hidden group"
        onContextMenu={preventDefault}
        onDragStart={preventDefault}
      >
        <img 
          src={src} 
          alt="Contenido premium"
          className="w-full h-auto max-h-[70vh] object-contain select-none"
          draggable={false}
          onContextMenu={preventDefault}
        />
        
        {/* Watermark */}
        {renderWatermark()}
        
        {/* Controles hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          <Button
            size="icon"
            variant="secondary"
            className="h-10 w-10 rounded-full"
            onClick={() => setShowFull(true)}
            title="Ver en pantalla completa"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Badge de seguridad */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/70 text-white text-[10px] px-2 py-1 rounded">
          🔒 Protegido
        </div>
      </div>

      {/* Modal pantalla completa */}
      {showFull && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setShowFull(false)}
          onContextMenu={preventDefault}
        >
          <div className="relative max-w-6xl max-h-[90vh]">
            <img 
              src={src} 
              alt="Contenido premium"
              className="max-w-full max-h-[90vh] object-contain select-none"
              draggable={false}
              onClick={(e) => e.stopPropagation()}
            />
            {renderWatermark()}
            
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-4 right-4 text-white hover:bg-white/20"
              onClick={() => setShowFull(false)}
            >
              ✕
            </Button>
            
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/70 text-white text-xs px-4 py-2 rounded-full">
              <span>🔒 {user?.email}</span>
              <span>•</span>
              <span>{new Date().toLocaleDateString('es-ES')}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
