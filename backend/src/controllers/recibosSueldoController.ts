import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import LiquidacionPeriodo from '../models/LiquidacionPeriodo.js';
import Employee from '../models/Employee.js';
import Convenio from '../models/Convenio.js';
import { reciboSueldoPdfService } from '../services/reciboSueldoPdfService.js';
import type { IReciboSueldoData, IConceptoRecibo } from '../services/reciboSueldoPdfService.js';

// Datos del empleador (configurables desde env o base de datos)
const DATOS_EMPLEADOR = {
  razonSocial: process.env.EMPRESA_RAZON_SOCIAL || 'MI EMPRESA S.R.L.',
  cuit: process.env.EMPRESA_CUIT || '30-12345678-9',
  direccion: process.env.EMPRESA_DIRECCION || 'Av. Principal 1234',
  localidad: process.env.EMPRESA_LOCALIDAD || 'Ciudad',
  provincia: process.env.EMPRESA_PROVINCIA || 'Buenos Aires',
  codigoPostal: process.env.EMPRESA_CP || '1000',
  telefono: process.env.EMPRESA_TELEFONO || '',
  email: process.env.EMPRESA_EMAIL || '',
};

// Constantes de aportes (Argentina)
const APORTES_EMPLEADO = {
  JUBILACION: 11,
  OBRA_SOCIAL: 3,
  PAMI: 3,
  SINDICATO: 2,
};

const CONTRIBUCIONES_EMPLEADOR = {
  JUBILACION: 10.17,
  OBRA_SOCIAL: 6,
  PAMI: 1.5,
  ART: 2.5,
};

/**
 * @desc    Generar recibo de sueldo PDF para un empleado en un período
 * @route   GET /api/recibos-sueldo/generar/:periodoId/:empleadoId
 * @access  Private
 */
