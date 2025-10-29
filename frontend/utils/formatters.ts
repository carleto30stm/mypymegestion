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
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
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