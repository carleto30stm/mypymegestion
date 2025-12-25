/**
 * Constantes para cálculos de liquidación de sueldos
 * Fuente única de verdad compartida entre frontend y backend
 */

// Aportes del empleado (porcentajes sobre base imponible)
export const APORTES_EMPLEADO = {
    JUBILACION: 11,      // 11%
    OBRA_SOCIAL: 3,      // 3%
    PAMI: 3,             // 3%
    SINDICATO: 2,        // 2%
} as const;

// Contribuciones del empleador (porcentajes sobre base imponible)
export const CONTRIBUCIONES_EMPLEADOR = {
    JUBILACION: 10.17,   // 10.17%
    OBRA_SOCIAL: 6,      // 6%
    PAMI: 1.5,           // 1.5%
    ART: 2.5,            // 2.5% (variable según ART)
} as const;

// Adicionales legales (porcentajes)
export const ADICIONALES_LEGALES = {
    PRESENTISMO: 8.33,   // 8.33%
    ANTIGUEDAD: 1,       // 1% por año de antigüedad
} as const;
