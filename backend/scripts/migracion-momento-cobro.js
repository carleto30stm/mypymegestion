/**
 * Script de migración para agregar campo momentoCobro a ventas existentes
 * 
 * Ejecutar desde el directorio backend con:
 * node scripts/migracion-momento-cobro.js
 * 
 * IMPORTANTE: Este script es seguro para ejecutar múltiples veces (idempotente)
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
  medioPago: String,
  momentoCobro: {
    type: String,
    enum: ['anticipado', 'contra_entrega', 'diferido'],
    default: 'diferido'
  },
  estado: String,
  createdAt: Date
}, { 
  collection: 'ventas',
  strict: false // Permitir campos adicionales no definidos
});

const Venta = mongoose.model('Venta', ventaSchema);

/**
 * Función principal de migración
 */
async function migrarMomentoCobro() {
  console.log('='.repeat(60));
  console.log('📋 MIGRACIÓN: Agregar campo momentoCobro a ventas existentes');
  console.log('='.repeat(60));
  console.log();

  try {
    // Conectar a MongoDB
    console.log('🔌 Conectando a MongoDB...');
    console.log(`   Base de datos: ${DB_NAME}`);
    await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
    console.log('✅ Conexión exitosa');
    console.log();

    // 1. Contar ventas sin momentoCobro
    const ventasSinMomento = await Venta.countDocuments({ 
      momentoCobro: { $exists: false } 
    });
    
    const ventasConMomento = await Venta.countDocuments({ 
      momentoCobro: { $exists: true } 
    });

    const totalVentas = await Venta.countDocuments();

    console.log('📊 Estado actual de la base de datos:');
    console.log(`   Total de ventas: ${totalVentas}`);
    console.log(`   Ventas CON momentoCobro: ${ventasConMomento}`);
    console.log(`   Ventas SIN momentoCobro: ${ventasSinMomento}`);
    console.log();

    if (ventasSinMomento === 0) {
      console.log('✅ No hay ventas que migrar. Todas tienen momentoCobro asignado.');
      console.log();
      await mongoose.connection.close();
      return;
    }

    // 2. Mostrar muestra de ventas a migrar
    console.log(`📝 Muestra de ventas a actualizar (primeras 5):`);
    const muestra = await Venta.find({ momentoCobro: { $exists: false } })
      .limit(5)
      .select('numeroVenta fecha medioPago estado')
      .lean();

    muestra.forEach((venta, index) => {
      console.log(`   ${index + 1}. Venta ${venta.numeroVenta} - ${venta.medioPago} - Estado: ${venta.estado}`);
    });
    console.log();

    // 3. Confirmar ejecución
    console.log('⚠️  Este script actualizará las ventas asignando momentoCobro = "diferido" por defecto');
    console.log('   (Comportamiento legacy: todas las ventas generaban deuda al confirmar)');
    console.log();
    
    // En un entorno de producción, aquí pedirías confirmación del usuario
    // Para automatización, asumimos confirmación si el script se ejecuta
    
    console.log('🚀 Iniciando migración...');
    console.log();

    // 4. Ejecutar actualización
    const resultado = await Venta.updateMany(
      { momentoCobro: { $exists: false } },
      { 
        $set: { 
          momentoCobro: 'diferido' 
        } 
      }
    );

    console.log('✅ Migración completada exitosamente');
    console.log(`   Documentos revisados: ${resultado.matchedCount}`);
    console.log(`   Documentos actualizados: ${resultado.modifiedCount}`);
    console.log();

    // 5. Verificación post-migración
    console.log('🔍 Verificando resultados...');
    const ventasSinMomentoPost = await Venta.countDocuments({ 
      momentoCobro: { $exists: false } 
    });
    const ventasConMomentoPost = await Venta.countDocuments({ 
      momentoCobro: { $exists: true } 
    });

    console.log(`   Ventas CON momentoCobro: ${ventasConMomentoPost}`);
    console.log(`   Ventas SIN momentoCobro: ${ventasSinMomentoPost}`);
    console.log();

    if (ventasSinMomentoPost === 0) {
      console.log('✅ ÉXITO: Todas las ventas tienen ahora el campo momentoCobro asignado');
    } else {
      console.log(`⚠️  ADVERTENCIA: Aún quedan ${ventasSinMomentoPost} ventas sin momentoCobro`);
    }
    console.log();

    // 6. Estadísticas finales por momentoCobro
    console.log('📊 Distribución de momentoCobro:');
    const estadisticas = await Venta.aggregate([
      { $match: { momentoCobro: { $exists: true } } },
      { $group: { _id: '$momentoCobro', cantidad: { $sum: 1 } } },
      { $sort: { cantidad: -1 } }
    ]);

    estadisticas.forEach(stat => {
      const emoji = stat._id === 'anticipado' ? '📥' : 
                    stat._id === 'contra_entrega' ? '🚚' : '💳';
      console.log(`   ${emoji} ${stat._id}: ${stat.cantidad} ventas`);
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
migrarMomentoCobro();
