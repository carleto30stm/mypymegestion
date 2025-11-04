# Configuración de Facturación Electrónica AFIP/ARCA

## 📋 Requisitos Previos

### 1. Obtener Certificado Digital de AFIP

Para poder facturar electrónicamente, necesitas generar un certificado digital y una clave privada:

#### Paso 1: Generar clave privada y CSR

```bash
# Crear directorio para certificados
mkdir -p backend/certs

# Generar clave privada (2048 bits)
openssl genrsa -out backend/certs/private.key 2048

# Generar Certificate Signing Request (CSR)
openssl req -new -key backend/certs/private.key -subj "/C=AR/O=TU_EMPRESA/CN=TU_CUIT/serialNumber=CUIT TU_CUIT" -out backend/certs/request.csr
```

#### Paso 2: Subir CSR a AFIP

1. Ingresa a https://auth.afip.gob.ar/contribuyente_/login.xhtml
2. Ve a: **Administrador de Relaciones de Clave Fiscal** → **Certificados Digitales**
3. Haz clic en **Generar Solicitud de Certificado**
4. Selecciona: **wsfe (Facturación Electrónica)**
5. Sube el archivo `request.csr`
6. Descarga el certificado generado y guárdalo como `backend/certs/cert.crt`

### 2. Configurar Punto de Venta en AFIP

1. Ingresa a AFIP con Clave Fiscal
2. Ve a: **Comprobantes en Línea** → **Administración**
3. Crea un nuevo **Punto de Venta**
4. Anota el número asignado (ej: 00001)

### 3. Configurar Variables de Entorno

Edita el archivo `backend/.env` con tus datos:

```bash
# AFIP Configuration
AFIP_CUIT=20123456789                    # Tu CUIT SIN guiones
AFIP_PRODUCTION=false                    # false = homologación, true = producción
AFIP_CERT_PATH=./certs/cert.crt         # Ruta al certificado
AFIP_KEY_PATH=./certs/private.key       # Ruta a la clave privada
AFIP_TA_FOLDER=./afip_tokens             # Carpeta para tokens de autorización
AFIP_PUNTO_VENTA=1                       # Número de punto de venta

# Company Data
EMPRESA_CUIT=20123456789
EMPRESA_RAZON_SOCIAL=Mi Empresa SA
EMPRESA_DOMICILIO=Av. Principal 123, Ciudad, Provincia
EMPRESA_CONDICION_IVA=Responsable Inscripto
EMPRESA_IIBB=901-123456-7                # Número de Ingresos Brutos (opcional)
EMPRESA_INICIO_ACTIVIDADES=2020-01-01
```

## 🚀 Uso de la API

### Endpoint 1: Crear Factura desde Venta

Crea un borrador de factura a partir de una venta existente:

```bash
POST /api/facturacion/desde-venta
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "ventaId": "67892abc123def456789"
}
```

**Respuesta:**
```json
{
  "message": "Factura creada exitosamente (borrador)",
  "factura": {
    "_id": "...",
    "tipoComprobante": "FACTURA_B",
    "estado": "borrador",
    "receptorRazonSocial": "Juan Pérez",
    "importeTotal": 12100,
    ...
  }
}
```

### Endpoint 2: Crear Factura Manual

Crea una factura desde cero sin venta previa:

```bash
POST /api/facturacion/manual
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "clienteId": "67892abc123def456789",
  "tipoComprobante": "FACTURA_B",
  "concepto": 1,
  "items": [
    {
      "codigo": "PROD001",
      "descripcion": "Producto de prueba",
      "cantidad": 2,
      "unidadMedida": "7",
      "precioUnitario": 1000,
      "importeBruto": 2000,
      "importeDescuento": 0,
      "importeNeto": 2000,
      "alicuotaIVA": 21,
      "importeIVA": 420,
      "importeTotal": 2420
    }
  ],
  "observaciones": "Factura de prueba"
}
```

### Endpoint 3: Autorizar Factura en AFIP (Solicitar CAE)

**¡IMPORTANTE!** Una vez autorizada, la factura no se puede modificar.

```bash
POST /api/facturacion/:id/autorizar
Authorization: Bearer YOUR_TOKEN
```

**Respuesta exitosa:**
```json
{
  "message": "Factura autorizada exitosamente por AFIP",
  "cae": "72345678901234",
  "numeroComprobante": "00001-00000123",
  "factura": {
    "estado": "autorizada",
    "datosAFIP": {
      "cae": "72345678901234",
      "fechaVencimientoCAE": "2025-11-10T00:00:00.000Z",
      "numeroComprobante": "00001-00000123",
      "codigoBarras": "20123456789011000172345678901234120251110"
    }
  }
}
```

**Respuesta rechazada:**
```json
{
  "error": "Factura rechazada por AFIP",
  "errores": [
    "El CUIT del receptor no existe",
    "Código de error 1234"
  ]
}
```

