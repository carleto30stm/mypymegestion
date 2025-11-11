import type { Request, Response } from 'express';
import LiquidacionPeriodo from '../models/LiquidacionPeriodo.js';
import type { ILiquidacionEmpleado } from '../models/LiquidacionPeriodo.js';
import Employee from '../models/Employee.js';
import HoraExtra from '../models/HoraExtra.js';
import Gasto from '../models/Gasto.js';

// Obtener todos los períodos de liquidación
export const getPeriodos = async (req: Request, res: Response) => {
  try {
    const periodos = await LiquidacionPeriodo.find()
      .sort({ fechaInicio: -1 })
      .limit(50);
    res.json(periodos);
  } catch (error) {
    console.error('Error al obtener períodos:', error);
    res.status(500).json({ message: 'Error al obtener períodos de liquidación' });
  }
};

// Obtener un período específico por ID
export const getPeriodoById = async (req: Request, res: Response) => {
  try {
    const periodo = await LiquidacionPeriodo.findById(req.params.id);
    if (!periodo) {
      return res.status(404).json({ message: 'Período no encontrado' });
    }
    res.json(periodo);
  } catch (error) {
    console.error('Error al obtener período:', error);
    res.status(500).json({ message: 'Error al obtener período' });
  }
};

// Crear nuevo período de liquidación
export const createPeriodo = async (req: Request, res: Response) => {
  try {
    const { nombre, fechaInicio, fechaFin, tipo } = req.body;

    // Validar que no exista un período abierto en las mismas fechas
    const periodoExistente = await LiquidacionPeriodo.findOne({
      estado: { $in: ['abierto', 'en_revision'] },
      $or: [
        { fechaInicio: { $lte: fechaFin }, fechaFin: { $gte: fechaInicio } }
      ]
    });

    if (periodoExistente) {
      return res.status(400).json({ 
        message: 'Ya existe un período abierto que se solapa con estas fechas' 
      });
    }

    // Obtener todos los empleados activos
    const empleados = await Employee.find({ estado: 'activo' });

    // Crear liquidaciones iniciales para cada empleado
    const liquidaciones: ILiquidacionEmpleado[] = empleados.map((emp: any) => ({
      empleadoId: emp._id,
      empleadoNombre: emp.nombre,
      empleadoApellido: emp.apellido,
      sueldoBase: emp.sueldoBase,
      horasExtra: [],
      totalHorasExtra: 0,
      adelantos: 0,
      aguinaldos: 0,
      bonus: 0,
      descuentos: 0,
      totalAPagar: emp.sueldoBase,
      estado: 'pendiente' as const,
      gastosRelacionados: []
    }));

    const nuevoPeriodo = new LiquidacionPeriodo({
      nombre,
      fechaInicio,
      fechaFin,
      tipo,
      estado: 'abierto',
      liquidaciones
    });

    await nuevoPeriodo.save();
    res.status(201).json(nuevoPeriodo);
  } catch (error) {
    console.error('Error al crear período:', error);
    res.status(500).json({ message: 'Error al crear período de liquidación' });
  }
};

