# Condiciones IVA Soportadas - Sistema de Facturación AFIP

## 📋 Variantes Reconocidas por el Sistema

### 1. Responsable Inscripto (Código AFIP: 1)
```
✅ "Responsable Inscripto"
✅ "Responsable Inscrito"
✅ "RESPONSABLE_INSCRIPTO"
✅ "RESPONSABLE_INSCRITO"
```

### 2. Monotributo (Código AFIP: 6)
```
✅ "Monotributo"
✅ "Monotributista"           ← AGREGADO
✅ "Responsable Monotributo"
✅ "Mono Tributo"
✅ "MONOTRIBUTO"
✅ "MONOTRIBUTISTA"
✅ "RESPONSABLE_MONOTRIBUTO"
✅ "MONO_TRIBUTO"
```

### 3. Consumidor Final (Código AFIP: 5)
```
✅ "Consumidor Final"
✅ "CONSUMIDOR_FINAL"
```

### 4. Exento (Código AFIP: 3)
```
✅ "Exento"
✅ "EXENTO"
```

### 5. Responsable No Inscripto (Código AFIP: 2)
```
✅ "Responsable No Inscripto"
✅ "Responsable No Inscrito"
✅ "RESPONSABLE_NO_INSCRIPTO"
✅ "RESPONSABLE_NO_INSCRITO"
```

### 6. No Responsable (Código AFIP: 4)
```
✅ "No Responsable"
✅ "NO_RESPONSABLE"
```

### 7. IVA Liberado (Código AFIP: 10)
```
✅ "IVA Liberado"
✅ "Liberado"
✅ "IVA_LIBERADO"
✅ "LIBERADO"
```

### 8. Agente de Percepción (Código AFIP: 11)
```
✅ "Agente Percepción"
✅ "Agente de Percepción"
✅ "AGENTE_PERCEPCION"
✅ "AGENTE_DE_PERCEPCION"
```

### 9. Pequeño Contribuyente Eventual (Código AFIP: 12)
```
✅ "Pequeño Contribuyente Eventual"
✅ "Pequeno Contribuyente Eventual"
✅ "PEQUENO_CONTRIBUYENTE_EVENTUAL"
✅ "PEQUEÑO_CONTRIBUYENTE_EVENTUAL"
```

### 10. Monotributista Social (Código AFIP: 13)
```
✅ "Monotributista Social"
✅ "Mono Tributista Social"
✅ "MONOTRIBUTISTA_SOCIAL"
✅ "MONO_TRIBUTISTA_SOCIAL"
```

### 11. Pequeño Contribuyente Eventual Social (Código AFIP: 14)
```
✅ "Pequeño Contribuyente Eventual Social"
✅ "Pequeno Contribuyente Eventual Social"
✅ "PEQUENO_CONTRIBUYENTE_EVENTUAL_SOCIAL"
✅ "PEQUEÑO_CONTRIBUYENTE_EVENTUAL_SOCIAL"
```

---

## 🔧 Normalización Automática

El sistema normaliza automáticamente las condiciones IVA:

1. **Convierte a mayúsculas**: `"Monotributista"` → `"MONOTRIBUTISTA"`
2. **Reemplaza espacios por guiones bajos**: `"Responsable Inscripto"` → `"RESPONSABLE_INSCRIPTO"`
3. **Compara contra todas las variantes**: Acepta múltiples formas de escribir lo mismo

---

## 🎯 Mapeo a Tipos de Factura

### Empresa Responsable Inscripto

| Cliente               | Tipo Factura | Discrimina IVA | DocTipo      |
|-----------------------|--------------|----------------|--------------|
| RI                    | A            | ✅ Sí          | 80 (CUIT)    |
| Monotributista        | B            | ✅ Sí          | 80 (CUIT)    |
| Consumidor Final      | B            | ✅ Sí          | 96 (DNI)     |
| Exento                | B            | ✅ Sí          | 80/96        |

### Empresa Monotributo o No RI

| Cliente               | Tipo Factura | Discrimina IVA | DocTipo      |
|-----------------------|--------------|----------------|--------------|
| Cualquiera            | C            | ❌ No          | Cualquiera   |

---

## 🐛 Logs de Depuración

Cuando hay un error de condición IVA no reconocida, el sistema muestra:

```
❌ Condición IVA no reconocida: "Monotributista"
❌ Normalizada: "MONOTRIBUTISTA"
❌ Condiciones válidas: RESPONSABLE_INSCRIPTO, MONOTRIBUTISTA, CONSUMIDOR_FINAL, EXENTO, etc.
```

---

## 📝 Valores en Base de Datos (Cliente.ts)

Según el modelo `Cliente`, los valores permitidos son:

```typescript
condicionIVA: 'Responsable Inscripto' | 'Monotributista' | 'Exento' | 'Consumidor Final'
```

**Todos estos valores ahora están soportados correctamente** ✅

---

## 🔍 Variables de Entorno (Empresa)

```bash
EMPRESA_CONDICION_IVA=Responsable Inscripto
```

Valores sugeridos:
- `"Responsable Inscripto"` → Puede emitir A/B/C
- `"Monotributo"` → Solo puede emitir C
- `"Exento"` → Solo puede emitir C

---

**Fecha**: 21 de noviembre de 2025  
**Versión**: 2.0  
**Estado**: ✅ Todas las variantes soportadas
