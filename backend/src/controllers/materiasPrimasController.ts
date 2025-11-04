import type { Request, Response } from 'express';
import MateriaPrima from '../models/MateriaPrima.js';

// Obtener todas las materias primas
export const getMateriasPrimas = async (req: Request, res: Response): Promise<void> => {
  try {
    const { estado, categoria, stockBajo } = req.query;
    
    // Construir filtros
    const filtros: any = {};
    if (estado) filtros.estado = estado;
    if (categoria) filtros.categoria = categoria;
    
    let materiasPrimas = await MateriaPrima.find(filtros)
      .populate('proveedorPrincipal', 'razonSocial numeroDocumento')
      .populate('proveedoresAlternativos', 'razonSocial numeroDocumento')
      .sort({ nombre: 1 });
    
    // Filtrar por stock bajo si se solicita
    if (stockBajo === 'true') {
      materiasPrimas = materiasPrimas.filter(mp => mp.stock <= mp.stockMinimo);
    }
    
    res.json(materiasPrimas);
  } catch (error) {
    console.error('Error al obtener materias primas:', error);
    res.status(500).json({ 
      message: 'Error al obtener materias primas',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Obtener una materia prima por ID
export const getMateriaPrimaById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const materiaPrima = await MateriaPrima.findById(id)
      .populate('proveedorPrincipal')
      .populate('proveedoresAlternativos');
    
    if (!materiaPrima) {
      res.status(404).json({ message: 'Materia prima no encontrada' });
      return;
    }
    
    res.json(materiaPrima);
  } catch (error) {
    console.error('Error al obtener materia prima:', error);
    res.status(500).json({ 
      message: 'Error al obtener materia prima',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Crear una materia prima
export const createMateriaPrima = async (req: Request, res: Response): Promise<void> => {
  try {
    const nuevaMateriaPrima = new MateriaPrima(req.body);
    const materiaPrimaGuardada = await nuevaMateriaPrima.save();
    res.status(201).json(materiaPrimaGuardada);
  } catch (error: any) {
    console.error('Error al crear materia prima:', error);
    
    // Error de código duplicado
    if (error.code === 11000) {
      res.status(400).json({ 
        message: 'Ya existe una materia prima con ese código' 
      });
      return;
    }
    
    // Error de validación
    if (error.name === 'ValidationError') {
      const errores = Object.values(error.errors).map((err: any) => err.message);
      res.status(400).json({ 
        message: 'Error de validación',
        errores 
      });
      return;
    }
    
    res.status(500).json({ 
      message: 'Error al crear materia prima',
      error: error.message 
    });
  }
};

// Actualizar una materia prima
export const updateMateriaPrima = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const materiaPrimaActualizada = await MateriaPrima.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!materiaPrimaActualizada) {
      res.status(404).json({ message: 'Materia prima no encontrada' });
      return;
    }
    
    res.json(materiaPrimaActualizada);
  } catch (error: any) {
    console.error('Error al actualizar materia prima:', error);
    
    // Error de validación
    if (error.name === 'ValidationError') {
      const errores = Object.values(error.errors).map((err: any) => err.message);
      res.status(400).json({ 
        message: 'Error de validación',
        errores 
      });
      return;
    }
    
    res.status(500).json({ 
      message: 'Error al actualizar materia prima',
      error: error.message 
    });
  }
};

// Eliminar una materia prima (soft delete)
export const deleteMateriaPrima = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const materiaPrima = await MateriaPrima.findByIdAndUpdate(
      id,
      { estado: 'inactivo' },
      { new: true }
    );
    
    if (!materiaPrima) {
      res.status(404).json({ message: 'Materia prima no encontrada' });
      return;
    }
    
    res.json({ 
      message: 'Materia prima desactivada exitosamente',
      materiaPrima 
    });
  } catch (error) {
    console.error('Error al eliminar materia prima:', error);
    res.status(500).json({ 
      message: 'Error al eliminar materia prima',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Actualizar stock de materia prima
export const updateStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { cantidad, operacion, precio } = req.body; // operacion: 'entrada' | 'salida' | 'set'
    
    const materiaPrima = await MateriaPrima.findById(id);
    if (!materiaPrima) {
      res.status(404).json({ message: 'Materia prima no encontrada' });
      return;
    }
    
    const stockAnterior = materiaPrima.stock;
    
    if (operacion === 'set') {
      materiaPrima.stock = cantidad;
    } else if (operacion === 'entrada') {
      materiaPrima.stock += cantidad;
      
      // Actualizar precio promedio ponderado si se proporciona precio
      if (precio) {
        const valorAnterior = materiaPrima.precioPromedio * stockAnterior;
        const valorNuevo = precio * cantidad;
        const stockTotal = materiaPrima.stock;
        
        materiaPrima.precioPromedio = (valorAnterior + valorNuevo) / stockTotal;
        materiaPrima.precioUltimaCompra = precio;
        materiaPrima.ultimaCompra = new Date();
      }
    } else if (operacion === 'salida') {
      if (materiaPrima.stock < cantidad) {
        res.status(400).json({ 
          message: 'Stock insuficiente',
          stockActual: materiaPrima.stock,
          cantidadSolicitada: cantidad
        });
        return;
      }
      materiaPrima.stock -= cantidad;
    }
    
    await materiaPrima.save();
    res.json(materiaPrima);
  } catch (error) {
    console.error('Error al actualizar stock:', error);
    res.status(500).json({ 
      message: 'Error al actualizar stock',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Buscar materias primas
export const searchMateriasPrimas = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string') {
      res.status(400).json({ message: 'Parámetro de búsqueda requerido' });
      return;
    }
    
    const materiasPrimas = await MateriaPrima.find({
      $or: [
        { nombre: { $regex: q, $options: 'i' } },
        { codigo: { $regex: q, $options: 'i' } },
        { descripcion: { $regex: q, $options: 'i' } }
      ],
      estado: 'activo'
    })
    .populate('proveedorPrincipal', 'razonSocial')
    .limit(10);
    
    res.json(materiasPrimas);
  } catch (error) {
    console.error('Error al buscar materias primas:', error);
    res.status(500).json({ 
      message: 'Error al buscar materias primas',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Obtener alertas de stock bajo
export const getAlertasStockBajo = async (req: Request, res: Response): Promise<void> => {
  try {
    const materiasPrimas = await MateriaPrima.find({
      estado: 'activo',
      $expr: { $lte: ['$stock', '$stockMinimo'] }
    })
    .populate('proveedorPrincipal', 'razonSocial telefono email')
    .sort({ stock: 1 });
    
    res.json(materiasPrimas);
  } catch (error) {
    console.error('Error al obtener alertas:', error);
    res.status(500).json({ 
      message: 'Error al obtener alertas',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
