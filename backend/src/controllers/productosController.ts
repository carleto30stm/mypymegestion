import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import Producto from '../models/Producto.js';

// @desc    Obtener todos los productos
// @route   GET /api/productos
// @access  Private
export const getProductos = async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const productos = await Producto.find().sort({ nombre: 1 });
        res.json(productos);
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// @desc    Obtener productos con stock bajo
// @route   GET /api/productos/stock-bajo
// @access  Private
export const getProductosStockBajo = async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const productos = await Producto.find({ 
            estado: 'activo',
            $expr: { $lte: ['$stock', '$stockMinimo'] }
        }).sort({ stock: 1 });
        res.json(productos);
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// @desc    Obtener un producto por ID
// @route   GET /api/productos/:id
// @access  Private
export const getProductoById = async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const producto = await Producto.findById(req.params.id);
        
        if (producto) {
            res.json(producto);
        } else {
            res.status(404).json({ message: 'Producto no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// @desc    Buscar producto por código
// @route   GET /api/productos/codigo/:codigo
// @access  Private
export const getProductoByCodigo = async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const producto = await Producto.findOne({ codigo: req.params.codigo });
        
        if (producto) {
            res.json(producto);
        } else {
            res.status(404).json({ message: 'Producto no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// @desc    Crear un nuevo producto
// @route   POST /api/productos
// @access  Private (admin/oper_ad)
export const createProducto = async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const nuevoProducto = new Producto(req.body);
        const productoGuardado = await nuevoProducto.save();
        res.status(201).json(productoGuardado);
    } catch (error: any) {
        if (error.code === 11000) {
            res.status(400).json({ message: 'El código del producto ya existe' });
        } else {
            res.status(400).json({ message: 'Datos inválidos', details: error.message });
        }
    }
};

// @desc    Actualizar un producto
// @route   PUT /api/productos/:id
// @access  Private (admin/oper_ad)
export const updateProducto = async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const producto = await Producto.findById(req.params.id);

        if (producto) {
            const productoActualizado = await Producto.findByIdAndUpdate(
                req.params.id, 
                req.body, 
                { new: true, runValidators: true }
            );
            res.json(productoActualizado);
        } else {
            res.status(404).json({ message: 'Producto no encontrado' });
        }
    } catch (error: any) {
        if (error.code === 11000) {
            res.status(400).json({ message: 'El código del producto ya existe' });
        } else {
            res.status(400).json({ message: 'Error al actualizar producto', details: error.message });
        }
    }
};

// @desc    Ajustar stock de un producto
// @route   PATCH /api/productos/:id/ajustar-stock
// @access  Private (admin/oper_ad)
export const ajustarStock = async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const { cantidad, tipo, motivo } = req.body;
        
        if (!cantidad || !tipo || !motivo) {
            return res.status(400).json({ 
                message: 'Cantidad, tipo y motivo son requeridos' 
            });
        }

        const producto = await Producto.findById(req.params.id);

        if (!producto) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        // Calcular nuevo stock
        let nuevoStock = producto.stock;
        if (tipo === 'entrada') {
            nuevoStock += cantidad;
        } else if (tipo === 'salida') {
            nuevoStock -= cantidad;
            if (nuevoStock < 0) {
                return res.status(400).json({ 
                    message: 'Stock insuficiente para realizar el ajuste' 
                });
            }
        } else {
            return res.status(400).json({ 
                message: 'Tipo de ajuste inválido. Use "entrada" o "salida"' 
            });
        }

        producto.stock = nuevoStock;
        const productoActualizado = await producto.save();

        res.json({
            message: `Stock ajustado correctamente (${tipo})`,
            producto: productoActualizado,
            ajuste: { cantidad, tipo, motivo, stockAnterior: producto.stock, stockNuevo: nuevoStock }
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Error al ajustar stock', details: error.message });
    }
};

// @desc    Eliminar un producto (soft delete)
// @route   DELETE /api/productos/:id
// @access  Private (admin)
export const deleteProducto = async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const producto = await Producto.findById(req.params.id);

        if (producto) {
            // Soft delete: cambiar estado a 'inactivo'
            producto.estado = 'inactivo';
            await producto.save();
            res.json({ message: 'Producto desactivado correctamente' });
        } else {
            res.status(404).json({ message: 'Producto no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// @desc    Reactivar un producto
// @route   PATCH /api/productos/:id/reactivar
// @access  Private (admin)
export const reactivarProducto = async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const producto = await Producto.findById(req.params.id);

        if (producto) {
            producto.estado = 'activo';
            await producto.save();
            res.json({ message: 'Producto reactivado correctamente', producto });
        } else {
            res.status(404).json({ message: 'Producto no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor' });
    }
};
