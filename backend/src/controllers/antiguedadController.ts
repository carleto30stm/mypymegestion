import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import {
  calcularAntiguedad,
  calcularAdicionalAntiguedad,
  getResumenAntiguedadEmpleado,
  getEmpleadosProximosAniversario,
  getRankingAntiguedad,
  getEstadisticasAntiguedad
} from '../services/antiguedadService.js';
import Employee from '../models/Employee.js';

/**
 * CONTROLLER DE ANTIGÜEDAD
 * 
 * Endpoints para gestión y consulta de antigüedad de empleados
 * según LCT y Convenios Colectivos de Trabajo
 */

/**
 * @desc    Obtener antigüedad de un empleado específico
 * @route   GET /api/antiguedad/empleado/:empleadoId
 * @access  Private
 */
export const getAntiguedadEmpleado = async (req: Request, res: Response) => {
  try {
    const { empleadoId } = req.params;
    const { sueldoBasico, sueldoBruto } = req.query;

    if (!empleadoId || !mongoose.Types.ObjectId.isValid(empleadoId)) {
      return res.status(400).json({ message: 'ID de empleado inválido' });
    }

    const resumen = await getResumenAntiguedadEmpleado(
      empleadoId,
      sueldoBasico ? parseFloat(sueldoBasico as string) : undefined,
      sueldoBruto ? parseFloat(sueldoBruto as string) : undefined
    );

    if (!resumen) {
      return res.status(404).json({ message: 'Empleado no encontrado o sin fecha de ingreso' });
    }

    res.json(resumen);

  } catch (error) {
    console.error('Error obteniendo antigüedad:', error);
    res.status(500).json({ message: 'Error al obtener antigüedad del empleado' });
  }
};

/**
 * @desc    Calcular adicional por antigüedad para liquidación
 * @route   POST /api/antiguedad/calcular-adicional
 * @access  Private
 */
export const calcularAdicional = async (req: Request, res: Response) => {
  try {
    const { empleadoId, sueldoBasico, sueldoBruto, fechaCalculo } = req.body;

    if (!empleadoId || !mongoose.Types.ObjectId.isValid(empleadoId)) {
      return res.status(400).json({ message: 'ID de empleado inválido' });
    }

    if (!sueldoBasico || isNaN(sueldoBasico)) {
      return res.status(400).json({ message: 'Sueldo básico requerido' });
    }

    const fecha = fechaCalculo ? new Date(fechaCalculo) : new Date();
    const adicional = await calcularAdicionalAntiguedad(
      empleadoId,
      sueldoBasico,
      sueldoBruto,
      fecha
    );

    if (!adicional) {
      return res.status(404).json({ message: 'No se pudo calcular adicional' });
    }

    res.json(adicional);

  } catch (error) {
    console.error('Error calculando adicional:', error);
    res.status(500).json({ message: 'Error al calcular adicional por antigüedad' });
  }
};

/**
 * @desc    Obtener alertas de aniversarios próximos
 * @route   GET /api/antiguedad/alertas
 * @access  Private
 */
export const getAlertas = async (req: Request, res: Response) => {
  try {
    const { dias = 30 } = req.query;
    const diasAnticipacion = parseInt(dias as string);

    const alertas = await getEmpleadosProximosAniversario(diasAnticipacion);

    res.json({
      diasAnticipacion,
      totalAlertas: alertas.length,
      alertas
    });

  } catch (error) {
    console.error('Error obteniendo alertas:', error);
    res.status(500).json({ message: 'Error al obtener alertas de aniversarios' });
  }
};

/**
 * @desc    Obtener ranking de empleados por antigüedad
 * @route   GET /api/antiguedad/ranking
 * @access  Private
 */
export const getRanking = async (req: Request, res: Response) => {
  try {
    const { limite = 10 } = req.query;
    const limiteNum = parseInt(limite as string);

    const ranking = await getRankingAntiguedad(limiteNum);

    res.json({
      limite: limiteNum,
      ranking
    });

  } catch (error) {
    console.error('Error obteniendo ranking:', error);
    res.status(500).json({ message: 'Error al obtener ranking de antigüedad' });
  }
};

/**
 * @desc    Obtener estadísticas generales de antigüedad
 * @route   GET /api/antiguedad/estadisticas
 * @access  Private
 */
export const getEstadisticas = async (req: Request, res: Response) => {
  try {
    const estadisticas = await getEstadisticasAntiguedad();
    res.json(estadisticas);

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ message: 'Error al obtener estadísticas de antigüedad' });
  }
};

/**
 * @desc    Obtener antigüedad de todos los empleados activos
 * @route   GET /api/antiguedad/todos
 * @access  Private
 */
