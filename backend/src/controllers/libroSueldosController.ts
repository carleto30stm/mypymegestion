import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import LiquidacionPeriodo from '../models/LiquidacionPeriodo.js';
import Employee from '../models/Employee.js';

/**
 * LIBRO DE SUELDOS DIGITAL - AFIP
 * 
 * RG AFIP 4003/2017 y modificatorias
 * 
 * El Libro de Sueldos Digital es el registro obligatorio de remuneraciones
 * y conceptos en formato electrónico que reemplaza al libro de sueldos tradicional.
 * 
 * Estructura de registros según especificación AFIP:
 * - Registro 1: Datos del empleador
 * - Registro 2: Datos de empleados y remuneraciones
 * - Registro 3: Totales
 */

// Códigos de concepto según nomenclador AFIP
const CODIGOS_CONCEPTO = {
  // Remuneraciones
  SUELDO_BASICO: '1010',
  ADICIONAL_ANTIGUEDAD: '1020',
  ADICIONAL_PRESENTISMO: '1030',
  ADICIONAL_TITULO: '1040',
  HORAS_EXTRA_50: '1100',
  HORAS_EXTRA_100: '1110',
  COMISIONES: '1200',
  GRATIFICACIONES: '1300',
  SAC: '1400',
  VACACIONES: '1500',
  ZONA_DESFAVORABLE: '1600',
  PLUS_CONVENIO: '1700',
  OTROS_CONCEPTOS_REM: '1900',
  
  // No remunerativos
  ASIGNACION_FAMILIAR: '2010',
  VIATICOS: '2020',
  REFRIGERIO: '2030',
  OTROS_NO_REM: '2900',
  
  // Deducciones
  JUBILACION: '3010',
  OBRA_SOCIAL: '3020',
  PAMI: '3030',
  SINDICATO: '3040',
  IMPUESTO_GANANCIAS: '3050',
  ADELANTO: '3100',
  OTROS_DESCUENTOS: '3900'
};

// Tipos de contrato según AFIP
const TIPOS_CONTRATO = {
  INDETERMINADO: '01',
  PLAZO_FIJO: '02',
  EVENTUAL: '03',
  TEMPORADA: '04',
  APRENDIZAJE: '05',
  PASANTIA: '06'
};

// Interface para línea del libro
interface ILineaLibro {
  codigoConcepto: string;
  descripcion: string;
  cantidad?: number;
  unidad?: string;
  importe: number;
  tipo: 'remunerativo' | 'no_remunerativo' | 'deduccion';
}

interface IRegistroEmpleado {
  cuil: string;
  apellido: string;
  nombre: string;
  fechaIngreso: string;
  tipoContrato: string;
  categoriaConvenio: string;
  obraSocial: string;
  diasTrabajados: number;
  conceptos: ILineaLibro[];
  totalRemunerativo: number;
  totalNoRemunerativo: number;
  totalDeducciones: number;
  neto: number;
}

interface ILibroSueldosDigital {
  encabezado: {
    cuitEmpleador: string;
    razonSocial: string;
    domicilio: string;
    periodo: string;
    fechaGeneracion: Date;
    secuencial: number;
  };
  empleados: IRegistroEmpleado[];
  totalesGenerales: {
    cantidadEmpleados: number;
    totalRemunerativo: number;
    totalNoRemunerativo: number;
    totalDeducciones: number;
    totalNeto: number;
  };
  hash?: string;
}

/**
 * @desc    Generar Libro de Sueldos Digital para un período
 * @route   GET /api/libro-sueldos/generar/:periodoId
 * @access  Private (admin)
 */