// Agregar horas extra a una liquidación de empleado
export const agregarHorasExtra = async (req: Request, res: Response) => {
  try {
    const { periodoId, empleadoId, horaExtraId } = req.body;

    const periodo = await LiquidacionPeriodo.findById(periodoId);
    if (!periodo) {
      return res.status(404).json({ message: 'Período no encontrado' });
    }

    if (periodo.estado === 'cerrado') {
      return res.status(400).json({ message: 'No se puede modificar un período cerrado' });
    }

    // Buscar la hora extra
    const horaExtra = await HoraExtra.findById(horaExtraId);
    if (!horaExtra) {
      return res.status(404).json({ message: 'Hora extra no encontrada' });
    }

    // Buscar la liquidación del empleado
    const liquidacionIndex = periodo.liquidaciones.findIndex(
      (liq: any) => liq.empleadoId.toString() === empleadoId
    );

    if (liquidacionIndex === -1) {
      return res.status(404).json({ message: 'Empleado no encontrado en este período' });
    }

    const liquidacion = periodo.liquidaciones[liquidacionIndex];
    if (!liquidacion) {
      return res.status(404).json({ message: 'Liquidación no encontrada' });
    }

    // Verificar si ya fue agregada
    const yaAgregada = liquidacion.horasExtra.some(
      he => he.horaExtraId === (horaExtra._id as any).toString()
    );
    
    if (yaAgregada) {
      return res.status(400).json({ message: 'Esta hora extra ya fue agregada a la liquidación' });
    }

    // Crear gasto de hora extra inmediatamente para que aparezca en nómina
    const gastoHoraExtra = new Gasto({
      fecha: new Date(),
      rubro: 'SUELDOS',
      subRubro: `${liquidacion.empleadoApellido}, ${liquidacion.empleadoNombre}`,
      medioDePago: 'EFECTIVO', // Valor por defecto, se puede cambiar al liquidar
      clientes: `${liquidacion.empleadoApellido}, ${liquidacion.empleadoNombre}`,
      detalleGastos: `Hora extra - ${horaExtra.cantidadHoras} horas - ${periodo.nombre}`,
      tipoOperacion: 'salida',
      concepto: 'hora_extra',
      comentario: `Hora extra agregada a liquidación: ${horaExtra.descripcion || 'Sin descripción'}`,
      salida: horaExtra.montoTotal,
      entrada: 0,
      banco: 'EFECTIVO',
      estado: 'activo',
      confirmado: false, // Se confirmará al liquidar
      fechaStandBy: periodo.fechaFin // Se hace efectivo al fin del período
    });

    await gastoHoraExtra.save();

    // Agregar hora extra al resumen
    const horaExtraResumen = {
      horaExtraId: (horaExtra._id as any).toString(),
      fecha: horaExtra.fecha,
      cantidadHoras: horaExtra.cantidadHoras,
      valorHora: horaExtra.valorHora,
      montoTotal: horaExtra.montoTotal,
      descripcion: horaExtra.descripcion || ''
    };

    liquidacion.horasExtra.push(horaExtraResumen);
    liquidacion.totalHorasExtra += horaExtra.montoTotal;
    liquidacion.gastosRelacionados.push(gastoHoraExtra._id as any);
    liquidacion.totalAPagar = 
      liquidacion.sueldoBase +
      liquidacion.totalHorasExtra +
      liquidacion.aguinaldos +
      liquidacion.bonus -
      liquidacion.adelantos -
      liquidacion.descuentos;

    await periodo.save();
    res.json({ periodo, gastoCreado: gastoHoraExtra });
  } catch (error) {
    console.error('Error al agregar horas extra:', error);
    res.status(500).json({ message: 'Error al agregar horas extra' });
  }
};

// Registrar adelanto
export const registrarAdelanto = async (req: Request, res: Response) => {
  try {
    const { periodoId, empleadoId, monto, banco, observaciones } = req.body;

    const periodo = await LiquidacionPeriodo.findById(periodoId);
    if (!periodo) {
      return res.status(404).json({ message: 'Período no encontrado' });
    }

    if (periodo.estado === 'cerrado') {
      return res.status(400).json({ message: 'No se puede modificar un período cerrado' });
    }

    const liquidacionIndex = periodo.liquidaciones.findIndex(
      (liq: any) => liq.empleadoId.toString() === empleadoId
    );

    if (liquidacionIndex === -1) {
      return res.status(404).json({ message: 'Empleado no encontrado en este período' });
    }

    const liquidacion = periodo.liquidaciones[liquidacionIndex];
    if (!liquidacion) {
      return res.status(404).json({ message: 'Liquidación no encontrada' });
    }

    // Validar banco
    const bancoFinal = banco || 'EFECTIVO';

    // Crear gasto de adelanto inmediatamente para que aparezca en nómina
    const gastoAdelanto = new Gasto({
      fecha: new Date(),
      rubro: 'SUELDOS',
      subRubro: `${liquidacion.empleadoApellido}, ${liquidacion.empleadoNombre}`,
      medioDePago: 'EFECTIVO', // Siempre efectivo ya que es un adelanto
      clientes: `${liquidacion.empleadoApellido}, ${liquidacion.empleadoNombre}`,
      detalleGastos: `Adelanto de sueldo - ${periodo.nombre}`,
      tipoOperacion: 'salida',
      concepto: 'adelanto',
      comentario: observaciones || `Adelanto registrado en período: ${periodo.nombre}`,
      salida: monto,
      entrada: 0,
      banco: bancoFinal, // Caja/banco de donde sale el adelanto
      estado: 'activo',
      confirmado: true // Los adelantos son efectivos inmediatamente
    });

    await gastoAdelanto.save();

    // Actualizar adelantos
    liquidacion.adelantos += monto;
    liquidacion.gastosRelacionados.push(gastoAdelanto._id as any);
    liquidacion.totalAPagar = 
      liquidacion.sueldoBase +
      liquidacion.totalHorasExtra +
      liquidacion.aguinaldos +
      liquidacion.bonus -
      liquidacion.adelantos -
      liquidacion.descuentos;

    if (observaciones) {
      liquidacion.observaciones = 
        (liquidacion.observaciones || '') + '\n' + observaciones;
    }

    await periodo.save();
    res.json({ periodo, gastoCreado: gastoAdelanto });
  } catch (error) {
    console.error('Error al registrar adelanto:', error);
    res.status(500).json({ message: 'Error al registrar adelanto' });
  }
};