export const getAntiguedadTodos = async (req: Request, res: Response) => {
  try {
    const { area, incluirAdicional } = req.query;

    // Construir filtro
    const filtro: any = { activo: true };
    if (area) {
      filtro.area = area;
    }

    const empleados = await Employee.find(filtro);
    const ahora = new Date();

    const resultados = await Promise.all(
      empleados
        .filter(emp => emp.fechaIngreso)
        .map(async (emp) => {
          const antiguedad = calcularAntiguedad(new Date(emp.fechaIngreso), ahora);
          
          let adicional = null;
          if (incluirAdicional === 'true' && emp.sueldoBase) {
            adicional = await calcularAdicionalAntiguedad(
              (emp._id as any).toString(),
              emp.sueldoBase
            );
          }

          return {
            empleadoId: emp._id,
            apellido: emp.apellido,
            nombre: emp.nombre,
            cuit: emp.cuit || '',
            area: (emp as any).area || '',
            cargo: emp.puesto || '',
            fechaIngreso: emp.fechaIngreso,
            antiguedad,
            adicional
          };
        })
    );

    // Ordenar por antigüedad (mayor primero)
    resultados.sort((a, b) => b.antiguedad.totalDias - a.antiguedad.totalDias);

    res.json({
      total: resultados.length,
      filtros: { area: area || 'todos', incluirAdicional: incluirAdicional === 'true' },
      empleados: resultados
    });

  } catch (error) {
    console.error('Error obteniendo antigüedad de todos:', error);
    res.status(500).json({ message: 'Error al obtener antigüedad de empleados' });
  }
};

/**
 * @desc    Simular cálculo de antigüedad (sin empleado real)
 * @route   POST /api/antiguedad/simular
 * @access  Private
 */
export const simularAntiguedad = async (req: Request, res: Response) => {
  try {
    const { fechaIngreso, fechaCalculo, sueldoBasico, porcentajePorAnio = 1, topeAnios = 25 } = req.body;

    if (!fechaIngreso) {
      return res.status(400).json({ message: 'Fecha de ingreso requerida' });
    }

    const ingreso = new Date(fechaIngreso);
    const calculo = fechaCalculo ? new Date(fechaCalculo) : new Date();

    // Calcular antigüedad
    const antiguedad = calcularAntiguedad(ingreso, calculo);

    // Simular adicional
    let adicionalSimulado = null;
    if (sueldoBasico) {
      const aniosAplicar = Math.min(antiguedad.anios, topeAnios);
      const porcentajeTotal = porcentajePorAnio * aniosAplicar;
      const montoAdicional = sueldoBasico * (porcentajeTotal / 100);

      adicionalSimulado = {
        aniosComputados: aniosAplicar,
        topeAplicado: antiguedad.anios > topeAnios,
        porcentajePorAnio,
        porcentajeTotal,
        sueldoBasico,
        montoAdicional: Math.round(montoAdicional * 100) / 100
      };
    }

    res.json({
      fechaIngreso: ingreso,
      fechaCalculo: calculo,
      antiguedad,
      simulacionAdicional: adicionalSimulado,
      nota: 'Simulación sin considerar configuración de convenio'
    });

  } catch (error) {
    console.error('Error simulando antigüedad:', error);
    res.status(500).json({ message: 'Error al simular antigüedad' });
  }
};

/**
 * @desc    Obtener historial de adicionales por antigüedad (para auditoría)
 * @route   GET /api/antiguedad/historial/:empleadoId
 * @access  Private (admin)
 */
export const getHistorialAntiguedad = async (req: Request, res: Response) => {
  try {
    const { empleadoId } = req.params;
    const { anio } = req.query;

    if (!empleadoId || !mongoose.Types.ObjectId.isValid(empleadoId)) {
      return res.status(400).json({ message: 'ID de empleado inválido' });
    }

    const empleado = await Employee.findById(empleadoId);
    if (!empleado || !empleado.fechaIngreso) {
      return res.status(404).json({ message: 'Empleado no encontrado o sin fecha de ingreso' });
    }

    // Calcular evolución de antigüedad año a año
    const fechaIngreso = new Date(empleado.fechaIngreso);
    const anioActual = new Date().getFullYear();
    const anioInicio = anio ? parseInt(anio as string) : fechaIngreso.getFullYear();
    
    const historial: Array<{
      anio: number;
      fechaCalculo: Date;
      antiguedad: any;
    }> = [];

    for (let a = anioInicio; a <= anioActual; a++) {
      // Calcular al 31 de diciembre de cada año (o fecha actual si es año actual)
      const fechaCalculo = a === anioActual 
        ? new Date() 
        : new Date(a, 11, 31);

      if (fechaCalculo >= fechaIngreso) {
        const antiguedad = calcularAntiguedad(fechaIngreso, fechaCalculo);
        historial.push({
          anio: a,
          fechaCalculo,
          antiguedad
        });
      }
    }

    res.json({
      empleadoId,
      nombreCompleto: `${empleado.apellido}, ${empleado.nombre}`,
      fechaIngreso,
      historial
    });

  } catch (error) {
    console.error('Error obteniendo historial:', error);
    res.status(500).json({ message: 'Error al obtener historial de antigüedad' });
  }
};
