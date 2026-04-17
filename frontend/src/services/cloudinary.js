// src/services/cloudinary.js
import { mediaAPI } from '@/lib/api';

export async function uploadToCloudinary(file, options = {}) {
  const {
    folder = 'user_uploads',
    resource_type = 'auto',
    tags = [],
  } = options;

  // Validar carpeta
  if (!folder || folder.includes('undefined')) {
    throw new Error('Carpeta de destino no válida');
  }

  try {
    const signResponse = await mediaAPI.signUpload({
      folder,
      resource_type,
    });

    const { signature, timestamp, api_key, cloud_name } = signResponse.data;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', api_key);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);
    formData.append('folder', folder);
    if (tags.length) {
      formData.append('tags', tags.join(','));
    }

    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloud_name}/${resource_type}/upload`;
    const uploadResponse = await fetch(cloudinaryUrl, {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json();
      throw new Error(error.error?.message || 'Error al subir a Cloudinary');
    }

    const result = await uploadResponse.json();
    return {
      public_id: result.public_id,
      url: result.secure_url,
      format: result.format,
      duration: result.duration,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      resource_type: result.resource_type,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
}

// ... (funciones validateVideo, validateImage sin cambios)
export async function validateVideo(file, maxDuration = 420, maxSizeMB = 500) {
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > maxSizeMB) {
    return { valid: false, error: `El video excede los ${maxSizeMB}MB (${sizeMB.toFixed(1)}MB)` };
  }
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      const duration = video.duration;
      if (duration > maxDuration) {
        resolve({
          valid: false,
          error: `El video excede los ${maxDuration} segundos (${duration.toFixed(1)}s)`,
          duration,
          sizeMB,
        });
      } else {
        resolve({ valid: true, duration, sizeMB });
      }
    };
    video.onerror = () => {
      resolve({ valid: false, error: 'No se pudo leer el archivo de video' });
    };
    video.src = URL.createObjectURL(file);
  });
}

export function validateImage(file, maxSizeMB = 10) {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return { valid: false, error: 'Formato no permitido. Usa JPEG, PNG o WebP.' };
  }
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > maxSizeMB) {
    return { valid: false, error: `La imagen excede los ${maxSizeMB}MB (${sizeMB.toFixed(1)}MB)` };
  }
  return { valid: true, sizeMB };
}
