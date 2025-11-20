/**
 * Script de migración para mapear estados legacy a estados granulares
 * 
 * Ejecutar desde el directorio backend con:
 * node scripts/migracion-estados-granulares.js
 * 
 * IMPORTANTE: Este script es idempotente y puede ejecutarse múltiples veces
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configurar __dirname para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mygestor';
const DB_NAME = process.env.MONGO_DB_NAME || 'test';

/**
 * Esquema mínimo de Venta para la migración
 */
const ventaSchema = new mongoose.Schema({
  numeroVenta: String,
  fecha: Date,
  estado: String,
  estadoGranular: String,
  estadoCobranza: String,
  estadoEntrega: String,
  facturada: Boolean,
  facturaId: mongoose.Schema.Types.ObjectId,
  montoCobrado: Number,
  total: Number,
  createdAt: Date
}, { 
  collection: 'ventas',
  strict: false // Permitir campos adicionales
});

const Venta = mongoose.model('Venta', ventaSchema);

/**
 * Mapea estado legacy a estado granular
 * Lógica inteligente basada en otros campos
 */
function mapearEstadoGranular(venta) {
  const { estado, estadoCobranza, estadoEntrega, facturada, facturaId, montoCobrado, total } = venta;

  // Si está anulada, es anulada en cualquier caso
  if (estado === 'anulada') {
    return 'anulada';
  }

  // Si está pendiente y no confirmada
  if (estado === 'pendiente') {
    return 'pendiente';
  }

  // A partir de aquí, la venta está confirmada
  // Ahora determinamos el estado granular según el progreso del ciclo

  const estaCobrada = estadoCobranza === 'cobrado' || (montoCobrado > 0 && montoCobrado >= total);
  const estaEntregada = estadoEntrega === 'entregado';
  const estaFacturada = facturada || facturaId;

  // Si tiene todos los estados completados → completada
  if (estaCobrada && estaEntregada && estaFacturada) {
    return 'completada';
  }

  // Si está cobrada pero no todo lo demás
  if (estaCobrada) {
    return 'cobrada';
  }

  // Si está entregada pero no cobrada
  if (estaEntregada) {
    return 'entregada';
  }

  // Si está facturada pero no entregada ni cobrada
  if (estaFacturada) {
    return 'facturada';
  }

  // Si está confirmada pero sin facturar, entregar ni cobrar
  if (estado === 'confirmada') {
    return 'confirmada';
  }

  // Fallback (no debería llegar aquí)
  return 'pendiente';
}

/**
 * Función principal de migración
 */
