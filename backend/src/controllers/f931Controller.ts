import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import LiquidacionPeriodo from '../models/LiquidacionPeriodo.js';
import Employee from '../models/Employee.js';

/**
 * FORMULARIO 931 - AFIP
 * Declaración Jurada de Aportes y Contribuciones
 * Sistema Integrado Previsional Argentino (SIPA)
 * 
 * Resoluciones aplicables:
 * - RG AFIP 3834/2016 (Sistema de Cuentas Tributarias)
 * - RG AFIP 2192/2006 (F.931)
 * - Ley 24.241 (Sistema Integrado de Jubilaciones y Pensiones)
 */

// Códigos de actividad AFIP más comunes
const CODIGOS_ACTIVIDAD = {
  '1': 'Comercio al por mayor y menor',
  '2': 'Industria manufacturera',
  '3': 'Construcción',
  '4': 'Transporte',
  '5': 'Servicios',
  '6': 'Agropecuario',
  '7': 'Salud',
  '8': 'Educación',
  '9': 'Otros servicios'
};

// Códigos de situación revista (tipo de contrato)
const SITUACION_REVISTA = {
  '1': 'Activo',
  '2': 'Licencia sin goce de haberes',
  '3': 'Licencia por maternidad',
  '4': 'Reserva de puesto',
  '5': 'Licencia gremial',
  '6': 'Suspendido',
  '7': 'Pasante',
  '8': 'Licencia por enfermedad'
};

// Códigos de condición (según categorización)
const CONDICION_EMPLEADO = {
  '0': 'Normal',
  '1': 'Zona desfavorable',
  '2': 'Beneficiario plan jefe/jefa',
  '3': 'Actividad diferencial'
};

// Códigos de modalidad de contratación
const MODALIDAD_CONTRATACION = {
  '0': 'Contrato por tiempo indeterminado',
  '1': 'Contrato a plazo fijo',
  '2': 'Contrato eventual',
  '3': 'Contrato temporada',
  '4': 'Contrato aprendizaje',
  '6': 'Pasantía'
};

// Porcentajes según SIPA (actualizados 2024)
const ALICUOTAS = {
  // Aportes del trabajador
  JUBILACION_EMPLEADO: 11,
  OBRA_SOCIAL_EMPLEADO: 3,
  PAMI_EMPLEADO: 3,

  // Contribuciones del empleador
  JUBILACION_EMPLEADOR: 10.17,
  OBRA_SOCIAL_EMPLEADOR: 6,
  PAMI_EMPLEADOR: 1.5,
  FONDO_EMPLEO: 0.89,
  ART: 2.5, // Variable según ART

  // Reducciones por zona desfavorable
  REDUCCION_PATAGONIA: 50
};

// Interface para datos del F931
interface IDatosEmpleadoF931 {
  cuil: string;
  apellidoNombre: string;
  codigoSituacion: string;
  codigoCondicion: string;
  codigoActividad: string;
  codigoModalidad: string;
  codigoObraSocial: string;
  cantidadDias: number;
  remuneracion1: number; // Rem. imponible aportes SS
  remuneracion2: number; // Rem. imponible contribuciones
  remuneracion3: number; // Rem. adicional (SAC proporcional)
  remuneracion4: number; // Rem. no remunerativa
  remuneracion5: number; // Maternidad/otras asignaciones
  remuneracion6: number; // Horas extra al 50%
  remuneracion7: number; // Horas extra al 100%
  remuneracion8: number; // Adicional zona patagónica
  remuneracion9: number; // Gratificaciones
  remuneracion10: number; // Sueldo anual complementario
  baseImponible1: number; // Base SIJP
  baseImponible2: number; // Base Obra Social
  baseImponible3: number; // Base INSSJP (PAMI)
  baseImponible4: number; // Base contribuciones
  aportesJubilacion: number;
  aportesObraSocial: number;
  aportesPami: number;
  totalAportes: number;
  contribucionesJubilacion: number;
  contribucionesObraSocial: number;
  contribucionesPami: number;
  contribucionesFondoEmpleo: number;
  contribucionesART: number;
  totalContribuciones: number;
  deduccionesEmpleado: number;
  grupoFamiliar: number; // Cantidad de adherentes
}

