# plan.md — Family Fans Mony (Actualizado)

## 1) Objectives
- Entregar una plataforma full-stack (React + shadcn/ui, FastAPI, MongoDB) 100% en español, con **operación manual-first** (admin valida pagos y evidencias).
- Core operativo: **saldo interno + depósitos manuales (cripto/banco) verificados por admin + campañas (anunciante→creador) + liberación de pagos con comisión**.
- Panel Admin como “centro de control” (verificaciones, aprobaciones, cancelaciones, settings de wallet/datos bancarios).
- Flujos V1 incluidos: **suscripciones premium**, **retiros con KYC**, **rankings básicos**, **financiamiento musical**.
- Restricciones confirmadas: **sin WhatsApp**, **sin directos/pujas de mensajes dorados**, pagos **sin API externa** (comprobantes + aprobación admin).
- Preparar el proyecto para despliegue estable en Render (guía creada) y remover branding de Emergent.

**Estado actual:**
- ✅ Phase 1 (POC) completada y validada.
- ✅ Phase 2 (MVP) completada, UI+API listas, testing realizado y bugs corregidos.
- ⏳ En progreso: guía de despliegue en Render (ya creada) y remoción de branding Emergent.
- ⏳ Próximo: Phase 3 (Spotify curators, micro-tareas, rankings mejorados) + testing.

---

## 2) Implementation Steps (Phases)

### Phase 1 — Core POC (Aislado) **COMPLETADA**
**Core probado**: ledger/saldo interno + depósito manual (cripto/banco) + verificación admin + crear campaña + postulación/aceptación + entrega evidencia + aprobación admin + pago al creador con comisión.

User stories (POC)
1. Como anunciante, quiero subir un comprobante de depósito (cripto o banco) para que el admin lo apruebe y se acredite mi saldo.
2. Como admin, quiero aprobar/rechazar depósitos para controlar el saldo real disponible.
3. Como anunciante, quiero crear una campaña con presupuesto y filtros para recibir aplicaciones relevantes.
4. Como creador, quiero postularme a campañas compatibles para ganar dinero.
5. Como admin, quiero aprobar la evidencia del creador y liberar el pago aplicando comisión.

Evidencia / resultado
- Script de prueba ejecutado y aprobado (idempotencia y consistencia de saldos OK).

Exit criteria (POC) — logrado
- Flujo completo ejecutado varias veces sin inconsistencias.
- No se puede aprobar dos veces el mismo depósito/deliverable.
- Auditoría: cada movimiento crea Transaction con referencia y timestamps.

---

### Phase 2 — V1 App Development (MVP funcional) **COMPLETADA**
**Meta:** construir UI + API completas para el core, con admin panel usable.

User stories (V1) — logrado
1. Registro/inicio de sesión y redirección por rol.
2. Dashboard anunciante (saldo, depósitos, campañas, revisión de entregables).
3. Dashboard creador (perfil ampliado, aplicar a campañas, subir evidencias, ganancias, retiros).
4. Admin: bandeja operativa (depósitos, KYC, entregables, retiros, financiamientos, settings, transacciones).
5. Fan: explorar creadores, suscribirse y ver contenido premium.

Backend (FastAPI) — entregado
- Auth JWT (email/password) + RBAC.
- Seed admin: `edrianttrejol@gmail.com / Sportox@22`.
- Depósitos manuales (cripto/banco) con comprobante + approve/reject.
- Campañas: creación, escrow, cancelación con reembolso de no gastado.
- Applications: postular/aceptar/rechazar.
- Deliverables: submit + approve/reject (pago al creador con comisión 25% / 35% Top10).
- KYC: envío docs + approve/reject.
- Withdrawals: request (min $10, requiere KYC) + regla 1/mes o 3/mes si Top10.
- Subscriptions: plan por creador + subscribe + cobro con comisión.
- Premium content: publicación por creador + acceso con suscripción.
- Music financing: solicitud + approve/reject con acreditación.
- Rankings básicos: endpoint + recálculo manual admin.
- Storage local (/uploads) para comprobantes/KYC/archivos (MVP).

Frontend (React + shadcn/ui) — entregado
- Páginas públicas: Home, Login, Register, Explorar, Rankings, Perfil de creador.
- Panel Admin: Dashboard + tabs/rutas (Depósitos, Campañas, Entregables, Retiros, KYC, Financiamiento, Usuarios, Transacciones, Configuración).
- Panel Anunciante: depósitos, crear campaña, ver campañas, revisar aplicaciones/entregables.
- Panel Creador: perfil ampliado, campañas disponibles, aplicaciones, entregables, ganancias, KYC, retiros, premium.
- Panel Fan: explorar, suscripciones, depósitos, transacciones.

