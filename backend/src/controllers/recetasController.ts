import type { Request, Response } from 'express';
import Receta from '../models/Receta.js';
import MateriaPrima from '../models/MateriaPrima.js';
import Producto from '../models/Producto.js';
import mongoose from 'mongoose';

// Obtener todas las recetas con filtros
export const getRecetas = async (req: Request, res: Response) => {
  try {
    const { estado, productoId } = req.query;
    
    const filtro: any = {};
    if (estado) filtro.estado = estado;
    if (productoId) filtro.productoId = productoId;

    const recetas = await Receta.find(filtro)
      .populate('productoId', 'codigo nombre precioVenta')
      .sort({ fechaCreacion: -1 });

    res.json(recetas);
  } catch (error: any) {
    console.error('Error al obtener recetas:', error);
    res.status(500).json({ 
      mensaje: 'Error al obtener recetas', 
      error: error.message 
    });
  }
};

// Obtener receta por ID
export const getRecetaById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const receta = await Receta.findById(id)
      .populate('productoId', 'codigo nombre precioVenta');

    if (!receta) {
      return res.status(404).json({ mensaje: 'Receta no encontrada' });
    }

    res.json(receta);
  } catch (error: any) {
    console.error('Error al obtener receta:', error);
    res.status(500).json({ 
      mensaje: 'Error al obtener receta', 
      error: error.message 
    });
  }
};

// Obtener recetas por producto
export const getRecetasByProducto = async (req: Request, res: Response) => {
  try {
    const { productoId } = req.params;

    const recetas = await Receta.find({ productoId })
      .sort({ version: -1 });

    res.json(recetas);
  } catch (error: any) {
    console.error('Error al obtener recetas del producto:', error);
    res.status(500).json({ 
      mensaje: 'Error al obtener recetas del producto', 
      error: error.message 
    });
  }
};

// Crear nueva receta
export const crearReceta = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { 
      productoId, 
      materiasPrimas, 
      rendimiento,
      tiempoPreparacion,
      costoManoObra,
      costoIndirecto,
      precioVentaSugerido,
      estado,
      observaciones,
      createdBy
    } = req.body;

    // Validar que el producto existe
    const producto = await Producto.findById(productoId).session(session);
    if (!producto) {
      await session.abortTransaction();
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }

    // Obtener costos actuales de materias primas
    const materiasConCosto = await Promise.all(
      materiasPrimas.map(async (item: any) => {
        const mp = await MateriaPrima.findById(item.materiaPrimaId).session(session);
        if (!mp) {
          throw new Error(`Materia prima no encontrada: ${item.materiaPrimaId}`);
        }
        return {
          ...item,
          codigoMateriaPrima: mp.codigo,
          nombreMateriaPrima: mp.nombre,
          unidadMedida: mp.unidadMedida,
          costo: mp.precioPromedio || mp.precioUltimaCompra || 0
        };
      })
    );

    // Verificar si ya existe una receta activa para este producto
    const recetaExistente = await Receta.findOne({ 
      productoId, 
      estado: 'activa' 
    }).session(session);

    let version = 1;
    if (recetaExistente) {
      version = recetaExistente.version + 1;
      // Desactivar la receta anterior si la nueva será activa
      if (estado === 'activa') {
        recetaExistente.estado = 'inactiva';
        await recetaExistente.save({ session });
      }
    }

    const nuevaReceta = new Receta({
      productoId,
      codigoProducto: producto.codigo,
      nombreProducto: producto.nombre,
      materiasPrimas: materiasConCosto,
      rendimiento: rendimiento || 1,
      tiempoPreparacion: tiempoPreparacion || 0,
      costoManoObra: costoManoObra || 0,
      costoIndirecto: costoIndirecto || 0,
      precioVentaSugerido,
      estado: estado || 'borrador',
      version,
      observaciones,
      createdBy
    });

    await nuevaReceta.save({ session });
    await session.commitTransaction();

    const recetaPopulada = await Receta.findById(nuevaReceta._id)
      .populate('productoId', 'codigo nombre precioVenta');

    res.status(201).json(recetaPopulada);
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error al crear receta:', error);
    res.status(500).json({ 
      mensaje: 'Error al crear receta', 
      error: error.message 
    });
  } finally {
    session.endSession();
  }
};

