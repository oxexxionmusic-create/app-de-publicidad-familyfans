# plan.md — Family Fans Mony

## 1) Objectives
- Entregar un MVP full-stack (React + shadcn/ui, FastAPI, MongoDB) 100% en español.
- Core operativo: **saldo interno + depósitos manuales (cripto/banco) verificados por admin + campañas (anunciante→creador) + liberación de pagos con comisión**.
- Panel Admin como “centro de control” (verificaciones, aprobaciones, cancelaciones, settings de wallet/datos bancarios).
- Flujos secundarios V1: suscripciones premium, retiros con KYC, rankings básicos, curadores Spotify y micro-tareas (versión simplificada).
- Mantener el alcance alineado a 30 créditos (MVP, sin WhatsApp, sin directos/pujas).

## 2) Implementation Steps (Phases)

### Phase 1 — Core POC (Aislado) **NECESARIO**
**Core a probar**: ledger/saldo interno + depósito manual (cripto/banco) + verificación admin + crear campaña + asignar/aceptar + entrega evidencia + aprobación admin + pago al creador con comisión.

User stories (POC)
1. Como anunciante, quiero subir un comprobante de depósito (cripto o banco) para que el admin lo apruebe y se acredite mi saldo.
2. Como admin, quiero aprobar/rechazar depósitos para controlar el saldo real disponible.
3. Como anunciante, quiero crear una campaña con presupuesto y filtros para recibir aplicaciones relevantes.
4. Como creador, quiero postularme a campañas compatibles para ganar dinero.
5. Como admin, quiero aprobar la evidencia del creador y liberar el pago aplicando comisión.

Steps
- Definir modelo mínimo en MongoDB: Users, Deposits, WalletLedger/Transactions, Campaigns, Applications, Deliverables.
- Script/endpoint de prueba (sin UI):
  - Crear anunciante/creador/admin
  - Crear depósito “pendiente” + aprobarlo → ledger acredita saldo
  - Crear campaña + postulación + aceptación
  - Subir deliverable + aprobar → mover fondos: anunciante→escrow→creador + comisión plataforma
- Validar reglas: saldo suficiente, estados (pending/approved/rejected), idempotencia (no doble aprobación), comisión 25%/35% (flag Top10).
- “Websearch” rápida de best practices: ledger/contabilidad doble simple, estados de workflows y validación de idempotencia en pagos manuales.

Exit criteria (POC)
- Flujo completo ejecutado 3 veces sin inconsistencias de saldo.
- No se puede aprobar dos veces el mismo depósito/deliverable.
- Auditoría: cada movimiento crea Transaction con referencia y timestamps.

### Phase 2 — V1 App Development (MVP funcional)
**Meta**: construir UI + API completas para el core, con admin panel usable. (Auth incluido porque es requerido por roles y no bloquea integraciones externas.)

User stories (V1)
1. Como usuario, quiero registrarme/iniciar sesión para acceder a mi panel según mi rol.
2. Como anunciante, quiero ver mi saldo, depósitos y campañas en un dashboard claro.
3. Como creador, quiero completar mi perfil ampliado y postularme/subir evidencias.
4. Como admin, quiero una bandeja de “pendientes” (depósitos, KYC, deliverables, retiros, financiamientos) para operar rápido.
5. Como fan, quiero explorar creadores y suscribirme para ver contenido exclusivo.

Backend (FastAPI)
- Auth JWT (email/password), RBAC (admin/advertiser/creator/fan), seed admin: `edrianttrejol@gmail.com / Sportox@22`.
- Módulos/Endpoints MVP:
  - Settings (solo admin): wallet BEP20 + datos bancarios editables.
  - Deposits: crear (usuario) + listar + admin approve/reject (acredita ledger).
  - Ledger/Transactions: lectura por usuario + global admin.
  - Campaigns: CRUD anunciante, estados, cancelación (reembolsa no gastado), dashboard.
  - Applications: creator apply/withdraw, advertiser review (opcional), admin override.
  - Deliverables: creator submit link+captura, admin approve/reject → pago.
  - Subscriptions: creator plan (precio) + fan subscribe/cancel + feed privado.
  - KYC: upload docs + admin approve/reject.
  - Withdrawals: request (min $10, requiere KYC) + admin approve/reject; regla 1/mes o 3/mes si Top10.
  - Rankings (básico): cálculo batch/endpoint basado en métricas guardadas (manual/admin por ahora).
