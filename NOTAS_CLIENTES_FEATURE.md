# Sistema de Notas para Clientes

Fecha: 16 de noviembre de 2025
Branch: ventas

## Resumen

Sistema completo para registrar incidentes, problemas y observaciones sobre clientes con timestamp automático y trazabilidad completa (usuario creador, fecha/hora).

## Implementación

### Backend

#### 1. Modelo (`backend/src/models/Cliente.ts`)
- **Campo agregado**: `notas` (array de subdocumentos)
- **Estructura de cada nota**:
  ```typescript
  {
    texto: string (requerido, max 1000 caracteres),
    tipo: 'incidente' | 'problema' | 'observacion' | 'seguimiento',
    creadoPor: string (usuario que creó la nota),
    fechaCreacion: Date (auto-generada)
  }
  ```

#### 2. Controlador (`backend/src/controllers/clientesController.ts`)
Tres nuevos endpoints implementados:

- **`agregarNota`** - POST `/api/clientes/:id/notas`
  - Agrega nueva nota al cliente
  - Requiere: `{ texto, tipo }`
  - Asigna automáticamente: `creadoPor` (del token JWT), `fechaCreacion` (Date.now())
  - Retorna cliente actualizado con la nota agregada

- **`obtenerNotas`** - GET `/api/clientes/:id/notas`
  - Lista todas las notas del cliente ordenadas por fecha descendente
  - Retorna: `{ clienteId, nombreCliente, notas[] }`

- **`eliminarNota`** - DELETE `/api/clientes/:id/notas/:notaId`
  - Elimina nota específica (solo admin)
  - Usa filter sobre el array de notas

#### 3. Rutas (`backend/src/routes/clientes.ts`)
```typescript
router.route('/:id/notas')
  .get(obtenerNotas)    // Listar notas
  .post(agregarNota);   // Crear nota (admin/oper_ad)

router.delete('/:id/notas/:notaId', eliminarNota); // Eliminar (admin)
```

### Frontend

#### 1. Types (`frontend/types.ts`)
Interface `Cliente` actualizada con:
```typescript
notas?: Array<{
  _id?: string;
  texto: string;
  tipo: 'incidente' | 'problema' | 'observacion' | 'seguimiento';
  creadoPor: string;
  fechaCreacion: string;
}>
```

#### 2. Redux Slice (`frontend/redux/slices/clientesSlice.ts`)
Dos nuevos thunks agregados:

- **`agregarNota`**
  ```typescript
  dispatch(agregarNota({ 
    clienteId: string, 
    texto: string, 
    tipo: 'incidente' | 'problema' | 'observacion' | 'seguimiento' 
  }))
  ```

- **`eliminarNota`**
  ```typescript
  dispatch(eliminarNota({ 
    clienteId: string, 
    notaId: string 
  }))
  ```

#### 3. Componente Modal (`frontend/components/NotasClienteModal.tsx`)
Componente reutilizable con:

**Funcionalidades**:
- Listar notas ordenadas por fecha (más recientes primero)
- Formulario para agregar nueva nota (solo admin/oper_ad)
- Selector de tipo de nota (incidente/problema/observacion/seguimiento)
- Indicador visual por tipo (íconos y colores diferentes)
- Botón eliminar nota (solo admin)
- Contador de caracteres (max 1000)
- Display de fecha/hora y usuario creador

**Props**:
```typescript
{
  open: boolean;
  onClose: () => void;
  cliente: Cliente | null;
  onAgregarNota: (texto, tipo) => void;
  onEliminarNota: (notaId) => void;
  userType: 'admin' | 'oper' | 'oper_ad';
}
```

**Códigos de color por tipo**:
- 🟠 Incidente → Warning (naranja)
- 🔴 Problema → Error (rojo)
- 🔵 Observación → Info (azul)
- 🟢 Seguimiento → Success (verde)

#### 4. Integración en ClientesPage (`frontend/pages/ClientesPage.tsx`)

**Cambios realizados**:
1. Import del modal y los thunks
2. Estados agregados: `openNotas`, `clienteNotas`
3. Handlers agregados:
   - `handleOpenNotas(cliente)` - abre modal
   - `handleCloseNotas()` - cierra modal
   - `handleAgregarNota(texto, tipo)` - dispatch agregarNota
   - `handleEliminarNota(notaId)` - dispatch eliminarNota
4. Botón "Ver Notas" agregado en columna Acciones (ícono StickyNote2)
5. Modal renderizado al final del componente

## Permisos

- **Ver notas**: Todos los usuarios autenticados
- **Agregar notas**: admin y oper_ad
- **Eliminar notas**: Solo admin

## Validaciones

### Backend
- Texto: requerido, max 1000 caracteres
- Tipo: enum validado ('incidente', 'problema', 'observacion', 'seguimiento')
- Usuario creador: auto-asignado desde token JWT
- Fecha: auto-generada por Mongoose (Date.now)

