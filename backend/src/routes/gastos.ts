import express from 'express';
import {
  getGastos,
  createGasto,
  updateGasto,
  deleteGasto
} from '../controllers/gastosControllers.js';
import { protect } from '../middleware/authMiddleware.js';
import { requireEditDeletePermission } from '../middleware/operAuth.js';
import Gasto from '../models/Gasto.js';
import ReciboPago from '../models/ReciboPago.js';
import LiquidacionPeriodo from '../models/LiquidacionPeriodo.js';
import mongoose from 'mongoose';

const router = express.Router();

router.route('/')
  .get(protect, getGastos)
  .post(protect, createGasto); // OPER puede crear gastos

// Confirmar un cheque (cambiar confirmado a true)
router.patch('/:id/confirmar', async (req, res) => {
  try {
    const { id } = req.params;
    
    const gasto = await Gasto.findByIdAndUpdate(
      id,
      { confirmado: true },
      { new: true }
    );

    if (!gasto) {
      return res.status(404).json({ error: 'Gasto no encontrado' });
    }

    // Verificar que sea un cheque
    if (!gasto.medioDePago?.includes('CHEQUE')) {
      return res.status(400).json({ error: 'Solo se pueden confirmar cheques' });
    }

    res.json(gasto);
  } catch (error) {
    console.error('Error confirmando cheque:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para "disponer" de un cheque de tercero (depositarlo o pagarlo a proveedor)
router.post('/:id/disponer-cheque', async (req, res) => {
  try {
    const { id } = req.params;
    const { tipoDisposicion, destino, detalleOperacion } = req.body;
    
    // Buscar el cheque original
    const chequeOriginal = await Gasto.findById(id);
    if (!chequeOriginal) {
      return res.status(404).json({ error: 'Cheque no encontrado' });
    }

    // Verificar que sea un cheque de tercero confirmado
    if (chequeOriginal.medioDePago !== 'CHEQUE TERCERO' || !chequeOriginal.confirmado) {
      return res.status(400).json({ error: 'Solo se pueden disponer cheques de terceros confirmados' });
    }

    // Verificar que el cheque esté disponible
    if (chequeOriginal.estadoCheque !== 'recibido') {
      return res.status(400).json({ error: 'Este cheque ya fue dispuesto anteriormente' });
    }

    let nuevoEstado: 'recibido' | 'depositado' | 'pagado_proveedor' | 'endosado' = 'recibido';
    let nuevoBanco = '';
    
    // Determinar estado y destino según tipo de disposición
    if (tipoDisposicion === 'depositar') {
      nuevoEstado = 'depositado';
      nuevoBanco = destino; // PROVINCIA, SANTANDER, etc.
    } else if (tipoDisposicion === 'pagar_proveedor') {
      nuevoEstado = 'pagado_proveedor';
      nuevoBanco = 'EFECTIVO'; // Lo registramos como efectivo ya que salió del patrimonio
    } else {
      return res.status(400).json({ error: 'Tipo de disposición no válido' });
    }

    // Crear el movimiento de salida del cheque (sale del inventario de cheques)
    const movimientoSalida = new Gasto({
      fecha: new Date(),
      rubro: 'BANCO',
      subRubro: 'MOV.BANC',
      medioDePago: 'CHEQUE TERCERO',
      banco: chequeOriginal.banco, // Mismo banco donde estaba el cheque original
      clientes: chequeOriginal.clientes,
      detalleGastos: `${tipoDisposicion === 'depositar' ? 'Depósito' : 'Pago a proveedor'} - ${detalleOperacion}`,
      tipoOperacion: 'salida',
      comentario: `Disposición de cheque original ID: ${id}`,
      confirmado: true,
      salida: chequeOriginal.entrada, // La misma cantidad que ingresó
      entrada: 0,
      estadoCheque: nuevoEstado,
      chequeRelacionadoId: id,
      numeroCheque: chequeOriginal.numeroCheque // Copiar el número de cheque
    });

    // Si es depósito, crear también la entrada en el banco destino
    let movimientoEntrada = null;
    if (tipoDisposicion === 'depositar') {
      console.log('🏦 Creando movimiento de entrada con numeroCheque:', chequeOriginal.numeroCheque);
      
      movimientoEntrada = new Gasto({
        fecha: new Date(),
        rubro: 'BANCO',
        subRubro: 'MOV.BANC',
        medioDePago: 'CHEQUE TERCERO', // Mantener como CHEQUE TERCERO para que se muestre el numeroCheque
        banco: destino, // El banco donde depositamos (PROVINCIA, SANTANDER, etc.)
        clientes: chequeOriginal.clientes,
        detalleGastos: `Depósito cheque de tercero - ${detalleOperacion}`,
        tipoOperacion: 'entrada',
        comentario: `Depósito de cheque original ID: ${id}`,
        confirmado: true,
        entrada: chequeOriginal.entrada, // Entra el mismo monto
        salida: 0,
        chequeRelacionadoId: id,
        numeroCheque: chequeOriginal.numeroCheque, // Copiar el número de cheque también en el depósito
        estadoCheque: 'depositado' // Marcar como depositado para identificarlo
      });

      console.log('✅ Movimiento entrada creado con numeroCheque:', movimientoEntrada.numeroCheque);
    }

    // Actualizar el estado del cheque original
    chequeOriginal.estadoCheque = nuevoEstado;
    
    // CRÍTICO: Actualizar también el estadoCheque en ReciboPago.formasPago[].datosCheque
    // para que el contador de "Cheques Pendientes" refleje correctamente los cheques dispuestos
    if (chequeOriginal.numeroCheque) {
      try {
        const reciboConCheque = await mongoose.model('ReciboPago').findOne({
          'formasPago.medioPago': 'CHEQUE',
          'formasPago.datosCheque.numeroCheque': chequeOriginal.numeroCheque,
          estadoRecibo: 'activo'
        });

        if (reciboConCheque) {
          // Encontrar el índice de la forma de pago que contiene este cheque
          const indiceFP = reciboConCheque.formasPago.findIndex(
            (fp: any) => fp.medioPago === 'CHEQUE' && 
                        fp.datosCheque?.numeroCheque === chequeOriginal.numeroCheque
          );

          if (indiceFP !== -1) {
            // Actualizar el estado del cheque en ReciboPago
            reciboConCheque.formasPago[indiceFP].datosCheque.estadoCheque = nuevoEstado;
            await reciboConCheque.save();
            console.log(`✅ Estado del cheque ${chequeOriginal.numeroCheque} actualizado en ReciboPago a: ${nuevoEstado}`);
          }
        }
      } catch (error) {
        console.error('⚠️ Error actualizando estadoCheque en ReciboPago:', error);
        // No fallar la operación principal si esto falla, solo loguear
      }
    }
    
    // Guardar todas las operaciones
    await chequeOriginal.save();
    await movimientoSalida.save();
    
    const resultados: any = {
      chequeOriginal,
      movimientoSalida,
      movimientoEntrada: null
    };

    if (movimientoEntrada) {
      await movimientoEntrada.save();
      resultados.movimientoEntrada = movimientoEntrada;
    }

    res.json({
      message: `Cheque ${tipoDisposicion === 'depositar' ? 'depositado' : 'utilizado para pago'} exitosamente`,
      operaciones: resultados
    });

  } catch (error) {
    console.error('Error disponiendo cheque:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.route('/:id')
  .put(updateGasto)    // Cualquier usuario puede editar
  .delete(deleteGasto); // Cualquier usuario puede eliminar

// Ruta para cancelar gasto (oper_ad y admin)
router.patch('/:id/cancel', async (req, res) => {
  try {
    const { comentario } = req.body;
    
    // Obtener el gasto antes de cancelarlo para verificar si es adelanto
    const gastoAntesDeCancelar = await Gasto.findById(req.params.id);
    
    if (!gastoAntesDeCancelar) {
      return res.status(404).json({ message: 'Gasto no encontrado' });
    }
    
    // Si es un adelanto y está activo, revertir el monto en la liquidación
    if (gastoAntesDeCancelar.concepto === 'adelanto' && gastoAntesDeCancelar.estado === 'activo') {
      const periodo = await LiquidacionPeriodo.findOne({
        'liquidaciones.gastosRelacionados': gastoAntesDeCancelar._id
      });
      
      if (periodo) {
        if (periodo.estado === 'cerrado') {
          return res.status(400).json({ 
            message: 'No se puede cancelar un adelanto de un período cerrado' 
          });
        }
        
        const liquidacion = periodo.liquidaciones.find((liq: any) =>
          liq.gastosRelacionados.some((id: any) => 
            id.toString() === gastoAntesDeCancelar._id.toString()
          )
        );
        
        if (liquidacion) {
          // Revertir el adelanto
          liquidacion.adelantos -= gastoAntesDeCancelar.salida;
          
          // Recalcular totalAPagar
          liquidacion.totalAPagar = 
            liquidacion.sueldoBase +
            liquidacion.totalHorasExtra +
            liquidacion.aguinaldos +
            liquidacion.incentivos -
            liquidacion.adelantos -
            liquidacion.descuentos;
          
          await periodo.save();
          
          console.log(`✅ Adelanto cancelado y revertido: $${gastoAntesDeCancelar.salida} restado de ${liquidacion.empleadoApellido}, ${liquidacion.empleadoNombre}`);
        }
      }
    }
    
    const updateData: any = { estado: 'cancelado' };
    
    // Si se proporciona un comentario, actualizar también ese campo
    if (comentario) {
      updateData.comentario = comentario;
    }
    
    const gasto = await Gasto.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    if (!gasto) {
      return res.status(404).json({ message: 'Gasto no encontrado' });
    }
    
    res.json({
      ...gasto.toObject(),
      adelantoRevertido: gastoAntesDeCancelar.concepto === 'adelanto'
    });
  } catch (error) {
    console.error('Error al cancelar el gasto:', error);
    res.status(500).json({ message: 'Error al cancelar el gasto' });
  }
});

// Ruta para reactivar gasto (solo admin)
router.patch('/:id/reactivate', async (req, res) => {
  try {
    const { comentario } = req.body;
    
    // Obtener el gasto antes de reactivarlo para verificar si es adelanto
    const gastoAntesDeReactivar = await Gasto.findById(req.params.id);
    
    if (!gastoAntesDeReactivar) {
      return res.status(404).json({ message: 'Gasto no encontrado' });
    }
    
    // Si es un adelanto y está cancelado, volver a aplicar el monto en la liquidación
    if (gastoAntesDeReactivar.concepto === 'adelanto' && gastoAntesDeReactivar.estado === 'cancelado') {
      const periodo = await LiquidacionPeriodo.findOne({
        'liquidaciones.gastosRelacionados': gastoAntesDeReactivar._id
      });
      
      if (periodo) {
        if (periodo.estado === 'cerrado') {
          return res.status(400).json({ 
            message: 'No se puede reactivar un adelanto de un período cerrado' 
          });
        }
        
        const liquidacion = periodo.liquidaciones.find((liq: any) =>
          liq.gastosRelacionados.some((id: any) => 
            id.toString() === gastoAntesDeReactivar._id.toString()
          )
        );
        
        if (liquidacion) {
          // Re-aplicar el adelanto
          liquidacion.adelantos += gastoAntesDeReactivar.salida;
          
          // Recalcular totalAPagar
          liquidacion.totalAPagar = 
            liquidacion.sueldoBase +
            liquidacion.totalHorasExtra +
            liquidacion.aguinaldos +
            liquidacion.incentivos -
            liquidacion.adelantos -
            liquidacion.descuentos;
          
          await periodo.save();
          
          console.log(`✅ Adelanto reactivado: $${gastoAntesDeReactivar.salida} sumado nuevamente a ${liquidacion.empleadoApellido}, ${liquidacion.empleadoNombre}`);
        }
      }
    }
    
    const updateData: any = { estado: 'activo' };
    
    // Si se proporciona un comentario, actualizar también ese campo
    if (comentario) {
      updateData.comentario = comentario;
    }
    
    const gasto = await Gasto.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    if (!gasto) {
      return res.status(404).json({ message: 'Gasto no encontrado' });
    }
    
    res.json({
      ...gasto.toObject(),
      adelantoReaplicado: gastoAntesDeReactivar.concepto === 'adelanto'
    });
  } catch (error) {
    console.error('Error al reactivar el gasto:', error);
    res.status(500).json({ message: 'Error al reactivar el gasto' });
  }
});

export default router;
