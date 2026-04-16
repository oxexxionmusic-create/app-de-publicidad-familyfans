// src/services/cloudinary.js
import { mediaAPI } from '@/lib/api';

/**
 * Sube un archivo directamente a Cloudinary usando una firma generada por el backend.
 * @param {File} file - Archivo a subir.
 * @param {Object} options - Opciones: folder, resource_type, public_id_prefix, tags, etc.
 * @returns {Promise<Object>} - Resultado de Cloudinary (public_id, secure_url, etc.)
 */
export async function uploadToCloudinary(file, options = {}) {
  const {
    folder = 'user_uploads',
    resource_type = 'auto', // 'image', 'video', 'raw', 'auto'
    public_id_prefix = '',
    tags = [],
  } = options;

  // 1. Solicitar firma al backend
  const signResponse = await mediaAPI.signUpload({
    folder,
    public_id_prefix,
    resource_type,
  });

  const { signature, timestamp, api_key, cloud_name } = signResponse.data;

  // 2. Construir FormData para Cloudinary
  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', api_key);
  formData.append('timestamp', timestamp);
  formData.append('signature', signature);
  formData.append('folder', folder);
  if (public_id_prefix) {
    formData.append('public_id_prefix', public_id_prefix);
  }
  if (tags.length) {
    formData.append('tags', tags.join(','));
  }

  // 3. Subir a Cloudinary
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
}

/**
 * Valida un archivo de video según restricciones (duración, tamaño).
 * @param {File} file - Archivo de video.
 * @param {number} maxDuration - Duración máxima en segundos.
 * @param {number} maxSizeMB - Tamaño máximo en MB.
 * @returns {Promise<{ valid: boolean, error?: string, duration?: number, sizeMB?: number }>}
 */
export async function validateVideo(file, maxDuration = 420, maxSizeMB = 500) {
  // Validar tamaño
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > maxSizeMB) {
    return { valid: false, error: `El video excede los ${maxSizeMB}MB (${sizeMB.toFixed(1)}MB)` };
  }

  // Validar duración (usando elemento de video HTML5)
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

/**
 * Valida una imagen (tamaño, tipo).
 */
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
