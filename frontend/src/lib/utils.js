// src/lib/utils.js
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina clases de Tailwind de forma segura, eliminando conflictos.
 * @param {...any} inputs - Clases CSS o arrays de clases.
 * @returns {string} - Cadena de clases optimizada.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Formatea un número como moneda (USD).
 * @param {number} amount - Monto a formatear.
 * @param {Object} options - Opciones de formato (mínimo dígitos, etc.).
 * @returns {string} - Cadena formateada (ej: "$1,234.56").
 */
export function formatCurrency(amount, options = {}) {
  const { minimumFractionDigits = 2, maximumFractionDigits = 2 } = options;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount);
}

/**
 * Formatea un número grande con sufijos (K, M, B).
 * @param {number} num - Número a formatear.
 * @returns {string} - Cadena abreviada (ej: "1.2K", "3.5M").
 */
export function formatCompactNumber(num) {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}

/**
 * Formatea una fecha en formato relativo legible (ej: "hace 2 horas").
 * @param {string|Date} dateInput - Fecha a formatear.
 * @returns {string} - Texto relativo en español.
 */
export function formatRelativeTime(dateInput) {
  const date = new Date(dateInput);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHours = Math.round(diffMin / 60);
  const diffDays = Math.round(diffHours / 24);

  if (diffSec < 60) {
    return `hace ${diffSec} segundo${diffSec !== 1 ? 's' : ''}`;
  }
  if (diffMin < 60) {
    return `hace ${diffMin} minuto${diffMin !== 1 ? 's' : ''}`;
  }
  if (diffHours < 24) {
    return `hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
  }
  if (diffDays < 7) {
    return `hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`;
  }
  // Más de 7 días: mostrar fecha corta
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Formatea una fecha en formato local legible (ej: "15 abr 2025").
 * @param {string|Date} dateInput - Fecha a formatear.
 * @returns {string} - Fecha formateada.
 */
export function formatDate(dateInput) {
  const date = new Date(dateInput);
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Formatea una duración en segundos a formato "mm:ss" o "hh:mm:ss".
 * @param {number} seconds - Duración total en segundos.
 * @returns {string} - Duración formateada.
 */
export function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Convierte un tamaño en bytes a una cadena legible (KB, MB, GB).
 * @param {number} bytes - Tamaño en bytes.
 * @param {number} decimals - Decimales a mostrar.
 * @returns {string} - Cadena formateada (ej: "1.5 MB").
 */
export function formatFileSize(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Trunca una cadena de texto a una longitud máxima con puntos suspensivos.
 * @param {string} str - Cadena original.
 * @param {number} maxLength - Longitud máxima.
 * @returns {string} - Cadena truncada.
 */
export function truncateString(str, maxLength = 50) {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
}

/**
 * Obtiene las iniciales de un nombre (máximo 2 caracteres).
 * @param {string} name - Nombre completo.
 * @returns {string} - Iniciales en mayúsculas.
 */
export function getInitials(name) {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Valida si una URL pertenece a un dominio de Cloudinary.
 * @param {string} url - URL a verificar.
 * @returns {boolean} - true si es una URL de Cloudinary.
 */
export function isCloudinaryUrl(url) {
  return url && url.includes('res.cloudinary.com');
}

/**
 * Extrae el public_id de una URL de Cloudinary.
 * @param {string} url - URL completa de Cloudinary.
 * @returns {string|null} - public_id o null si no se puede extraer.
 */
export function extractCloudinaryPublicId(url) {
  if (!isCloudinaryUrl(url)) return null;
  // Ejemplo: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/public_id.jpg
  const parts = url.split('/');
  const uploadIndex = parts.indexOf('upload');
  if (uploadIndex === -1) return null;
  // La parte después de 'upload' y la versión (v123...) es el public_id con extensión
  const relevantParts = parts.slice(uploadIndex + 2);
  const publicIdWithExt = relevantParts.join('/');
  // Eliminar extensión
  const lastDotIndex = publicIdWithExt.lastIndexOf('.');
  if (lastDotIndex !== -1) {
    return publicIdWithExt.substring(0, lastDotIndex);
  }
  return publicIdWithExt;
}
