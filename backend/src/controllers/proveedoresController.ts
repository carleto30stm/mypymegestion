import type { Request, Response } from 'express';
import Proveedor from '../models/Proveedor.js';

// Obtener todos los proveedores
export const getProveedores = async (req: Request, res: Response): Promise<void> => {
  try {
    const { estado, categoria } = req.query;
    
    // Construir filtros
    const filtros: any = {};
    if (estado) filtros.estado = estado;
    if (categoria) filtros.categorias = categoria;
    
    const proveedores = await Proveedor.find(filtros).sort({ razonSocial: 1 });
    res.json(proveedores);
  } catch (error) {
    console.error('Error al obtener proveedores:', error);
    res.status(500).json({ 
      message: 'Error al obtener proveedores',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Obtener un proveedor por ID
export const getProveedorById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const proveedor = await Proveedor.findById(id);
    
    if (!proveedor) {
      res.status(404).json({ message: 'Proveedor no encontrado' });
      return;
    }
    
    res.json(proveedor);
  } catch (error) {
    console.error('Error al obtener proveedor:', error);
    res.status(500).json({ 
      message: 'Error al obtener proveedor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Crear un proveedor
export const createProveedor = async (req: Request, res: Response): Promise<void> => {
  try {
    const nuevoProveedor = new Proveedor(req.body);
    const proveedorGuardado = await nuevoProveedor.save();
    res.status(201).json(proveedorGuardado);
  } catch (error: any) {
    console.error('Error al crear proveedor:', error);
    
    // Error de documento duplicado
    if (error.code === 11000) {
      res.status(400).json({ 
        message: 'Ya existe un proveedor con ese número de documento' 
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
      message: 'Error al crear proveedor',
      error: error.message 
    });
  }
};

// Actualizar un proveedor
export const updateProveedor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const proveedorActualizado = await Proveedor.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!proveedorActualizado) {
      res.status(404).json({ message: 'Proveedor no encontrado' });
      return;
    }
    
    res.json(proveedorActualizado);
  } catch (error: any) {
    console.error('Error al actualizar proveedor:', error);
    
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
      message: 'Error al actualizar proveedor',
      error: error.message 
    });
  }
};

// Eliminar un proveedor (soft delete - cambiar estado a inactivo)
export const deleteProveedor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Cambiar estado a inactivo en lugar de eliminar
    const proveedor = await Proveedor.findByIdAndUpdate(
      id,
      { estado: 'inactivo' },
      { new: true }
    );
    
    if (!proveedor) {
      res.status(404).json({ message: 'Proveedor no encontrado' });
      return;
    }
    
    res.json({ 
      message: 'Proveedor desactivado exitosamente',
      proveedor 
    });
  } catch (error) {
    console.error('Error al eliminar proveedor:', error);
    res.status(500).json({ 
      message: 'Error al eliminar proveedor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Actualizar saldo de cuenta del proveedor
export const updateSaldoCuenta = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { monto, operacion } = req.body; // operacion: 'suma' | 'resta' | 'set'
    
    const proveedor = await Proveedor.findById(id);
    if (!proveedor) {
      res.status(404).json({ message: 'Proveedor no encontrado' });
      return;
    }
    
    if (operacion === 'set') {
      proveedor.saldoCuenta = monto;
    } else if (operacion === 'suma') {
      proveedor.saldoCuenta += monto;
    } else if (operacion === 'resta') {
      proveedor.saldoCuenta -= monto;
    }
    
    await proveedor.save();
    res.json(proveedor);
  } catch (error) {
    console.error('Error al actualizar saldo:', error);
    res.status(500).json({ 
      message: 'Error al actualizar saldo',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Buscar proveedores
export const searchProveedores = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string') {
      res.status(400).json({ message: 'Parámetro de búsqueda requerido' });
      return;
    }
    
    const proveedores = await Proveedor.find({
      $or: [
        { razonSocial: { $regex: q, $options: 'i' } },
        { numeroDocumento: { $regex: q, $options: 'i' } },
        { nombreContacto: { $regex: q, $options: 'i' } }
      ],
      estado: 'activo'
    }).limit(10);
    
    res.json(proveedores);
  } catch (error) {
    console.error('Error al buscar proveedores:', error);
    res.status(500).json({ 
      message: 'Error al buscar proveedores',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Agregar nota a un proveedor
export const agregarNota = async (req: Request, res: Response): Promise<void> => {
  try {
    const { texto, tipo, creadoPor } = req.body;
    const username = creadoPor || (req as any).user?.username || 'sistema';

    if (!texto || !tipo) {
      res.status(400).json({ message: 'Texto y tipo de nota son requeridos' });
      return;
    }

    const proveedor = await Proveedor.findById(req.params.id);
    if (!proveedor) {
      res.status(404).json({ message: 'Proveedor no encontrado' });
      return;
    }

    if (!proveedor.notas) proveedor.notas = [];

    proveedor.notas.push({
      texto,
      tipo,
      creadoPor: username,
      fechaCreacion: new Date()
    } as any);

    const proveedorActualizado = await proveedor.save();

    res.status(201).json({ message: 'Nota agregada correctamente', proveedor: proveedorActualizado, nota: proveedor.notas[proveedor.notas.length - 1] });
  } catch (error: any) {
    console.error('Error al agregar nota a proveedor:', error);
    res.status(500).json({ message: 'Error al agregar nota', error: error.message });
  }
};

// Obtener notas de un proveedor
export const obtenerNotas = async (req: Request, res: Response): Promise<void> => {
  try {
    const proveedor = await Proveedor.findById(req.params.id);
    if (!proveedor) {
      res.status(404).json({ message: 'Proveedor no encontrado' });
      return;
    }

    const notas = proveedor.notas || [];
    const notasOrdenadas = [...notas].sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime());

    res.json({ proveedorId: proveedor._id, nombreProveedor: proveedor.razonSocial, notas: notasOrdenadas });
  } catch (error: any) {
    console.error('Error al obtener notas de proveedor:', error);
    res.status(500).json({ message: 'Error al obtener notas', error: error.message });
  }
};

// Eliminar nota de un proveedor
export const eliminarNota = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, notaId } = req.params;
    const proveedor = await Proveedor.findById(id);
    if (!proveedor) {
      res.status(404).json({ message: 'Proveedor no encontrado' });
      return;
    }

    if (!proveedor.notas || proveedor.notas.length === 0) {
      res.status(404).json({ message: 'No hay notas para eliminar' });
      return;
    }

    const originales = proveedor.notas.length;
    proveedor.notas = proveedor.notas.filter((nota: any) => nota._id?.toString() !== notaId);

    if (proveedor.notas.length === originales) {
      res.status(404).json({ message: 'Nota no encontrada' });
      return;
    }

    const proveedorActualizado = await proveedor.save();
    res.json({ message: 'Nota eliminada correctamente', proveedor: proveedorActualizado });
  } catch (error: any) {
    console.error('Error al eliminar nota de proveedor:', error);
    res.status(500).json({ message: 'Error al eliminar nota', error: error.message });
  }
};
