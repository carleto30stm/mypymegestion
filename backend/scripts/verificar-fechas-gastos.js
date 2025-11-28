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
  detalleGastos: String,
  entrada: Number,
  salida: Number
}, { timestamps: true });

const Gasto = mongoose.model('Gasto', gastoSchema);

async function verificarFechas() {
  try {
    console.log('🔍 Conectando a MongoDB...\n');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    // Obtener el total de registros
    const total = await Gasto.countDocuments();
    console.log(`📊 Total de registros en gastos: ${total}\n`);

    // Obtener la fecha más antigua y más reciente
    const masAntiguo = await Gasto.findOne().sort({ fecha: 1 });
    const masReciente = await Gasto.findOne().sort({ fecha: -1 });

    console.log('📅 Rango de fechas en la base de datos:');
    console.log(`   Más antiguo: ${masAntiguo?.fecha ? new Date(masAntiguo.fecha).toLocaleDateString('es-AR') : 'N/A'}`);
    console.log(`   Más reciente: ${masReciente?.fecha ? new Date(masReciente.fecha).toLocaleDateString('es-AR') : 'N/A'}\n`);

    // Agrupar por año
    const porAnio = await Gasto.aggregate([
      {
        $group: {
          _id: { $year: '$fecha' },
          count: { $sum: 1 },
          totalEntradas: { $sum: '$entrada' },
          totalSalidas: { $sum: '$salida' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    console.log('📈 Registros por año:');
    console.log('─'.repeat(80));
    console.log('Año\t\tRegistros\tEntradas\t\tSalidas');
    console.log('─'.repeat(80));
    
    let totalRegistros = 0;
    porAnio.forEach(anio => {
      totalRegistros += anio.count;
      console.log(
        `${anio._id}\t\t${anio.count}\t\t$${(anio.totalEntradas || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}\t\t$${(anio.totalSalidas || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
      );
    });
    console.log('─'.repeat(80));
    console.log(`TOTAL\t\t${totalRegistros}\n`);

    // Mostrar algunos registros de años anteriores al 2025 si existen
    const registrosAnteriores = await Gasto.find({
      fecha: { $lt: new Date('2025-01-01') }
    })
    .sort({ fecha: -1 })
    .limit(10)
    .select('fecha rubro detalleGastos entrada salida');

    if (registrosAnteriores.length > 0) {
      console.log(`\n⚠️  Encontrados ${registrosAnteriores.length > 0 ? 'registros' : ''} de años anteriores a 2025:`);
      console.log('─'.repeat(80));
      registrosAnteriores.forEach((gasto, index) => {
        console.log(`${index + 1}. ${new Date(gasto.fecha).toLocaleDateString('es-AR')} - ${gasto.rubro} - ${gasto.detalleGastos?.substring(0, 40)}...`);
        console.log(`   Entrada: $${(gasto.entrada || 0).toLocaleString('es-AR')} | Salida: $${(gasto.salida || 0).toLocaleString('es-AR')}\n`);
      });
    } else {
      console.log('\n✅ No hay registros anteriores a 2025');
    }

    // Registros del año 2025
    const registros2025 = await Gasto.countDocuments({
      fecha: { 
        $gte: new Date('2025-01-01'),
        $lt: new Date('2026-01-01')
      }
    });
    console.log(`\n📊 Registros del año 2025: ${registros2025}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexión cerrada');
  }
}

verificarFechas();