export const generarReciboPDF = async (req: Request, res: Response) => {
  try {
    const { periodoId, empleadoId } = req.params;

    // Validar IDs
    if (!periodoId || !empleadoId || 
        !mongoose.Types.ObjectId.isValid(periodoId) || 
        !mongoose.Types.ObjectId.isValid(empleadoId)) {
      return res.status(400).json({ message: 'IDs inválidos' });
    }

    // Obtener período de liquidación
    const periodo = await LiquidacionPeriodo.findById(periodoId);
    if (!periodo) {
      return res.status(404).json({ message: 'Período de liquidación no encontrado' });
    }

    // Buscar la liquidación del empleado en el período
    const liquidacion = periodo.liquidaciones.find(
      (liq: any) => liq.empleadoId.toString() === empleadoId
    );

    if (!liquidacion) {
      return res.status(404).json({ message: 'Empleado no encontrado en este período' });
    }

    // Obtener datos completos del empleado
    const empleado = await Employee.findById(empleadoId).populate('convenioId');
    if (!empleado) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }

    // Obtener datos del convenio si existe
    let convenioNombre = '-';
    let categoriaNombre = empleado.categoriaConvenio || '-';
    if (empleado.convenioId) {
      const convenio = await Convenio.findById(empleado.convenioId);
      if (convenio) {
        convenioNombre = `${convenio.numero} - ${convenio.nombre}`;
        const cat = convenio.categorias.find(c => c.codigo === empleado.categoriaConvenio);
        if (cat) {
          categoriaNombre = cat.nombre;
        }
      }
    }

    // Determinar si es empleado formal
    const esEmpleadoFormal = empleado.modalidadContratacion === 'formal';

    // Construir conceptos del recibo
    const conceptos: IConceptoRecibo[] = [];
    let totalHaberes = 0;
    let totalDeducciones = 0;

    // Sueldo básico
    const sueldoBasePeriodo = periodo.tipo === 'quincenal' 
      ? liquidacion.sueldoBase / 2 
      : liquidacion.sueldoBase;
    
    conceptos.push({
      codigo: '001',
      descripcion: 'Sueldo Básico',
      cantidad: periodo.tipo === 'quincenal' ? 15 : 30,
      unidad: 'días',
      haberes: sueldoBasePeriodo,
      deducciones: 0
    });
    totalHaberes += sueldoBasePeriodo;

    // Horas extra
    if (liquidacion.totalHorasExtra > 0) {
      for (const he of liquidacion.horasExtra) {
        conceptos.push({
          codigo: '010',
          descripcion: `Horas Extra (${he.descripcion || 'HS al 50%'})`,
          cantidad: he.cantidadHoras,
          unidad: 'hs',
          haberes: he.montoTotal,
          deducciones: 0
        });
        totalHaberes += he.montoTotal;
      }
    }

    // Aguinaldo (SAC)
    if (liquidacion.aguinaldos > 0) {
      conceptos.push({
        codigo: '020',
        descripcion: 'S.A.C. (Aguinaldo)',
        haberes: liquidacion.aguinaldos,
        deducciones: 0
      });
      totalHaberes += liquidacion.aguinaldos;
    }

    // Bonus/Premios
    if (liquidacion.bonus > 0) {
      conceptos.push({
        codigo: '030',
        descripcion: 'Premio / Bonificación',
        haberes: liquidacion.bonus,
        deducciones: 0
      });
      totalHaberes += liquidacion.bonus;
    }

    // Base imponible para aportes
    const baseImponible = sueldoBasePeriodo + liquidacion.totalHorasExtra;

    // Deducciones - Solo para empleados formales
    if (esEmpleadoFormal) {
      // Jubilación
      const aporteJubilacion = baseImponible * (APORTES_EMPLEADO.JUBILACION / 100);
      conceptos.push({
        codigo: '501',
        descripcion: 'Jubilación (11%)',
        haberes: 0,
        deducciones: aporteJubilacion
      });
      totalDeducciones += aporteJubilacion;

      // Obra Social
      const aporteOS = baseImponible * (APORTES_EMPLEADO.OBRA_SOCIAL / 100);
      conceptos.push({
        codigo: '502',
        descripcion: 'Obra Social (3%)',
        haberes: 0,
        deducciones: aporteOS
      });
      totalDeducciones += aporteOS;

      // PAMI (Ley 19.032)
      const aportePAMI = baseImponible * (APORTES_EMPLEADO.PAMI / 100);
      conceptos.push({
        codigo: '503',
        descripcion: 'PAMI - Ley 19.032 (3%)',
        haberes: 0,
        deducciones: aportePAMI
      });
      totalDeducciones += aportePAMI;

      // Sindicato (si corresponde)
      if (empleado.sindicato) {
        const aporteSindicato = baseImponible * (APORTES_EMPLEADO.SINDICATO / 100);
        conceptos.push({
          codigo: '504',
          descripcion: `Cuota Sindical - ${empleado.sindicato} (2%)`,
          haberes: 0,
          deducciones: aporteSindicato
        });
        totalDeducciones += aporteSindicato;
      }
    }

    // Adelantos
    if (liquidacion.adelantos > 0) {
      conceptos.push({
        codigo: '600',
        descripcion: 'Adelanto de Sueldo',
        haberes: 0,
        deducciones: liquidacion.adelantos
      });
      totalDeducciones += liquidacion.adelantos;
    }

    // Otros descuentos
    if (liquidacion.descuentos > 0) {
      conceptos.push({
        codigo: '610',
        descripcion: 'Otros Descuentos',
        haberes: 0,
        deducciones: liquidacion.descuentos
      });
      totalDeducciones += liquidacion.descuentos;
    }

    // Calcular contribuciones patronales (informativo)
    let contribucionesPatronales;
    if (esEmpleadoFormal) {
      const contribJubilacion = baseImponible * (CONTRIBUCIONES_EMPLEADOR.JUBILACION / 100);
      const contribOS = baseImponible * (CONTRIBUCIONES_EMPLEADOR.OBRA_SOCIAL / 100);
      const contribPAMI = baseImponible * (CONTRIBUCIONES_EMPLEADOR.PAMI / 100);
      const contribART = baseImponible * (CONTRIBUCIONES_EMPLEADOR.ART / 100);
      
      contribucionesPatronales = {
        jubilacion: contribJubilacion,
        obraSocial: contribOS,
        pami: contribPAMI,
        art: contribART,
        total: contribJubilacion + contribOS + contribPAMI + contribART
      };
    }

    // Neto a cobrar
    const neto = totalHaberes - totalDeducciones;

    // Generar número de recibo
    const numeroRecibo = generarNumeroRecibo(periodo, empleado);

    // Armar datos para el PDF
    const datosRecibo = {
      empleado: {
        legajo: empleado.legajo || (empleado._id as any).toString().slice(-6),
        apellido: empleado.apellido,
        nombre: empleado.nombre,
        cuil: empleado.cuit || '-',
        fechaIngreso: empleado.fechaIngreso,
        categoria: categoriaNombre,
        puesto: empleado.puesto,
        convenio: convenioNombre,
        obraSocial: empleado.obraSocial?.nombre || '-',
        cbu: empleado.cbu || '',
        direccion: empleado.direccion || ''
      },
      empleador: DATOS_EMPLEADOR,
      liquidacion: {
        periodo: periodo.nombre,
        fechaLiquidacion: new Date(),
        fechaPago: liquidacion.fechaPago || new Date(),
        tipo: periodo.tipo as 'mensual' | 'quincenal' | 'final',
        formaPago: liquidacion.medioDePago || 'Efectivo',
        lugarPago: DATOS_EMPLEADOR.localidad,
        diasTrabajados: periodo.tipo === 'quincenal' ? 15 : 30
      },
      conceptos,
      totales: {
        totalHaberes,
        totalDeducciones,
        neto
      },
      ...(contribucionesPatronales && { contribucionesPatronales }),
      numeroRecibo
    } as IReciboSueldoData;

    // Generar y enviar PDF
    await reciboSueldoPdfService.generarPDF(datosRecibo, res);

    // Guardar referencia del recibo generado
    liquidacion.reciboGenerado = numeroRecibo;
    await periodo.save();

  } catch (error) {
    console.error('Error al generar recibo PDF:', error);
    res.status(500).json({ message: 'Error al generar recibo de sueldo' });
  }
};

