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
import mongoose from 'mongoose';

const router = express.Router();

router.route('/')
  .get( getGastos)
  .post( createGasto); // OPER puede crear gastos
  // .get(protect, getGastos)
  // .post(protect, createGasto); // OPER puede crear gastos
  // TODO: agregar el protected si se usa JWDT a confirmar

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
    if (!gasto.medioDePago?.includes('Cheque')) {
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
    if (chequeOriginal.medioDePago !== 'Cheque Tercero' || !chequeOriginal.confirmado) {
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
      medioDePago: 'Cheque Tercero',
      banco: chequeOriginal.banco, // Mismo banco donde estaba el cheque original
      clientes: chequeOriginal.clientes,
      detalleGastos: `${tipoDisposicion === 'depositar' ? 'Depósito' : 'Pago a proveedor'} - ${detalleOperacion}`,
      tipoOperacion: 'salida',
      comentario: `Disposición de cheque original ID: ${id}`,
      confirmado: true,
      salida: chequeOriginal.entrada, // La misma cantidad que ingresó
      entrada: 0,
      estadoCheque: nuevoEstado,
      chequeRelacionadoId: id
    });

    // Si es depósito, crear también la entrada en el banco destino
    let movimientoEntrada = null;
    if (tipoDisposicion === 'depositar') {
      movimientoEntrada = new Gasto({
        fecha: new Date(),
        rubro: 'BANCO',
        subRubro: 'MOV.BANC',
        medioDePago: 'Efectivo', // Ahora es dinero en cuenta
        banco: destino, // El banco donde depositamos (PROVINCIA, SANTANDER, etc.)
        clientes: chequeOriginal.clientes,
        detalleGastos: `Depósito cheque de tercero - ${detalleOperacion}`,
        tipoOperacion: 'entrada',
        comentario: `Depósito de cheque original ID: ${id}`,
        confirmado: true,
        entrada: chequeOriginal.entrada, // Entra el mismo monto
        salida: 0,
        chequeRelacionadoId: id
      });
    }

    // Actualizar el estado del cheque original
    chequeOriginal.estadoCheque = nuevoEstado;
    
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
  .put( updateGasto)    // OPER NO puede editar
  .delete(  deleteGasto); // OPER NO puede eliminar

export default router;
