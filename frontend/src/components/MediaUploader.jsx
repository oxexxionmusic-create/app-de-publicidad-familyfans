// src/components/MediaUploader.jsx
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Upload, X, Image as ImageIcon, Video, AlertCircle, Loader2 } from 'lucide-react';
import { validateVideo, validateImage, uploadToCloudinary } from '@/services/cloudinary';

export default function MediaUploader({
  onUploadSuccess,
  onUploadError,
  accept = 'image/*,video/*',
  maxSizeMB = 500,
  maxDuration = 420,
  folder = 'user_uploads',
  resourceType = 'auto', // 'auto', 'image', 'video'
  className = '',
  showPreview = true,
  buttonText = 'Seleccionar archivo',
}) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [validationError, setValidationError] = useState('');
  const fileInputRef = useRef(null);

  const determineResourceType = (file) => {
    if (resourceType !== 'auto') return resourceType;
    return file.type.startsWith('video/') ? 'video' : 'image';
  };

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const type = determineResourceType(selectedFile);
    
    // Validar según tipo
    let validation;
    if (type === 'video') {
      validation = await validateVideo(selectedFile, maxDuration, maxSizeMB);
    } else {
      validation = validateImage(selectedFile, maxSizeMB);
    }

    if (!validation.valid) {
      setValidationError(validation.error);
      toast.error(validation.error);
      return;
    }

    setValidationError('');
    setFile(selectedFile);

    // Crear preview
    if (showPreview) {
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target.result);
        reader.readAsDataURL(selectedFile);
      } else if (selectedFile.type.startsWith('video/')) {
        setPreview(URL.createObjectURL(selectedFile));
      } else {
        setPreview(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setValidationError('');

    try {
      const type = determineResourceType(file);
      const result = await uploadToCloudinary(
        file,
        { folder, resourceType: type },
        (percent) => setProgress(percent)
      );

      setProgress(100);
      toast.success('Archivo subido exitosamente');
      
      // Pasar resultado al padre
      onUploadSuccess?.({
        ...result,
        originalFile: file,
      });

      // Limpiar estado
      setFile(null);
      setPreview(null);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Upload error:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'Error al subir el archivo';
      setValidationError(errorMsg);
      toast.error(errorMsg);
      onUploadError?.(error);
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setProgress(0);
    setValidationError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {!file ? (
        <div
          className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">{buttonText}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {accept.includes('video') && `Máx ${maxSizeMB}MB, ${maxDuration}s`}
            {!accept.includes('video') && `Máx ${maxSizeMB}MB`}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
        </div>
      ) : (
        <div className="border rounded-lg p-4">
          <div className="flex items-start gap-3">
            {/* Preview */}
            {showPreview && preview && file.type.startsWith('image/') && (
              <img src={preview} alt="Preview" className="w-16 h-16 object-cover rounded" />
            )}
            {showPreview && preview && file.type.startsWith('video/') && (
              <video src={preview} controls className="w-16 h-16 object-cover rounded" />
            )}
            {!preview && (
              <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                {file.type.startsWith('video/') ? <Video className="w-6 h-6" /> : <ImageIcon className="w-6 h-6" />}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
              
              {validationError && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3" /> {validationError}
                </p>
              )}

              {uploading && (
                <div className="mt-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">{progress}%</p>
                </div>
              )}
            </div>

            {!uploading && (
              <Button variant="ghost" size="icon" onClick={clearFile}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {!uploading && (
            <div className="flex justify-end mt-3">
              <Button size="sm" onClick={handleUpload}>
                <Upload className="w-4 h-4 mr-1" /> Subir a Cloudinary
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
