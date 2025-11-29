import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '..', '.env') });

// Modelo simplificado de Gasto
const gastoSchema = new mongoose.Schema({
  fecha: Date,
  rubro: String,
  subRubro: String,
  detalleGastos: String,
  medioDePago: String,
  banco: String,
  entrada: Number,
  salida: Number,
  tipoOperacion: String,
  estado: String,
  confirmado: Boolean,
  creadoPor: String
}, { timestamps: true });

const Gasto = mongoose.model('Gasto', gastoSchema);

async function mostrarDetalles() {
  try {
    console.log('🔍 Conectando a MongoDB...\n');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    // Buscar registros con años diferentes a 2025
    const registrosIncorrectos = await Gasto.find({
      $or: [
        { fecha: { $lt: new Date('2025-01-01') } },
        { fecha: { $gte: new Date('2026-01-01') } }
      ]
    }).sort({ fecha: 1 });

    console.log(`📋 Total de registros con fechas incorrectas: ${registrosIncorrectos.length}\n`);
    console.log('═'.repeat(100));

    registrosIncorrectos.forEach((gasto, index) => {
      console.log(`\n🔸 REGISTRO ${index + 1}:`);
      console.log('─'.repeat(100));
      console.log(`   📌 ID: ${gasto._id}`);
      console.log(`   📅 Fecha: ${gasto.fecha ? new Date(gasto.fecha).toLocaleString('es-AR', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }) : 'N/A'}`);
      console.log(`   📅 Fecha ISO: ${gasto.fecha ? gasto.fecha.toISOString() : 'N/A'}`);
      console.log(`   📂 Rubro: ${gasto.rubro || 'N/A'}`);
      console.log(`   📁 Sub-Rubro: ${gasto.subRubro || 'N/A'}`);
      console.log(`   📝 Detalle: ${gasto.detalleGastos || 'N/A'}`);
      console.log(`   💳 Medio de Pago: ${gasto.medioDePago || 'N/A'}`);
      console.log(`   🏦 Banco: ${gasto.banco || 'N/A'}`);
      console.log(`   💰 Entrada: $${(gasto.entrada || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
      console.log(`   💸 Salida: $${(gasto.salida || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
      console.log(`   🔄 Tipo Operación: ${gasto.tipoOperacion || 'N/A'}`);
      console.log(`   📊 Estado: ${gasto.estado || 'N/A'}`);
      console.log(`   ✅ Confirmado: ${gasto.confirmado ? 'Sí' : 'No'}`);
      console.log(`   👤 Creado por: ${gasto.creadoPor || 'N/A'}`);
      console.log(`   🕐 Created At: ${gasto.createdAt ? new Date(gasto.createdAt).toLocaleString('es-AR') : 'N/A'}`);
      console.log(`   🕑 Updated At: ${gasto.updatedAt ? new Date(gasto.updatedAt).toLocaleString('es-AR') : 'N/A'}`);
      console.log('─'.repeat(100));
    });

    console.log('\n═'.repeat(100));
    console.log('\n💡 COMANDO PARA CORREGIR MANUALMENTE EN MONGODB COMPASS:');
    console.log('─'.repeat(100));
    
    registrosIncorrectos.forEach((gasto, index) => {
      const fechaActual = new Date(gasto.fecha);
      let fechaCorregida;
      
      // Si el año es 25, convertir a 2025
      if (fechaActual.getFullYear() === 25) {
        fechaCorregida = new Date(fechaActual);
        fechaCorregida.setFullYear(2025);
      }
      // Si el año es 22025, convertir a 2025
      else if (fechaActual.getFullYear() === 22025) {
        fechaCorregida = new Date(fechaActual);
        fechaCorregida.setFullYear(2025);
      }
      // Otros casos
      else {
        fechaCorregida = new Date(fechaActual);
        fechaCorregida.setFullYear(2025);
      }
      
      console.log(`\n// Registro ${index + 1}: ${gasto.detalleGastos?.substring(0, 50)}...`);
      console.log(`db.gastos.updateOne(`);
      console.log(`  { _id: ObjectId("${gasto._id}") },`);
      console.log(`  { $set: { fecha: ISODate("${fechaCorregida.toISOString()}") } }`);
      console.log(`)`);
    });

    console.log('\n═'.repeat(100));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexión cerrada');
  }
}

mostrarDetalles();
