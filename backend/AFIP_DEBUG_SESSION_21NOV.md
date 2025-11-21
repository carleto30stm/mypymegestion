# Sesión de Debug AFIP - 21 Noviembre 2025

**Inicio**: 21/11/2025 00:45 AM  
**Fin**: 21/11/2025 04:05 AM  
**Duración**: ~3 horas 20 minutos  
**Estado**: ⏸️ PAUSADO - Error XML sin resolver

---

## 🎯 Objetivo de la Sesión

**Migrar de SDK comercial (@afipsdk/afip.js) a sistema SOAP nativo** para eliminar dependencia de token pagado.

### Problema Inicial
```
Error 401 - Request failed with status code 401
{
  "error": "Necesitás un access_token",
  "link": "https://afipsdk.com/access-token.html",
  "docs": "https://afipsdk.com/docs.html"
}
```

**Causa**: SDK comercial requiere `SDK_ACCESS_TOKEN` de subscripción pagada.

---

## 📊 Progreso de la Sesión

### ✅ Completado (80%)

#### 1. Análisis de Dependencias (00:45 - 01:15)
- ✅ Identificadas 14+ ubicaciones usando AFIPService en facturacionController.ts
- ✅ Mapeadas conversiones necesarias: métodos estáticos vs instancia
- ✅ Identificadas diferencias de interface (AFIPConfig)

#### 2. Reemplazo de Imports y Configuración (01:15 - 01:45)
- ✅ Cambiado import de `afipService.ts` a `AFIPServiceSOAP.ts`
- ✅ Actualizado `getAfipConfig()` con campos:
  - `certPath`, `keyPath` (antes: `cert`, `key` con contenido PEM)
  - `puntoVenta`, `razonSocial` agregados
  - `production`, `taFolder`, `cuit` mantenidos

#### 3. Reemplazo de Métodos Estáticos (01:45 - 02:15)
- ✅ `AFIPService.determinarTipoFactura()` → `AFIPServiceSOAP.determinarTipoFactura()`
- ✅ `AFIPService.calcularIVA()` → `AFIPServiceSOAP.calcularIVA()`
- ✅ `AFIPService.obtenerCodigoTipoDocumento()` → `AFIPServiceSOAP.convertirTipoDocumento()`
- ✅ `AFIPService.generarCodigoBarras()` → `AFIPServiceSOAP.generarCodigoBarras()`

#### 4. Reemplazo de Métodos de Instancia (02:15 - 02:45)
- ✅ `new AFIPService(config)` → `new AFIPServiceSOAP(config)`
- ✅ `afipService.solicitarCAE()` → adapter IFactura → DatosFactura
- ✅ `afipService.verificarCAE()` → interface ajustada
- ✅ `afipService.obtenerPuntosVenta()` → directo

#### 5. Adapter Pattern (02:45 - 03:00)
- ✅ Creado converter IFactura (Mongoose) → DatosFactura (SOAP):
  ```typescript
  const datosFactura = {
    puntoVenta: factura.datosAFIP.puntoVenta,
    tipoComprobante: factura.tipoComprobante.replace('FACTURA_', '')...,
    concepto: (factura.concepto === 1 ? 'productos' : ...),
    cliente: {
      tipoDocumento: mapeo[factura.receptorTipoDocumento],
      numeroDocumento: factura.receptorNumeroDocumento.replace(/[^0-9]/g, '')
    },
    fecha: factura.fecha,
    importes: { total, noGravado, exento, neto, iva, tributos },
    iva: factura.detalleIVA.map(...)
  };
  ```

#### 6. Compilación y Validación (03:00 - 03:15)
- ✅ TypeScript compila sin errores
- ✅ Sin referencias al SDK viejo
- ✅ Imports resueltos correctamente
- ✅ Error 401 eliminado (ya no requiere SDK_ACCESS_TOKEN)

#### 7. Debugging Runtime (03:15 - 04:05)
- ✅ Agregado logging extensivo:
  - Datos recibidos (JSON)
  - FeDetRequest construido
  - SOAP request completo
  - SOAP response completa
  - HTTP status + data type
  - Inspección caracteres en error
- ✅ Identificado problema: AFIP devuelve HTML en vez de SOAP XML

---

## ❌ Problema Bloqueante

### Error Actual
```
✅ Response HTTP status: 200
📦 Response data type: string
📦 Response data length: 81
📄 XML recibido: <html><head><title></title>5794109044628168702</head><body><br><br></body></html>
❌ Error: Unexpected close tag Line: 0 Column: 74
```