async function migrarEstadosGranulares() {
  console.log('='.repeat(60));
  console.log('📋 MIGRACIÓN: Mapear estados legacy a estados granulares');
  console.log('='.repeat(60));
  console.log();

  try {
    // Conectar a MongoDB
    console.log('🔌 Conectando a MongoDB...');
    console.log(`   Base de datos: ${DB_NAME}`);
    await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
    console.log('✅ Conexión exitosa');
    console.log();

    // 1. Contar ventas sin estadoGranular
    const ventasSinEstadoGranular = await Venta.countDocuments({ 
      estadoGranular: { $exists: false } 
    });
    
    const ventasConEstadoGranular = await Venta.countDocuments({ 
      estadoGranular: { $exists: true } 
    });

    const totalVentas = await Venta.countDocuments();

    console.log('📊 Estado actual de la base de datos:');
    console.log(`   Total de ventas: ${totalVentas}`);
    console.log(`   Ventas CON estadoGranular: ${ventasConEstadoGranular}`);
    console.log(`   Ventas SIN estadoGranular: ${ventasSinEstadoGranular}`);
    console.log();

    if (ventasSinEstadoGranular === 0) {
      console.log('✅ No hay ventas que migrar. Todas tienen estadoGranular asignado.');
      console.log();
      await mongoose.connection.close();
      return;
    }

    // 2. Obtener ventas a migrar
    console.log(`📝 Procesando ${ventasSinEstadoGranular} ventas...`);
    const ventas = await Venta.find({ estadoGranular: { $exists: false } })
      .select('numeroVenta estado estadoCobranza estadoEntrega facturada facturaId montoCobrado total')
      .lean();

    // 3. Preparar operaciones bulk
    const bulkOps = [];
    const estadisticas = {
      borrador: 0,
      pendiente: 0,
      confirmada: 0,
      facturada: 0,
      entregada: 0,
      cobrada: 0,
      completada: 0,
      anulada: 0
    };

    ventas.forEach(venta => {
      const estadoGranular = mapearEstadoGranular(venta);
      estadisticas[estadoGranular]++;

      bulkOps.push({
        updateOne: {
          filter: { _id: venta._id },
          update: { $set: { estadoGranular } }
        }
      });
    });

    // 4. Mostrar preview
    console.log();
    console.log('📋 Preview de mapeo (primeras 10 ventas):');
    console.log('─'.repeat(80));
    console.log('   Venta        | Estado Legacy  | Estado Granular | Cobro     | Entrega   | Factura');
    console.log('─'.repeat(80));
    
    ventas.slice(0, 10).forEach(venta => {
      const estadoGranular = mapearEstadoGranular(venta);
      const cobro = venta.estadoCobranza || 'sin_cobrar';
      const entrega = venta.estadoEntrega || 'sin_remito';
      const factura = venta.facturada ? 'SÍ' : 'NO';
      
      console.log(
        `   ${(venta.numeroVenta || '?').padEnd(12)} | ` +
        `${(venta.estado || '?').padEnd(14)} | ` +
        `${estadoGranular.padEnd(15)} | ` +
        `${cobro.padEnd(9)} | ` +
        `${entrega.padEnd(9)} | ` +
        `${factura}`
      );
    });
    console.log('─'.repeat(80));
    console.log();

    // 5. Mostrar estadísticas de mapeo
    console.log('📊 Distribución de estados granulares (después de migración):');
    Object.entries(estadisticas)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .forEach(([estado, count]) => {
        const emoji = {
          borrador: '📝',
          pendiente: '⏳',
          confirmada: '✅',
          facturada: '📄',
          entregada: '🚚',
          cobrada: '💰',
          completada: '🎉',
          anulada: '❌'
        }[estado] || '•';
        
        const porcentaje = ((count / ventasSinEstadoGranular) * 100).toFixed(1);
        console.log(`   ${emoji} ${estado.padEnd(12)}: ${count.toString().padStart(4)} ventas (${porcentaje}%)`);
      });
    console.log();

    // 6. Ejecutar migración
    console.log('🚀 Ejecutando actualización masiva...');
    const resultado = await Venta.bulkWrite(bulkOps, { ordered: false });
    
    console.log('✅ Migración completada exitosamente');
    console.log(`   Operaciones ejecutadas: ${resultado.modifiedCount}`);
    console.log();

    // 7. Verificación post-migración
    console.log('🔍 Verificando resultados...');
    const ventasSinEstadoGranularPost = await Venta.countDocuments({ 
      estadoGranular: { $exists: false } 
    });
    const ventasConEstadoGranularPost = await Venta.countDocuments({ 
      estadoGranular: { $exists: true } 
    });

    console.log(`   Ventas CON estadoGranular: ${ventasConEstadoGranularPost}`);
    console.log(`   Ventas SIN estadoGranular: ${ventasSinEstadoGranularPost}`);
    console.log();

    if (ventasSinEstadoGranularPost === 0) {
      console.log('✅ ÉXITO: Todas las ventas tienen ahora estadoGranular asignado');
    } else {
      console.log(`⚠️  ADVERTENCIA: Aún quedan ${ventasSinEstadoGranularPost} ventas sin estadoGranular`);
    }
    console.log();

    // 8. Estadísticas finales
    console.log('📊 Distribución REAL post-migración:');
    const estadisticasReales = await Venta.aggregate([
      { $match: { estadoGranular: { $exists: true } } },
      { $group: { _id: '$estadoGranular', cantidad: { $sum: 1 } } },
      { $sort: { cantidad: -1 } }
    ]);

    estadisticasReales.forEach(stat => {
      const emoji = {
        borrador: '📝',
        pendiente: '⏳',
        confirmada: '✅',
        facturada: '📄',
        entregada: '🚚',
        cobrada: '💰',
        completada: '🎉',
        anulada: '❌'
      }[stat._id] || '•';
      
      console.log(`   ${emoji} ${stat._id.padEnd(12)}: ${stat.cantidad} ventas`);
    });
    console.log();

    // Cerrar conexión
    await mongoose.connection.close();
    console.log('✅ Conexión cerrada');
    console.log();
    console.log('='.repeat(60));
    console.log('✨ Migración finalizada');
    console.log('='.repeat(60));

  } catch (error) {
    console.error();
    console.error('❌ ERROR durante la migración:');
    console.error('   Mensaje:', error.message);
    console.error('   Stack:', error.stack);
    console.error();
    
    // Cerrar conexión en caso de error
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    
    process.exit(1);
  }
}

// Ejecutar migración
migrarEstadosGranulares();
