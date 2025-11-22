// Funciones utilitarias para formatear números y fechas

/**
 * Formatea un número con el formato argentino: 100.000,00
 * @param value - Número a formatear
 * @returns String formateado
 */
export const formatCurrency = (value: number | string): string => {
  if (value === null || value === undefined || value === '') return '';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return '';
  
  return numValue.toLocaleString('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
};

/**
 * Formatea un número como moneda argentina con símbolo $
 * @param value - Número a formatear
 * @returns String formateado con símbolo de peso
 */
export const formatCurrencyWithSymbol = (value: number | string): string => {
  const formatted = formatCurrency(value);
  return formatted ? `$ ${formatted}` : '';
};

/**
 * Formatea una fecha al formato dd/mm/yyyy
 * @param dateString - Fecha en formato ISO o Date string
 * @returns Fecha formateada dd/mm/yyyy
 */
export const formatDate = (dateString: string | Date): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    // Verificar que la fecha sea válida
    if (isNaN(date.getTime())) return '';
    
    // Formatear a dd/mm/yyyy
    const day = date.getUTCDate().toString().padStart(2, '0');
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = date.getUTCFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    return '';
  }
};

/**
 * Formatea una fecha para mostrar sin problemas de zona horaria
 * Usa UTC para evitar que reste un día
 * @param dateString - Fecha en formato ISO o Date string
 * @returns Fecha formateada para mostrar (ej: "1 ene 2024")
 */
export const formatDateForDisplay = (dateString: string | Date): string => {
  if (!dateString) return '';
  
  try {
    // Si es string con formato YYYY-MM-DD, parsearlo manualmente para evitar zona horaria
    if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}/)) {
      const [year, month, day] = dateString.split('T')[0].split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (error) {
    return '';
  }
};

/**
 * Convierte una fecha del formato dd/mm/yyyy al formato ISO (yyyy-mm-dd)
 * @param dateString - Fecha en formato dd/mm/yyyy
 * @returns Fecha en formato ISO
 */
export const parseDate = (dateString: string): string => {
  if (!dateString) return '';
  
  const parts = dateString.split('/');
  if (parts.length !== 3) return '';
  
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

/**
 * Parsea un número del formato argentino (100.000,00) a número
 * @param value - String en formato argentino
 * @returns Número parseado
 */
export const parseCurrency = (value: string): number => {
  if (!value || typeof value !== 'string') return 0;
  
  // Remover espacios y convertir formato argentino a formato estándar
  // 100.000,00 -> 100000.00
  const cleanValue = value
    .replace(/\s/g, '') // Remover espacios
    .replace(/\./g, '') // Remover puntos (miles)
    .replace(',', '.'); // Cambiar coma por punto (decimales)
  
  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Formatea un número mientras el usuario escribe (formato argentino con decimales)
 * Permite escribir cómodamente con comas y formatea en tiempo real
 * @param value - String ingresado por el usuario
 * @returns String formateado para mostrar en el input
 */
export const formatNumberInput = (value: string): string => {
  // Si el valor está vacío, retornar vacío
  if (!value) return '';
  
  // Permitir solo números y una coma
  const cleanValue = value.replace(/[^\d,]/g, '');
  
  // Si solo hay una coma al final, permitirla
  if (cleanValue === ',') return '';
  
  // Dividir por la coma (separador decimal argentino)
  const parts = cleanValue.split(',');
  
  // Solo permitir una coma
  if (parts.length > 2) {
    // Si hay más de una coma, tomar solo las primeras dos partes
    parts.splice(2);
  }
  
  // Parte entera
  let integerPart = parts[0] || '';
  
  // Formatear la parte entera con puntos cada tres dígitos (solo si tiene valor)
  if (integerPart.length > 0) {
    const num = parseInt(integerPart, 10);
    if (!isNaN(num) && num > 0) {
      integerPart = num.toLocaleString('es-AR');
    } else if (integerPart === '0') {
      integerPart = '0';
    }
  }
  
  // Parte decimal (máximo 2 dígitos)
  let decimalPart = parts[1];
  if (decimalPart !== undefined) {
    if (decimalPart.length > 2) {
      decimalPart = decimalPart.substring(0, 2);
    }
    // Si hay parte decimal (incluso vacía), agregar la coma
    return `${integerPart},${decimalPart}`;
  }
  
  // Si termina con coma en el input original, mantenerla
  if (value.endsWith(',') && parts.length === 2) {
    return `${integerPart},`;
  }
  
  return integerPart;
};

/**
 * Obtiene el valor numérico desde el formato visual (con decimales)
 * Convierte el formato argentino (1.000,50) a número (1000.50)
 * @param formattedValue - String formateado en formato argentino
 * @returns Número parseado
 */
export const getNumericValue = (formattedValue: string): number => {
  if (!formattedValue) return 0;
  
  // Convertir formato argentino a número: 1.000,50 -> 1000.50
  const cleanValue = formattedValue
    .replace(/\./g, '') // Remover puntos (separadores de miles)
    .replace(',', '.'); // Cambiar coma por punto (decimales)
  
  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? 0 : parsed;
};