### Endpoint 4: Listar Facturas

```bash
GET /api/facturacion?estado=autorizada&page=1&limit=20
Authorization: Bearer YOUR_TOKEN
```

Filtros disponibles:
- `estado`: borrador, autorizada, rechazada, anulada
- `clienteId`: ID del cliente
- `tipoComprobante`: FACTURA_A, FACTURA_B, FACTURA_C
- `desde`: Fecha desde (YYYY-MM-DD)
- `hasta`: Fecha hasta (YYYY-MM-DD)
- `page`: Número de página
- `limit`: Cantidad por página

### Endpoint 5: Obtener Factura por ID

```bash
GET /api/facturacion/:id
Authorization: Bearer YOUR_TOKEN
```

### Endpoint 6: Anular Factura

```bash
POST /api/facturacion/:id/anular
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "motivo": "Error en carga de datos"
}
```

### Endpoint 7: Verificar CAE en AFIP

Verifica que el CAE siga siendo válido en AFIP:

```bash
GET /api/facturacion/:id/verificar-cae
Authorization: Bearer YOUR_TOKEN
```

### Endpoint 8: Obtener Puntos de Venta

```bash
GET /api/facturacion/config/puntos-venta
Authorization: Bearer YOUR_TOKEN
```

## 📊 Tipos de Comprobantes

### Factura A
- **Para:** Responsables Inscriptos, Exentos
- **Discrimina IVA:** ✅ Sí
- **Formato:** Subtotal + IVA por separado

### Factura B
- **Para:** Monotributistas, Consumidor Final
- **Discrimina IVA:** ✅ Sí (pero como dato informativo)
- **Formato:** Total con IVA incluido

### Factura C
- **Para:** Consumidor Final (sin CUIT)
- **Discrimina IVA:** ❌ No
- **Formato:** Solo precio final

### Notas de Crédito/Débito
- Mismas variantes (A, B, C)
- Requieren comprobante asociado

## 🔍 Validaciones Importantes

### Antes de Autorizar una Factura

1. **CUIT válido**: Debe estar registrado en AFIP
2. **Condición IVA correcta**: Debe coincidir con la del cliente
3. **Totales correctos**: IVA calculado correctamente
4. **Punto de venta habilitado**: Debe existir en AFIP
5. **Items válidos**: Al menos un item con importes > 0

### Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| "CUIT no válido" | El CUIT no está en AFIP | Verificar CUIT del cliente |
| "Punto de venta no habilitado" | PtoVenta no existe | Crear punto de venta en AFIP |
| "Certificado vencido" | Cert expiró | Renovar certificado en AFIP |
| "Token de autorización inválido" | TA expiró | Se renueva automáticamente |

## 🔐 Seguridad

### Archivos Sensibles

```bash
# ❌ NUNCA subir al repositorio
backend/certs/private.key
backend/certs/cert.crt
backend/.env
backend/afip_tokens/

# ✅ Agregar al .gitignore
/backend/certs/
/backend/afip_tokens/
/backend/.env
```

### Backup de Certificados

```bash
# Hacer backup encriptado de certificados
tar -czf certs-backup-$(date +%Y%m%d).tar.gz backend/certs/
gpg -c certs-backup-$(date +%Y%m%d).tar.gz
```

## 📝 Testing en Homologación

Antes de ir a producción, prueba en homologación:

1. Configura `AFIP_PRODUCTION=false`
2. Usa el **CUIT de prueba** proporcionado por AFIP: **20409378472**
3. Genera facturas de prueba
4. Verifica CAEs en: https://www.afip.gob.ar/fe/ayuda/consulta_cae.asp

## 🚦 Flujo Completo de Facturación

```
1. Cliente realiza compra
   ↓
2. Se crea Venta en el sistema
   ↓
3. POST /api/facturacion/desde-venta
   ↓
4. Se genera Factura en estado "borrador"
   ↓
5. Revisar datos de la factura
   ↓
6. POST /api/facturacion/:id/autorizar
   ↓
7. Sistema solicita CAE a AFIP
   ↓
8. AFIP devuelve CAE (válido 10 días)
   ↓
9. Factura pasa a estado "autorizada"
   ↓
10. Imprimir/enviar factura al cliente
```

## 📞 Soporte

### Enlaces Útiles

- **AFIP Homologación**: https://wsaa.afip.gov.ar/ws/services/LoginCms?wsdl
- **AFIP Producción**: https://wsaa.afip.gov.ar/ws/services/LoginCms?wsdl
- **Consultar CAE**: https://www.afip.gob.ar/fe/ayuda/consulta_cae.asp
- **Documentación oficial**: https://www.afip.gob.ar/fe/

### Contacto AFIP

- **Mesa de ayuda**: 0810-999-2347
- **Email**: facturacionelectronica@afip.gob.ar

---

**Última actualización:** Octubre 2025
