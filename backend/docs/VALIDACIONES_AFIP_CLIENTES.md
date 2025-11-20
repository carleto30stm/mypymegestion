# 📋 Guía: Validaciones AFIP para Facturación en Producción

## 🎯 Cambios Implementados

Se agregaron validaciones críticas al modelo `Cliente` para asegurar datos completos antes de facturar en producción con AFIP.

---

## ✅ Validaciones Automáticas

### 1. **Formato de Documentos** (CRÍTICO)

| Tipo Documento | Validación | Ejemplo Válido | Ejemplo Inválido |
|----------------|------------|----------------|------------------|
| **CUIT** | 11 dígitos numéricos | `20123456789` o `20-12345678-9` | `2012345678` (10 dígitos) |
| **CUIL** | 11 dígitos numéricos | `27345678901` o `27-34567890-1` | `273456789` (9 dígitos) |
| **DNI** | 7 u 8 dígitos | `12345678` | `123456` (6 dígitos) |
| **Pasaporte** | Cualquier formato | `ABC123456` | ✅ (sin restricciones) |

> ⚠️ **Importante**: Los guiones y puntos se ignoran en la validación (ej: `20-12345678-9` es válido)

### 2. **Campos Obligatorios según Configuración**

#### Para **TODOS** los clientes con `requiereFacturaAFIP = true`:

- ✅ **Email** (formato válido: `usuario@dominio.com`)
- ✅ **Dirección** (calle, número, piso/depto)
- ✅ **Ciudad**

#### Para clientes **Consumidor Final** o **Monotributista**:

- ✅ **Código Postal** (además de los anteriores)

#### Para clientes **Responsable Inscripto**:

- ℹ️ Código postal es **opcional** (pero recomendado)

---

## 🚨 Errores Comunes y Soluciones

### Error: "Formato de documento inválido"

**Causa**: CUIT/CUIL no tiene 11 dígitos o DNI no tiene 7-8 dígitos

**Solución**:
```javascript
// ❌ INCORRECTO
numeroDocumento: "2012345678"     // Solo 10 dígitos

// ✅ CORRECTO
numeroDocumento: "20123456789"    // 11 dígitos
numeroDocumento: "20-12345678-9"  // También válido (guiones se ignoran)
```

### Error: "Email inválido - requerido para envío de facturas electrónicas"

**Causa**: Cliente con facturación AFIP sin email o con formato incorrecto

**Solución**:
```javascript
// ❌ INCORRECTO
email: ""                        // Vacío
email: "cliente.com"            // Sin @
email: "cliente @gmail.com"     // Con espacios

// ✅ CORRECTO
email: "cliente@gmail.com"
email: "facturacion@empresa.com.ar"
```

### Error: "Datos AFIP incompletos: Debe tener razón social o nombre"

**Causa**: Cliente sin `razonSocial` ni `nombre`

**Solución**:
```javascript
// Para personas físicas
{
  nombre: "Juan",
  apellido: "Pérez",
  razonSocial: undefined  // Opcional
}

// Para empresas
{
  razonSocial: "Empresa S.A.",
  nombre: undefined,      // Opcional si hay razonSocial
  apellido: undefined
}
```

---

## 🔧 Script de Migración

Para clientes **existentes** que no cumplen las validaciones nuevas:

### 1. **Solo Reporte** (recomendado primero)

```bash
cd backend
node scripts/migrar-clientes-afip.js --report
```

Muestra:
- Total de clientes con facturación AFIP
- Problemas detectados por categoría
- Lista detallada de cada cliente problemático

### 2. **Aplicar Correcciones Automáticas**

```bash
node scripts/migrar-clientes-afip.js --fix
```

⚠️ **Esto asignará valores placeholder**:
- Email: `{numeroDocumento}@actualizar.com`
- Dirección: `"A COMPLETAR"`
- Ciudad: `"A COMPLETAR"`
- Código Postal: `"0000"`

> **IMPORTANTE**: Estos valores placeholder DEBEN ser actualizados manualmente antes de facturar.

