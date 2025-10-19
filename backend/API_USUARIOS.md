# API de Gestión de Usuarios

## Autenticación
Todos los endpoints de usuarios requieren autenticación de administrador.
Incluye el token en el header: `Authorization: Bearer <token>`

## Endpoints

### 1. Obtener todos los usuarios
```
GET /api/users
```
**Headers:**
- Authorization: Bearer <admin_token>

**Respuesta exitosa:**
```json
[
  {
    "_id": "...",
    "username": "admin",
    "userType": "admin",
    "createdAt": "2024-...",
    "updatedAt": "2024-..."
  }
]
```

### 2. Crear un nuevo usuario
```
POST /api/users
```
**Headers:**
- Authorization: Bearer <admin_token>
- Content-Type: application/json

**Body:**
```json
{
  "username": "nuevo_usuario",
  "password": "password123",
  "userType": "oper"
}
```

**Tipos de usuario válidos:**
- `admin`: Administrador completo
- `oper`: Operador básico
- `oper_ad`: Operador avanzado

**Respuesta exitosa:**
```json
{
  "_id": "...",
  "username": "nuevo_usuario",
  "userType": "oper",
  "createdAt": "2024-...",
  "message": "Usuario creado exitosamente"
}
```

### 3. Actualizar usuario
```
PUT /api/users/:id
```
**Headers:**
- Authorization: Bearer <admin_token>
- Content-Type: application/json

**Parámetros:**
- `id`: ID del usuario a actualizar

**Body (todos los campos son opcionales):**
```json
{
  "username": "username_actualizado",
  "password": "nueva_password",
  "userType": "oper_ad"
}
```

**Respuesta exitosa:**
```json
{
  "_id": "...",
  "username": "username_actualizado",
  "userType": "oper_ad",
  "updatedAt": "2024-...",
  "message": "Usuario actualizado exitosamente"
}
```

### 4. Eliminar usuario
```
DELETE /api/users/:id
```
**Headers:**
- Authorization: Bearer <admin_token>

**Parámetros:**
- `id`: ID del usuario a eliminar

**Respuesta exitosa:**
```json
{
  "message": "Usuario eliminado exitosamente",
  "deletedUser": {
    "_id": "...",
    "username": "usuario_eliminado",
    "userType": "oper"
  }
}
```

## Restricciones de Seguridad

1. **Solo administradores** pueden gestionar usuarios
2. **No se puede eliminar** la propia cuenta
3. **No se puede eliminar** el último administrador del sistema
4. **No se puede cambiar** el tipo del último administrador
5. **Username debe ser único** en el sistema

## Códigos de Error Comunes

- `400`: Datos inválidos o falta información requerida
- `401`: No autorizado (token inválido o faltante)
- `403`: Acceso denegado (no es administrador)
- `404`: Usuario no encontrado
- `500`: Error interno del servidor

## Ejemplo de Uso en Postman

1. **Primero hacer login** para obtener el token de admin:
   ```
   POST /api/login
   {
     "username": "admin",
     "password": "password"
   }
   ```

2. **Usar el token** en los endpoints de usuarios:
   ```
   Headers: Authorization: Bearer <token_obtenido_del_login>
   ```