- Storage de archivos: guardar en servidor (/uploads) con referencia en MongoDB (MVP).

Frontend (React + shadcn/ui)
- App shell con rutas protegidas por rol.
- Pantallas mínimas:
  - Público: home, explorar creadores/rankings, login/registro.
  - Fan: explorar, perfil creador, suscripción, feed premium.
  - Anunciante: saldo/depósitos (crear+subir comprobante), campañas (crear/estado), ver entregables.
  - Creador: perfil ampliado, campañas disponibles, postular, subir evidencias, ganancias/ledger.
  - Admin: dashboard + tabs: Pendientes, Usuarios, Depósitos, Campañas/Entregables, Retiros, KYC, Financiamientos, Settings, Transacciones.
- UX states: loading/empty/error, badges de estado, confirm dialogs (cancelaciones/aprobaciones).

Close Phase 2
- Ejecutar 1 ronda de testing E2E (agent) sobre: registro/login, depósito→aprobación→saldo, campaña→postulación→deliverable→pago.

### Phase 3 — More Features (expansión controlada)
User stories
1. Como admin, quiero definir/editar “niveles” (standard/micro/small) y que el matching filtre campañas.
2. Como anunciante, quiero configurar bonus por umbral de vistas (registrado manualmente) para incentivar rendimiento.
3. Como creador artista, quiero solicitar financiamiento musical con audio/estadísticas y recibir decisión con mensaje.
4. Como curador Spotify, quiero registrar playlist y solicitar pago por escuchas con pruebas.
5. Como fan, quiero ganar micro-recompensas por escuchar 5 canciones y subir evidencia/comentario.

Implementación
- Matching por nivel/region/nicho + regla de aceptación por nivel.
- Bonus de campaña (campos + aprobación admin al validar resultados).
- Financiamiento musical: requests + admin approve/reject con mensaje; ledger de desembolso.
- Curadores Spotify (simplificado): registrar playlist + solicitud de pago basada en tabla; admin valida prueba.
- Micro-tareas: tarea creada por sistema, fan sube evidencia+comentario, admin aprueba y acredita $0.02.
- Rankings: job/cron interno simple (al iniciar o manual en admin) para recalcular Top10.

Close Phase 3
- 1 ronda de testing E2E (agent) sobre: financiamiento, retiros con KYC, curadores, micro-tareas, ranking.

### Phase 4 — Hardening / Production-readiness (si queda presupuesto)
User stories
1. Como admin, quiero exportar transacciones para contabilidad.
2. Como usuario, quiero ver historial filtrable (fecha/estado/tipo).
3. Como sistema, quiero evitar fraude básico (re-subida de mismo comprobante, duplicados).
4. Como creador, quiero ver desglose de ingresos por fuente.
5. Como anunciante, quiero reportes simples por campaña.

Implementación
- Refactor modular (services/repositories), validaciones fuertes, paginación.
- Auditoría: event log; idempotency keys.
- Mejoras UI: tablas con filtros, export CSV.

## 3) Next Actions (inmediatas)
- Confirmar MVP exacto de Phase 2 (core + suscripciones + KYC/retiros incluidos como arriba).
- Ejecutar Phase 1 POC del ledger/workflow y bloquear avance hasta pasar exit criteria.
- Definir valores iniciales de Settings admin (wallet + datos bancarios) y textos legales mínimos (términos/privacidad placeholders).

## 4) Success Criteria
- Admin puede operar la plataforma “manual-first” sin huecos: aprobar depósitos, liberar pagos, gestionar retiros/KYC.
- Core E2E funciona: depósito→saldo→campaña→postulación→entrega→aprobación→pago+comisión, sin inconsistencias.
- UI en español, rutas por rol, estados claros y sin pantallas rotas.
- Ledger/Transacciones auditables y consistentes; restricciones de retiro aplicadas.
- Testing E2E al cierre de cada fase con correcciones antes de avanzar.