interface IResumenF931 {
  periodo: string;
  cuitEmpleador: string;
  razonSocial: string;
  domicilioFiscal: string;
  codigoActividad: string;
  cantidadEmpleados: number;
  totalRemuneraciones: number;
  totalBaseImponible: number;
  totalAportesEmpleados: number;
  totalContribucionesPatronales: number;
  totalImporte: number;
  intereses?: number;
  total: number;
}

interface IF931Data {
  encabezado: {
    cuitEmpleador: string;
    razonSocial: string;
    periodoDeclaracion: string;
    fechaGeneracion: Date;
    version: string;
  };
  empleados: IDatosEmpleadoF931[];
  resumen: IResumenF931;
  declaracionJurada: {
    rectificativa: boolean;
    numeroOriginal?: string;
  };
}

/**
 * @desc    Generar datos del F931 para un período
 * @route   GET /api/f931/generar/:periodoId
 * @access  Private (admin)
 */
export const generarDatosF931 = async (req: Request, res: Response) => {
  try {
    const { periodoId } = req.params;
    const { rectificativa = false, numeroOriginal } = req.query;

    if (!periodoId || !mongoose.Types.ObjectId.isValid(periodoId)) {
      return res.status(400).json({ message: 'ID de período inválido' });
    }

    // Obtener período de liquidación
    const periodo = await LiquidacionPeriodo.findById(periodoId);
    if (!periodo) {
      return res.status(404).json({ message: 'Período no encontrado' });
    }

    // Verificar que el período esté cerrado
    if (periodo.estado !== 'cerrado') {
      return res.status(400).json({
        message: 'El período debe estar cerrado para generar el F931'
      });
    }

    // Obtener solo liquidaciones pagadas
    const liquidacionesPagadas = periodo.liquidaciones.filter(
      (liq: any) => liq.estado === 'pagado'
    );

    if (liquidacionesPagadas.length === 0) {
      return res.status(400).json({
        message: 'No hay liquidaciones pagadas en este período'
      });
    }

    // Datos del empleador desde env
    const cuitEmpleador = process.env.EMPRESA_CUIT || '30-12345678-9';
    const razonSocial = process.env.EMPRESA_RAZON_SOCIAL || 'MI EMPRESA S.R.L.';
    const domicilioFiscal = process.env.EMPRESA_DIRECCION || 'Av. Principal 1234';
    const codigoActividad = process.env.EMPRESA_CODIGO_ACTIVIDAD || '5'; // Servicios por defecto

    // Procesar cada empleado
    const empleadosF931: IDatosEmpleadoF931[] = [];
    let totalRemuneraciones = 0;
    let totalBaseImponible = 0;
    let totalAportes = 0;
    let totalContribuciones = 0;

    for (const liq of liquidacionesPagadas) {
      // Obtener datos completos del empleado
      const empleado = await Employee.findById((liq as any).empleadoId);

      if (!empleado) continue;

      // Solo procesar empleados formales
      if (empleado.modalidadContratacion !== 'formal') continue;

      const cuil = empleado.cuit || '';
      if (!cuil) {
        console.warn(`Empleado ${empleado.apellido} sin CUIL registrado`);
        continue;
      }

      // Calcular sueldo según tipo de período
      const sueldoBasePeriodo = periodo.tipo === 'quincenal'
        ? (liq as any).sueldoBase / 2
        : (liq as any).sueldoBase;

      // Remuneraciones
      const remuneracionImponible = sueldoBasePeriodo + (liq as any).totalHorasExtra;
      const sacProporcional = remuneracionImponible / 12; // SAC mensual

      // Bases imponibles (puede haber topes MOPRE)
      const baseJubilacion = remuneracionImponible;
      const baseObraSocial = remuneracionImponible;
      const basePami = remuneracionImponible;
      const baseContribuciones = remuneracionImponible;

      // Aportes del empleado
      const aporteJubilacion = baseJubilacion * (ALICUOTAS.JUBILACION_EMPLEADO / 100);
      const aporteObraSocial = baseObraSocial * (ALICUOTAS.OBRA_SOCIAL_EMPLEADO / 100);
      const aportePami = basePami * (ALICUOTAS.PAMI_EMPLEADO / 100);
      const totalAportesEmpleado = aporteJubilacion + aporteObraSocial + aportePami;

      // Contribuciones patronales
      const contribJubilacion = baseContribuciones * (ALICUOTAS.JUBILACION_EMPLEADOR / 100);
      const contribObraSocial = baseContribuciones * (ALICUOTAS.OBRA_SOCIAL_EMPLEADOR / 100);
      const contribPami = baseContribuciones * (ALICUOTAS.PAMI_EMPLEADOR / 100);
      const contribFondoEmpleo = baseContribuciones * (ALICUOTAS.FONDO_EMPLEO / 100);
      const contribART = baseContribuciones * (ALICUOTAS.ART / 100);
      const totalContribucionesPatronales = contribJubilacion + contribObraSocial +
        contribPami + contribFondoEmpleo + contribART;

      // Construir registro del empleado
      const empleadoF931: IDatosEmpleadoF931 = {
        cuil: formatearCUIL(cuil),
        apellidoNombre: `${empleado.apellido}, ${empleado.nombre}`,
        codigoSituacion: '1', // Activo
        codigoCondicion: '0', // Normal
        codigoActividad: codigoActividad,
        codigoModalidad: '0', // Tiempo indeterminado
        codigoObraSocial: empleado.obraSocial?.numero || '000000',
        cantidadDias: periodo.tipo === 'quincenal' ? 15 : 30,
        remuneracion1: remuneracionImponible,
        remuneracion2: remuneracionImponible,
        remuneracion3: sacProporcional,
        remuneracion4: 0, // No remunerativo
        remuneracion5: 0, // Asignaciones
        remuneracion6: calcularHorasExtra50((liq as any).horasExtra),
        remuneracion7: calcularHorasExtra100((liq as any).horasExtra),
        remuneracion8: 0, // Zona patagónica
        remuneracion9: (liq as any).incentivos || 0,
        remuneracion10: (liq as any).aguinaldos || 0,
        baseImponible1: baseJubilacion,
        baseImponible2: baseObraSocial,
        baseImponible3: basePami,
        baseImponible4: baseContribuciones,
        aportesJubilacion: Math.round(aporteJubilacion * 100) / 100,
        aportesObraSocial: Math.round(aporteObraSocial * 100) / 100,
        aportesPami: Math.round(aportePami * 100) / 100,
        totalAportes: Math.round(totalAportesEmpleado * 100) / 100,
        contribucionesJubilacion: Math.round(contribJubilacion * 100) / 100,
        contribucionesObraSocial: Math.round(contribObraSocial * 100) / 100,
        contribucionesPami: Math.round(contribPami * 100) / 100,
        contribucionesFondoEmpleo: Math.round(contribFondoEmpleo * 100) / 100,
        contribucionesART: Math.round(contribART * 100) / 100,
        totalContribuciones: Math.round(totalContribucionesPatronales * 100) / 100,
        deduccionesEmpleado: (liq as any).descuentos || 0,
        grupoFamiliar: 0
      };

      empleadosF931.push(empleadoF931);

      // Acumular totales
      totalRemuneraciones += remuneracionImponible;
      totalBaseImponible += baseJubilacion;
      totalAportes += totalAportesEmpleado;
      totalContribuciones += totalContribucionesPatronales;
    }

    // Construir resumen
    const totalImporte = totalAportes + totalContribuciones;
    const resumen: IResumenF931 = {
      periodo: periodo.nombre,
      cuitEmpleador,
      razonSocial,
      domicilioFiscal,
      codigoActividad,
      cantidadEmpleados: empleadosF931.length,
      totalRemuneraciones: Math.round(totalRemuneraciones * 100) / 100,
      totalBaseImponible: Math.round(totalBaseImponible * 100) / 100,
      totalAportesEmpleados: Math.round(totalAportes * 100) / 100,
      totalContribucionesPatronales: Math.round(totalContribuciones * 100) / 100,
      totalImporte: Math.round(totalImporte * 100) / 100,
      total: Math.round(totalImporte * 100) / 100
    };

    // Construir respuesta completa
    const f931Data: IF931Data = {
      encabezado: {
        cuitEmpleador,
        razonSocial,
        periodoDeclaracion: formatearPeriodoAFIP(periodo.fechaInicio),
        fechaGeneracion: new Date(),
        version: '42.0' // Versión del aplicativo SICOSS
      },
      empleados: empleadosF931,
      resumen,
      declaracionJurada: {
        rectificativa: rectificativa === 'true',
        numeroOriginal: numeroOriginal as string
      }
    };

    res.json(f931Data);

  } catch (error) {
    console.error('Error al generar F931:', error);
    res.status(500).json({ message: 'Error al generar datos del F931' });
  }
};

