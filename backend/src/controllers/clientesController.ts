import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import Cliente from '../models/Cliente.js';
import Venta from '../models/Venta.js';

// @desc    Obtener todos los clientes
// @route   GET /api/clientes
// @access  Private
export const getClientes = async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const clientes = await Cliente.find().sort({ fechaCreacion: -1 });
        res.json(clientes);
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// @desc    Obtener clientes activos
// @route   GET /api/clientes/activos
// @access  Private
export const getClientesActivos = async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const clientes = await Cliente.find({ estado: 'activo' }).sort({ nombreCompleto: 1 });
        res.json(clientes);
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// @desc    Obtener un cliente por ID
// @route   GET /api/clientes/:id
// @access  Private
export const getClienteById = async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const cliente = await Cliente.findById(req.params.id);
        
        if (cliente) {
            res.json(cliente);
        } else {
            res.status(404).json({ message: 'Cliente no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// @desc    Buscar cliente por documento
// @route   GET /api/clientes/documento/:numeroDocumento
// @access  Private
export const getClienteByDocumento = async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const cliente = await Cliente.findOne({ numeroDocumento: req.params.numeroDocumento });
        
        if (cliente) {
            res.json(cliente);
        } else {
            res.status(404).json({ message: 'Cliente no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// @desc    Obtener historial de compras de un cliente
// @route   GET /api/clientes/:id/historial
// @access  Private
export const getHistorialCompras = async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const cliente = await Cliente.findById(req.params.id);
        
        if (!cliente) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }

        const ventas = await Venta.find({ 
            clienteId: req.params.id,
            estado: { $ne: 'anulada' }
        }).sort({ fecha: -1 });

        const nombreCompleto = cliente.razonSocial || `${cliente.apellido || ''} ${cliente.nombre}`.trim();

        res.json({
            cliente: {
                id: cliente._id,
                nombre: nombreCompleto,
                documento: cliente.numeroDocumento
            },
            ventas
        });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// @desc    Crear un nuevo cliente
// @route   POST /api/clientes
// @access  Private (admin/oper_ad)
export const createCliente = async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const nuevoCliente = new Cliente(req.body);
        const clienteGuardado = await nuevoCliente.save();
        res.status(201).json(clienteGuardado);
    } catch (error: any) {
        if (error.code === 11000) {
            res.status(400).json({ message: 'Ya existe un cliente con ese número de documento' });
        } else {
            res.status(400).json({ message: 'Datos inválidos', details: error.message });
        }
    }
};

// @desc    Actualizar un cliente
// @route   PUT /api/clientes/:id
// @access  Private (admin/oper_ad)
export const updateCliente = async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const cliente = await Cliente.findById(req.params.id);

        if (cliente) {
            const clienteActualizado = await Cliente.findByIdAndUpdate(
                req.params.id, 
                req.body, 
                { new: true, runValidators: true }
            );
            res.json(clienteActualizado);
        } else {
            res.status(404).json({ message: 'Cliente no encontrado' });
        }
    } catch (error: any) {
        if (error.code === 11000) {
            res.status(400).json({ message: 'Ya existe un cliente con ese número de documento' });
        } else {
            res.status(400).json({ message: 'Error al actualizar cliente', details: error.message });
        }
    }
};

// @desc    Actualizar saldo de cuenta corriente
// @route   PATCH /api/clientes/:id/saldo
// @access  Private (admin/oper_ad)
export const actualizarSaldo = async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const { monto, operacion, concepto } = req.body;
        
        if (!monto || !operacion || !concepto) {
            return res.status(400).json({ 
                message: 'Monto, operación y concepto son requeridos' 
            });
        }

        const cliente = await Cliente.findById(req.params.id);

        if (!cliente) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }

        const saldoAnterior = cliente.saldoCuenta;
        
        // Operación: 'cargo' incrementa deuda (positivo), 'pago' reduce deuda (negativo)
        if (operacion === 'cargo') {
            cliente.saldoCuenta += monto;
        } else if (operacion === 'pago') {
            cliente.saldoCuenta -= monto;
        } else {
            return res.status(400).json({ 
                message: 'Operación inválida. Use "cargo" o "pago"' 
            });
        }

        // Actualizar estado según nuevo saldo y límite de crédito
        if (cliente.saldoCuenta > cliente.limiteCredito) {
            cliente.estado = 'moroso';
        } else if (cliente.estado === 'moroso' && cliente.saldoCuenta <= cliente.limiteCredito) {
            cliente.estado = 'activo';
        }

        const clienteActualizado = await cliente.save();

        res.json({
            message: `Saldo actualizado correctamente (${operacion})`,
            cliente: clienteActualizado,
            movimiento: { 
                monto, 
                operacion, 
                concepto, 
                saldoAnterior, 
                saldoNuevo: cliente.saldoCuenta 
            }
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Error al actualizar saldo', details: error.message });
    }
};

// @desc    Eliminar un cliente (soft delete)
// @route   DELETE /api/clientes/:id
// @access  Private (admin)
export const deleteCliente = async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const cliente = await Cliente.findById(req.params.id);

        if (cliente) {
            // Verificar si tiene saldo pendiente
            if (cliente.saldoCuenta > 0) {
                return res.status(400).json({ 
                    message: 'No se puede eliminar un cliente con saldo pendiente' 
                });
            }

            // Soft delete: cambiar estado a 'inactivo'
            cliente.estado = 'inactivo';
            await cliente.save();
            res.json({ message: 'Cliente desactivado correctamente' });
        } else {
            res.status(404).json({ message: 'Cliente no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// @desc    Reactivar un cliente
// @route   PATCH /api/clientes/:id/reactivar
// @access  Private (admin)
export const reactivarCliente = async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const cliente = await Cliente.findById(req.params.id);

        if (cliente) {
            cliente.estado = 'activo';
            await cliente.save();
            res.json({ message: 'Cliente reactivado correctamente', cliente });
        } else {
            res.status(404).json({ message: 'Cliente no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor' });
    }
};
