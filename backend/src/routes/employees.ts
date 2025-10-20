import express from 'express';
import Employee from '../models/Employee.js';

const router = express.Router();

// @desc    Obtener todos los empleados
// @route   GET /api/employees
// @access  Public
router.get('/', async (req, res) => {
  try {
    const employees = await Employee.find({})
      .sort({ apellido: 1, nombre: 1 });
    
    res.json(employees);
  } catch (error) {
    console.error('Error al obtener empleados:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// @desc    Obtener un empleado por ID
// @route   GET /api/employees/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }
    
    res.json(employee);
  } catch (error) {
    console.error('Error al obtener empleado:', error);
    if (error instanceof Error && error.name === 'CastError') {
      return res.status(400).json({ message: 'ID de empleado inválido' });
    }
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// @desc    Crear nuevo empleado
// @route   POST /api/employees
// @access  Public
router.post('/', async (req, res) => {
  try {
    const {
      nombre,
      apellido,
      documento,
      puesto,
      fechaIngreso,
      sueldoBase,
      estado,
      email,
      telefono,
      observaciones
    } = req.body;

    // Validación básica
    if (!nombre || !apellido || !documento || !puesto || !fechaIngreso || sueldoBase === undefined) {
      return res.status(400).json({ 
        message: 'Campos requeridos: nombre, apellido, documento, puesto, fechaIngreso, sueldoBase' 
      });
    }

    // Verificar si ya existe un empleado con el mismo documento
    const existingEmployee = await Employee.findOne({ documento });
    if (existingEmployee) {
      return res.status(400).json({ 
        message: 'Ya existe un empleado con este documento' 
      });
    }

    const employee = new Employee({
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      documento: documento.trim(),
      puesto: puesto.trim(),
      fechaIngreso,
      sueldoBase: Number(sueldoBase),
      estado: estado || 'activo',
      email: email?.trim(),
      telefono: telefono?.trim(),
      observaciones: observaciones?.trim()
    });

    const savedEmployee = await employee.save();
    res.status(201).json(savedEmployee);
  } catch (error) {
    console.error('Error al crear empleado:', error);
    
    // Manejar errores de validación de Mongoose
    if (error instanceof Error && error.name === 'ValidationError') {
      const validationErrors = Object.values((error as any).errors).map((err: any) => err.message);
      return res.status(400).json({ 
        message: 'Error de validación',
        errors: validationErrors
      });
    }
    
    // Manejar errores de duplicado
    if (error && typeof error === 'object' && 'code' in error && (error as any).code === 11000) {
      return res.status(400).json({ 
        message: 'Ya existe un empleado con este documento' 
      });
    }
    
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// @desc    Actualizar empleado
// @route   PUT /api/employees/:id
// @access  Public
router.put('/:id', async (req, res) => {
  try {
    const {
      nombre,
      apellido,
      documento,
      puesto,
      fechaIngreso,
      sueldoBase,
      estado,
      email,
      telefono,
      observaciones
    } = req.body;

    // Validación básica
    if (!nombre || !apellido || !documento || !puesto || !fechaIngreso || sueldoBase === undefined) {
      return res.status(400).json({ 
        message: 'Campos requeridos: nombre, apellido, documento, puesto, fechaIngreso, sueldoBase' 
      });
    }

    const employee = await Employee.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }

    // Verificar si el documento ya está en uso por otro empleado
    if (documento !== employee.documento) {
      const existingEmployee = await Employee.findOne({ 
        documento,
        _id: { $ne: req.params.id }
      });
      if (existingEmployee) {
        return res.status(400).json({ 
          message: 'Ya existe otro empleado con este documento' 
        });
      }
    }

    // Actualizar campos
    employee.nombre = nombre.trim();
    employee.apellido = apellido.trim();
    employee.documento = documento.trim();
    employee.puesto = puesto.trim();
    employee.fechaIngreso = fechaIngreso;
    employee.sueldoBase = Number(sueldoBase);
    employee.estado = estado || 'activo';
    employee.email = email?.trim();
    employee.telefono = telefono?.trim();
    employee.observaciones = observaciones?.trim();

    const updatedEmployee = await employee.save();
    res.json(updatedEmployee);
  } catch (error) {
    console.error('Error al actualizar empleado:', error);
    
    if (error instanceof Error && error.name === 'CastError') {
      return res.status(400).json({ message: 'ID de empleado inválido' });
    }
    
    if (error instanceof Error && error.name === 'ValidationError') {
      const validationErrors = Object.values((error as any).errors).map((err: any) => err.message);
      return res.status(400).json({ 
        message: 'Error de validación',
        errors: validationErrors
      });
    }
    
    if (error && typeof error === 'object' && 'code' in error && (error as any).code === 11000) {
      return res.status(400).json({ 
        message: 'Ya existe un empleado con este documento' 
      });
    }
    
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// @desc    Eliminar empleado
// @route   DELETE /api/employees/:id
// @access  Public
router.delete('/:id', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }

    await Employee.findByIdAndDelete(req.params.id);
    res.json({ 
      message: 'Empleado eliminado exitosamente',
      empleado: {
        nombre: employee.nombre,
        apellido: employee.apellido,
        documento: employee.documento
      }
    });
  } catch (error) {
    console.error('Error al eliminar empleado:', error);
    
    if (error instanceof Error && error.name === 'CastError') {
      return res.status(400).json({ message: 'ID de empleado inválido' });
    }
    
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// @desc    Obtener estadísticas de empleados
// @route   GET /api/employees/stats/summary
// @access  Public
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await Employee.aggregate([
      {
        $group: {
          _id: '$estado',
          count: { $sum: 1 },
          totalSueldos: { $sum: '$sueldoBase' }
        }
      }
    ]);

    const totalEmpleados = await Employee.countDocuments();
    const presupuestoTotal = await Employee.aggregate([
      { $group: { _id: null, total: { $sum: '$sueldoBase' } } }
    ]);

    res.json({
      totalEmpleados,
      presupuestoTotal: presupuestoTotal[0]?.total || 0,
      porEstado: stats
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

export default router;