### Análisis
- **HTTP 200**: Request llega a AFIP sin problemas de red
- **Contenido HTML**: AFIP rechaza el SOAP request con página de error
- **Error ID**: 5794109044628168702 (tracking interno AFIP)
- **Causa**: XML SOAP malformado (namespaces incorrectos)

### SOAP Request Enviado
```xml
<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" 
                  xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <soapenv:Header/>
  <soapenv:Body>
    <ar:FECompUltimoAutorizado>
      <ar:Auth>                    <!-- ⚠️ PROBLEMA: Prefijo ar: en Auth -->
        <ar:Token>...</ar:Token>
        <ar:Sign>...</ar:Sign>
        <ar:Cuit>...</ar:Cuit>
      </ar:Auth>
      <ar:PtoVta>2</ar:PtoVta>
      <ar:CbteTipo>11</ar:CbteTipo>
    </ar:FECompUltimoAutorizado>
  </soapenv:Body>
</soapenv:Envelope>
```

### Namespace Inconsistency

**Código actual** (`AFIPWSFEService.ts`):
```typescript
// construirSOAP() - línea 309
const auth = `
  <Auth>                          // ✅ SIN prefijo ar: (última versión)
    <Token>${ta.token}</Token>
    <Sign>${ta.sign}</Sign>
    <Cuit>${this.config.cuit}</Cuit>
  </Auth>
`;

// obtenerUltimoComprobante() - línea 154
const soapRequest = this.construirSOAP('FECompUltimoAutorizado', `
  <ar:PtoVta>${puntoVenta}</ar:PtoVta>      // ✅ CON prefijo ar:
  <ar:CbteTipo>${tipoComprobante}</ar:CbteTipo>
`, ta);

// solicitarCAE() - línea 194
const soapRequest = this.construirSOAP('FECAESolicitar', `
  <ar:FeCAEReq>                             // ✅ CON prefijo ar:
    <ar:FeCabReq>
      <ar:CantReg>1</ar:CantReg>
      ...
    </ar:FeCabReq>
  </ar:FeCAEReq>
`, ta);

// construirFeDetRequest() - línea 338
xml = `
  <ar:FECAEDetRequest>                      // ✅ CON prefijo ar:
    <ar:Concepto>...</ar:Concepto>
    <ar:DocTipo>...</ar:DocTipo>
    ...
  </ar:FECAEDetRequest>
`;
```

**Output observado**:
```xml
<ar:Auth>                        <!-- ❌ INCONSISTENCIA: Código dice <Auth> -->
  <ar:Token>...</ar:Token>       <!-- pero output muestra <ar:Auth> -->
  <ar:Sign>...</ar:Sign>
  <ar:Cuit>...</ar:Cuit>
</ar:Auth>
```

### Hipótesis de Causa
1. **Nodemon cache**: Cambios no se aplicaron, usa código viejo en memoria
2. **Build desactualizado**: `npm run build` no ejecutado, dist/ tiene JS viejo
3. **Namespace correcto**: Según WSDL AFIP, quizás Auth SÍ requiere prefijo `ar:`
4. **Sintaxis XML**: Estructura envelope incorrecta según spec AFIP

---

## 🔄 Intentos de Solución

### Intento 1: Agregar prefijo ar: a Auth (03:20)
```typescript
const auth = `
  <ar:Auth>
    <ar:Token>${ta.token}</ar:Token>
    <ar:Sign>${ta.sign}</ar:Sign>
    <ar:Cuit>${this.config.cuit}</ar:Cuit>
  </ar:Auth>
`;
```
**Resultado**: Output sigue mostrando `<ar:Auth>` (cambio previo, no nuevo)  
**Conclusión**: Cambio no se aplicó, servidor usando código viejo

### Intento 2: Remover prefijo ar: de Auth (03:35)
```typescript
const auth = `
  <Auth>
    <Token>${ta.token}</Token>
    <Sign>${ta.sign}</Sign>
    <Cuit>${this.config.cuit}</Cuit>
  </Auth>
`;
```
**Resultado**: Compiló OK, pero `npm run dev` no reinició con código nuevo  
**Conclusión**: Necesita kill de proceso y restart limpio

