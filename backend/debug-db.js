// Script para consultar directamente los gastos con fechaStandBy en la base de datos
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Esquema básico para consultar
const gastoSchema = new mongoose.Schema({}, { strict: false, collection: 'gastos' });
const Gasto = mongoose.model('Gasto', gastoSchema);

async function debugStandBy() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔌 Conectado a MongoDB');
    
    const today = new Date().toISOString().split('T')[0];
    console.log('🗓️ Fecha de hoy:', today);
    
    // Buscar todos los gastos con fechaStandBy
    const gastosConStandBy = await Gasto.find({ 
      fechaStandBy: { $exists: true, $ne: null, $ne: '' }
    }).sort({ fechaStandBy: 1 });
    
    console.log(`\n📋 REGISTROS CON fechaStandBy encontrados: ${gastosConStandBy.length}\n`);
    
    if (gastosConStandBy.length === 0) {
      console.log('❌ No se encontraron registros con fechaStandBy');
      
      // Verificar si hay algún registro con fechaStandBy (incluye vacías o null)
      const todosLosGastos = await Gasto.find().limit(5);
      console.log('\n🔍 Primeros 5 registros para verificar estructura:');
      todosLosGastos.forEach((gasto, index) => {
        console.log(`${index + 1}. fechaStandBy: ${gasto.fechaStandBy || 'null/undefined'}`);
        console.log(`   detalleGastos: ${gasto.detalleGastos}`);
        console.log(`   fecha: ${gasto.fecha}`);
        console.log('');
      });
    } else {
      gastosConStandBy.forEach((gasto, index) => {
        const fechaStandBy = new Date(gasto.fechaStandBy).toISOString().split('T')[0];
        const shouldShow = fechaStandBy <= today;
        const status = shouldShow ? '✅ SE MUESTRA' : '❌ NO SE MUESTRA';
        
        console.log(`${index + 1}. ${status}`);
        console.log(`   _id: ${gasto._id}`);
        console.log(`   fechaStandBy: ${fechaStandBy}`);
        console.log(`   fecha: ${gasto.fecha}`);
        console.log(`   detalleGastos: ${gasto.detalleGastos}`);
        console.log(`   entrada: ${gasto.entrada || 0}`);
        console.log(`   salida: ${gasto.salida || 0}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
    process.exit(0);
  }
}

debugStandBy();