// Liquidar (pagar) a un empleado
export const liquidarEmpleado = async (req: Request, res: Response) => {
  try {
    const { periodoId, empleadoId, observaciones, medioDePago, banco } = req.body;

    const periodo = await LiquidacionPeriodo.findById(periodoId);
    if (!periodo) {
      return res.status(404).json({ message: 'Período no encontrado' });
    }

    if (periodo.estado === 'cerrado') {
      return res.status(400).json({ message: 'No se puede modificar un período cerrado' });
    }

    const liquidacionIndex = periodo.liquidaciones.findIndex(
      (liq: any) => liq.empleadoId.toString() === empleadoId
    );

    if (liquidacionIndex === -1) {
      return res.status(404).json({ message: 'Empleado no encontrado en este período' });
    }

    const liquidacion = periodo.liquidaciones[liquidacionIndex];
    if (!liquidacion) {
      return res.status(404).json({ message: 'Liquidación no encontrada' });
    }

    // Validar campos obligatorios
    const medioFinal = medioDePago || 'EFECTIVO';
    const bancoFinal = banco || 'EFECTIVO';

    // Calcular el monto del sueldo base según el tipo de período
    const sueldoBasePeriodo = periodo.tipo === 'quincenal' ? liquidacion.sueldoBase / 2 : liquidacion.sueldoBase;
    const montoSueldoBase = sueldoBasePeriodo - liquidacion.adelantos;
    
    const gastosSueldoCreados = [];
    
    // Solo crear gasto de sueldo base si hay monto pendiente
    if (montoSueldoBase > 0) {
      const gastoSueldo = new Gasto({
        rubro: 'SUELDOS',
        subRubro: `${liquidacion.empleadoApellido}, ${liquidacion.empleadoNombre}`,
        concepto: 'sueldo',
        medioDePago: medioFinal,
        banco: bancoFinal,
        tipoOperacion: 'salida',
        clientes: `${liquidacion.empleadoApellido}, ${liquidacion.empleadoNombre}`,
        detalleGastos: `Liquidación sueldo base - ${periodo.nombre}`,
        comentario: observaciones || `Liquidación período: ${periodo.nombre}`,
        salida: montoSueldoBase,
        entrada: 0,
        fecha: new Date(),
        estado: 'activo',
        confirmado: true
      });
      
      await gastoSueldo.save();
      gastosSueldoCreados.push(gastoSueldo);
      liquidacion.gastosRelacionados.push(gastoSueldo._id as any);
    }

    // Confirmar todos los gastos relacionados (horas extra que estaban en standby)
    for (const gastoId of liquidacion.gastosRelacionados) {
      const gasto = await Gasto.findById(gastoId);
      if (gasto && !gasto.confirmado) {
        gasto.confirmado = true;
        gasto.medioDePago = medioFinal; // Actualizar con el medio de pago real
        gasto.banco = bancoFinal; // Actualizar con el banco real
        gasto.fechaStandBy = null; // Quitar standby - ahora impacta en flujo de caja
        gasto.fecha = new Date(); // Actualizar fecha al momento de liquidación
        await gasto.save();
      }
    }

    // Actualizar liquidación
    liquidacion.estado = 'pagado';
    liquidacion.fechaPago = new Date();
    liquidacion.medioDePago = medioFinal;
    liquidacion.banco = bancoFinal;
    if (observaciones) {
      liquidacion.observaciones = observaciones;
    }

    await periodo.save();
    res.json({ periodo, gastosCreados: gastosSueldoCreados });
  } catch (error) {
    console.error('Error al liquidar empleado:', error);
    res.status(500).json({ message: 'Error al liquidar empleado' });
  }
};

