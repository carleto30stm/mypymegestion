// Script para debuggear registros con fechaStandBy
const today = new Date().toISOString().split('T')[0];
console.log('🗓️ Fecha de hoy:', today);

// Simular algunos gastos con fechaStandBy para test
const gastosTest = [
  {
    _id: '1',
    fecha: '2024-10-15',
    fechaStandBy: null,
    detalleGastos: 'Gasto normal sin standby',
    entrada: 0,
    salida: 100
  },
  {
    _id: '2', 
    fecha: '2024-10-20',
    fechaStandBy: '2024-10-19',
    detalleGastos: 'Gasto standby vencido (debe aparecer)',
    entrada: 0,
    salida: 200
  },
  {
    _id: '3',
    fecha: '2024-10-15',
    fechaStandBy: '2024-10-21',
    detalleGastos: 'Gasto standby para hoy (debe aparecer)',
    entrada: 500,
    salida: 0
  },
  {
    _id: '4',
    fecha: '2024-10-10',
    fechaStandBy: '2024-10-25',
    detalleGastos: 'Gasto standby futuro (NO debe aparecer)',
    entrada: 0,
    salida: 300
  }
];

console.log('\n📋 ANÁLISIS DE FILTRADO:\n');

gastosTest.forEach(gasto => {
  let shouldShow = true;
  let reason = '';
  
  if (!gasto.fechaStandBy) {
    reason = '✅ Sin fechaStandBy - se muestra siempre';
  } else {
    const fechaStandBy = new Date(gasto.fechaStandBy).toISOString().split('T')[0];
    if (fechaStandBy <= today) {
      reason = `✅ fechaStandBy (${fechaStandBy}) <= hoy (${today}) - se muestra`;
    } else {
      shouldShow = false;
      reason = `❌ fechaStandBy (${fechaStandBy}) > hoy (${today}) - NO se muestra`;
    }
  }
  
  console.log(`ID: ${gasto._id}`);
  console.log(`  Detalle: ${gasto.detalleGastos}`);
  console.log(`  fechaStandBy: ${gasto.fechaStandBy || 'null'}`);
  console.log(`  ${reason}`);
  console.log('');
});

console.log('💡 Si un registro no aparece, verificar:');
console.log('   1. Que fechaStandBy sea <= fecha actual');
console.log('   2. Que no haya errores de formato de fecha');
console.log('   3. Que no haya problemas de timezone');
console.log('\n🔍 Para debuggear en el navegador:');
console.log('   1. Abrir DevTools (F12)');
console.log('   2. Ir a Network tab');
console.log('   3. Buscar la llamada a /api/gastos');
console.log('   4. Verificar qué datos están llegando del backend');