/**
 * @desc    Generar recibos de todo el período en un solo PDF
 * @route   GET /api/recibos-sueldo/generar-todos/:periodoId
 * @access  Private
 */
export const generarTodosLosRecibos = async (req: Request, res: Response) => {
  try {
    const { periodoId } = req.params;

    if (!periodoId || !mongoose.Types.ObjectId.isValid(periodoId)) {
      return res.status(400).json({ message: 'ID de período inválido' });
    }

    const periodo = await LiquidacionPeriodo.findById(periodoId);
    if (!periodo) {
      return res.status(404).json({ message: 'Período no encontrado' });
    }

    // Filtrar solo los pagados
    const liquidacionesPagadas = periodo.liquidaciones.filter(
      (liq: any) => liq.estado === 'pagado'
    );

    if (liquidacionesPagadas.length === 0) {
      return res.status(400).json({ 
        message: 'No hay liquidaciones pagadas en este período' 
      });
    }

    // Por ahora, retornar info de recibos a generar
    // En una implementación completa, se generaría un PDF combinado
    const recibosInfo = [];
    
    for (const liq of liquidacionesPagadas) {
      const empleado = await Employee.findById((liq as any).empleadoId);
      recibosInfo.push({
        empleadoId: (liq as any).empleadoId,
        empleadoNombre: `${(liq as any).empleadoApellido}, ${(liq as any).empleadoNombre}`,
        fechaPago: (liq as any).fechaPago,
        totalAPagar: (liq as any).totalAPagar,
        reciboGenerado: (liq as any).reciboGenerado,
        urlRecibo: `/api/recibos-sueldo/generar/${periodoId}/${(liq as any).empleadoId}`
      });
    }

    res.json({
      periodo: periodo.nombre,
      totalRecibos: recibosInfo.length,
      recibos: recibosInfo
    });

  } catch (error) {
    console.error('Error al listar recibos:', error);
    res.status(500).json({ message: 'Error al listar recibos del período' });
  }
};

/**
 * @desc    Previsualizar recibo (datos JSON sin PDF)
 * @route   GET /api/recibos-sueldo/preview/:periodoId/:empleadoId
 * @access  Private
 */
