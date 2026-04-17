// src/components/MediaUploader.jsx
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Upload, X, Image as ImageIcon, Video, AlertCircle } from 'lucide-react';
import { uploadToCloudinary, validateVideo, validateImage } from '@/services/cloudinary';

export default function MediaUploader({
  onUploadSuccess,
  onUploadError,
  accept = 'image/*,video/*',
  maxSizeMB = 500,
  maxDuration = 420,
  folder = 'user_uploads',
  resourceType = 'auto',
  publicIdPrefix = '',
  tags = [],
  className = '',
}) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [validationError, setValidationError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Validar según tipo
    let validation;
    if (selectedFile.type.startsWith('video/')) {
      validation = await validateVideo(selectedFile, maxDuration, maxSizeMB);
    } else if (selectedFile.type.startsWith('image/')) {
      validation = validateImage(selectedFile, maxSizeMB);
    } else {
      validation = { valid: true };
    }

    if (!validation.valid) {
      setValidationError(validation.error);
      toast.error(validation.error);
      return;
    }

    setValidationError('');
    setFile(selectedFile);
    // Crear preview
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(selectedFile);
    } else if (selectedFile.type.startsWith('video/')) {
      setPreview(URL.createObjectURL(selectedFile));
    } else {
      setPreview(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(10);
    try {
      const result = await uploadToCloudinary(file, {
        folder,
        resource_type: resourceType,
        public_id_prefix: publicIdPrefix,
        tags,
      });
      setProgress(100);
      toast.success('Archivo subido exitosamente');
      onUploadSuccess?.(result);
      // Limpiar
      setFile(null);
      setPreview(null);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      toast.error(error.message || 'Error al subir');
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
          <p className="text-sm text-muted-foreground">
            Arrastra o haz clic para seleccionar {accept.includes('video') ? 'video/imagen' : 'archivo'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {accept.includes('video') && `Máx ${maxSizeMB}MB, ${maxDuration}s`}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      ) : (
        <div className="border rounded-lg p-4">
          <div className="flex items-start gap-3">
            {preview && file.type.startsWith('image/') && (
              <img src={preview} alt="Preview" className="w-20 h-20 object-cover rounded" />
            )}
            {preview && file.type.startsWith('video/') && (
              <video src={preview} controls className="w-20 h-20 object-cover rounded" />
            )}
            {!preview && (
              <div className="w-20 h-20 bg-muted rounded flex items-center justify-center">
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
              {uploading && <Progress value={progress} className="h-1 mt-2" />}
            </div>
            <Button variant="ghost" size="icon" onClick={clearFile} disabled={uploading}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          {!uploading && (
            <div className="flex justify-end mt-3">
              <Button size="sm" onClick={handleUpload}>
                Subir a Cloudinary
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