/**
 * @desc    Exportar F931 en formato TXT para SICOSS
 * @route   GET /api/f931/exportar-txt/:periodoId
 * @access  Private (admin)
 */
export const exportarF931TXT = async (req: Request, res: Response) => {
  try {
    const { periodoId } = req.params;

    if (!periodoId || !mongoose.Types.ObjectId.isValid(periodoId)) {
      return res.status(400).json({ message: 'ID de período inválido' });
    }

    const periodo = await LiquidacionPeriodo.findById(periodoId);
    if (!periodo) {
      return res.status(404).json({ message: 'Período no encontrado' });
    }

    if (periodo.estado !== 'cerrado') {
      return res.status(400).json({
        message: 'El período debe estar cerrado para exportar'
      });
    }

    const cuitEmpleador = (process.env.EMPRESA_CUIT || '30-12345678-9').replace(/-/g, '');
    const periodoAFIP = formatearPeriodoAFIP(periodo.fechaInicio);

    // Generar líneas TXT formato SICOSS
    const lineas: string[] = [];

    // Línea de encabezado (tipo registro 01)
    lineas.push(generarLineaEncabezado(cuitEmpleador, periodoAFIP));

    // Procesar empleados
    const liquidacionesPagadas = periodo.liquidaciones.filter(
      (liq: any) => liq.estado === 'pagado'
    );

    for (const liq of liquidacionesPagadas) {
      const empleado = await Employee.findById((liq as any).empleadoId);
      if (!empleado || empleado.modalidadContratacion !== 'formal') continue;
      if (!empleado.cuit) continue;

      const sueldoBasePeriodo = periodo.tipo === 'quincenal'
        ? (liq as any).sueldoBase / 2
        : (liq as any).sueldoBase;

      // Línea de nómina (tipo registro 02)
      lineas.push(generarLineaNomina(
        empleado,
        sueldoBasePeriodo,
        (liq as any).totalHorasExtra,
        (liq as any).aguinaldos || 0,
        periodo.tipo === 'quincenal' ? 15 : 30
      ));
    }

    // Línea de totales (tipo registro 03)
    lineas.push(generarLineaTotales(liquidacionesPagadas.length));

    // Crear contenido TXT
    const contenidoTXT = lineas.join('\r\n');

    // Enviar como archivo descargable
    const nombreArchivo = `F931_${cuitEmpleador}_${periodoAFIP}.txt`;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    res.send(contenidoTXT);

  } catch (error) {
    console.error('Error al exportar F931 TXT:', error);
    res.status(500).json({ message: 'Error al exportar archivo TXT' });
  }
};

