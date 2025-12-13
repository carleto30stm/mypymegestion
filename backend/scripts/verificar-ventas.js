/**
 * Script para verificar ventas y cobros reales
 * Uso: node scripts/verificar-ventas.js [mes] [año]
 * Ejemplo: node scripts/verificar-ventas.js 12 2025
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
const VentaSchema = new mongoose.Schema({}, { strict: false, collection: 'ventas' });
const ReciboSchema = new mongoose.Schema({}, { strict: false, collection: 'recibopagos' });
const GastoSchema = new mongoose.Schema({}, { strict: false, collection: 'gastos' });

const Venta = mongoose.model('Venta', VentaSchema);
const Recibo = mongoose.model('Recibo', ReciboSchema);
const Gasto = mongoose.model('Gasto', GastoSchema);

async function verificarDatos() {
  try {
    // Obtener mes/año de argumentos o usar actual
    const mes = process.argv[2] ? parseInt(process.argv[2]) : new Date().getMonth() + 1;
    const año = process.argv[3] ? parseInt(process.argv[3]) : new Date().getFullYear();

    console.log(`\n📊 VERIFICACIÓN DE DATOS - ${mes}/${año}\n`);
    console.log('='.repeat(80));

    // Fechas del período
    const fechaInicio = new Date(año, mes - 1, 1);
    const fechaFin = new Date(año, mes, 0, 23, 59, 59);

    console.log(`📅 Período: ${fechaInicio.toLocaleDateString('es-AR')} - ${fechaFin.toLocaleDateString('es-AR')}\n`);

    // ========== 1. VENTAS CONFIRMADAS ==========
    console.log('1️⃣  VENTAS CONFIRMADAS (Tabla Venta)');
    console.log('-'.repeat(80));

    const ventasConfirmadas = await Venta.find({
      estado: 'confirmada',
      $or: [
        { fechaCreacion: { $gte: fechaInicio, $lte: fechaFin } },
        { fecha: { $gte: fechaInicio, $lte: fechaFin } }
      ]
    }).lean();

    const ventasConIVA = ventasConfirmadas.filter(v => v.aplicaIVA);
    const ventasSinIVA = ventasConfirmadas.filter(v => !v.aplicaIVA);

    const totalVentasConIVA = ventasConIVA.reduce((sum, v) => sum + (v.total || 0), 0);
    const totalIVA = ventasConIVA.reduce((sum, v) => sum + (v.iva || 0), 0);
    const netasConIVA = totalVentasConIVA - totalIVA;
    const totalVentasSinIVA = ventasSinIVA.reduce((sum, v) => sum + (v.total || 0), 0);

    console.log(`   Ventas con IVA: ${ventasConIVA.length} ops → Total: $${totalVentasConIVA.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
    console.log(`      → IVA Débito: $${totalIVA.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
    console.log(`      → Neto sin IVA: $${netasConIVA.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
    console.log(`   Ventas sin IVA: ${ventasSinIVA.length} ops → Total: $${totalVentasSinIVA.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
    console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`   TOTAL VENTAS NETAS (sin IVA): $${(netasConIVA + totalVentasSinIVA).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
    console.log(`   TOTAL BRUTO (con IVA): $${(totalVentasConIVA + totalVentasSinIVA).toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n`);

    // Desglose por medio de pago
    const ventasPorMedio = {};
    ventasConfirmadas.forEach(v => {
      const medio = v.medioPago || 'SIN_ESPECIFICAR';
      if (!ventasPorMedio[medio]) {
        ventasPorMedio[medio] = { cantidad: 0, total: 0 };
      }
      ventasPorMedio[medio].cantidad++;
      ventasPorMedio[medio].total += v.total || 0;
    });

    console.log('   📋 Desglose por Medio de Pago:');
    Object.entries(ventasPorMedio).forEach(([medio, data]) => {
      console.log(`      ${medio}: ${data.cantidad} ops → $${data.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
    });

    // ========== 2. RECIBOS DE PAGO (COBROS) ==========
    console.log('\n2️⃣  RECIBOS DE PAGO (Cobros posteriores)');
    console.log('-'.repeat(80));

    const recibos = await Recibo.find({
      estadoRecibo: 'activo',
      fecha: { $gte: fechaInicio, $lte: fechaFin }
    }).lean();

    const totalCobradoRecibos = recibos.reduce((sum, r) => sum + (r.totales?.totalCobrado || 0), 0);
    const cantidadRecibos = recibos.length;

    console.log(`   Recibos emitidos: ${cantidadRecibos}`);
    console.log(`   Total cobrado: $${totalCobradoRecibos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);

    // Desglose por forma de pago
    const cobrosPorForma = {};
    recibos.forEach(r => {
      if (r.formasPago && Array.isArray(r.formasPago)) {
        r.formasPago.forEach(fp => {
          const medio = fp.medioPago || 'SIN_ESPECIFICAR';
          if (!cobrosPorForma[medio]) {
            cobrosPorForma[medio] = { cantidad: 0, total: 0 };
          }
          cobrosPorForma[medio].cantidad++;
          cobrosPorForma[medio].total += fp.monto || 0;
        });
      }
    });

    console.log('\n   📋 Desglose por Forma de Pago:');
    Object.entries(cobrosPorForma).forEach(([medio, data]) => {
      console.log(`      ${medio}: ${data.cantidad} ops → $${data.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
    });

    // ========== 3. GASTOS ENTRADA (VENTAS LEGACY) ==========
    console.log('\n3️⃣  GASTOS ENTRADA - VENTAS LEGACY');
    console.log('-'.repeat(80));

    const gastosVentasLegacy = await Gasto.find({
      tipoOperacion: 'entrada',
      rubro: 'COBRO.VENTA',
      subRubro: { $in: ['COBRO', 'ADEUDADO'] },
      fecha: { $gte: fechaInicio, $lte: fechaFin },
      estado: { $ne: 'cancelado' }
    }).lean();

    const totalVentasLegacy = gastosVentasLegacy.reduce((sum, g) => sum + (g.entrada || 0), 0);

    console.log(`   Registros legacy: ${gastosVentasLegacy.length}`);
    console.log(`   Total: $${totalVentasLegacy.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
    console.log(`   ⚠️  Nota: Ventas legacy (pagos en negro, sin desglose IVA)\n`);

    // ========== 4. OTROS INGRESOS OPERACIONALES ==========
    console.log('4️⃣  OTROS INGRESOS OPERACIONALES');
    console.log('-'.repeat(80));

    const otrosIngresos = await Gasto.find({
      tipoOperacion: 'entrada',
      rubro: 'COBRO.VENTA',
      subRubro: { $in: ['FLETE', 'COMISION', 'AJUSTE'] },
      fecha: { $gte: fechaInicio, $lte: fechaFin },
      estado: { $ne: 'cancelado' }
    }).lean();

    const totalOtrosIngresos = otrosIngresos.reduce((sum, g) => sum + (g.entrada || 0), 0);

    console.log(`   Registros: ${otrosIngresos.length}`);
    console.log(`   Total: $${totalOtrosIngresos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n`);

    // ========== 5. FLUJO DE COBROS (CAJA) ==========
    console.log('5️⃣  FLUJO DE COBROS (Ingresos físicos a caja)');
    console.log('-'.repeat(80));

    // Ventas con medio de pago físico (excluir vacío que son a crédito)
    const ventasConMedioPago = ventasConfirmadas.filter(v => v.medioPago && v.medioPago !== '');
    const cobrosVentasInmediatas = ventasConMedioPago.reduce((sum, v) => sum + (v.total || 0), 0);

    // Otros ingresos no relacionados con ventas
    const gastosEntradaSueltos = await Gasto.find({
      tipoOperacion: 'entrada',
      rubro: { $ne: 'COBRO.VENTA' },
      fecha: { $gte: fechaInicio, $lte: fechaFin },
      estado: { $ne: 'cancelado' }
    }).lean();
    const totalEntradaSueltas = gastosEntradaSueltos.reduce((sum, g) => sum + (g.entrada || 0), 0);

    const flujoCobrosTotal = cobrosVentasInmediatas + totalCobradoRecibos + totalEntradaSueltas;

    console.log(`   Cobros ventas inmediatas: $${cobrosVentasInmediatas.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
    console.log(`   Cobros posteriores (ReciboPago): $${totalCobradoRecibos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
    console.log(`   Otras entradas: $${totalEntradaSueltas.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
    console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`   FLUJO TOTAL DE COBROS: $${flujoCobrosTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n`);

    // ========== RESUMEN FINAL ==========
    console.log('=' .repeat(80));
    console.log('📊 RESUMEN PARA REPORTE CONTABLE');
    console.log('='.repeat(80));
    console.log(`\n   A. INGRESOS (Base Devengado - Contable):`);
    console.log(`      Ventas Netas (sin IVA): $${(netasConIVA + totalVentasSinIVA).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
    console.log(`      + Ventas Legacy: $${totalVentasLegacy.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
    console.log(`      + Otros Ingresos: $${totalOtrosIngresos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
    console.log(`      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`      TOTAL INGRESOS: $${(netasConIVA + totalVentasSinIVA + totalVentasLegacy + totalOtrosIngresos).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
    
    console.log(`\n   B. FLUJO DE CAJA (Base Percibido - Cobros Reales):`);
    console.log(`      Flujo Total de Cobros: $${flujoCobrosTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
    
    console.log(`\n   ℹ️  Diferencia Devengado vs Percibido: $${(netasConIVA + totalVentasSinIVA + totalVentasLegacy - flujoCobrosTotal).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
    console.log(`      (Ventas a crédito pendientes de cobro)\n`);

    // ========== VERIFICACIÓN DE INCONSISTENCIAS ==========
    console.log('🔍 VERIFICACIÓN DE POSIBLES INCONSISTENCIAS');
    console.log('='.repeat(80));

    // Ventas sin medio de pago
    const ventasSinMedio = ventasConfirmadas.filter(v => !v.medioPago || v.medioPago === '');
    if (ventasSinMedio.length > 0) {
      const totalSinMedio = ventasSinMedio.reduce((sum, v) => sum + (v.total || 0), 0);
      console.log(`   ⚠️  ${ventasSinMedio.length} ventas sin medio de pago → $${totalSinMedio.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
      console.log(`      (Probablemente ventas a crédito)`);
    }

    // Ventas sin aplicaIVA definido
    const ventasSinIVADefinido = ventasConfirmadas.filter(v => v.aplicaIVA === undefined);
    if (ventasSinIVADefinido.length > 0) {
      console.log(`   ⚠️  ${ventasSinIVADefinido.length} ventas sin campo aplicaIVA definido`);
    }

    // Recibos huérfanos (sin ventas relacionadas)
    const recibosHuerfanos = recibos.filter(r => !r.ventasRelacionadas || r.ventasRelacionadas.length === 0);
    if (recibosHuerfanos.length > 0) {
      const totalHuerfanos = recibosHuerfanos.reduce((sum, r) => sum + (r.totales?.totalCobrado || 0), 0);
      console.log(`   ℹ️  ${recibosHuerfanos.length} recibos sin ventas relacionadas → $${totalHuerfanos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
      console.log(`      (Regularizaciones de deuda o pagos directos)`);
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
verificarDatos();
