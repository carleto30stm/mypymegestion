/**
 * Script para verificar egresos y detectar duplicaciones
 * Uso: node scripts/verificar-egresos.js [mes] [año]
 * Ejemplo: node scripts/verificar-egresos.js 12 2025
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mygestion')
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch(err => {
    console.error('❌ Error conectando a MongoDB:', err);
    process.exit(1);
  });

// Definir esquemas básicos
const GastoSchema = new mongoose.Schema({}, { strict: false, collection: 'gastos' });
const CompraSchema = new mongoose.Schema({}, { strict: false, collection: 'compras' });

const Gasto = mongoose.model('Gasto', GastoSchema);
const Compra = mongoose.model('Compra', CompraSchema);

async function verificarEgresos() {
  try {
    // Obtener mes/año de argumentos o usar actual
    const mes = process.argv[2] ? parseInt(process.argv[2]) : new Date().getMonth() + 1;
    const año = process.argv[3] ? parseInt(process.argv[3]) : new Date().getFullYear();

    console.log(`\n📊 VERIFICACIÓN DE EGRESOS - ${mes}/${año}\n`);
    console.log('='.repeat(80));

    // Fechas del período
    const fechaInicio = new Date(año, mes - 1, 1);
    const fechaFin = new Date(año, mes, 0, 23, 59, 59);

    console.log(`📅 Período: ${fechaInicio.toLocaleDateString('es-AR')} - ${fechaFin.toLocaleDateString('es-AR')}\n`);

    // ========== 1. GASTOS SALIDA ==========
    console.log('1️⃣  GASTOS - SALIDAS (Tabla Gasto)');
    console.log('-'.repeat(80));

    const gastosSalida = await Gasto.find({
      tipoOperacion: 'salida',
      fecha: { $gte: fechaInicio, $lte: fechaFin },
      estado: { $ne: 'cancelado' }
    }).lean();

    // Agrupar por rubro
    const egresosPorRubro = {};
    let totalEgresos = 0;

    gastosSalida.forEach(g => {
      const rubro = g.rubro || 'SIN_RUBRO';
      const subRubro = g.subRubro || 'SIN_SUBRUBRO';
      const key = `${rubro} → ${subRubro}`;
      
      if (!egresosPorRubro[key]) {
        egresosPorRubro[key] = { cantidad: 0, total: 0, items: [] };
      }
      
      const monto = g.salida || 0;
      egresosPorRubro[key].cantidad++;
      egresosPorRubro[key].total += monto;
      egresosPorRubro[key].items.push({
        _id: g._id,
        fecha: g.fecha,
        monto,
        detalleGastos: g.detalleGastos,
        compraRelacionadaId: g.compraRelacionadaId
      });
      
      totalEgresos += monto;
    });

    console.log(`   Total gastos salida: ${gastosSalida.length}`);
    console.log(`   Total egresos: $${totalEgresos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n`);

    // Mostrar top 10 rubros por monto
    const rubrosOrdenados = Object.entries(egresosPorRubro)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 15);

    console.log('   📋 Top 15 Rubros por Monto:');
    rubrosOrdenados.forEach(([rubro, data]) => {
      console.log(`      ${rubro}`);
      console.log(`         ${data.cantidad} ops → $${data.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
    });

    // ========== 2. COMPRAS CONFIRMADAS ==========
    console.log('\n2️⃣  COMPRAS CONFIRMADAS (Tabla Compra)');
    console.log('-'.repeat(80));

    const comprasConfirmadas = await Compra.find({
      estado: 'confirmada',
      $or: [
        { fechaCompra: { $gte: fechaInicio, $lte: fechaFin } },
        { fecha: { $gte: fechaInicio, $lte: fechaFin } }
      ]
    }).lean();

    const totalCompras = comprasConfirmadas.reduce((sum, c) => sum + (c.total || 0), 0);
    
    console.log(`   Compras confirmadas: ${comprasConfirmadas.length}`);
    console.log(`   Total compras: $${totalCompras.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);

    // Verificar si compras tienen gastoRelacionadoId
    const comprasConGasto = comprasConfirmadas.filter(c => c.gastoRelacionadoId);
    const comprasSinGasto = comprasConfirmadas.filter(c => !c.gastoRelacionadoId);

    console.log(`\n   Con gastoRelacionadoId: ${comprasConGasto.length} → $${comprasConGasto.reduce((sum, c) => sum + (c.total || 0), 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
    console.log(`   Sin gastoRelacionadoId: ${comprasSinGasto.length} → $${comprasSinGasto.reduce((sum, c) => sum + (c.total || 0), 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);

    // ========== 3. VERIFICAR DUPLICACIONES ==========
    console.log('\n3️⃣  VERIFICACIÓN DE DUPLICACIONES');
    console.log('-'.repeat(80));

    // Buscar gastos que tengan compraRelacionadaId
    const gastosConCompra = gastosSalida.filter(g => g.compraRelacionadaId);
    const totalGastosConCompra = gastosConCompra.reduce((sum, g) => sum + (g.salida || 0), 0);

    console.log(`   Gastos con compraRelacionadaId: ${gastosConCompra.length}`);
    console.log(`   Total: $${totalGastosConCompra.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);

    // Verificar si hay duplicación (misma compra registrada dos veces)
    const comprasIds = new Set(comprasConfirmadas.map(c => c._id?.toString()));
    const gastosCompraIds = new Set(gastosConCompra.map(g => g.compraRelacionadaId?.toString()).filter(Boolean));

    const comprasQueEstanEnGastos = Array.from(gastosCompraIds).filter(id => comprasIds.has(id));
    
    if (comprasQueEstanEnGastos.length > 0) {
      console.log(`\n   ⚠️  POSIBLE DUPLICACIÓN DETECTADA:`);
      console.log(`   ${comprasQueEstanEnGastos.length} compras tienen registro en AMBAS tablas (Compra + Gasto)`);
      
      let totalDuplicado = 0;
      for (const compraId of comprasQueEstanEnGastos) {
        const compra = comprasConfirmadas.find(c => c._id?.toString() === compraId);
        const gasto = gastosConCompra.find(g => g.compraRelacionadaId?.toString() === compraId);
        
        if (compra && gasto) {
          console.log(`\n      Compra ID: ${compraId}`);
          console.log(`         Tabla Compra: $${(compra.total || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
          console.log(`         Tabla Gasto: $${(gasto.salida || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
          totalDuplicado += Math.min(compra.total || 0, gasto.salida || 0);
        }
      }
      
      console.log(`\n   💰 Total potencialmente duplicado: $${totalDuplicado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
    } else {
      console.log(`\n   ✅ No se detectaron duplicaciones entre Compras y Gastos`);
    }

    // ========== 4. ANÁLISIS POR CATEGORÍA CONTABLE ==========
    console.log('\n4️⃣  ANÁLISIS POR CATEGORÍA CONTABLE');
    console.log('-'.repeat(80));

    const categorias = {
      'Gastos Fijos (SERVICIOS)': { rubros: ['SERVICIOS'], total: 0, cantidad: 0 },
      'Costo de Ventas (MATERIA PRIMA + MANO OBRA)': { rubros: ['PROOV.MATERIA.PRIMA', 'PROOVMANO.DE.OBRA'], total: 0, cantidad: 0 },
      'Gastos Personal (SUELDOS)': { rubros: ['SUELDOS'], total: 0, cantidad: 0 },
      'Gastos Administrativos (GASTOS.ADMIN)': { rubros: ['GASTOS.ADMIN', 'GASTOS ADMINISTRATIVOS'], total: 0, cantidad: 0 },
      'Gastos Operacionales (MANT.MAQ + MOVILIDAD)': { rubros: ['MANT.MAQ', 'MOVILIDAD', 'MANT.EMPRESA'], total: 0, cantidad: 0 },
      'Gastos Financieros (BANCO + ARCA)': { rubros: ['BANCO', 'ARCA'], total: 0, cantidad: 0 }
    };

    gastosSalida.forEach(g => {
      for (const [categoria, data] of Object.entries(categorias)) {
        if (data.rubros.includes(g.rubro)) {
          data.total += g.salida || 0;
          data.cantidad++;
          break;
        }
      }
    });

    Object.entries(categorias).forEach(([categoria, data]) => {
      const porcentaje = totalEgresos > 0 ? (data.total / totalEgresos * 100).toFixed(1) : 0;
      console.log(`   ${categoria}:`);
      console.log(`      ${data.cantidad} ops → $${data.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })} (${porcentaje}%)`);
    });

    // ========== 5. GASTOS CON POTENCIALES ERRORES ==========
    console.log('\n5️⃣  VERIFICACIÓN DE INTEGRIDAD');
    console.log('-'.repeat(80));

    // Gastos con salida = 0 o null
    const gastosCeroONull = gastosSalida.filter(g => !g.salida || g.salida === 0);
    if (gastosCeroONull.length > 0) {
      console.log(`   ⚠️  ${gastosCeroONull.length} gastos con salida = 0 o null`);
    }

    // Gastos sin rubro
    const gastosSinRubro = gastosSalida.filter(g => !g.rubro);
    if (gastosSinRubro.length > 0) {
      const totalSinRubro = gastosSinRubro.reduce((sum, g) => sum + (g.salida || 0), 0);
      console.log(`   ⚠️  ${gastosSinRubro.length} gastos sin rubro → $${totalSinRubro.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
    }

    // Transferencias (no son gastos contables, solo movimientos)
    const transferencias = await Gasto.find({
      tipoOperacion: 'transferencia',
      fecha: { $gte: fechaInicio, $lte: fechaFin },
      estado: { $ne: 'cancelado' }
    }).lean();

    if (transferencias.length > 0) {
      const totalTransferencias = transferencias.reduce((sum, t) => sum + (t.montoTransferencia || t.salida || 0), 0);
      console.log(`   ℹ️  ${transferencias.length} transferencias (no son gastos contables) → $${totalTransferencias.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
    }

    // ========== RESUMEN FINAL ==========
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN PARA REPORTE CONTABLE');
    console.log('='.repeat(80));

    const totalEgresosSinComprasDuplicadas = comprasQueEstanEnGastos.length > 0
      ? totalEgresos - comprasQueEstanEnGastos.reduce((sum, id) => {
          const gasto = gastosConCompra.find(g => g.compraRelacionadaId?.toString() === id);
          return sum + (gasto?.salida || 0);
        }, 0)
      : totalEgresos;

    console.log(`\n   A. EGRESOS BRUTOS (desde Gastos):`);
    console.log(`      Total registrado: $${totalEgresos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
    
    if (comprasQueEstanEnGastos.length > 0) {
      console.log(`\n   B. AJUSTE POR DUPLICACIÓN (Compras + Gastos):`);
      console.log(`      Compras también en Gastos: -$${comprasQueEstanEnGastos.reduce((sum, id) => {
        const gasto = gastosConCompra.find(g => g.compraRelacionadoId?.toString() === id);
        return sum + (gasto?.salida || 0);
      }, 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
      console.log(`      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`      TOTAL EGRESOS SIN DUPLICAR: $${totalEgresosSinComprasDuplicadas.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
    } else {
      console.log(`\n   ✅ No hay duplicaciones detectadas`);
      console.log(`      TOTAL EGRESOS: $${totalEgresos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
    }

    console.log(`\n   C. COMPRAS NO REGISTRADAS EN GASTOS:`);
    if (comprasSinGasto.length > 0) {
      const totalComprasSinGasto = comprasSinGasto.reduce((sum, c) => sum + (c.total || 0), 0);
      console.log(`      ${comprasSinGasto.length} compras → $${totalComprasSinGasto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
      console.log(`      ⚠️  Estas compras pueden estar registradas sin campo gastoRelacionadoId`);
    } else {
      console.log(`      ✅ Todas las compras tienen gastoRelacionadoId`);
    }

    console.log('\n✅ Verificación completada\n');

  } catch (error) {
    console.error('❌ Error en verificación:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar
verificarEgresos();