// Actualizar receta
export const actualizarReceta = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const actualizaciones = req.body;

    const receta = await Receta.findById(id).session(session);
    if (!receta) {
      await session.abortTransaction();
      return res.status(404).json({ mensaje: 'Receta no encontrada' });
    }

    // Si se actualizan las materias primas, obtener costos actuales
    if (actualizaciones.materiasPrimas) {
      actualizaciones.materiasPrimas = await Promise.all(
        actualizaciones.materiasPrimas.map(async (item: any) => {
          const mp = await MateriaPrima.findById(item.materiaPrimaId).session(session);
          if (!mp) {
            throw new Error(`Materia prima no encontrada: ${item.materiaPrimaId}`);
          }
          return {
            ...item,
            codigoMateriaPrima: mp.codigo,
            nombreMateriaPrima: mp.nombre,
            unidadMedida: mp.unidadMedida,
            costo: mp.precioPromedio || mp.precioUltimaCompra || 0
          };
        })
      );
    }

    // Si se activa esta receta, desactivar otras del mismo producto
    if (actualizaciones.estado === 'activa' && receta.estado !== 'activa') {
      await Receta.updateMany(
        { 
          productoId: receta.productoId, 
          _id: { $ne: id },
          estado: 'activa'
        },
        { estado: 'inactiva' }
      ).session(session);
    }

    Object.assign(receta, actualizaciones);
    await receta.save({ session });
    await session.commitTransaction();

    const recetaActualizada = await Receta.findById(id)
      .populate('productoId', 'codigo nombre precioVenta');

    res.json(recetaActualizada);
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error al actualizar receta:', error);
    res.status(500).json({ 
      mensaje: 'Error al actualizar receta', 
      error: error.message 
    });
  } finally {
    session.endSession();
  }
};

// Eliminar receta
export const eliminarReceta = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const receta = await Receta.findById(id);
    if (!receta) {
      return res.status(404).json({ mensaje: 'Receta no encontrada' });
    }

    // Verificar que no sea una receta activa
    if (receta.estado === 'activa') {
      return res.status(400).json({ 
        mensaje: 'No se puede eliminar una receta activa. Desactívela primero.' 
      });
    }

    await Receta.findByIdAndDelete(id);
    res.json({ mensaje: 'Receta eliminada exitosamente' });
  } catch (error: any) {
    console.error('Error al eliminar receta:', error);
    res.status(500).json({ 
      mensaje: 'Error al eliminar receta', 
      error: error.message 
    });
  }
};

// Calcular costo actual de producción
export const calcularCostoActual = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const receta = await Receta.findById(id);
    if (!receta) {
      return res.status(404).json({ mensaje: 'Receta no encontrada' });
    }

    // Obtener costos actuales de materias primas
    let costoMateriasPrimasActual = 0;
    const detallesMateriasPrimas = await Promise.all(
      receta.materiasPrimas.map(async (item) => {
        const mp = await MateriaPrima.findById(item.materiaPrimaId);
        const costoActual = mp ? (mp.precioPromedio || mp.precioUltimaCompra || 0) : 0;
        const costoItem = costoActual * item.cantidad;
        costoMateriasPrimasActual += costoItem;
        
        return {
          materiaPrimaId: item.materiaPrimaId,
          codigo: item.codigoMateriaPrima,
          nombre: item.nombreMateriaPrima,
          cantidad: item.cantidad,
          costoRegistrado: item.costo || 0,
          costoActual: costoActual,
          diferencia: costoActual - (item.costo || 0),
          subtotal: costoItem
        };
      })
    );

    const costoTotalActual = costoMateriasPrimasActual + 
                             (receta.costoManoObra || 0) + 
                             (receta.costoIndirecto || 0);
    
    const costoUnitarioActual = costoTotalActual / receta.rendimiento;

    let margenActual = 0;
    if (receta.precioVentaSugerido && receta.precioVentaSugerido > 0) {
      margenActual = ((receta.precioVentaSugerido - costoUnitarioActual) / receta.precioVentaSugerido) * 100;
    }

    res.json({
      recetaId: receta._id,
      version: receta.version,
      costoRegistrado: {
        materiasPrimas: receta.costoMateriasPrimas,
        manoObra: receta.costoManoObra,
        indirecto: receta.costoIndirecto,
        total: receta.costoTotal,
        unitario: receta.costoTotal / receta.rendimiento
      },
      costoActual: {
        materiasPrimas: costoMateriasPrimasActual,
        manoObra: receta.costoManoObra,
        indirecto: receta.costoIndirecto,
        total: costoTotalActual,
        unitario: costoUnitarioActual
      },
      diferencia: {
        materiasPrimas: costoMateriasPrimasActual - receta.costoMateriasPrimas,
        total: costoTotalActual - receta.costoTotal,
        unitario: costoUnitarioActual - (receta.costoTotal / receta.rendimiento)
      },
      detallesMateriasPrimas,
      margen: {
        registrado: receta.margenBruto,
        actual: margenActual,
        diferencia: margenActual - (receta.margenBruto || 0)
      },
      precioVenta: receta.precioVentaSugerido,
      necesitaActualizacion: Math.abs(costoTotalActual - receta.costoTotal) > 0.01
    });
  } catch (error: any) {
    console.error('Error al calcular costo actual:', error);
    res.status(500).json({ 
      mensaje: 'Error al calcular costo actual', 
      error: error.message 
    });
  }
};

