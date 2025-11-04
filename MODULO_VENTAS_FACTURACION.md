# Módulo de Ventas y Facturación - Estado Actual

## ✅ Componentes Implementados

### Frontend

#### Páginas
- **VentasPage.tsx** - Punto de venta completo
  - ✅ Carrito de compras
  - ✅ Selección de productos con autocompletado
  - ✅ Control de stock en tiempo real
  - ✅ Selección de cliente
  - ✅ Medios de pago y bancos
  - ✅ Cálculo automático de totales e IVA (21%)
  - ✅ Integración con slice de ventas
  - ✅ Dialog post-venta para facturar inmediatamente
  
- **FacturasPage.tsx** - Gestión de facturas
  - ✅ Lista de facturas con DataGrid
  - ✅ Filtros avanzados (estado, tipo, cliente, fechas)
  - ✅ Vista de detalle por factura
  - ✅ Autorización con AFIP
  - ✅ Impresión de PDF
  - ✅ Estados: borrador, autorizada, rechazada, anulada, error

#### Componentes
- **FacturaDetailDialog.tsx** - Detalle completo de factura
  - ✅ Información general
  - ✅ Datos del cliente
  - ✅ Detalle de items
  - ✅ Totales y desglose de IVA
  - ✅ Datos de autorización AFIP (CAE, vencimiento, código de barras)
  - ✅ Botón imprimir integrado
  - ✅ Integración con FacturaPDF
  
- **FacturaPDF.tsx** - Generador de PDF AFIP
  - ✅ Layout compliant con normativa AFIP
  - ✅ Generación de QR code según RG 1415/2003
  - ✅ Código de barras (CAE)
  - ✅ Funciones de imprimir y descargar
  - ✅ Datos completos de emisor y receptor
  - ✅ Detalle de items con IVA
  
- **AutorizarFacturaDialog.tsx** - Autorización con AFIP
  - ✅ Dialog de confirmación
  - ✅ Conexión con backend para solicitar CAE
  - ✅ Manejo de errores de AFIP

### Backend

#### Servicios
- **AFIPService** (`backend/src/services/afipService.ts`)
  - ✅ Integración con @afipsdk/afip.js
  - ✅ Autenticación con AFIP
  - ✅ Solicitud de CAE
  - ✅ Consulta de últimos comprobantes
  - ✅ Puntos de venta
  - ✅ Validaciones pre-envío

#### Modelos
- **Venta** (`backend/src/models/Venta.ts`)
  - ✅ Items, totales, cliente, vendedor
  - ✅ Medios de pago, banco
  - ✅ Control de stock automático
  - ✅ Relación con facturas

- **Factura** (`backend/src/models/Factura.ts`)
  - ✅ Tipos de comprobante (A, B, C, NC, ND)
  - ✅ Estados (borrador, autorizada, rechazada, anulada, error)
  - ✅ Datos AFIP (CAE, vencimiento, códigos)
  - ✅ Detalle de IVA por alícuota
  - ✅ Validaciones de consistencia

#### Rutas API
- **`/api/ventas`** - CRUD de ventas
  - POST /api/ventas - Crear venta (descuenta stock)
  - GET /api/ventas - Listar ventas con filtros
  - GET /api/ventas/:id - Detalle de venta
  - PUT /api/ventas/:id - Actualizar venta
  - DELETE /api/ventas/:id - Anular venta

- **`/api/facturas`** - Gestión de facturas
  - POST /api/facturas/crear-desde-venta/:ventaId - Crear factura desde venta
  - GET /api/facturas - Listar con filtros
  - GET /api/facturas/:id - Detalle de factura
  - POST /api/facturas/:id/autorizar - Solicitar CAE a AFIP
  - PUT /api/facturas/:id/anular - Anular factura
  - GET /api/facturas/exportar/pdf/:id - Descargar PDF

### Redux Store
- **ventasSlice.ts**
  - ✅ fetchVentas, createVenta, updateVenta, deleteVenta
  - ✅ Estado de carga, errores
  - ✅ Paginación

- **facturasSlice.ts**
  - ✅ fetchFacturas, crearFacturaDesdeVenta, autorizarFactura
  - ✅ Filtros avanzados
  - ✅ Manejo de estados de AFIP

## 📋 Scripts de Testing AFIP

- **`npm run afip:generar-cert`** - Generar certificados (manual con OpenSSL)
- **`npm run afip:test-conexion`** - Test de conexión y autenticación
- **`npm run afip:generar-datos`** - Crear clientes y productos de prueba
- **`npm run afip:test-completo`** - Suite completa de tests

## ⏳ Pendiente (AFIP)