/**
 * @desc    Obtener preview del F931 (resumen sin detalles)
 * @route   GET /api/f931/preview/:periodoId
 * @access  Private
 */
export const previewF931 = async (req: Request, res: Response) => {
  try {
    const { periodoId } = req.params;

    if (!periodoId || !mongoose.Types.ObjectId.isValid(periodoId)) {
      return res.status(400).json({ message: 'ID de período inválido' });
    }

    const periodo = await LiquidacionPeriodo.findById(periodoId);
    if (!periodo) {
      return res.status(404).json({ message: 'Período no encontrado' });
    }

    const liquidacionesPagadas = periodo.liquidaciones.filter(
      (liq: any) => liq.estado === 'pagado'
    );

    // Contar empleados formales
    let empleadosFormalees = 0;
    let empleadosInformales = 0;
    let totalRemuneraciones = 0;
    let empleadosSinCUIL: string[] = [];

    for (const liq of liquidacionesPagadas) {
      const empleado = await Employee.findById((liq as any).empleadoId);
      if (!empleado) continue;

      if (empleado.modalidadContratacion === 'formal') {
        if (!empleado.cuit) {
          empleadosSinCUIL.push(`${empleado.apellido}, ${empleado.nombre}`);
        } else {
          empleadosFormalees++;
          const sueldo = periodo.tipo === 'quincenal'
            ? (liq as any).sueldoBase / 2
            : (liq as any).sueldoBase;
          totalRemuneraciones += sueldo + (liq as any).totalHorasExtra;
        }
      } else {
        empleadosInformales++;
      }
    }

    // Calcular totales estimados
    const totalAportes = totalRemuneraciones *
      ((ALICUOTAS.JUBILACION_EMPLEADO + ALICUOTAS.OBRA_SOCIAL_EMPLEADO + ALICUOTAS.PAMI_EMPLEADO) / 100);

    const totalContribuciones = totalRemuneraciones *
      ((ALICUOTAS.JUBILACION_EMPLEADOR + ALICUOTAS.OBRA_SOCIAL_EMPLEADOR +
        ALICUOTAS.PAMI_EMPLEADOR + ALICUOTAS.FONDO_EMPLEO + ALICUOTAS.ART) / 100);

    res.json({
      periodo: {
        id: periodo._id,
        nombre: periodo.nombre,
        tipo: periodo.tipo,
        estado: periodo.estado,
        fechaInicio: periodo.fechaInicio,
        fechaFin: periodo.fechaFin
      },
      resumen: {
        totalLiquidaciones: liquidacionesPagadas.length,
        empleadosFormales: empleadosFormalees,
        empleadosInformales,
        empleadosSinCUIL,
        advertencias: empleadosSinCUIL.length > 0
          ? `${empleadosSinCUIL.length} empleado(s) formal(es) sin CUIL registrado`
          : null
      },
      estimacion: {
        totalRemuneraciones: Math.round(totalRemuneraciones * 100) / 100,
        totalAportesEmpleados: Math.round(totalAportes * 100) / 100,
        totalContribucionesPatronales: Math.round(totalContribuciones * 100) / 100,
        totalAPagar: Math.round((totalAportes + totalContribuciones) * 100) / 100
      },
      listo: periodo.estado === 'cerrado' && empleadosSinCUIL.length === 0
    });

  } catch (error) {
    console.error('Error en preview F931:', error);
    res.status(500).json({ message: 'Error al generar preview' });
  }
};