Testing (E2E) — logrado
- Testing agent ejecutado, issues detectados y corregidos:
  - Redirección de registro de creador arreglada.
  - `data-testid` de sidebar admin corregidos.

---

### Phase 2.5 — Deploy Readiness (Render) + Branding Cleanup **EN PROGRESO**
**Objetivo:** asegurar despliegue sin problemas y remover dependencias/marca de Emergent.

Tareas
1. ✅ Guía de despliegue creada: `/app/GUIA_DESPLIEGUE_RENDER.md`.
2. ⏳ Remover marca/branding Emergent:
   - Quitar badge/elemento “Made with Emergent” del frontend.
   - Eliminar dependencia `@emergentbase/visual-edits` si no es necesaria.
   - Revisar `.env` y `REACT_APP_BACKEND_URL` para producción (Render).
   - Asegurar que no existan links a `emergent.sh` o assets de Emergent.
3. ⏳ Ajustes para producción:
   - Aumentar longitud de `JWT_SECRET` (≥32 chars) para evitar warnings.
   - Documentar limitación de `/uploads` en Render Free (persistencia).

Exit criteria
- No aparece ninguna marca Emergent en UI ni dependencias innecesarias.
- Deploy en Render ejecuta backend y frontend con variables correctas.

---

### Phase 3 — More Features (expansión controlada) **PENDIENTE / SIGUIENTE**
**Objetivo:** completar módulos avanzados manteniendo el enfoque manual-first y bajo costo.

User stories
1. Como curador Spotify, quiero registrar playlists y solicitar pago por escuchas con pruebas.
2. Como fan/usuario, quiero hacer micro-tareas de escucha (5 canciones + comentario + evidencia) para ganar $0.02.
3. Como admin, quiero gestionar y aprobar solicitudes de curadores y micro-tareas desde una cola de pendientes.
4. Como sistema/admin, quiero rankings mejorados y recálculo más claro (manual o job simple).
5. (Opcional) Matching mejorado por nivel/region/nicho (si entra en presupuesto) y reglas de elegibilidad.

Implementación (propuesta)
- **Curadores Spotify (simplificado):**
  - CRUD de playlists (5–25 canciones, datos básicos).
  - Solicitud de pago con campos: #canciones, #escuchas, evidencia (captura).
  - Tabla de pago fija según reglas del documento.
  - Admin aprueba/rechaza y acredita saldo.
- **Micro-tareas (simplificado):**
  - Crear tarea “escuchar 5 canciones” + comentario + evidencia.
  - Admin aprueba y acredita $0.02.
- **Rankings mejorados:**
  - Más categorías (además de vistos/seguidores), al menos como placeholders con datos manuales.
  - Botón admin “Recalcular rankings” y explicación de cálculo.
- **Niveles / matching (si aplica):**
  - Enforce por creator_level/influencer_level en campañas.
  - Regla: niveles altos aceptan su nivel o inferiores; niveles bajos solo su nivel.

Close Phase 3
- 1 ronda de testing E2E sobre:
  - Curadores: registro playlist → solicitud → aprobación admin → balance.
  - Micro-tareas: envío evidencia → aprobación admin → balance.
  - Rankings: recálculo + visualización.

---

### Phase 4 — Hardening / Production-readiness (si queda presupuesto y tras tu aprobación)
User stories
1. Exportación CSV de transacciones y reportes simples.
2. Historial filtrable (fecha/estado/tipo) y paginación real.
3. Anti-fraude básico: detectar comprobantes duplicados, evitar re-subidas.
4. Desglose de ingresos por fuente (ads vs subs vs financing vs tareas).
5. Persistencia real de archivos (S3/Cloudinary) para producción.

Implementación
- Refactor modular, validaciones fuertes, paginación, auditoría mejorada.
- Integración opcional de almacenamiento externo.

---

## 3) Next Actions (inmediatas)
1. Terminar **Phase 2.5**:
   - Eliminar “Made with Emergent” y cualquier link/asset de Emergent.
   - Limpiar dependencias de Emergent en `package.json` si no se usan.
2. Confirmar alcance exacto de **Phase 3** (Curadores + micro-tareas + rankings mejorados) para no exceder presupuesto.
3. Ejecutar testing después de Phase 2.5 y al cierre de Phase 3.

---

## 4) Success Criteria
- Admin opera la plataforma end-to-end sin huecos: aprobar depósitos, liberar pagos, gestionar retiros/KYC, settings wallet/banco.
- Core E2E funciona: depósito→saldo→campaña→postulación→entrega→aprobación→pago+comisión, sin inconsistencias.
- UI en español, rutas por rol, estados claros, sin pantallas rotas.
- Deploy en Render exitoso usando la guía (`/app/GUIA_DESPLIEGUE_RENDER.md`).
- No existe branding de Emergent en el producto final.
- Testing E2E al cierre de cada fase con correcciones antes de avanzar.