export const previsualizarRecibo = async (req: Request, res: Response) => {
  try {
    const { periodoId, empleadoId } = req.params;

    if (!periodoId || !empleadoId || 
        !mongoose.Types.ObjectId.isValid(periodoId) || 
        !mongoose.Types.ObjectId.isValid(empleadoId)) {
      return res.status(400).json({ message: 'IDs inválidos' });
    }

    const periodo = await LiquidacionPeriodo.findById(periodoId);
    if (!periodo) {
      return res.status(404).json({ message: 'Período no encontrado' });
    }

    const liquidacion = periodo.liquidaciones.find(
      (liq: any) => liq.empleadoId.toString() === empleadoId
    );

    if (!liquidacion) {
      return res.status(404).json({ message: 'Empleado no encontrado en este período' });
    }

    const empleado = await Employee.findById(empleadoId);
    if (!empleado) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }

    const esEmpleadoFormal = empleado.modalidadContratacion === 'formal';
    const sueldoBasePeriodo = periodo.tipo === 'quincenal' ? liquidacion.sueldoBase / 2 : liquidacion.sueldoBase;
    const baseImponible = sueldoBasePeriodo + liquidacion.totalHorasExtra;

    // Calcular aportes
    let aportes = null;
    if (esEmpleadoFormal) {
      aportes = {
        jubilacion: baseImponible * (APORTES_EMPLEADO.JUBILACION / 100),
        obraSocial: baseImponible * (APORTES_EMPLEADO.OBRA_SOCIAL / 100),
        pami: baseImponible * (APORTES_EMPLEADO.PAMI / 100),
        sindicato: empleado.sindicato ? baseImponible * (APORTES_EMPLEADO.SINDICATO / 100) : 0
      };
    }

    // Calcular totales
    const totalHaberes = sueldoBasePeriodo + liquidacion.totalHorasExtra + liquidacion.aguinaldos + liquidacion.bonus;
    let totalDeducciones = liquidacion.adelantos + liquidacion.descuentos;
    if (aportes) {
      totalDeducciones += Object.values(aportes).reduce((a, b) => a + b, 0);
    }
    const neto = totalHaberes - totalDeducciones;

    res.json({
      periodo: {
        id: periodo._id,
        nombre: periodo.nombre,
        tipo: periodo.tipo,
        fechaInicio: periodo.fechaInicio,
        fechaFin: periodo.fechaFin
      },
      empleado: {
        id: empleado._id,
        nombreCompleto: `${empleado.apellido}, ${empleado.nombre}`,
        cuil: empleado.cuit,
        legajo: empleado.legajo,
        modalidad: empleado.modalidadContratacion
      },
      liquidacion: {
        sueldoBase: sueldoBasePeriodo,
        horasExtra: liquidacion.totalHorasExtra,
        aguinaldo: liquidacion.aguinaldos,
        bonus: liquidacion.bonus,
        totalHaberes,
        adelantos: liquidacion.adelantos,
        descuentos: liquidacion.descuentos,
        aportes,
        totalDeducciones,
        neto,
        estado: liquidacion.estado,
        fechaPago: liquidacion.fechaPago
      }
    });

  } catch (error) {
    console.error('Error al previsualizar recibo:', error);
    res.status(500).json({ message: 'Error al previsualizar recibo' });
  }
};

/**
 * @desc    Obtener historial de recibos de un empleado
 * @route   GET /api/recibos-sueldo/historial/:empleadoId
 * @access  Private
 */
export const getHistorialRecibos = async (req: Request, res: Response) => {
  try {
    const { empleadoId } = req.params;
    const { limite = 12 } = req.query;

    if (!empleadoId || !mongoose.Types.ObjectId.isValid(empleadoId)) {
      return res.status(400).json({ message: 'ID de empleado inválido' });
    }

    // Buscar todos los períodos donde el empleado tiene liquidación
    const periodos = await LiquidacionPeriodo.find({
      'liquidaciones.empleadoId': new mongoose.Types.ObjectId(empleadoId)
    })
      .sort({ fechaInicio: -1 })
      .limit(parseInt(limite as string));

    const historial = [];

    for (const periodo of periodos) {
      const liquidacion = periodo.liquidaciones.find(
        (liq: any) => liq.empleadoId.toString() === empleadoId
      );

      if (liquidacion) {
        historial.push({
          periodoId: periodo._id,
          periodoNombre: periodo.nombre,
          tipo: periodo.tipo,
          fechaInicio: periodo.fechaInicio,
          fechaFin: periodo.fechaFin,
          estadoPeriodo: periodo.estado,
          liquidacion: {
            sueldoBase: liquidacion.sueldoBase,
            totalHorasExtra: liquidacion.totalHorasExtra,
            totalAPagar: liquidacion.totalAPagar,
            estado: liquidacion.estado,
            fechaPago: liquidacion.fechaPago,
            reciboGenerado: liquidacion.reciboGenerado
          },
          urlRecibo: liquidacion.estado === 'pagado' 
            ? `/api/recibos-sueldo/generar/${periodo._id}/${empleadoId}`
            : null
        });
      }
    }

    res.json({
      empleadoId,
      totalRecibos: historial.length,
      historial
    });

  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ message: 'Error al obtener historial de recibos' });
  }
};

// =====================================================
// UTILIDADES
// =====================================================

function generarNumeroRecibo(periodo: any, empleado: any): string {
  const año = new Date().getFullYear();
  const mes = String(new Date().getMonth() + 1).padStart(2, '0');
  const legajo = empleado.legajo || empleado._id.toString().slice(-6);
  const tipo = periodo.tipo === 'quincenal' ? 'Q' : 'M';
  
  return `${año}${mes}-${tipo}-${legajo}`;
}