/**
 * @desc    Obtener histórico de F931 generados
 * @route   GET /api/f931/historial
 * @access  Private
 */
export const getHistorialF931 = async (req: Request, res: Response) => {
  try {
    const { anio } = req.query;
    const anioFiltro = anio ? parseInt(anio as string) : new Date().getFullYear();

    // Buscar períodos cerrados del año
    const periodos = await LiquidacionPeriodo.find({
      estado: 'cerrado',
      fechaInicio: {
        $gte: new Date(`${anioFiltro}-01-01`),
        $lte: new Date(`${anioFiltro}-12-31`)
      }
    }).sort({ fechaInicio: -1 });

    const historial = periodos.map(p => ({
      periodoId: p._id,
      nombre: p.nombre,
      tipo: p.tipo,
      fechaInicio: p.fechaInicio,
      fechaFin: p.fechaFin,
      fechaCierre: p.fechaCierre,
      cantidadEmpleados: p.liquidaciones.filter((l: any) => l.estado === 'pagado').length,
      urlGenerarF931: `/api/f931/generar/${p._id}`,
      urlExportarTXT: `/api/f931/exportar-txt/${p._id}`
    }));

    res.json({
      anio: anioFiltro,
      totalPeriodos: historial.length,
      periodos: historial
    });

  } catch (error) {
    console.error('Error al obtener historial F931:', error);
    res.status(500).json({ message: 'Error al obtener historial' });
  }
};