### Certificados
- [ ] Conseguir CUIT del cliente
- [ ] Subir `request.csr` al portal de AFIP
- [ ] Descargar `cert.crt` firmado
- [ ] Guardar en `backend/certs/cert.crt`
- [ ] Probar conexión: `npm run afip:test-conexion`

### Configuración Producción
- [ ] Actualizar `.env` con CUIT real del cliente
- [ ] `AFIP_PRODUCTION=true` (cuando vaya a producción)
- [ ] Generar certificados de producción (no homologación)
- [ ] Registrar certificados en AFIP producción
- [ ] Configurar punto de venta autorizado

## 🎯 Funcionalidades Principales

### Flujo de Venta Completa
1. Usuario carga productos al carrito
2. Selecciona cliente y medio de pago
3. Confirma venta → Se descuenta stock automáticamente
4. Dialog pregunta si quiere facturar
5. Si factura:
   - Crea factura en estado "borrador"
   - Va a FacturasPage para autorizar
6. Autorización:
   - Usuario hace clic en "Autorizar"
   - Backend solicita CAE a AFIP
   - Factura pasa a estado "autorizada"
7. Impresión:
   - Usuario hace clic en "Imprimir"
   - Se abre FacturaPDF con QR code
   - Puede imprimir o descargar

### Tipos de Comprobantes Soportados
- ✅ Factura A (Responsable Inscripto a Responsable Inscripto)
- ✅ Factura B (Responsable Inscripto a Consumidor Final/Monotributista)
- ✅ Factura C (Monotributista a Consumidor Final)
- ✅ Nota de Crédito A, B, C
- ✅ Nota de Débito A, B, C

### Validaciones Implementadas
- ✅ Stock disponible antes de vender
- ✅ Cliente obligatorio
- ✅ Medio de pago obligatorio
- ✅ Banco obligatorio (si no es efectivo/cta. cte.)
- ✅ CUIT/CUIL válido
- ✅ Consistencia de importes
- ✅ Validación de tipo de comprobante según condición IVA

## 🔧 Configuración Necesaria

### Variables de Entorno (.env)

\`\`\`properties
# AFIP Configuration
AFIP_CUIT=20123456789              # ← Cambiar por CUIT real
AFIP_PRODUCTION=false               # ← true para producción
AFIP_CERT_PATH=./certs/cert.crt
AFIP_KEY_PATH=./certs/private.key
AFIP_TA_FOLDER=./afip_tokens
AFIP_PUNTO_VENTA=1                  # ← Configurar punto de venta real

# Company Data
EMPRESA_CUIT=20123456789            # ← Cambiar por CUIT real
EMPRESA_RAZON_SOCIAL=Mi Empresa SA  # ← Nombre de la empresa
EMPRESA_DOMICILIO=Av. Principal 123, Ciudad, Provincia
EMPRESA_CONDICION_IVA=Responsable Inscripto
EMPRESA_IIBB=901-123456-7
EMPRESA_INICIO_ACTIVIDADES=2020-01-01
\`\`\`

## 📊 Base de Datos

### Colecciones MongoDB
- **ventas** - Registro de todas las ventas
- **facturas** - Facturas electrónicas (borradores y autorizadas)
- **clientes** - Clientes con datos fiscales (CUIT, condición IVA)
- **productos** - Productos con stock y precios
- **usuarios** - Vendedores que registran las ventas

## 🚀 Próximos Pasos

1. **Completar integración AFIP** (cuando tengas certificado)
   - Probar autorización real
   - Verificar QR code en validador AFIP
   - Ajustar mapeos de tipos de comprobante si es necesario

2. **Mejoras opcionales**
   - [ ] Exportar facturas a Excel
   - [ ] Enviar factura por email al cliente
   - [ ] Dashboard de ventas con gráficos
   - [ ] Reportes de facturación por período
   - [ ] Integración con sistema contable
   - [ ] Conciliación de medios de pago
   - [ ] Control de crédito por cliente (cta. cte.)

3. **Testing**
   - [ ] Test unitarios de cálculos de IVA
   - [ ] Test de integración con AFIP
   - [ ] Test de generación de PDF
   - [ ] Test de control de stock

## 📖 Documentación de Referencia

- AFIP SDK: https://afipsdk.com/docs
- Facturación Electrónica AFIP: https://www.afip.gob.ar/fe/
- RG 1415/2003 (QR Code): Especificaciones AFIP
- Tipos de comprobante: https://www.afip.gob.ar/fe/documentos/TABLACOMPROBANTES.xls

---

**Estado del módulo:** ✅ Funcional (sin integración AFIP real)  
**Bloqueador principal:** Certificado AFIP (requiere CUIT del cliente)  
**Siguiente paso:** Obtener CUIT del cliente → Generar certificado → Probar autorización