export const generarLibroSueldos = async (req: Request, res: Response) => {
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
        message: 'El período debe estar cerrado para generar el Libro de Sueldos' 
      });
    }

    // Datos del empleador
    const cuitEmpleador = process.env.EMPRESA_CUIT || '30-12345678-9';
    const razonSocial = process.env.EMPRESA_RAZON_SOCIAL || 'MI EMPRESA S.R.L.';
    const domicilio = process.env.EMPRESA_DIRECCION || 'Av. Principal 1234';

    // Procesar empleados
    const empleadosLibro: IRegistroEmpleado[] = [];
    let totalRemunerativoGeneral = 0;
    let totalNoRemunerativoGeneral = 0;
    let totalDeduccionesGeneral = 0;
    let totalNetoGeneral = 0;

    const liquidacionesPagadas = periodo.liquidaciones.filter(
      (liq: any) => liq.estado === 'pagado'
    );

    for (const liq of liquidacionesPagadas) {
      const empleado = await Employee.findById((liq as any).empleadoId);
      if (!empleado) continue;
      
      // Solo empleados formales
      if (empleado.modalidadContratacion !== 'formal') continue;
      if (!empleado.cuit) continue;

      const conceptos: ILineaLibro[] = [];
      let totalRemunerativo = 0;
      let totalNoRemunerativo = 0;
      let totalDeducciones = 0;

      // Sueldo básico
      const sueldoBasePeriodo = periodo.tipo === 'quincenal' 
        ? (liq as any).sueldoBase / 2 
        : (liq as any).sueldoBase;

      conceptos.push({
        codigoConcepto: CODIGOS_CONCEPTO.SUELDO_BASICO,
        descripcion: 'Sueldo Básico',
        importe: sueldoBasePeriodo,
        tipo: 'remunerativo'
      });
      totalRemunerativo += sueldoBasePeriodo;

      // Adicionales
      if ((liq as any).adicionales && Array.isArray((liq as any).adicionales)) {
        for (const adicional of (liq as any).adicionales) {
          const codigo = mapearCodigoAdicional(adicional.concepto);
          conceptos.push({
            codigoConcepto: codigo,
            descripcion: adicional.concepto,
            importe: adicional.monto,
            tipo: 'remunerativo'
          });
          totalRemunerativo += adicional.monto;
        }
      }

      // Horas extra
      if ((liq as any).totalHorasExtra > 0) {
        conceptos.push({
          codigoConcepto: CODIGOS_CONCEPTO.HORAS_EXTRA_50,
          descripcion: 'Horas Extra',
          cantidad: (liq as any).horasExtra?.length || 0,
          unidad: 'HS',
          importe: (liq as any).totalHorasExtra,
          tipo: 'remunerativo'
        });
        totalRemunerativo += (liq as any).totalHorasExtra;
      }

      // SAC/Aguinaldo si corresponde
      if ((liq as any).aguinaldos > 0) {
        conceptos.push({
          codigoConcepto: CODIGOS_CONCEPTO.SAC,
          descripcion: 'SAC Proporcional',
          importe: (liq as any).aguinaldos,
          tipo: 'remunerativo'
        });
        totalRemunerativo += (liq as any).aguinaldos;
      }

      // Bonus/Gratificaciones
      if ((liq as any).bonus > 0) {
        conceptos.push({
          codigoConcepto: CODIGOS_CONCEPTO.GRATIFICACIONES,
          descripcion: 'Gratificación',
          importe: (liq as any).bonus,
          tipo: 'remunerativo'
        });
        totalRemunerativo += (liq as any).bonus;
      }

      // DEDUCCIONES
      // Jubilación (11%)
      const aporteJubilacion = totalRemunerativo * 0.11;
      conceptos.push({
        codigoConcepto: CODIGOS_CONCEPTO.JUBILACION,
        descripcion: 'Jubilación 11%',
        importe: aporteJubilacion,
        tipo: 'deduccion'
      });
      totalDeducciones += aporteJubilacion;

      // Obra Social (3%)
      const aporteOS = totalRemunerativo * 0.03;
      conceptos.push({
        codigoConcepto: CODIGOS_CONCEPTO.OBRA_SOCIAL,
        descripcion: 'Obra Social 3%',
        importe: aporteOS,
        tipo: 'deduccion'
      });
      totalDeducciones += aporteOS;

      // PAMI (3%)
      const aportePami = totalRemunerativo * 0.03;
      conceptos.push({
        codigoConcepto: CODIGOS_CONCEPTO.PAMI,
        descripcion: 'PAMI 3%',
        importe: aportePami,
        tipo: 'deduccion'
      });
      totalDeducciones += aportePami;

      // Sindicato (si aplica)
      const aporteSindicato = totalRemunerativo * 0.02;
      if (empleado.sindicato) {
        conceptos.push({
          codigoConcepto: CODIGOS_CONCEPTO.SINDICATO,
          descripcion: `Cuota sindical ${empleado.sindicato}`,
          importe: aporteSindicato,
          tipo: 'deduccion'
        });
        totalDeducciones += aporteSindicato;
      }

      // Descuentos adicionales
      if ((liq as any).descuentos > 0) {
        conceptos.push({
          codigoConcepto: CODIGOS_CONCEPTO.OTROS_DESCUENTOS,
          descripcion: 'Otros descuentos',
          importe: (liq as any).descuentos,
          tipo: 'deduccion'
        });
        totalDeducciones += (liq as any).descuentos;
      }

      // Neto
      const neto = totalRemunerativo + totalNoRemunerativo - totalDeducciones;

      // Construir registro del empleado
      const registroEmpleado: IRegistroEmpleado = {
        cuil: formatearCUIL(empleado.cuit),
        apellido: empleado.apellido,
        nombre: empleado.nombre,
        fechaIngreso: formatearFecha(empleado.fechaIngreso),
        tipoContrato: TIPOS_CONTRATO.INDETERMINADO,
        categoriaConvenio: empleado.categoriaConvenio || 'S/C',
        obraSocial: empleado.obraSocial?.numero || 'S/D',
        diasTrabajados: periodo.tipo === 'quincenal' ? 15 : 30,
        conceptos,
        totalRemunerativo: redondear(totalRemunerativo),
        totalNoRemunerativo: redondear(totalNoRemunerativo),
        totalDeducciones: redondear(totalDeducciones),
        neto: redondear(neto)
      };

      empleadosLibro.push(registroEmpleado);

      // Acumular totales generales
      totalRemunerativoGeneral += totalRemunerativo;
      totalNoRemunerativoGeneral += totalNoRemunerativo;
      totalDeduccionesGeneral += totalDeducciones;
      totalNetoGeneral += neto;
    }

    // Construir libro completo
    const libro: ILibroSueldosDigital = {
      encabezado: {
        cuitEmpleador: formatearCUIL(cuitEmpleador),
        razonSocial,
        domicilio,
        periodo: formatearPeriodo(periodo.fechaInicio),
        fechaGeneracion: new Date(),
        secuencial: 1
      },
      empleados: empleadosLibro,
      totalesGenerales: {
        cantidadEmpleados: empleadosLibro.length,
        totalRemunerativo: redondear(totalRemunerativoGeneral),
        totalNoRemunerativo: redondear(totalNoRemunerativoGeneral),
        totalDeducciones: redondear(totalDeduccionesGeneral),
        totalNeto: redondear(totalNetoGeneral)
      }
    };

    // Generar hash de integridad
    libro.hash = generarHashIntegridad(libro);

    res.json(libro);

  } catch (error) {
    console.error('Error al generar Libro de Sueldos:', error);
    res.status(500).json({ message: 'Error al generar Libro de Sueldos Digital' });
  }
};

