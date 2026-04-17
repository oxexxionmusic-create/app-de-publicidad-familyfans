// src/services/cloudinary.js
import { mediaAPI } from '@/lib/api';

/**
 * Valida un archivo de video antes de subir
 * @param {File} file - Archivo a validar
 * @param {number} maxDuration - Duración máxima en segundos
 * @param {number} maxSizeMB - Tamaño máximo en MB
 * @returns {Promise<{valid: boolean, error?: string, duration?: number}>}
 */
export const validateVideo = (file, maxDuration = 420, maxSizeMB = 500) => {
  return new Promise((resolve) => {
    // Validar tipo
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
      resolve({ valid: false, error: 'Formato de video no soportado. Use MP4, MOV, AVI o WebM.' });
      return;
    }

    // Validar tamaño
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      resolve({ valid: false, error: `El video excede ${maxSizeMB}MB (tamaño: ${sizeMB.toFixed(1)}MB).` });
      return;
    }

    // Validar duración
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      if (video.duration > maxDuration) {
        resolve({ 
          valid: false, 
          error: `El video excede ${maxDuration} segundos (duración: ${Math.round(video.duration)}s).` 
        });
      } else {
        resolve({ valid: true, duration: video.duration });
      }
    };
    video.onerror = () => {
      resolve({ valid: false, error: 'No se pudo leer el archivo de video.' });
    };
    video.src = URL.createObjectURL(file);
  });
};

/**
 * Valida un archivo de imagen antes de subir
 * @param {File} file - Archivo a validar
 * @param {number} maxSizeMB - Tamaño máximo en MB
 * @returns {{valid: boolean, error?: string}}
 */
export const validateImage = (file, maxSizeMB = 10) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Formato de imagen no soportado. Use JPEG, PNG o WebP.' };
  }

  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > maxSizeMB) {
    return { valid: false, error: `La imagen excede ${maxSizeMB}MB (tamaño: ${sizeMB.toFixed(1)}MB).` };
  }

  return { valid: true };
};

/**
 * Sube un archivo a Cloudinary a través del backend
 * @param {File} file - Archivo a subir
 * @param {Object} options - Opciones de subida
 * @param {string} options.folder - Carpeta en Cloudinary
 * @param {string} options.resourceType - 'image' o 'video'
 * @param {Function} onProgress - Callback para progreso (0-100)
 * @returns {Promise<Object>} - Resultado de la subida con public_id, url, etc.
 */
export const uploadToCloudinary = async (file, options = {}, onProgress) => {
  const { folder = 'user_uploads', resourceType = 'image' } = options;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  let response;
  if (resourceType === 'video') {
    response = await mediaAPI.uploadVideo(formData, {
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      }
    });
  } else {
    response = await mediaAPI.uploadImage(formData, {
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      }
    });
  }

  // La respuesta del backend contiene { success, public_id, url, ... }
  if (!response.data.success) {
    throw new Error(response.data.error || 'Error desconocido al subir');
  }

  return {
    public_id: response.data.public_id,
    url: response.data.url,
    secure_url: response.data.url, // El backend ya devuelve secure_url
    resource_type: resourceType,
    format: response.data.format,
    bytes: response.data.bytes,
    width: response.data.width,
    height: response.data.height,
    duration: response.data.duration, // solo para video
  };
};
