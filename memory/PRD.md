# Family Fans Mony - PRD (Product Requirements Document)

## Nombre: Family Fans Mony
## Descripcion: Plataforma de publicidad que conecta anunciantes con influencers/creadores

## Stack Tecnico
- Backend: FastAPI (Python) + MongoDB
- Frontend: React + shadcn/ui + Tailwind CSS
- Idioma: Espanol (toda la interfaz)

## Roles de Usuario
1. **Admin** (edrianttrejol@gmail.com / Sportox@22) - Control total manual
2. **Anunciante** - Crea campanas, deposita fondos
3. **Creador** - Aplica a campanas, monetiza contenido, curador Spotify
4. **Fan** - Explora, suscribe, micro-tareas

## Funcionalidades Implementadas
- Auth JWT con roles
- Sistema de depositos manuales (cripto/banco) con aprobacion admin
- Campanas publicitarias (crear, aplicar, entregar, aprobar)
- Sistema financiero con comisiones (25% estandar, 35% Top 10)
- KYC para retiros
- Suscripciones premium
- Financiamiento musical
- Curadores de Spotify
- Micro-tareas (escuchar musica y ganar)
- Rankings Top 10
- Panel admin completo con gestion manual

## Archivos Clave
- /app/backend/server.py - API principal
- /app/backend/auth.py - Autenticacion
- /app/frontend/src/App.js - Router principal
- /app/frontend/src/pages/ - Todas las paginas
- /app/frontend/src/lib/api.js - Cliente API
- /app/GUIA_DESPLIEGUE_RENDER.md - Guia de despliegue