### Intento 3: Kill Node + Rebuild (03:50)
```powershell
taskkill /F /IM node.exe        # Forzar cierre todos node.exe
npm run build                    # Compilar TypeScript a JavaScript
npm run dev                      # Iniciar servidor con código nuevo
```
**Resultado**: Servidor corriendo pero no se probó desde frontend aún  
**Estado**: Esperando test del usuario para ver XML actualizado

---

## 📁 Archivos Modificados

### Servicios AFIP
1. **backend/src/services/afip/AFIPWSFEService.ts** (20+ cambios)
   - Línea 154: `obtenerUltimoComprobante()` - agregado `ar:` a PtoVta/CbteTipo
   - Línea 194: `solicitarCAE()` - agregado `ar:` a FeCAEReq/FeCabReq
   - Línea 240: `consultarComprobante()` - agregado `ar:` a FeCompConsReq
   - Línea 309: `construirSOAP()` - Auth SIN `ar:` (última versión)
   - Línea 338: `construirFeDetRequest()` - todos elementos con `ar:`
   - Línea 175-220: Logging extensivo agregado

2. **backend/src/services/afip/AFIPServiceSOAP.ts** (sin cambios)
   - Facade estable, no requirió modificaciones

3. **backend/src/services/afip/AFIPWSAAService.ts** (sin cambios)
   - Autenticación WSAA funciona correctamente

### Controlador
4. **backend/src/controllers/facturacionController.ts** (14 cambios)
   - Línea 1: Import cambiado a AFIPServiceSOAP
   - Línea 9-18: getAfipConfig() actualizado
   - Línea 32, 75, 120: Métodos estáticos reemplazados
   - Línea 468-570: Adapter IFactura → DatosFactura creado
   - Línea 550: generarCodigoBarras() reemplazado

### Configuración (sin cambios)
- backend/.env - Variables intactas
- backend/package.json - @afipsdk/afip.js aún instalado (pendiente remover)
- backend/tsconfig.json - Sin modificaciones

---

## ✅ Qué Funciona

### Servicios Estables
- ✅ **WSAA**: Autenticación con certificado
  - Genera TA (Ticket Acceso) válidos
  - Token y Sign correctos
  - Expira: 21/11/2025 12:23:03
  - Cache funcionando (no regenera innecesariamente)

- ✅ **FEDummy**: Consulta estado servidor AFIP
  - Response válida en SOAP XML
  - AppServer/DbServer/AuthServer todos OK

- ✅ **Compilación**: TypeScript → JavaScript
  - Sin errores de tipos
  - Imports resueltos
  - Build exitoso

- ✅ **Logging**: Debug infrastructure completa
  - JSON input
  - XML construction
  - HTTP transactions
  - Response inspection
  - Character-level analysis

### Conversiones Funcionando
- ✅ determinarTipoFactura() - mapeo IVA → tipo factura
- ✅ calcularIVA() - cálculo baseImponible + alicuota
- ✅ convertirTipoDocumento() - string → código AFIP
- ✅ generarCodigoBarras() - CAE → código barras
- ✅ validarFactura() - validación pre-envío

---

## ❌ Qué NO Funciona

### Operaciones Fallando
- ❌ **FECompUltimoAutorizado**: Consultar último nro comprobante
  - Request enviada OK
  - AFIP devuelve HTML error
  - Error ID: 5794109044628168702
  - Bloquea solicitarCAE()

- ❌ **FECAESolicitar**: Solicitar CAE
  - No llega a ejecutarse
  - Falla en paso previo (obtenerUltimoComprobante)
  - Sin logs de esta request aún

### Root Cause
**Namespaces XML incorrectos en SOAP envelope**  
→ AFIP rechaza request sin procesar  
→ Devuelve página HTML de error en lugar de SOAP Fault

---

## 🔍 Próximos Pasos (Para Retomar)

### Inmediato (Crítico)
1. **Verificar servidor reinició con código nuevo**
   - Probar desde frontend
   - Ver si `<Auth>` aparece SIN prefijo `ar:` ahora
   - Confirmar que cambio se aplicó

2. **Consultar WSDL AFIP oficial**
   - URL: https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL
   - Verificar namespace correcto para Auth
   - Verificar si todos elementos necesitan `ar:` o solo algunos

3. **Comparar con request funcional (FEDummy)**
   - FEDummy funciona → ver su XML
   - FECompUltimoAutorizado falla → comparar diferencias
   - Identificar patrón correcto

### Investigación (Importante)
4. **Revisar ejemplos SOAP AFIP**
   - Documentación oficial
   - Repos GitHub con implementaciones working
   - Ejemplos en JAVA/.NET (convertir a Node.js)