/**
 * @desc    Exportar Libro de Sueldos en formato TXT (AFIP)
 * @route   GET /api/libro-sueldos/exportar-txt/:periodoId
 * @access  Private (admin)
 */
export const exportarLibroTXT = async (req: Request, res: Response) => {
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
      return res.status(400).json({ message: 'El período debe estar cerrado' });
    }

    const cuitEmpleador = (process.env.EMPRESA_CUIT || '30-12345678-9').replace(/-/g, '');
    const periodoAFIP = formatearPeriodo(periodo.fechaInicio);

    const lineas: string[] = [];

    // Registro tipo 1: Encabezado empleador
    lineas.push(generarRegistro1(cuitEmpleador, periodoAFIP));

    // Procesar empleados
    const liquidacionesPagadas = periodo.liquidaciones.filter(
      (liq: any) => liq.estado === 'pagado'
    );

    let secuencia = 1;
    for (const liq of liquidacionesPagadas) {
      const empleado = await Employee.findById((liq as any).empleadoId);
      if (!empleado || empleado.modalidadContratacion !== 'formal') continue;
      if (!empleado.cuit) continue;

      const sueldoBasePeriodo = periodo.tipo === 'quincenal' 
        ? (liq as any).sueldoBase / 2 
        : (liq as any).sueldoBase;

      // Registro tipo 2: Datos empleado
      lineas.push(generarRegistro2(
        empleado,
        sueldoBasePeriodo,
        (liq as any).totalHorasExtra || 0,
        (liq as any).adicionales || [],
        (liq as any).descuentos || 0,
        periodo.tipo === 'quincenal' ? 15 : 30,
        secuencia++
      ));
    }

    // Registro tipo 3: Totales
    lineas.push(generarRegistro3(secuencia - 1));

    // Crear archivo
    const contenido = lineas.join('\r\n');
    const nombreArchivo = `LIBRO_SUELDOS_${cuitEmpleador}_${periodoAFIP}.txt`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    res.send(contenido);

  } catch (error) {
    console.error('Error al exportar Libro TXT:', error);
    res.status(500).json({ message: 'Error al exportar archivo TXT' });
  }
};

