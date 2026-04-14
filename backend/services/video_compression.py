import ffmpeg
import os
import tempfile
from pathlib import Path
from fastapi import HTTPException

MAX_DURATION_CHAT = 40  # segundos
MAX_DURATION_PREMIUM = 420  # 7 minutos
MAX_FILE_SIZE_MB = 100

def validate_video(input_path: str, max_duration: int = MAX_DURATION_PREMIUM) -> dict:
    """Valida que el video cumpla con los requisitos"""
    try:
        probe = ffmpeg.probe(input_path)
        duration = float(probe['format']['duration'])
        file_size_mb = os.path.getsize(input_path) / (1024 * 1024)
        
        if duration > max_duration:
            raise HTTPException(
                400, 
                f"El video no puede superar {max_duration} segundos (actual: {duration:.1f}s)"
            )
        
        if file_size_mb > MAX_FILE_SIZE_MB:
            raise HTTPException(
                400, 
                f"El video no puede superar {MAX_FILE_SIZE_MB}MB (actual: {file_size_mb:.1f}MB)"
            )
        
        return {
            "duration": duration,
            "size_mb": file_size_mb,
            "width": int(probe['streams'][0].get('width', 0)),
            "height": int(probe['streams'][0].get('height', 0))
        }
    except ffmpeg.Error as e:
        raise HTTPException(400, f"Error al analizar el video: {e.stderr.decode()}")

def compress_video(input_path: str, output_path: str, max_duration: int = MAX_DURATION_PREMIUM) -> str:
    """Comprime video manteniendo calidad aceptable"""
    try:
        # Validar primero
        video_info = validate_video(input_path, max_duration)
        
        # Parámetros de compresión
        crf = 28  # Calidad (18-28, menor = mejor)
        preset = "medium"
        maxrate = "1M"
        bufsize = "2M"
        
        # Escalar a 720p si es mayor
        scale_filter = "scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease"
        
        (
            ffmpeg
            .input(input_path)
            .filter('scale', 'min(1280,iw)', 'min(720,ih)', force_original_aspect_ratio='decrease')
            .output(
                output_path,
                vcodec='libx264',
                acodec='aac',
                crf=crf,
                preset=preset,
                maxrate=maxrate,
                bufsize=bufsize,
                t=max_duration,  # Limitar duración
                movflags='+faststart'  # Optimizar para streaming
            )
            .overwrite_output()
            .run(capture_stdout=True, capture_stderr=True)
        )
        
        return output_path
    except ffmpeg.Error as e:
        stderr = e.stderr.decode() if e.stderr else "Error desconocido"
        raise HTTPException(400, f"Error al comprimir video: {stderr}")
    except Exception as e:
        raise HTTPException(500, f"Error interno al procesar video: {str(e)}")

def get_video_duration(file_path: str) -> float:
    """Obtiene la duración de un video en segundos"""
    try:
        probe = ffmpeg.probe(file_path)
        return float(probe['format']['duration'])
    except:
        return 0.0
      