---

## 📝 Ejemplos de Creación de Clientes

### ✅ Cliente Consumidor Final (Correcto)

```javascript
{
  tipoDocumento: "DNI",
  numeroDocumento: "12345678",
  nombre: "María",
  apellido: "González",
  email: "maria.gonzalez@gmail.com",
  telefono: "1145678901",
  direccion: "Av. Corrientes 1234, Piso 5, Depto A",
  ciudad: "Buenos Aires",
  provincia: "Buenos Aires",
  codigoPostal: "C1043",
  condicionIVA: "Consumidor Final",
  requiereFacturaAFIP: true,
  aplicaIVA: true
}
```

### ✅ Cliente Responsable Inscripto (Correcto)

```javascript
{
  tipoDocumento: "CUIT",
  numeroDocumento: "30-71234567-8",  // 11 dígitos (guiones se ignoran)
  razonSocial: "Mi Empresa S.R.L.",
  email: "facturacion@miempresa.com.ar",
  telefono: "1134567890",
  direccion: "San Martín 5678",
  ciudad: "Córdoba",
  provincia: "Córdoba",
  codigoPostal: "X5000",  // Opcional pero recomendado
  condicionIVA: "Responsable Inscripto",
  requiereFacturaAFIP: true,
  aplicaIVA: true
}
```

### ❌ Cliente con Errores

```javascript
{
  tipoDocumento: "CUIT",
  numeroDocumento: "3071234567",  // ❌ Solo 10 dígitos (falta 1)
  razonSocial: "Empresa XYZ",
  email: "",                      // ❌ Vacío (requerido)
  direccion: "",                  // ❌ Vacío (requerido)
  ciudad: "",                     // ❌ Vacío (requerido)
  condicionIVA: "Monotributista",
  requiereFacturaAFIP: true
}
// Este cliente NO se podrá guardar
```

---

## 🔍 Verificación en Frontend

### Formulario de Clientes

Agregar validaciones visuales:

```typescript
// Validar CUIT en tiempo real
const validarCUIT = (valor: string) => {
  const soloNumeros = valor.replace(/[^0-9]/g, '');
  if (soloNumeros.length !== 11) {
    return 'CUIT debe tener 11 dígitos';
  }
  return true;
};

// Campos obligatorios si requiere factura
<TextField
  label="Email"
  required={formData.requiereFacturaAFIP}
  error={formData.requiereFacturaAFIP && !formData.email}
  helperText={
    formData.requiereFacturaAFIP && !formData.email
      ? 'Email obligatorio para facturación electrónica'
      : ''
  }
/>
```

---

## 📊 Checklist Pre-Producción

Antes de activar facturación en producción:

- [ ] Ejecutar `migrar-clientes-afip.js --report`
- [ ] Verificar que todos los clientes con `requiereFacturaAFIP=true` tienen:
  - [ ] Documento válido (CUIT 11 dígitos, DNI 7-8 dígitos)
  - [ ] Email válido
  - [ ] Dirección completa
  - [ ] Ciudad
  - [ ] Código postal (si aplica)
- [ ] Actualizar placeholders `@actualizar.com` y `"A COMPLETAR"`
- [ ] Probar creación de factura con cliente real en homologación
- [ ] Verificar que el email del cliente recibe la factura
- [ ] Confirmar CAE en AFIP homologación

---

## 🆘 Soporte

Si un cliente **urgente** necesita factura pero tiene datos incompletos:

1. **Opción A (Temporal)**:
   - Completar con datos mínimos para pasar validación
   - Facturar
   - Actualizar datos reales después

2. **Opción B (Emergencia)**:
   - Cambiar temporalmente `requiereFacturaAFIP = false`
   - Guardar cliente
   - Actualizar datos completos
   - Cambiar a `requiereFacturaAFIP = true`
   - Facturar

> ⚠️ Opción B solo en emergencias - AFIP puede rechazar facturas con datos inconsistentes

---

## 📞 Contacto

Dudas o problemas: contactar al equipo de desarrollo
