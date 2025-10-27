# Instrucciones para agentes AI (repositorio myGestor)

Breve: este proyecto es una aplicación fullstack (React + Vite en frontend, Node/Express + TypeScript + Mongoose en backend) para gestionar gastos con autenticación por JWT y roles (admin / oper_ad / oper). Estas notas recogen lo esencial que un agente necesita para ser productivo rápidamente en cambios, debugging y PRs.

1) Comandos claves
  - Backend (desarrollo):
    - cd backend; npm install; cp .env.example .env; npm run dev  # arranca nodemon + ts-node
  - Frontend (desarrollo):
    - cd frontend; npm install; cp .env.example .env; npm run dev  # arranca Vite
  - Frontend (build):
    - cd frontend; npm run build  # tsc + vite build
  - Backend (build/run prod):
    - cd backend; npm run build; npm run start

2) Arquitectura y límites de servicio (por qué está así)
  - Frontend: React + TypeScript + Material UI; estado global con Redux Toolkit en `frontend/redux/`.
    - `frontend/services/api.ts` es el cliente axios central: añade Authorization desde localStorage y redirige al login si el token expiró.
  - Backend: Express + TypeScript + Mongoose en `backend/src/`.
    - `backend/src/models/Gasto.ts` contiene esquema y validación por rubro/subRubro; actualizarlo cuando añadas rubros.
  - Comunicación: todas las llamadas REST usan prefijo `/api/*`. Ejemplos: `/api/auth` (login), `/api/gastos` (CRUD gastos).

3) Estado y autenticación (puntos críticos que rompen roles)
  - Tokens y persistencia:
    - Token y metadatos se guardan en localStorage: `token`, `tokenExpiration`, `user`.
    - `frontend/redux/slices/authSlice.ts` rehidrata `user` desde `localStorage` al cargar la app. Revisa ese archivo al tocar autenticación o expiración.
  - Expiración: el backend y frontend usan 12 horas por diseño; `authSlice` calcula expiration y `services/api.ts` bloquea/redirige si expiró.

4) Convenciones específicas del proyecto (no genéricas)
  - Rubro / SubRubro: la lista autorizada está duplicada en backend y frontend:
    - Backend: `backend/src/models/Gasto.ts` -> `subRubrosByRubro`.
    - Frontend: `frontend/types.ts` -> `subRubrosByRubro` y unión en la interfaz `Gasto`.
    - Si añades o renombras un rubro, actualiza ambos archivos para evitar validaciones fallidas.
  - Al cancelar un gasto: es obligatorio enviar `comentario` (UI valida y backend guarda). Revisa las rutas PATCH en `backend/src/routes/gastos.ts`.
  - Para cheques: hay campos específicos (`estadoCheque`, `chequeRelacionadoId`). Cambios en esa lógica afectan tanto UI como endpoints (acción `confirmarCheque` y `disponerCheque` en `frontend/services/api.ts`).

5) Archivos clave para mirar antes de editar
  - `frontend/redux/slices/authSlice.ts` — rehidratación, tokenExpiration, guardado de `user` en localStorage.
  - `frontend/redux/store.ts` — middleware (redux-logger en dev), serializableCheck personalizado.
  - `frontend/services/api.ts` — baseURL, interceptors, manejo 401/expiración.
  - `frontend/components/ExpenseTable.tsx` — lógica UI para permisos (el lugar más común donde se comprueba `user.userType`).
  - `frontend/types.ts` — tipos centrales (User, Gasto) y mapeos de subRubros.
  - `backend/src/models/Gasto.ts` — esquema y validaciones por rubro/subrubro.
  - `backend/src/routes/gastos.ts` — endpoints de cancel/re-activar/eliminar/confirmar.
  - `backend/src/server.ts` — punto de entrada, variables de entorno esperadas.

6) Patterns y decisiones observadas (ejemplos concretos)
  - Persistencia ligera: se confía en `localStorage` para rehidratación; busca `localStorage.getItem('user')` y `tokenExpiration` en el frontend.
  - Validación compartida: subRubros están validados en el backend (Mongoose) y en frontend (tipos/constantes). Evitar desincronización.
  - Manejo de expiración: `api.ts` intercepta peticiones y redirige a `/login` en 401 o token expirado.

7) Debugging rápido / dónde mirar logs
  - Frontend: activar `console.log` desde `authSlice` y redux-logger (ya habilitado en dev). Revisar `frontend/services/api.ts` logs de expiración.
  - Backend: `npm run dev` usa `nodemon` con ts-node; errores de tipo/validación salen en consola. Modelos con validaciones Mongoose lanzan mensajes claros.

8) Pull request checklist para agentes
  - ¿Actualizaste `subRubrosByRubro` en backend y frontend si tocaste rubros? (sí/no)
  - ¿Verificaste que `authSlice` rehidrata `user` y no rompe roles después de reload?
  - ¿Probaste flujo de login -> crear/editar/cancelar/reactivar gasto como `admin` y `oper_ad`?
  - ¿Agregaste tests/manual steps en el PR description si cambias comportamiento del auth o validaciones?

9) Qué no hacer (errores comunes vistos)
  - No modificar solo el frontend al cambiar rubros; romperá la validación backend y producirá errores al crear gastos.
  - No asumir que `localStorage` siempre contiene `user` — `authSlice` parsea y valida; el agente debe respetar esa convención.

Si quieres, actualizo este archivo con ejemplos concretos de endpoints (ej: rutas en `backend/src/routes/gastos.ts`) o añado sección de debugging paso a paso. ¿Hay algo que te gustaría ampliar o cambiar?