/**
 * @desc    Exportar Libro de Sueldos en formato Excel
 * @route   GET /api/libro-sueldos/exportar-excel/:periodoId
 * @access  Private (admin)
 */
export const exportarLibroExcel = async (req: Request, res: Response) => {
  try {
    const { periodoId } = req.params;

    if (!periodoId || !mongoose.Types.ObjectId.isValid(periodoId)) {
      return res.status(400).json({ message: 'ID de período inválido' });
    }

    const periodo = await LiquidacionPeriodo.findById(periodoId);
    if (!periodo) {
      return res.status(404).json({ message: 'Período no encontrado' });
    }

    // Para Excel, generamos un CSV que Excel puede abrir
    const cuitEmpleador = process.env.EMPRESA_CUIT || '30-12345678-9';
    const razonSocial = process.env.EMPRESA_RAZON_SOCIAL || 'MI EMPRESA S.R.L.';
    const periodoNombre = periodo.nombre;

    let csv = '';
    
    // Encabezado
    csv += `LIBRO DE SUELDOS DIGITAL\r\n`;
    csv += `Empleador: ${razonSocial}\r\n`;
    csv += `CUIT: ${cuitEmpleador}\r\n`;
    csv += `Período: ${periodoNombre}\r\n`;
    csv += `Fecha generación: ${new Date().toLocaleDateString('es-AR')}\r\n`;
    csv += `\r\n`;

    // Cabecera de columnas
    csv += `CUIL;Apellido;Nombre;Fecha Ingreso;Días;Sueldo Básico;Adicionales;Horas Extra;Bruto;Jubilación;O.Social;PAMI;Sindicato;Otros Desc.;Total Desc.;Neto\r\n`;

    const liquidacionesPagadas = periodo.liquidaciones.filter(
      (liq: any) => liq.estado === 'pagado'
    );

    for (const liq of liquidacionesPagadas) {
      const empleado = await Employee.findById((liq as any).empleadoId);
      if (!empleado || empleado.modalidadContratacion !== 'formal') continue;

      const sueldoBase = periodo.tipo === 'quincenal' 
        ? (liq as any).sueldoBase / 2 
        : (liq as any).sueldoBase;

      const adicionales = (liq as any).adicionales?.reduce((sum: number, a: any) => sum + a.monto, 0) || 0;
      const horasExtra = (liq as any).totalHorasExtra || 0;
      const bruto = sueldoBase + adicionales + horasExtra;
      
      const jubilacion = bruto * 0.11;
      const obraSocial = bruto * 0.03;
      const pami = bruto * 0.03;
      const sindicato = empleado.sindicato ? bruto * 0.02 : 0;
      const otrosDesc = (liq as any).descuentos || 0;
      const totalDesc = jubilacion + obraSocial + pami + sindicato + otrosDesc;
      const neto = bruto - totalDesc;

      csv += `${empleado.cuit || ''};`;
      csv += `${empleado.apellido};`;
      csv += `${empleado.nombre};`;
      csv += `${formatearFecha(empleado.fechaIngreso)};`;
      csv += `${periodo.tipo === 'quincenal' ? 15 : 30};`;
      csv += `${redondear(sueldoBase)};`;
      csv += `${redondear(adicionales)};`;
      csv += `${redondear(horasExtra)};`;
      csv += `${redondear(bruto)};`;
      csv += `${redondear(jubilacion)};`;
      csv += `${redondear(obraSocial)};`;
      csv += `${redondear(pami)};`;
      csv += `${redondear(sindicato)};`;
      csv += `${redondear(otrosDesc)};`;
      csv += `${redondear(totalDesc)};`;
      csv += `${redondear(neto)}\r\n`;
    }

    const nombreArchivo = `Libro_Sueldos_${periodoNombre.replace(/\s/g, '_')}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    res.send('\uFEFF' + csv); // BOM para Excel

  } catch (error) {
    console.error('Error al exportar Excel:', error);
    res.status(500).json({ message: 'Error al exportar archivo Excel' });
  }
};

/**
 * @desc    Preview del Libro de Sueldos
 * @route   GET /api/libro-sueldos/preview/:periodoId
 * @access  Private
 */
export const previewLibroSueldos = async (req: Request, res: Response) => {
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

    let empleadosFormales = 0;
    let empleadosSinCuil: string[] = [];
    let totalBruto = 0;

    for (const liq of liquidacionesPagadas) {
      const empleado = await Employee.findById((liq as any).empleadoId);
      if (!empleado) continue;

      if (empleado.modalidadContratacion === 'formal') {
        if (!empleado.cuit) {
          empleadosSinCuil.push(`${empleado.apellido}, ${empleado.nombre}`);
        } else {
          empleadosFormales++;
          const sueldoBase = periodo.tipo === 'quincenal' 
            ? (liq as any).sueldoBase / 2 
            : (liq as any).sueldoBase;
          totalBruto += sueldoBase + ((liq as any).totalHorasExtra || 0);
        }
      }
    }

    res.json({
      periodo: {
        id: periodo._id,
        nombre: periodo.nombre,
        tipo: periodo.tipo,
        estado: periodo.estado
      },
      resumen: {
        empleadosFormales,
        empleadosSinCuil,
        totalBrutoEstimado: redondear(totalBruto)
      },
      advertencias: empleadosSinCuil.length > 0 
        ? `${empleadosSinCuil.length} empleado(s) sin CUIL` 
        : null,
      listoParaGenerar: periodo.estado === 'cerrado' && empleadosSinCuil.length === 0,
      formatosDisponibles: ['json', 'txt', 'excel']
    });

  } catch (error) {
    console.error('Error en preview:', error);
    res.status(500).json({ message: 'Error al generar preview' });
  }
};

/**
 * @desc    Historial de libros generados
 * @route   GET /api/libro-sueldos/historial
 * @access  Private
 */
export const getHistorialLibros = async (req: Request, res: Response) => {
  try {
    const { anio } = req.query;
    const anioFiltro = anio ? parseInt(anio as string) : new Date().getFullYear();

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
      cantidadLiquidaciones: p.liquidaciones.filter((l: any) => l.estado === 'pagado').length,
      urls: {
        preview: `/api/libro-sueldos/preview/${p._id}`,
        json: `/api/libro-sueldos/generar/${p._id}`,
        txt: `/api/libro-sueldos/exportar-txt/${p._id}`,
        excel: `/api/libro-sueldos/exportar-excel/${p._id}`
      }
    }));

    res.json({
      anio: anioFiltro,
      totalPeriodos: historial.length,
      periodos: historial
    });

  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ message: 'Error al obtener historial' });
  }
};

// =====================================================
// FUNCIONES AUXILIARES
// =====================================================

function formatearCUIL(cuil: string): string {
  const limpio = cuil.replace(/-/g, '');
  if (limpio.length !== 11) return cuil;
  return `${limpio.slice(0, 2)}-${limpio.slice(2, 10)}-${limpio.slice(10)}`;
}

function formatearFecha(fecha: string | Date): string {
  const d = new Date(fecha);
  return d.toLocaleDateString('es-AR');
}

function formatearPeriodo(fecha: Date): string {
  const d = new Date(fecha);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function redondear(num: number): number {
  return Math.round(num * 100) / 100;
}

function mapearCodigoAdicional(concepto: string): string {
  const lower = concepto.toLowerCase();
  if (lower.includes('antigüedad') || lower.includes('antiguedad')) return CODIGOS_CONCEPTO.ADICIONAL_ANTIGUEDAD;
  if (lower.includes('presentismo')) return CODIGOS_CONCEPTO.ADICIONAL_PRESENTISMO;
  if (lower.includes('título') || lower.includes('titulo')) return CODIGOS_CONCEPTO.ADICIONAL_TITULO;
  if (lower.includes('zona')) return CODIGOS_CONCEPTO.ZONA_DESFAVORABLE;
  return CODIGOS_CONCEPTO.OTROS_CONCEPTOS_REM;
}

function generarHashIntegridad(libro: ILibroSueldosDigital): string {
  // Hash simple para integridad (en producción usar crypto)
  const datos = JSON.stringify({
    cuit: libro.encabezado.cuitEmpleador,
    periodo: libro.encabezado.periodo,
    total: libro.totalesGenerales.totalNeto,
    empleados: libro.totalesGenerales.cantidadEmpleados
  });
  let hash = 0;
  for (let i = 0; i < datos.length; i++) {
    const char = datos.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).toUpperCase();
}

function generarRegistro1(cuit: string, periodo: string): string {
  // Registro tipo 1 - Encabezado
  const tipo = '1';
  const cuitPadded = cuit.padStart(11, '0');
  const periodoPadded = periodo.padStart(6, '0');
  const version = '001';
  const relleno = ' '.repeat(180);
  return `${tipo}${cuitPadded}${periodoPadded}${version}${relleno}`;
}

function generarRegistro2(
  empleado: any,
  sueldoBase: number,
  horasExtra: number,
  adicionales: any[],
  descuentos: number,
  dias: number,
  secuencia: number
): string {
  // Registro tipo 2 - Empleado
  const tipo = '2';
  const cuil = (empleado.cuit || '').replace(/-/g, '').padStart(11, '0');
  const apellido = empleado.apellido.substring(0, 20).padEnd(20, ' ');
  const nombre = empleado.nombre.substring(0, 20).padEnd(20, ' ');
  const diasStr = String(dias).padStart(2, '0');
  const sueldoStr = String(Math.round(sueldoBase * 100)).padStart(12, '0');
  const horasStr = String(Math.round(horasExtra * 100)).padStart(12, '0');
  const adicionalesTotal = adicionales.reduce((sum, a) => sum + a.monto, 0);
  const adicStr = String(Math.round(adicionalesTotal * 100)).padStart(12, '0');
  const secStr = String(secuencia).padStart(5, '0');
  const relleno = ' '.repeat(86);
  
  return `${tipo}${cuil}${apellido}${nombre}${diasStr}${sueldoStr}${horasStr}${adicStr}${secStr}${relleno}`;
}

function generarRegistro3(cantidadEmpleados: number): string {
  // Registro tipo 3 - Totales
  const tipo = '3';
  const cantidad = String(cantidadEmpleados).padStart(6, '0');
  const relleno = ' '.repeat(193);
  return `${tipo}${cantidad}${relleno}`;
}