### Frontend
- Campo texto: validación de no vacío
- Max length: 1000 caracteres con contador visual
- Confirmación antes de eliminar nota

## Flujo de uso

1. Usuario va a **Gestión de Clientes**
2. Click en ícono 📝 "Ver Notas" en la fila del cliente
3. Modal se abre mostrando historial de notas ordenado cronológicamente
4. Si tiene permisos (admin/oper_ad):
   - Selecciona tipo de nota
   - Escribe texto (max 1000 chars)
   - Click "Agregar Nota"
5. Nota se guarda con:
   - Texto ingresado
   - Tipo seleccionado
   - Usuario actual (automático)
   - Fecha/hora actual (automática)
6. Lista se actualiza instantáneamente
7. Admin puede eliminar notas con botón 🗑️

## Casos de uso

### Incidente
"Cliente llamó furioso porque el pedido llegó 3 días tarde. Se ofreció descuento del 10% en próxima compra."

### Problema
"Cliente reporta que producto ref. ABC123 llega defectuoso en últimas 3 entregas. Investigar con producción."

### Observación
"Cliente prefiere entregas los martes por la mañana. Coordinar con logística."

### Seguimiento
"Contactado el 15/11 - confirmó recepción del producto de reemplazo. Situación resuelta."

## Beneficios

1. **Trazabilidad completa**: quién, cuándo y qué se registró
2. **Historial centralizado**: toda la información del cliente en un solo lugar
3. **Categorización**: facilita filtrado y búsqueda futura
4. **Auditoría**: registro inmutable de eventos (solo admin puede eliminar)
5. **Colaboración**: todo el equipo ve las notas de otros usuarios
6. **Prevención**: evita repetir errores conocidos con el cliente

## Mejoras futuras (opcional)

- [ ] Filtro por tipo de nota en el modal
- [ ] Búsqueda de texto en notas
- [ ] Exportar notas a PDF/Excel
- [ ] Notificaciones cuando se agrega nota crítica (incidente/problema)
- [ ] Dashboard con estadísticas de incidentes por cliente
- [ ] Adjuntar archivos a las notas (fotos, documentos)
- [ ] Editar notas (con historial de cambios)
- [ ] Mención de usuarios (@usuario)
- [ ] Recordatorios/fechas de seguimiento

## Testing

### Manual (recomendado ejecutar)
1. Crear cliente nuevo
2. Agregar nota tipo "observacion"
3. Agregar nota tipo "incidente"
4. Verificar ordenamiento cronológico
5. Verificar display de usuario y fecha
6. Eliminar una nota (como admin)
7. Recargar página y verificar persistencia

### Comandos útiles
```powershell
# Backend
cd backend
npm run dev

# Frontend  
cd frontend
npm run dev
```

### Endpoints para probar con Postman/curl
```bash
# Obtener notas del cliente
GET http://localhost:3001/api/clientes/<CLIENT_ID>/notas
Authorization: Bearer <TOKEN>

# Agregar nota
POST http://localhost:3001/api/clientes/<CLIENT_ID>/notas
Authorization: Bearer <TOKEN>
Content-Type: application/json
{
  "texto": "Cliente prefiere entregas por la mañana",
  "tipo": "observacion"
}

# Eliminar nota
DELETE http://localhost:3001/api/clientes/<CLIENT_ID>/notas/<NOTA_ID>
Authorization: Bearer <TOKEN>
```

## Archivos modificados/creados

### Backend
- ✅ `backend/src/models/Cliente.ts` - schema de notas
- ✅ `backend/src/controllers/clientesController.ts` - 3 endpoints nuevos
- ✅ `backend/src/routes/clientes.ts` - rutas notas

### Frontend
- ✅ `frontend/types.ts` - interface Cliente con notas
- ✅ `frontend/redux/slices/clientesSlice.ts` - thunks notas
- ✅ `frontend/components/NotasClienteModal.tsx` - modal (NUEVO)
- ✅ `frontend/pages/ClientesPage.tsx` - integración botón + modal

## Notas técnicas

- Las notas se guardan como subdocumentos en el array `notas` del cliente (no tabla separada)
- Cada nota genera automáticamente un `_id` de MongoDB para identificación única
- El ordenamiento por fecha se hace en memoria (frontend y backend) - funciona bien para <100 notas/cliente
- Si un cliente tiene muchas notas (>1000), considerar paginación en el modal
- El username se extrae del token JWT en el backend (campo `user.username`)
- Las fechas se guardan como Date en MongoDB y se formatean en frontend con `formatDate` de utils

---

**Estado**: ✅ Implementación completa y lista para usar
**Próximo paso**: Testing manual en ambiente de desarrollo
