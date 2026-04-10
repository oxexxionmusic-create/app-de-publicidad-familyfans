# Guia de Despliegue en Render - Family Fans Mony

## Requisitos Previos
1. Una cuenta en [Render](https://render.com) (plan gratuito funciona)
2. Una cuenta en [MongoDB Atlas](https://www.mongodb.com/atlas) (plan gratuito M0)
3. Tu codigo subido a un repositorio en GitHub

---

## Paso 1: Configurar MongoDB Atlas (Base de Datos)

1. Ve a [MongoDB Atlas](https://www.mongodb.com/atlas) y crea una cuenta
2. Crea un **nuevo cluster** (selecciona el plan gratuito M0)
3. Elige la region mas cercana a tus usuarios (ejemplo: Sao Paulo para LATAM)
4. Una vez creado, haz clic en **"Connect"**
5. Selecciona **"Connect your application"**
6. Copia la **Connection String**. Se vera algo asi:
   ```
   mongodb+srv://usuario:contrasena@cluster0.xxxxx.mongodb.net/familyfansmony?retryWrites=true&w=majority
   ```
7. **IMPORTANTE**: Reemplaza `<password>` con tu contrasena real y agrega el nombre de la base de datos `familyfansmony` antes del `?`
8. En la seccion **"Network Access"**, agrega la IP `0.0.0.0/0` para permitir conexiones desde Render

---

## Paso 2: Preparar el Codigo para Render

### Estructura de archivos necesaria:

```
tu-repositorio/
├── backend/
│   ├── server.py
│   ├── auth.py
│   ├── requirements.txt
│   └── .env (NO subir a GitHub)
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── craco.config.js
│   └── .env (NO subir a GitHub)
└── README.md
```

### Crear archivo `.gitignore` en la raiz:
```
# Dependencias
node_modules/
__pycache__/
*.pyc
.venv/

# Variables de entorno
.env
.env.local
.env.production

# Archivos subidos
backend/uploads/

# Build
frontend/build/
```

---

## Paso 3: Desplegar el Backend en Render

1. Inicia sesion en [Render](https://render.com)
2. Haz clic en **"New +"** > **"Web Service"**
3. Conecta tu repositorio de GitHub
4. Configura:
   - **Name**: `familyfansmony-api`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free (o el que prefieras)

5. En **"Environment Variables"**, agrega:
   | Variable | Valor |
   |----------|-------|
   | `MONGO_URL` | Tu connection string de MongoDB Atlas |
   | `DB_NAME` | `familyfansmony` |
   | `CORS_ORIGINS` | `https://tu-frontend.onrender.com` (pon la URL de tu frontend despues de desplegarlo) |
   | `JWT_SECRET` | Una clave secreta larga y aleatoria (minimo 32 caracteres) |
   | `PYTHON_VERSION` | `3.11.0` |

6. Haz clic en **"Create Web Service"**
7. Espera a que termine el despliegue (~5 minutos)
8. Anota la URL que te da Render (ejemplo: `https://familyfansmony-api.onrender.com`)

---

## Paso 4: Desplegar el Frontend en Render

1. En Render, haz clic en **"New +"** > **"Static Site"**
2. Conecta el mismo repositorio de GitHub
3. Configura:
   - **Name**: `familyfansmony-web`
   - **Root Directory**: `frontend`
   - **Build Command**: `yarn install && yarn build`
   - **Publish Directory**: `build`

4. En **"Environment Variables"**, agrega:
   | Variable | Valor |
   |----------|-------|
   | `REACT_APP_BACKEND_URL` | `https://familyfansmony-api.onrender.com` (la URL de tu backend del paso 3) |

5. En **"Redirects/Rewrites"**, agrega esta regla (MUY IMPORTANTE para React Router):
   - Source: `/*`
   - Destination: `/index.html`
   - Action: `Rewrite`

6. Haz clic en **"Create Static Site"**
7. Espera el despliegue (~5 minutos)

---

## Paso 5: Configurar CORS (Importante)

Despues de desplegar ambos servicios:

1. Ve al backend en Render > **Environment** 
2. Actualiza `CORS_ORIGINS` con la URL exacta de tu frontend:
   ```
   https://familyfansmony-web.onrender.com
   ```
3. Render reiniciara automaticamente el backend

---

## Paso 6: Verificar el Despliegue

1. Abre la URL de tu frontend en el navegador
2. Intenta iniciar sesion con la cuenta de admin:
   - Email: `edrianttrejol@gmail.com`
   - Password: `Sportox@22`
3. Si todo funciona, veras el panel de administracion

---

## Paso 7: Configurar Dominio Personalizado (Opcional)

1. En Render, ve a tu Static Site > **Settings** > **Custom Domains**
2. Agrega tu dominio (ejemplo: `familyfansmony.com`)
3. Configura los DNS de tu dominio segun las instrucciones de Render
4. Render generara automaticamente un certificado SSL

---

## Notas Importantes

### Plan Gratuito de Render
- Los servicios gratuitos se "duermen" despues de 15 minutos de inactividad
- La primera solicitud despues del "sueno" puede tardar ~30-50 segundos
- Para mantener el servicio activo, puedes usar un servicio como [UptimeRobot](https://uptimerobot.com) que haga ping cada 5 minutos

### Almacenamiento de Archivos
- Los archivos subidos (comprobantes, KYC, etc.) se almacenan en el servidor
- En Render gratuito, estos archivos se borran cuando el servicio se reinicia
- Para produccion, considera usar:
  - **Cloudinary** (gratuito hasta 25GB) para imagenes
  - **AWS S3** o **Backblaze B2** para archivos generales
  - Puedes integrar cualquiera de estos sin cambiar mucho codigo

### Seguridad
- NUNCA subas el archivo `.env` a GitHub
- Cambia el `JWT_SECRET` a algo unico y largo
- Activa 2FA en tu cuenta de MongoDB Atlas y Render

### Monitoreo
- Render proporciona logs en tiempo real en el dashboard
- MongoDB Atlas tiene metricas de uso en su panel
- Configura alertas de email en Render para errores del servicio

---

## Resolucion de Problemas Comunes

### Error 502 Bad Gateway
- El backend esta reiniciandose o dormido. Espera 30 segundos y recarga.

### Error de CORS
- Verifica que `CORS_ORIGINS` en el backend tenga la URL exacta del frontend (sin `/` al final)

### La app carga pero no muestra datos
- Verifica la variable `REACT_APP_BACKEND_URL` en el frontend
- Asegurate de que apunte al backend de Render, no a localhost

### Los archivos subidos no se muestran
- En el plan gratuito de Render, los archivos se borran al reiniciar
- Necesitaras integrar un servicio de almacenamiento externo para produccion

### El admin no puede iniciar sesion
- El admin se crea automaticamente al iniciar el servidor
- Si la base de datos esta vacia, reinicia el backend desde Render

---

## Comando Rapido para Subir a GitHub

```bash
# En la raiz de tu proyecto
git init
git add .
git commit -m "Family Fans Mony - MVP"
git branch -M main
git remote add origin https://github.com/tu-usuario/familyfansmony.git
git push -u origin main
```

---

**Contacto para soporte**: Si tienes problemas con el despliegue, revisa los logs en Render Dashboard > tu servicio > Logs.
