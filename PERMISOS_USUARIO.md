# 🔐 Sistema de Permisos por Tipo de Usuario

## Tipos de Usuario

### 1. **ADMIN** (admin)
- ✅ **Crear** registros de gastos
- ✅ **Editar** registros de gastos
- ✅ **Eliminar** registros de gastos
- ✅ **Descargar** PDF
- ✅ **Crear/eliminar** otros usuarios
- ✅ **Ver** todos los registros

### 2. **OPERADOR AVANZADO** (oper_ad)
- ✅ **Crear** registros de gastos
- ✅ **Editar** registros de gastos
- ✅ **Eliminar** registros de gastos
- ✅ **Descargar** PDF
- ❌ **No puede** crear/eliminar usuarios
- ✅ **Ver** todos los registros

### 3. **OPERADOR** (oper)
- ✅ **Puede CREAR** registros de gastos
- ❌ **No puede** editar registros
- ❌ **No puede** eliminar registros
- ✅ **Puede** descargar PDF
- ❌ **No puede** crear/eliminar usuarios
- ✅ **Ver** todos los registros

---

## Pruebas en Postman

### 🔑 Paso 1: Obtener Tokens de Autenticación

#### Login como ADMIN
```http
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}
```

#### Crear usuario OPERADOR AVANZADO (solo ADMIN)
```http
POST http://localhost:3001/api/users
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "username": "operador_avanzado",
  "password": "123456",
  "userType": "oper_ad"
}
```

#### Crear usuario OPERADOR (solo ADMIN)
```http
POST http://localhost:3001/api/users
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "username": "operador_basico",
  "password": "123456",
  "userType": "oper"
}
```

#### Login como OPERADOR AVANZADO
```http
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "username": "operador_avanzado",
  "password": "123456"
}
```

#### Login como OPERADOR
```http
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "username": "operador_basico",
  "password": "123456"
}
```

---

### 📊 Paso 2: Probar Permisos de Gastos

#### Crear Gasto (✅ ADMIN, ✅ OPER_AD, ✅ OPER)
```http
POST http://localhost:3001/api/gastos
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "fecha": "2025-10-19",
  "rubro": "SERVICIOS",
  "subRubro": "EDENOR",
  "medioDePago": "Mov. Banco",
  "clientes": "Cliente Test",
  "detalleGastos": "Pago de luz",
  "comentario": "Prueba de permisos",
  "entrada": 0,
  "salida": 5000,
  "banco": "SANTANDER"
}
```

**Respuesta esperada para TODOS:** ✅ Éxito (201 Created)

#### Ver Gastos (✅ Todos los usuarios)
```http
GET http://localhost:3001/api/gastos
Authorization: Bearer {{token}}
```

#### Actualizar Gasto (✅ ADMIN, ✅ OPER_AD, ❌ OPER)
**Respuesta esperada para OPER:**
```json
{
  "message": "No tienes permisos para editar o eliminar registros. Solo usuarios admin y oper_ad pueden realizar estas acciones."
}
```
```http
PUT http://localhost:3001/api/gastos/{{gasto_id}}
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "fecha": "2025-10-19",
  "rubro": "SERVICIOS",
  "subRubro": "AGUA",
  "medioDePago": "Mov. Banco",
  "clientes": "Cliente Test Editado",
  "detalleGastos": "Pago de agua - editado",
  "comentario": "Prueba de edición",
  "entrada": 0,
  "salida": 3000,
  "banco": "EFECTIVO"
}
```

#### Eliminar Gasto (✅ ADMIN, ✅ OPER_AD, ❌ OPER)
**Respuesta esperada para OPER:**
```json
{
  "message": "No tienes permisos para editar o eliminar registros. Solo usuarios admin y oper_ad pueden realizar estas acciones."
}
```
```http
DELETE http://localhost:3001/api/gastos/{{gasto_id}}
Authorization: Bearer {{token}}
```

---

## 🎨 Diferencias en el Frontend

### Usuario ADMIN y OPER_AD verán:
- ✅ Botón "Agregar Registro" en el sidebar
- ✅ Columna "Acciones" en la tabla con botones Editar/Eliminar
- ✅ Botón "Descargar PDF" en el resumen bancario

### Usuario OPER verá:
- ✅ Botón "Agregar Registro" en el sidebar (puede crear)
- ❌ **NO** aparece la columna "Acciones" en la tabla (no puede editar/eliminar)
- ✅ Botón "Descargar PDF" en el resumen bancario (puede ver reportes)
- ✅ Puede **CREAR** y **VER** datos, pero no **EDITAR** ni **ELIMINAR**

---

## 🔧 Variables de Entorno Postman

Para facilitar las pruebas, crea estas variables en Postman:

```
admin_token: (token obtenido del login admin)
oper_ad_token: (token obtenido del login oper_ad)
oper_token: (token obtenido del login oper)
base_url: http://localhost:3001
```

---

## 🚀 Flujo de Prueba Recomendado

1. **Login como admin** → Obtener token admin
2. **Crear usuarios** oper_ad y oper usando token admin
3. **Login con cada tipo** de usuario → Obtener sus tokens
4. **Probar operaciones** con cada token:
   - GET (debería funcionar para todos)
   - POST (debería fallar para oper)
   - PUT (debería fallar para oper)
   - DELETE (debería fallar para oper)
5. **Probar frontend** logueándose con cada tipo de usuario para ver las diferencias en la UI

---

## ⚠️ Notas Importantes

- Los tokens JWT tienen una duración de 30 días
- El usuario admin inicial se crea automáticamente (username: admin, password: password)
- Solo usuarios admin pueden crear/eliminar otros usuarios
- Los permisos se validan tanto en frontend (UI) como backend (API)
- Los usuarios oper pueden ver todos los datos pero no pueden modificar nada