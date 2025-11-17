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

// @desc    Agregar nota a un cliente
// @route   POST /api/clientes/:id/notas
// @access  Private (admin/oper_ad)
export const agregarNota = async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const { texto, tipo, creadoPor } = req.body;
        const username = creadoPor || (req as any).user?.username || 'sistema';

        if (!texto || !tipo) {
            return res.status(400).json({ 
                message: 'Texto y tipo de nota son requeridos' 
            });
        }

        const cliente = await Cliente.findById(req.params.id);

        if (!cliente) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }

        // Agregar la nota al array
        if (!cliente.notas) {
            cliente.notas = [];
        }

        cliente.notas.push({
            texto,
            tipo,
            creadoPor: username,
            fechaCreacion: new Date()
        });

        const clienteActualizado = await cliente.save();

        res.status(201).json({
            message: 'Nota agregada correctamente',
            cliente: clienteActualizado,
            nota: cliente.notas[cliente.notas.length - 1]
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Error al agregar nota', details: error.message });
    }
};

// @desc    Obtener notas de un cliente
// @route   GET /api/clientes/:id/notas
// @access  Private
export const obtenerNotas = async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const cliente = await Cliente.findById(req.params.id);

        if (!cliente) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }

        // Ordenar notas por fecha descendente (más recientes primero)
        const notas = cliente.notas || [];
        const notasOrdenadas = [...notas].sort((a, b) => 
            new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime()
        );

        res.json({
            clienteId: cliente._id,
            nombreCliente: cliente.razonSocial || `${cliente.apellido || ''} ${cliente.nombre}`.trim(),
            notas: notasOrdenadas
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Error al obtener notas', details: error.message });
    }
};

// @desc    Eliminar nota de un cliente
// @route   DELETE /api/clientes/:id/notas/:notaId
// @access  Private (admin)
export const eliminarNota = async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const { id, notaId } = req.params;

        const cliente = await Cliente.findById(id);

        if (!cliente) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }

        if (!cliente.notas || cliente.notas.length === 0) {
            return res.status(404).json({ message: 'No hay notas para eliminar' });
        }

        // Filtrar la nota a eliminar
        const notasOriginales = cliente.notas.length;
        cliente.notas = cliente.notas.filter(
            (nota: any) => nota._id?.toString() !== notaId
        );

        if (cliente.notas.length === notasOriginales) {
            return res.status(404).json({ message: 'Nota no encontrada' });
        }

        const clienteActualizado = await cliente.save();

        res.json({
            message: 'Nota eliminada correctamente',
            cliente: clienteActualizado
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Error al eliminar nota', details: error.message });
    }
};
