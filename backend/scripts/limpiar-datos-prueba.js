/**
 * Script para limpiar datos de prueba
 * 
 * Este script elimina TODOS los datos de las siguientes colecciones:
 * - Ventas
 * - ReciboPago
 * - MovimientoCuentaCorriente
 * - Gastos
 * - Remitos
 * 
 * También resetea los saldos de cuenta corriente de TODOS los clientes a 0
 * 
 * ⚠️ ADVERTENCIA: Esta operación NO es reversible.
 * Solo usar en ambiente de desarrollo con datos de prueba.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configurar __dirname para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '../.env') });

// Importar modelos
import Venta from '../src/models/Venta.js';
import ReciboPago from '../src/models/ReciboPago.js';
import MovimientoCuentaCorriente from '../src/models/MovimientoCuentaCorriente.js';
import Gasto from '../src/models/Gasto.js';
import Cliente from '../src/models/Cliente.js';

// Si hay modelo Remito, importarlo también
let Remito;
try {
  const remitoModule = await import('../src/models/Remito.js');
  Remito = remitoModule.default;
} catch (err) {
  console.log('⚠️  Modelo Remito no encontrado (puede no existir aún)');
}

const limpiarDatos = async () => {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mygestor');
    console.log('✅ Conectado a MongoDB');

    console.log('\n⚠️  ADVERTENCIA: Este script eliminará TODOS los datos de prueba');
    console.log('📋 Colecciones que se limpiarán:');
    console.log('   - Ventas');
    console.log('   - ReciboPago');
    console.log('   - MovimientoCuentaCorriente');
    console.log('   - Gastos');
    console.log('   - Remitos (si existe)');
    console.log('   - Saldos de Clientes (resetear a 0)');
    
    console.log('\n⏳ Iniciando limpieza en 3 segundos...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Eliminar todas las ventas
    const ventasEliminadas = await Venta.deleteMany({});
    console.log(`✅ ${ventasEliminadas.deletedCount} ventas eliminadas`);

    // Eliminar todos los recibos
    const recibosEliminados = await ReciboPago.deleteMany({});
    console.log(`✅ ${recibosEliminados.deletedCount} recibos eliminados`);

    // Eliminar todos los movimientos de cuenta corriente
    const movimientosEliminados = await MovimientoCuentaCorriente.deleteMany({});
    console.log(`✅ ${movimientosEliminados.deletedCount} movimientos de cuenta corriente eliminados`);

    // Eliminar todos los gastos
    const gastosEliminados = await Gasto.deleteMany({});
    console.log(`✅ ${gastosEliminados.deletedCount} gastos eliminados`);

    // Eliminar remitos si el modelo existe
    if (Remito) {
      const remitosEliminados = await Remito.deleteMany({});
      console.log(`✅ ${remitosEliminados.deletedCount} remitos eliminados`);
    }

    // Resetear saldos de clientes a 0
    const clientesActualizados = await Cliente.updateMany(
      {},
      { $set: { saldoCuenta: 0 } }
    );
    console.log(`✅ ${clientesActualizados.modifiedCount} clientes con saldo reseteado a 0`);

    console.log('\n✅ Limpieza completada exitosamente');
    console.log('📊 Base de datos lista para nuevos datos de producción/desarrollo');
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
    process.exit(0);
  }
};

// Ejecutar
limpiarDatos();