// =====================================================
// FUNCIONES AUXILIARES
// =====================================================

function formatearCUIL(cuil: string): string {
  // Remover guiones y formatear XX-XXXXXXXX-X
  const limpio = cuil.replace(/-/g, '');
  if (limpio.length !== 11) return cuil;
  return `${limpio.slice(0, 2)}-${limpio.slice(2, 10)}-${limpio.slice(10)}`;
}

function formatearPeriodoAFIP(fecha: Date): string {
  // Formato YYYYMM
  const d = new Date(fecha);
  const anio = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  return `${anio}${mes}`;
}

function calcularHorasExtra50(horasExtra: any[]): number {
  if (!horasExtra || !Array.isArray(horasExtra)) return 0;
  // Asumimos que horas extra normales son al 50%
  return horasExtra.reduce((sum, he) => sum + (he.montoTotal || 0), 0);
}

function calcularHorasExtra100(horasExtra: any[]): number {
  // Por ahora retornamos 0, se puede expandir si se diferencian tipos
  return 0;
}

function generarLineaEncabezado(cuit: string, periodo: string): string {
  // Tipo registro 01 - Encabezado SICOSS
  // Formato fijo de 200 caracteres
  const tipo = '01';
  const cuitPadded = cuit.padStart(11, '0');
  const periodoPadded = periodo.padStart(6, '0');
  const secuencia = '0001';
  const rectificativa = 'N';
  const relleno = ' '.repeat(175);

  return `${tipo}${cuitPadded}${periodoPadded}${secuencia}${rectificativa}${relleno}`;
}

function generarLineaNomina(
  empleado: any,
  sueldoBase: number,
  horasExtra: number,
  sac: number,
  dias: number
): string {
  // Tipo registro 02 - Nómina SICOSS
  const tipo = '02';
  const cuil = (empleado.cuit || '').replace(/-/g, '').padStart(11, '0');
  const apellidoNombre = `${empleado.apellido}, ${empleado.nombre}`.substring(0, 30).padEnd(30, ' ');
  const situacion = '01';
  const condicion = '00';
  const actividad = '01';
  const modalidad = '00';
  const diasTrabajados = String(dias).padStart(2, '0');

  // Remuneraciones (en centavos, 11 dígitos)
  const rem1 = String(Math.round(sueldoBase * 100)).padStart(11, '0');
  const rem2 = String(Math.round(horasExtra * 100)).padStart(11, '0');
  const rem3 = String(Math.round(sac * 100)).padStart(11, '0');

  // Aportes
  const aporteJub = String(Math.round(sueldoBase * ALICUOTAS.JUBILACION_EMPLEADO)).padStart(11, '0');
  const aporteOS = String(Math.round(sueldoBase * ALICUOTAS.OBRA_SOCIAL_EMPLEADO)).padStart(11, '0');
  const aportePami = String(Math.round(sueldoBase * ALICUOTAS.PAMI_EMPLEADO)).padStart(11, '0');

  const relleno = ' '.repeat(50);

  return `${tipo}${cuil}${apellidoNombre}${situacion}${condicion}${actividad}${modalidad}${diasTrabajados}${rem1}${rem2}${rem3}${aporteJub}${aporteOS}${aportePami}${relleno}`;
}

function generarLineaTotales(cantidadEmpleados: number): string {
  // Tipo registro 03 - Totales SICOSS
  const tipo = '03';
  const cantidad = String(cantidadEmpleados).padStart(5, '0');
  const relleno = ' '.repeat(193);

  return `${tipo}${cantidad}${relleno}`;
}
