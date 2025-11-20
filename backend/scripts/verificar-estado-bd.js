/**
 * Script de verificación rápida - Estado de la Base de Datos
 * Verifica qué campos faltan en las ventas para saber qué migraciones ejecutar
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGO_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGO_DB_NAME || 'caja';

async function verificarEstado() {
  console.log('='.repeat(60));
  console.log('🔍 VERIFICACIÓN: Estado actual de la base de datos');
  console.log('='.repeat(60));
  console.log();

  try {
    console.log('🔌 Conectando a MongoDB...');
    console.log(`   Base de datos: ${DB_NAME}`);
    await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
    console.log('✅ Conexión exitosa');
    console.log();

    const db = mongoose.connection.db;

    // Verificar colección ventas
    const totalVentas = await db.collection('ventas').countDocuments();
    console.log(`📊 Total de ventas en BD: ${totalVentas}`);
    console.log();

    if (totalVentas === 0) {
      console.log('ℹ️  No hay ventas en la base de datos.');
      console.log('   No es necesario ejecutar migraciones todavía.');
      await mongoose.disconnect();
      return;
    }

    // 1. Verificar momentoCobro
    console.log('1️⃣  Verificando campo "momentoCobro"...');
    const ventasSinMomento = await db.collection('ventas').countDocuments({
      momentoCobro: { $exists: false }
    });
    const ventasConMomento = await db.collection('ventas').countDocuments({
      momentoCobro: { $exists: true }
    });

    if (ventasSinMomento > 0) {
      console.log(`   ⚠️  ${ventasSinMomento} ventas SIN momentoCobro`);
      console.log(`   ✅ ${ventasConMomento} ventas CON momentoCobro`);
      console.log(`   🚨 DEBES EJECUTAR: migracion-momento-cobro.js`);
    } else {
      console.log(`   ✅ Todas las ventas tienen momentoCobro`);
      console.log(`   ℹ️  No necesitas ejecutar: migracion-momento-cobro.js`);
    }
    console.log();

    // 2. Verificar estadoGranular
    console.log('2️⃣  Verificando campo "estadoGranular"...');
    const ventasSinGranular = await db.collection('ventas').countDocuments({
      estadoGranular: { $exists: false }
    });
    const ventasConGranular = await db.collection('ventas').countDocuments({
      estadoGranular: { $exists: true }
    });

    if (ventasSinGranular > 0) {
      console.log(`   ℹ️  ${ventasSinGranular} ventas SIN estadoGranular`);
      console.log(`   ✅ ${ventasConGranular} ventas CON estadoGranular`);
      console.log(`   💡 OPCIONAL ejecutar: migracion-estados-granulares.js`);
      console.log(`      (Mejora UI con emojis y badges de progreso)`);
    } else {
      console.log(`   ✅ Todas las ventas tienen estadoGranular`);
      console.log(`   ℹ️  No necesitas ejecutar: migracion-estados-granulares.js`);
    }
    console.log();

    // 3. Verificar medios de pago legacy
    console.log('3️⃣  Verificando medios de pago legacy...');
    const gastosLegacy = await db.collection('gastos').countDocuments({
      medioDePago: { $in: ['CHEQUE TERCERO', 'CHEQUE PROPIO', 'TARJETA DÉBITO', 'TARJETA CRÉDITO', 'CUENTA CORRIENTE', 'RESERVA'] }
    });
    const ventasLegacy = await db.collection('ventas').countDocuments({
      medioPago: { $in: ['CHEQUE TERCERO', 'CHEQUE PROPIO', 'TARJETA DÉBITO', 'TARJETA CRÉDITO', 'CUENTA CORRIENTE', 'RESERVA'] }
    });

    if (gastosLegacy > 0 || ventasLegacy > 0) {
      console.log(`   ℹ️  ${gastosLegacy} gastos con formato legacy (espacios)`);
      console.log(`   ℹ️  ${ventasLegacy} ventas con formato legacy (espacios)`);
      console.log(`   💡 OPCIONAL ejecutar: migracion-medios-pago-unificados.js`);
      console.log(`      (Normaliza a formato único con guiones bajos)`);
    } else {
      console.log(`   ✅ Medios de pago ya están normalizados`);
      console.log(`   ℹ️  No necesitas ejecutar: migracion-medios-pago-unificados.js`);
    }
    console.log();

    // Resumen final
    console.log('='.repeat(60));
    console.log('📋 RESUMEN - Scripts a ejecutar:');
    console.log('='.repeat(60));
    console.log();

    let scriptsPendientes = 0;

    if (ventasSinMomento > 0) {
      console.log('🚨 CRÍTICO - Ejecutar YA:');
      console.log('   node scripts/migracion-momento-cobro.js');
      console.log();
      scriptsPendientes++;
    }

    if (ventasSinGranular > 0 || gastosLegacy > 0 || ventasLegacy > 0) {
      console.log('💡 OPCIONAL - Ejecutar cuando quieras:');
      if (ventasSinGranular > 0) {
        console.log('   node scripts/migracion-estados-granulares.js');
      }
      if (gastosLegacy > 0 || ventasLegacy > 0) {
        console.log('   node scripts/migracion-medios-pago-unificados.js');
      }
      console.log();
    }

    if (scriptsPendientes === 0 && ventasSinGranular === 0 && gastosLegacy === 0 && ventasLegacy === 0) {
      console.log('✅ ¡Todo al día! No hay migraciones pendientes.');
      console.log();
    }

    await mongoose.disconnect();
    console.log('✅ Verificación completada');

  } catch (error) {
    console.error();
    console.error('❌ ERROR:', error.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

verificarEstado();
