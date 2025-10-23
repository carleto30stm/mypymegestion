// Test para la función formatNumberInput

const formatNumberInput = (value) => {
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

// Casos de prueba
console.log('Test 1:', formatNumberInput('1500')); // Esperado: "1.500"
console.log('Test 2:', formatNumberInput('1500,')); // Esperado: "1.500,"
console.log('Test 3:', formatNumberInput('1500,5')); // Esperado: "1.500,5"
console.log('Test 4:', formatNumberInput('1500,50')); // Esperado: "1.500,50"
console.log('Test 5:', formatNumberInput('1500,123')); // Esperado: "1.500,12"
console.log('Test 6:', formatNumberInput(',')); // Esperado: ""
console.log('Test 7:', formatNumberInput('0,50')); // Esperado: "0,50"