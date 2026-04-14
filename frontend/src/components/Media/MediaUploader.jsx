import { useState, useCallback } from 'react';
import { useAuth } from '@/App';
import { mediaAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, X, Video, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function MediaUploader({ 
  onSuccess, 
  onCancel, 
  isChatUpload = false,
  maxDuration = 420 // 7 minutos por defecto
}) {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  
  // Form fields
  const [expiration, setExpiration] = useState('1_week');
  const [description, setDescription] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [price, setPrice] = useState('');

  const handleFileSelect = useCallback((e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    // Validaciones
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/webm'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Formato no soportado. Usa JPG, PNG, GIF, MP4 o WebM');
      return;
    }
    
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (selectedFile.size > maxSize) {
      setError('El archivo no puede superar 100MB');
      return;
    }
    
    // Preview para imágenes
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(selectedFile);
    }
    
    setFile(selectedFile);
    setError(null);
  }, []);

  const validateVideoDuration = async (file) => {
    // Para videos, verificar duración con metadata
    if (file.type.startsWith('video/')) {
      return new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        
        video.onloadedmetadata = () => {
          window.URL.revokeObjectURL(video.src);
          if (video.duration > maxDuration) {
            resolve({
              valid: false,
              message: `El video no puede superar ${maxDuration / 60} minutos`
            });
          } else {
            resolve({ valid: true });
          }
        };
        
        video.src = URL.createObjectURL(file);
      });
    }
    return { valid: true };
  };

  const handleUpload = async () => {
    if (!file) return;
    
    // Validar duración de video
    const durationCheck = await validateVideoDuration(file);
    if (!durationCheck.valid) {
      setError(durationCheck.message);
      return;
    }
    
    setUploading(true);
    setProgress(0);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', file.type.startsWith('video/') ? 'video' : 'image');
      formData.append('expiration', expiration);
      formData.append('description', description);
      formData.append('is_premium', isPremium);
      if (isPremium && price) {
        formData.append('price', parseFloat(price));
      }
      
      // Simular progreso (en producción usar axios.onUploadProgress)
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      const response = await mediaAPI.upload(formData);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      toast.success('Contenido subido exitosamente');
      onSuccess?.(response.data);
      
      // Reset
      setFile(null);
      setPreview(null);
      setDescription('');
      setIsPremium(false);
      setPrice('');
      
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al subir el archivo');
      toast.error('Error al subir');
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  const removeFile = () => {
    setFile(null);
    setPreview(null);
    setError(null);
  };

  return (
    <div className="space-y-4">
      {/* File Input */}
      {!file ? (
        <div 
          className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
          onClick={() => document.getElementById('media-file-input').click()}
        >
          <input
            id="media-file-input"
            type="file"
            accept="image/*,video/mp4,video/webm"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium mb-1">Selecciona un archivo</p>
          <p className="text-xs text-muted-foreground">
            Imágenes (JPG, PNG, GIF) o Videos (MP4, WebM) • Máx 100MB
          </p>
          {isChatUpload && (
            <p className="text-xs text-primary mt-2">
              ⏱ Videos de chat: máx {maxDuration / 60} minutos
            </p>
          )}
        </div>
      ) : (
        <div className="border rounded-xl p-4 space-y-3">
          {/* Preview */}
          {preview ? (
            <div className="relative">
              <img src={preview} alt="Preview" className="max-h-40 rounded-lg" />
              <Button
                size="icon"
                variant="destructive"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={removeFile}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {file.type.startsWith('video/') ? (
                <Video className="w-8 h-8 text-primary" />
              ) : (
                <ImageIcon className="w-8 h-8 text-primary" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button size="icon" variant="ghost" onClick={removeFile}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
          
          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
          
          {/* Progress */}
          {uploading && progress > 0 && (
            <div className="space-y-1">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Subiendo... {progress}%
              </p>
            </div>
          )}
        </div>
      )}

      {/* Options */}
      {file && !uploading && (
        <div className="space-y-4 p-4 bg-[hsl(var(--surface-2))] rounded-xl">
          {/* Expiration */}
          <div>
            <Label>Expiración del contenido</Label>
            <Select value={expiration} onValueChange={setExpiration}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1_day">1 día</SelectItem>
                <SelectItem value="3_days">3 días</SelectItem>
                <SelectItem value="1_week">1 semana</SelectItem>
                <SelectItem value="1_month">1 mes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Premium Toggle */}
          {user?.role === 'creator' && (
            <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg">
              <input
                type="checkbox"
                id="is-premium"
                checked={isPremium}
                onChange={(e) => setIsPremium(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="is-premium" className="cursor-pointer">
                Vender como contenido premium
              </Label>
            </div>
          )}
          
          {/* Price Input */}
          {isPremium && (
            <div>
              <Label>Precio (USD)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
          )}
          
          {/* Description */}
          <div>
            <Label>Descripción (opcional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe tu contenido..."
              maxLength={500}
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/500
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button 
          variant="outline" 
          onClick={onCancel}
          disabled={uploading}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button 
          onClick={handleUpload}
          disabled={!file || uploading}
          className="flex-1"
        >
          {uploading ? 'Subiendo...' : 'Subir Contenido'}
        </Button>
      </div>
    </div>
  );
}