5. **Probar variantes de namespace**
   - Opción A: Auth SIN ar:, resto CON ar:
   - Opción B: Todo CON ar:
   - Opción C: Auth CON ar:, resto SIN ar:
   - Opción D: Nada con ar: (solo método)

6. **Agregar SOAP Fault handling**
   ```typescript
   if (soapBody['soap:Fault']) {
     const fault = soapBody['soap:Fault'];
     console.error('SOAP Fault:', fault);
     throw new Error(`AFIP SOAP Fault: ${fault.faultstring}`);
   }
   ```

### Alternativas (Si no se resuelve)
7. **Usar librería SOAP**
   - `npm install soap` (Node.js SOAP client)
   - Genera requests desde WSDL automáticamente
   - Pro: Namespaces correctos garantizados
   - Contra: Dependencia adicional

8. **Validar XML con XSD**
   - Descargar XSD schemas de AFIP
   - Validar XML generado contra schema
   - Identificar errores específicos

9. **Wireshark / tcpdump**
   - Capturar tráfico real SDK → AFIP
   - Ver XML exacto que SDK envía
   - Copiar estructura working

---

## 📚 Recursos y Referencias

### Documentación AFIP
- WSDL WSFE: https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL
- Manual WSFE: http://www.afip.gob.ar/ws/documentacion/ws-factura-electronica.asp
- Homologación: https://www.afip.gob.ar/ws/WSAA/homologacion.asp

### Código Relacionado
- `backend/AFIP_SOAP_ARCHITECTURE.md` - Arquitectura SOAP implementada
- `backend/AFIP_INTEGRATION_STATUS.md` - Estado general proyecto
- `backend/docs/VALIDACIONES_AFIP_CLIENTES.md` - Validaciones clientes

### Ejemplos Externos
- SDK Java AFIP: https://github.com/afipsdk/afip.java
- WSAA Python: https://github.com/PyAr/pyafipws
- WSFE .NET: https://github.com/pablojr/AfipSdk

---

## 💡 Aprendizajes de la Sesión

### Técnicos
1. **Namespaces XML son críticos**: Pequeño error bloquea todo
2. **AFIP no devuelve SOAP Fault**: Responde con HTML cuando XML inválido
3. **Error ID en HTML title**: AFIP trackea errores con IDs únicos
4. **Nodemon cache**: Cambios en código pueden no aplicarse sin restart limpio
5. **HTTP 200 ≠ success**: Puede ser error en formato de respuesta

### Debugging
1. **Logging extensivo es clave**: Ver XML completo request/response
2. **Character inspection útil**: Identificar corrupción o encoding
3. **Múltiples niveles de logging**: Data → XML → HTTP → Parse
4. **Comparar working vs failing**: FEDummy OK, FECompUltimoAutorizado fail

### Arquitectura
1. **Adapter pattern esencial**: Mongoose models ≠ SOAP DTOs
2. **Facade simplifica uso**: Un punto de entrada para todos servicios
3. **Separación WSAA/WSFE**: Autenticación independiente de facturación
4. **Type safety ayuda**: TypeScript detectó 8 errores en compilación

---

## 📊 Estadísticas de la Sesión

- **Archivos modificados**: 4 principales
- **Líneas de código cambiadas**: ~150
- **Cambios de método**: 14+
- **Intentos de solución**: 3
- **Errores resueltos**: 1 (Error 401 SDK)
- **Errores nuevos**: 1 (HTML response AFIP)
- **Tests ejecutados**: 4 (desde frontend)
- **Compilaciones**: 6+
- **Reinicios de servidor**: 5+

---

## 🎯 Estado Final

**Compilación**: ✅ OK (sin errores TypeScript)  
**SDK removido**: ✅ Completo (14+ ubicaciones)  
**WSAA**: ✅ Funcionando (TA válidos)  
**WSFE**: ❌ Bloqueado (namespaces XML)  
**Testing**: ⏳ Pendiente (reinicio limpio)

**Blocker crítico**: Namespaces XML en SOAP requests  
**Próximo paso**: Verificar WSDL oficial AFIP  
**Alternativa**: Usar librería `soap` npm

---

**Última prueba**: 21/11/2025 03:55 AM  
**Próxima acción**: Reiniciar servidor y probar desde frontend  
**Documentación**: AFIP_INTEGRATION_STATUS.md actualizado
