# 🚀 Guía Rápida: Inicio con Facturación Electrónica AFIP

## 📋 Checklist de Configuración

### ✅ Paso 1: Instalar Dependencias

Ya instaladas:
- `@afipsdk/afip.js` - SDK de AFIP
- `moment` - Manejo de fechas
- `@types/moment` - Tipos para TypeScript
- `@types/node` - Tipos para Node.js

### ✅ Paso 2: Obtener Certificado AFIP (Producción)

**Opción A: Certificado Real (Producción)**
```bash
# 1. Generar clave privada y CSR
cd backend
mkdir -p certs
openssl genrsa -out certs/private.key 2048
openssl req -new -key certs/private.key \
  -subj "/C=AR/O=TU_EMPRESA/CN=TU_CUIT/serialNumber=CUIT TU_CUIT" \
  -out certs/request.csr

# 2. Ir a AFIP → Administrador de Relaciones → Certificados Digitales
# 3. Subir el CSR
# 4. Descargar certificado y guardarlo en certs/cert.crt
```

**Opción B: Testing sin Certificado (Homologación)**
```bash
# Puedes usar el CUIT de prueba de AFIP: 20409378472
# No necesitas certificado real, el SDK maneja automáticamente
```

### ✅ Paso 3: Configurar Variables de Entorno

Edita `backend/.env`:

```bash
# AFIP Configuration
AFIP_CUIT=20123456789
AFIP_PRODUCTION=false
AFIP_CERT_PATH=./certs/cert.crt
AFIP_KEY_PATH=./certs/private.key
AFIP_TA_FOLDER=./afip_tokens
AFIP_PUNTO_VENTA=1

# Company Data
EMPRESA_CUIT=20123456789
EMPRESA_RAZON_SOCIAL=Tu Empresa SA
EMPRESA_DOMICILIO=Calle Principal 123, Buenos Aires
EMPRESA_CONDICION_IVA=Responsable Inscripto
EMPRESA_IIBB=901-123456-7
EMPRESA_INICIO_ACTIVIDADES=2020-01-01
```

### ✅ Paso 4: Crear Directorios

```bash
cd backend
mkdir -p certs afip_tokens
chmod 700 certs
chmod 700 afip_tokens
```

### ✅ Paso 5: Probar Conexión

```bash
cd backend
node scripts/test-afip.js
```

## 🎯 Flujo de Trabajo Recomendado

### 1️⃣ Cliente Realiza Compra

```typescript
// Frontend - Crear venta
POST /api/ventas
{
  "clienteId": "67...",
  "items": [...],
  "medioPago": "EFECTIVO",
  "banco": "EFECTIVO"
}
```

### 2️⃣ Generar Factura desde Venta

```typescript
// Backend automático o manual
POST /api/facturacion/desde-venta
{
  "ventaId": "67..."
}

// Respuesta
{
  "factura": {
    "_id": "67...",
    "estado": "borrador",
    "tipoComprobante": "FACTURA_B",
    "importeTotal": 12100
  }
}
```

### 3️⃣ Revisar y Autorizar en AFIP

```typescript
// Autorizar factura (solicita CAE)
POST /api/facturacion/67.../autorizar

// Respuesta exitosa
{
  "cae": "72345678901234",
  "numeroComprobante": "00001-00000123",
  "fechaVencimientoCAE": "2025-11-10"
}
```

### 4️⃣ Imprimir/Enviar al Cliente

```typescript
// Obtener factura autorizada
GET /api/facturacion/67...

// Datos para imprimir:
// - Número: 00001-00000123
// - CAE: 72345678901234
// - Código de barras (para scanner)
// - Datos completos del comprobante
```

## 🧪 Testing sin Afectar Producción

### Modo Homologación

1. Configura `AFIP_PRODUCTION=false`
2. Usa CUIT de prueba: `20409378472`
3. Las facturas NO son reales
4. Puedes probar libremente

### Ejecutar Test

```bash
cd backend
npm run test:afip
```

O directamente:

```bash
node scripts/test-afip.js
```

## 📊 Estructura de Base de Datos

### Modelos Creados

1. **Factura** (`backend/src/models/Factura.ts`)
   - Contiene todos los datos del comprobante
   - Relacionada con Venta y Cliente
   - Incluye datos AFIP (CAE, número, etc.)

### Índices Importantes

```javascript
// Buscar por CAE
db.facturas.findOne({ 'datosAFIP.cae': '72345678901234' })

// Buscar por número
db.facturas.findOne({ 'datosAFIP.numeroComprobante': '00001-00000123' })

// Facturas de un cliente
db.facturas.find({ clienteId: ObjectId('67...') })

// Facturas autorizadas del mes
db.facturas.find({
  estado: 'autorizada',
  fecha: { $gte: ISODate('2025-10-01'), $lte: ISODate('2025-10-31') }
})
```

## 🔧 Troubleshooting

### Error: "Certificado no encontrado"

```bash
# Verificar que existan los archivos
ls -la backend/certs/

# Deben estar:
# - private.key
# - cert.crt
```

### Error: "CUIT inválido"

```bash
# El CUIT debe tener 11 dígitos sin guiones
# Correcto: 20123456789
# Incorrecto: 20-12345678-9
```

### Error: "Punto de venta no habilitado"

1. Ingresa a AFIP con Clave Fiscal
2. Ve a: **Comprobantes en Línea** → **Administración**
3. Crea un punto de venta
4. Anota el número y configúralo en `.env`

### Error: "Token de autorización vencido"

```bash
# Eliminar tokens viejos (se regeneran automáticamente)
rm -rf backend/afip_tokens/*
```

## 📈 Próximos Pasos

### 1. Integración Frontend

Crear componentes React para:
- [ ] Listar facturas
- [ ] Ver detalle de factura
- [ ] Autorizar factura
- [ ] Imprimir factura (PDF)
- [ ] Enviar por email

### 2. Automatización

- [ ] Facturar automáticamente al confirmar venta
- [ ] Envío automático de factura por email
- [ ] Notificación antes del vencimiento del CAE

### 3. Reportes

- [ ] Libro IVA Digital
- [ ] Resumen mensual de facturación
- [ ] Export para contador

### 4. Seguridad

- [ ] Backup automático de certificados
- [ ] Logs de auditoría de facturas
- [ ] Restricción de permisos por rol

## 📞 Recursos

- **Documentación completa**: `backend/FACTURACION_AFIP.md`
- **Ejemplo de uso**: `backend/scripts/test-afip.js`
- **Código fuente**:
  - Modelo: `backend/src/models/Factura.ts`
  - Servicio: `backend/src/services/afipService.ts`
  - Controlador: `backend/src/controllers/facturacionController.ts`
  - Rutas: `backend/src/routes/facturacionRoutes.ts`

---

**¿Listo para comenzar?** 🚀

```bash
# 1. Configurar .env
vim backend/.env

# 2. Crear directorios
mkdir -p backend/certs backend/afip_tokens

# 3. Probar
node backend/scripts/test-afip.js

# 4. Iniciar servidor
cd backend && npm run dev
```
