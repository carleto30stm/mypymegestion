import express from 'express';
import Gasto from '../models/Gasto.js';

const router = express.Router();

/**
 * Endpoint temporal para migrar cheques sin numeroCheque
 * Busca en el detalle del gasto si hay información del número de cheque
 * y lo extrae para poblar el campo numeroCheque
 */
router.post('/fix-cheques-sin-numero', async (req, res) => {
  try {
    // Buscar todos los cheques sin numeroCheque
    const chequesSinNumero = await Gasto.find({
      medioDePago: { $in: ['CHEQUE TERCERO', 'CHEQUE PROPIO'] },
      $or: [
        { numeroCheque: null },
        { numeroCheque: '' },
        { numeroCheque: { $exists: false } }
      ]
    });

    console.log(`📋 Encontrados ${chequesSinNumero.length} cheques sin numeroCheque`);

    const actualizados: any[] = [];
    const noActualizados: any[] = [];

    for (const cheque of chequesSinNumero) {
      // Intentar extraer el número de cheque del detalleGastos o comentario
      const texto = `${cheque.detalleGastos || ''} ${cheque.comentario || ''}`;
      
      // Buscar patrones como "Cheque N° 1234" o "Nro 1234" o "#1234"
      const patrones = [
        /cheque\s*n[°º]?\s*(\d+)/i,
        /n[úu]mero\s*(\d+)/i,
        /nro\.?\s*(\d+)/i,
        /#(\d+)/,
        /cheque\s+(\d+)/i
      ];

      let numeroEncontrado = null;
      for (const patron of patrones) {
        const match = texto.match(patron);
        if (match && match[1]) {
          numeroEncontrado = match[1];
          break;
        }
      }

      if (numeroEncontrado) {
        cheque.numeroCheque = numeroEncontrado;
        await cheque.save();
        actualizados.push({
          id: cheque._id,
          numeroCheque: numeroEncontrado,
          detalle: cheque.detalleGastos
        });
        console.log(`✅ Cheque ${cheque._id} actualizado con número ${numeroEncontrado}`);
      } else {
        noActualizados.push({
          id: cheque._id,
          detalle: cheque.detalleGastos,
          comentario: cheque.comentario
        });
        console.log(`⚠️ No se pudo extraer número para cheque ${cheque._id}`);
      }
    }

    res.json({
      message: 'Migración completada',
      totalProcesados: chequesSinNumero.length,
      actualizados: actualizados.length,
      noActualizados: noActualizados.length,
      detalleActualizados: actualizados,
      detalleNoActualizados: noActualizados
    });

  } catch (error) {
    console.error('Error en migración de cheques:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * Endpoint para actualizar manualmente un cheque específico
 */
router.patch('/actualizar-numero-cheque/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { numeroCheque } = req.body;

    if (!numeroCheque) {
      return res.status(400).json({ error: 'numeroCheque es requerido' });
    }

    const cheque = await Gasto.findById(id);
    
    if (!cheque) {
      return res.status(404).json({ error: 'Cheque no encontrado' });
    }

    if (!cheque.medioDePago?.includes('CHEQUE')) {
      return res.status(400).json({ error: 'El gasto no es un cheque' });
    }

    cheque.numeroCheque = numeroCheque.toString().toUpperCase();
    await cheque.save();

    res.json({
      message: 'Número de cheque actualizado',
      cheque: {
        id: cheque._id,
        numeroCheque: cheque.numeroCheque,
        medioDePago: cheque.medioDePago,
        monto: cheque.entrada || cheque.salida
      }
    });

  } catch (error) {
    console.error('Error actualizando número de cheque:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