// Simular producción
export const simularProduccion = async (req: Request, res: Response) => {
  try {
    const { recetaId, cantidadAProducir } = req.body;

    if (!cantidadAProducir || cantidadAProducir <= 0) {
      return res.status(400).json({ mensaje: 'La cantidad a producir debe ser mayor a 0' });
    }

    const receta = await Receta.findById(recetaId)
      .populate('productoId', 'codigo nombre precioVenta');
      
    if (!receta) {
      return res.status(404).json({ mensaje: 'Receta no encontrada' });
    }

    // Verificar disponibilidad de materias primas
    const materiasNecesarias = await Promise.all(
      receta.materiasPrimas.map(async (item) => {
        const mp = await MateriaPrima.findById(item.materiaPrimaId);
        const cantidadNecesaria = item.cantidad * cantidadAProducir;
        const disponible = mp ? mp.stock >= cantidadNecesaria : false;
        
        return {
          materiaPrimaId: item.materiaPrimaId,
          codigo: item.codigoMateriaPrima,
          nombre: item.nombreMateriaPrima,
          cantidadNecesaria,
          stockDisponible: mp?.stock || 0,
          disponible,
          faltante: disponible ? 0 : cantidadNecesaria - (mp?.stock || 0),
          costo: (mp?.precioPromedio || mp?.precioUltimaCompra || 0) * cantidadNecesaria
        };
      })
    );

    const todasDisponibles = materiasNecesarias.every(m => m.disponible);
    const costoTotalMateriasPrimas = materiasNecesarias.reduce((sum, m) => sum + m.costo, 0);
    const costoTotalProduccion = costoTotalMateriasPrimas + 
                                 ((receta.costoManoObra || 0) * cantidadAProducir) + 
                                 ((receta.costoIndirecto || 0) * cantidadAProducir);
    
    const unidadesProducidas = cantidadAProducir * receta.rendimiento;
    const costoUnitario = costoTotalProduccion / unidadesProducidas;

    res.json({
      receta: {
        id: receta._id,
        producto: receta.nombreProducto,
        version: receta.version
      },
      cantidadSolicitada: cantidadAProducir,
      unidadesProducidas,
      factible: todasDisponibles,
      materiasPrimas: materiasNecesarias,
      costos: {
        materiasPrimas: costoTotalMateriasPrimas,
        manoObra: (receta.costoManoObra || 0) * cantidadAProducir,
        indirecto: (receta.costoIndirecto || 0) * cantidadAProducir,
        total: costoTotalProduccion,
        unitario: costoUnitario
      },
      tiempoEstimado: receta.tiempoPreparacion * cantidadAProducir,
      alertas: todasDisponibles ? [] : ['Materias primas insuficientes']
    });
  } catch (error: any) {
    console.error('Error al simular producción:', error);
    res.status(500).json({ 
      mensaje: 'Error al simular producción', 
      error: error.message 
    });
  }
};

// Obtener estadísticas de recetas
export const obtenerEstadisticas = async (req: Request, res: Response) => {
  try {
    const totalRecetas = await Receta.countDocuments();
    const recetasActivas = await Receta.countDocuments({ estado: 'activa' });
    const recetasBorrador = await Receta.countDocuments({ estado: 'borrador' });
    
    const recetasMasRentables = await Receta.find({ 
      estado: 'activa',
      margenBruto: { $exists: true }
    })
    .sort({ margenBruto: -1 })
    .limit(5)
    .populate('productoId', 'codigo nombre precioVenta');

    const recetasMasCostosas = await Receta.find({ estado: 'activa' })
      .sort({ costoTotal: -1 })
      .limit(5)
      .populate('productoId', 'codigo nombre precioVenta');

    res.json({
      totalRecetas,
      recetasActivas,
      recetasBorrador,
      recetasInactivas: totalRecetas - recetasActivas - recetasBorrador,
      recetasMasRentables,
      recetasMasCostosas
    });
  } catch (error: any) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ 
      mensaje: 'Error al obtener estadísticas', 
      error: error.message 
    });
  }
};