// Cerrar período
export const cerrarPeriodo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { cerradoPor, observaciones } = req.body;

    const periodo = await LiquidacionPeriodo.findById(id);
    if (!periodo) {
      return res.status(404).json({ message: 'Período no encontrado' });
    }

    if (periodo.estado === 'cerrado') {
      return res.status(400).json({ message: 'El período ya está cerrado' });
    }

    // Verificar que todos estén pagados o cancelados
    const pendientes = periodo.liquidaciones.filter((liq: any) => liq.estado === 'pendiente');
    if (pendientes.length > 0) {
      return res.status(400).json({ 
        message: `Hay ${pendientes.length} empleados con liquidación pendiente` 
      });
    }

    periodo.estado = 'cerrado';
    periodo.fechaCierre = new Date();
    periodo.cerradoPor = cerradoPor;
    if (observaciones) {
      periodo.observaciones = observaciones;
    }

    await periodo.save();
    res.json(periodo);
  } catch (error) {
    console.error('Error al cerrar período:', error);
    res.status(500).json({ message: 'Error al cerrar período' });
  }
};

// Actualizar estado de período (abierto -> en_revision)
export const actualizarEstadoPeriodo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const periodo = await LiquidacionPeriodo.findById(id);
    if (!periodo) {
      return res.status(404).json({ message: 'Período no encontrado' });
    }

    if (periodo.estado === 'cerrado') {
      return res.status(400).json({ message: 'No se puede modificar un período cerrado' });
    }

    periodo.estado = estado;
    await periodo.save();
    res.json(periodo);
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    res.status(500).json({ message: 'Error al actualizar estado del período' });
  }
};

// Agregar empleado a un período existente
export const agregarEmpleado = async (req: Request, res: Response) => {
  try {
    const { periodoId, empleadoId } = req.body;

    const periodo = await LiquidacionPeriodo.findById(periodoId);
    if (!periodo) {
      return res.status(404).json({ message: 'Período no encontrado' });
    }

    if (periodo.estado === 'cerrado') {
      return res.status(400).json({ message: 'No se puede modificar un período cerrado' });
    }

    // Verificar si el empleado ya existe en el período
    const yaExiste = periodo.liquidaciones.some(
      (liq: any) => liq.empleadoId.toString() === empleadoId
    );

    if (yaExiste) {
      return res.status(400).json({ message: 'El empleado ya está en este período' });
    }

    // Buscar los datos del empleado
    const empleado = await Employee.findById(empleadoId);
    if (!empleado) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }

    if (empleado.estado !== 'activo') {
      return res.status(400).json({ message: 'Solo se pueden agregar empleados activos' });
    }

    // Crear la liquidación para el nuevo empleado
    const nuevaLiquidacion: ILiquidacionEmpleado = {
      empleadoId: empleado._id as any,
      empleadoNombre: empleado.nombre,
      empleadoApellido: empleado.apellido,
      sueldoBase: empleado.sueldoBase,
      horasExtra: [],
      totalHorasExtra: 0,
      adelantos: 0,
      aguinaldos: 0,
      bonus: 0,
      descuentos: 0,
      totalAPagar: empleado.sueldoBase,
      estado: 'pendiente' as const,
      gastosRelacionados: []
    };

    periodo.liquidaciones.push(nuevaLiquidacion as any);
    await periodo.save();

    res.json({ periodo, mensaje: 'Empleado agregado correctamente al período' });
  } catch (error) {
    console.error('Error al agregar empleado:', error);
    res.status(500).json({ message: 'Error al agregar empleado' });
  }
};

// Eliminar período (solo si está abierto y sin pagos realizados)
export const deletePeriodo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const periodo = await LiquidacionPeriodo.findById(id);
    if (!periodo) {
      return res.status(404).json({ message: 'Período no encontrado' });
    }

    if (periodo.estado === 'cerrado') {
      return res.status(400).json({ message: 'No se puede eliminar un período cerrado' });
    }

    const hayPagos = periodo.liquidaciones.some((liq: any) => liq.estado === 'pagado');
    if (hayPagos) {
      return res.status(400).json({ 
        message: 'No se puede eliminar un período con pagos realizados' 
      });
    }

    await LiquidacionPeriodo.findByIdAndDelete(id);
    res.json({ message: 'Período eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar período:', error);
    res.status(500).json({ message: 'Error al eliminar período' });
  }
};
