import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, Divider, Grid, FormControlLabel, Switch } from '@mui/material';
import { Print as PrintIcon, PictureAsPdf as PdfIcon } from '@mui/icons-material';
import { 
  LiquidacionEmpleado, 
  LiquidacionPeriodo, 
  DescuentoEmpleado, 
  IncentivoEmpleado, 
  TIPOS_DESCUENTO, 
  TIPOS_INCENTIVO,
  APORTES_EMPLEADO,
  ADICIONALES_LEGALES
} from '../types';
import { formatCurrency, formatDateForDisplay } from '../utils/formatters';
// Nota: ReciboSueldo ya no ejecuta el cálculo; debe recibir `calculados` desde la página de liquidación.

interface ReciboSueldoProps {
  liquidacion: LiquidacionEmpleado;
  periodo: LiquidacionPeriodo;
  open: boolean;
  onClose: () => void;
  descuentosDetalle?: DescuentoEmpleado[];
  incentivosDetalle?: IncentivoEmpleado[];
  incluirAportes?: boolean; // Si incluir aportes legales
  // Valores dinámicos que pueden venir desde el frontend (fuente de verdad)
  adicionalPresentismo?: number;
  adicionalAntiguedad?: number;
  adicionalZona?: number;
  // Objeto calculado por el frontend (fuente de verdad completa). Si está presente, usar sus totales sin recomputar.
  calculados?: any;
}

const ReciboSueldo: React.FC<ReciboSueldoProps> = ({ 
  liquidacion, 
  periodo, 
  open, 
  onClose, 
  descuentosDetalle = [], 
  incentivosDetalle = [],
  incluirAportes: incluirAportesInitial,
  adicionalPresentismo: adicionalPresentismoProp,
  adicionalAntiguedad: adicionalAntiguedadProp,
  adicionalZona: adicionalZonaProp,
  calculados: calculadosProp
}) => {
  
  // Usar la modalidad del empleado para determinar si incluir aportes
  // Si empleadoModalidad === 'formal', incluir aportes automáticamente
  const esEmpleadoFormal = liquidacion.empleadoModalidad === 'formal';
  
  // Estado para controlar si se incluyen aportes (inicializado según modalidad)
  const [incluirAportes, setIncluirAportes] = useState(
    incluirAportesInitial !== undefined ? incluirAportesInitial : esEmpleadoFormal
  );

  // Calcular totales de descuentos e incentivos
  const totalDescuentosDetalle = descuentosDetalle.reduce((sum, d) => sum + Math.abs(d.montoCalculado ?? d.monto ?? 0), 0);
  const totalIncentivosDetalle = incentivosDetalle.reduce((sum, i) => sum + (i.montoCalculado || i.monto), 0);

  // Totales desde la liquidación (legacy o calculados)
  const incentivos = liquidacion.incentivos || 0;
  // Si hay detalles, el total es la suma de ellos; si no, miramos el campo totalizado
  const totalIncentivos = (incentivosDetalle.length > 0) ? totalIncentivosDetalle : (liquidacion.incentivos || 0);

  const empleadoData: any = {
    fechaIngreso: (liquidacion as any).empleadoFechaIngreso || liquidacion.empleadoFechaIngreso,
    modalidadContratacion: (liquidacion as any).empleadoModalidad || liquidacion.empleadoModalidad,
    sindicato: (liquidacion as any).empleadoSindicato || liquidacion.empleadoSindicato,
    aplicaAntiguedad: (liquidacion as any).aplicaAntiguedad,
    aplicaPresentismo: (liquidacion as any).aplicaPresentismo,
    aplicaZonaPeligrosa: (liquidacion as any).aplicaZonaPeligrosa
  };

  // Fuente de verdad: si la página de liquidación pasó `calculados`, usarlo; si no, mapear desde `liquidacion`.
  const enriched = (liquidacion as any) || {};
  const hasCalculados = calculadosProp !== undefined && calculadosProp !== null;
  const sourceTotals = hasCalculados ? calculadosProp : enriched;

  // Totales y montos mapeados
  const sueldoBasePeriodo = (sourceTotals && typeof sourceTotals.sueldoBasePeriodo === 'number')
    ? sourceTotals.sueldoBasePeriodo
    : (periodo.tipo === 'quincenal' ? ((enriched.sueldoBase ?? 0) / 2) : (enriched.sueldoBase ?? 0));

  const adicionalAntiguedadAmount = (sourceTotals && (typeof sourceTotals.adicionalAntiguedad === 'number')) ? sourceTotals.adicionalAntiguedad : (adicionalAntiguedadProp ?? enriched.adicionalAntiguedad ?? 0);
  const adicionalPresentismoAmount = (sourceTotals && (typeof sourceTotals.adicionalPresentismo === 'number')) ? sourceTotals.adicionalPresentismo : (adicionalPresentismoProp ?? enriched.adicionalPresentismo ?? 0);
  const adicionalZonaAmount = (sourceTotals && (typeof sourceTotals.adicionalZona === 'number')) ? sourceTotals.adicionalZona : (adicionalZonaProp ?? enriched.adicionalZona ?? 0);
  
  // Base Imponible: recalcular visualmente si faltan datos
  const baseImponible = sourceTotals?.baseImponible ?? 0;

  const aportes = incluirAportes ? {
    jubilacion: sourceTotals?.aporteJubilacion ?? enriched.aporteJubilacion ?? 0,
    obraSocial: sourceTotals?.aporteObraSocial ?? enriched.aporteObraSocial ?? 0,
    pami: sourceTotals?.aportePami ?? enriched.aportePami ?? 0,
    sindicato: sourceTotals?.aporteSindicato ?? enriched.aporteSindicato ?? 0,
  } : { jubilacion: 0, obraSocial: 0, pami: 0, sindicato: 0 };

  const totalAportes = sourceTotals?.totalAportes ?? (aportes.jubilacion + aportes.obraSocial + aportes.pami + aportes.sindicato);

  // Totales explícitos
  const enrichedTotalAPagar = (sourceTotals && typeof sourceTotals.totalAPagar === 'number') ? sourceTotals.totalAPagar : undefined;
  const enrichedTotalAportes = (sourceTotals && typeof sourceTotals.totalAportes === 'number') ? sourceTotals.totalAportes : undefined;

  // Total de descuentos para mostrar en PDF/HTML
  // Si hay detalles, usamos la suma. Si no, usamos el total guardado.
  // IMPORTANTE: si usamos calculadosProp y trae 'descuentos', usamos ese.
  let totalDescuentosVisual = (descuentosDetalle.length > 0) 
    ? totalDescuentosDetalle 
    : (sourceTotals?.descuentos ? Math.abs(sourceTotals.descuentos) : Math.abs(liquidacion.descuentos || 0));

  const generarPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginLeft = 12;
    const marginRight = pageWidth - 12;
    const colMid = pageWidth / 2;
    let yPos = 12;

    // ============ ENCABEZADO ============
    doc.setFillColor(240, 240, 240);
    doc.rect(marginLeft, yPos - 4, pageWidth - 24, 22, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('RECIBO DE HABERES', colMid, yPos + 4, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${periodo.nombre}`, colMid, yPos + 10, { align: 'center' });
    doc.text(
      `${formatDateForDisplay(periodo.fechaInicio)} al ${formatDateForDisplay(periodo.fechaFin)}`,
      colMid,
      yPos + 14,
      { align: 'center' }
    );
    yPos += 24;

    // ============ DATOS DEL EMPLEADO ============
    doc.setLineWidth(0.3);
    doc.line(marginLeft, yPos, marginRight, yPos);
    yPos += 6;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('DATOS DEL TRABAJADOR', marginLeft, yPos);
    yPos += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    // Columna izquierda
    doc.text(`Apellido y Nombre: ${liquidacion.empleadoApellido}, ${liquidacion.empleadoNombre}`, marginLeft, yPos);
    yPos += 4;
    
    if (liquidacion.empleadoDocumento || liquidacion.empleadoCuit) {
      doc.text(`DNI/CUIT: ${liquidacion.empleadoCuit || liquidacion.empleadoDocumento || '-'}`, marginLeft, yPos);
      doc.text(`Legajo: ${liquidacion.empleadoLegajo || '-'}`, colMid + 10, yPos - 4);
    }
    yPos += 4;
    
    if (liquidacion.empleadoPuesto) {
      doc.text(`Puesto: ${liquidacion.empleadoPuesto}`, marginLeft, yPos);
    }
    if (liquidacion.empleadoCategoria) {
      doc.text(`Categoría: ${liquidacion.empleadoCategoria}`, colMid + 10, yPos);
    }
    yPos += 4;

    if (liquidacion.empleadoFechaIngreso) {
      doc.text(`Fecha Ingreso: ${formatDateForDisplay(liquidacion.empleadoFechaIngreso)}`, marginLeft, yPos);
    }
    if (liquidacion.empleadoAntiguedad !== undefined) {
      doc.text(`Antigüedad: ${liquidacion.empleadoAntiguedad} años`, colMid + 10, yPos);
    }
    yPos += 4;

    if (liquidacion.empleadoObraSocial) {
      doc.text(`Obra Social: ${liquidacion.empleadoObraSocial}`, marginLeft, yPos);
    }
    if (liquidacion.empleadoSindicato) {
      doc.text(`Sindicato: ${liquidacion.empleadoSindicato}`, colMid + 10, yPos);
    }
    yPos += 6;

    // ============ TABLA DE CONCEPTOS ============
    doc.setLineWidth(0.5);
    doc.line(marginLeft, yPos, marginRight, yPos);
    yPos += 1;

    // Encabezado de tabla
    doc.setFillColor(220, 220, 220);
    doc.rect(marginLeft, yPos, pageWidth - 24, 6, 'F');
    yPos += 4;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('CONCEPTO', marginLeft + 2, yPos);
    doc.text('CANT.', 95, yPos, { align: 'center' });
    doc.text('HABERES', 130, yPos, { align: 'right' });
    doc.text('DEDUCCIONES', marginRight - 2, yPos, { align: 'right' });
    yPos += 4;

    doc.setLineWidth(0.3);
    doc.line(marginLeft, yPos, marginRight, yPos);
    yPos += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    let totalHaberes = 0;
    let totalDeducciones = 0;

    // -------- HABERES --------
    // Sueldo básico (ajustado por período)
    doc.text('Sueldo Básico', marginLeft + 2, yPos);
    doc.text('30', 95, yPos, { align: 'center' });
    doc.text(formatCurrency(sueldoBasePeriodo), 130, yPos, { align: 'right' });
    totalHaberes += sueldoBasePeriodo;
    yPos += 4; 

    // Adicional por antigüedad (ajustado por período)
    if (adicionalAntiguedadAmount && adicionalAntiguedadAmount > 0) {
      doc.text('Adicional Antigüedad', marginLeft + 2, yPos);
      doc.text(`${liquidacion.empleadoAntiguedad || 0} años`, 95, yPos, { align: 'center' });
      doc.text(formatCurrency(adicionalAntiguedadAmount), 130, yPos, { align: 'right' });
      totalHaberes += adicionalAntiguedadAmount;
      yPos += 4;
    }

    // Adicional presentismo (ajustado por período)
    if (adicionalPresentismoAmount && adicionalPresentismoAmount > 0) {
      doc.text('Presentismo', marginLeft + 2, yPos);
      // Mostrar el porcentaje dinámico desde ADICIONALES_LEGALES
      doc.text(`${ADICIONALES_LEGALES.PRESENTISMO}%`, 95, yPos, { align: 'center' });
      doc.text(formatCurrency(adicionalPresentismoAmount), 130, yPos, { align: 'right' });
      totalHaberes += adicionalPresentismoAmount;
      yPos += 4;
    }

    // Adicional zona peligrosa (ajustado por período)
    if (adicionalZonaAmount && adicionalZonaAmount > 0) {
      doc.text('Zona peligrosa', marginLeft + 2, yPos);
      doc.text('-', 95, yPos, { align: 'center' });
      doc.text(formatCurrency(adicionalZonaAmount), 130, yPos, { align: 'right' });
      totalHaberes += adicionalZonaAmount;
      yPos += 4;
    }

    // Horas extra
    if (liquidacion.horasExtra && liquidacion.horasExtra.length > 0) {
      const totalHorasQty = liquidacion.horasExtra.reduce((sum, he) => sum + he.cantidadHoras, 0);
      doc.text('Horas Extra 50%', marginLeft + 2, yPos);
      doc.text(`${totalHorasQty} hs`, 95, yPos, { align: 'center' });
      doc.text(formatCurrency(liquidacion.totalHorasExtra), 130, yPos, { align: 'right' });
      totalHaberes += liquidacion.totalHorasExtra;
      yPos += 4;
    }

    // SAC (Aguinaldo)
    if (liquidacion.aguinaldos > 0) {
      doc.text('S.A.C. (Aguinaldo)', marginLeft + 2, yPos);
      doc.text('-', 95, yPos, { align: 'center' });
      doc.text(formatCurrency(liquidacion.aguinaldos), 130, yPos, { align: 'right' });
      totalHaberes += liquidacion.aguinaldos;
      yPos += 4;
    }

    // incentivos/Premios (Manual legacy o fijo)
    if (incentivos > 0) {
      doc.text('Premios/incentivos', marginLeft + 2, yPos);
      doc.text('-', 95, yPos, { align: 'center' });
      doc.text(formatCurrency(incentivos), 130, yPos, { align: 'right' });
      totalHaberes += incentivos;
      yPos += 4;
    }

    // Incentivos detallados
    if (incentivosDetalle.length > 0) {
      incentivosDetalle.forEach(incentivo => {
        const tipoLabel = TIPOS_INCENTIVO[incentivo.tipo as keyof typeof TIPOS_INCENTIVO] || incentivo.tipo;
        const monto = incentivo.montoCalculado || incentivo.monto;
        doc.text(`Incentivo: ${tipoLabel}`, marginLeft + 2, yPos);
        doc.text(incentivo.esPorcentaje ? `${incentivo.monto}%` : '-', 95, yPos, { align: 'center' });
        doc.text(formatCurrency(monto), 130, yPos, { align: 'right' });
        totalHaberes += monto;
        yPos += 4;
      });
    } else if (totalIncentivos > 0) {
      // Caso fallback: hay totalIncentivos pero no detalle (legacy)
      doc.text('Total Incentivos', marginLeft + 2, yPos);
      doc.text('-', 95, yPos, { align: 'center' });
      doc.text(formatCurrency(totalIncentivos), 130, yPos, { align: 'right' });
      totalHaberes += totalIncentivos;
      yPos += 4;
    }

    // Viáticos (no remunerativo)
    if (liquidacion.viaticos && liquidacion.viaticos > 0) {
      doc.text('Viáticos (No Rem.)', marginLeft + 2, yPos);
      doc.text('-', 95, yPos, { align: 'center' });
      doc.text(formatCurrency(liquidacion.viaticos), 130, yPos, { align: 'right' });
      totalHaberes += liquidacion.viaticos;
      yPos += 4;
    }

    // Otros adicionales
    if (liquidacion.otrosAdicionales && liquidacion.otrosAdicionales > 0) {
      doc.text('Otros Adicionales', marginLeft + 2, yPos);
      doc.text('-', 95, yPos, { align: 'center' });
      doc.text(formatCurrency(liquidacion.otrosAdicionales), 130, yPos, { align: 'right' });
      totalHaberes += liquidacion.otrosAdicionales;
      yPos += 4;
    }

    // -------- DEDUCCIONES --------
    // Aportes jubilatorios
    if (incluirAportes && aportes.jubilacion > 0) {
      doc.text('Jubilación (11%)', marginLeft + 2, yPos);
      doc.text(formatCurrency(aportes.jubilacion), marginRight - 2, yPos, { align: 'right' });
      totalDeducciones += aportes.jubilacion;
      yPos += 4;
    }

    // Obra Social
    if (incluirAportes && aportes.obraSocial > 0) {
      doc.text('Obra Social (3%)', marginLeft + 2, yPos);
      doc.text(formatCurrency(aportes.obraSocial), marginRight - 2, yPos, { align: 'right' });
      totalDeducciones += aportes.obraSocial;
      yPos += 4;
    }

    // PAMI
    if (incluirAportes && aportes.pami > 0) {
      doc.text('Ley 19.032 PAMI (3%)', marginLeft + 2, yPos);
      doc.text(formatCurrency(aportes.pami), marginRight - 2, yPos, { align: 'right' });
      totalDeducciones += aportes.pami;
      yPos += 4;
    }

    // Sindicato
    if (incluirAportes && aportes.sindicato > 0) {
      doc.text('Cuota Sindical (2%)', marginLeft + 2, yPos);
      doc.text(formatCurrency(aportes.sindicato), marginRight - 2, yPos, { align: 'right' });
      totalDeducciones += aportes.sindicato;
      yPos += 4;
    }

    // Adelantos
    if (liquidacion.adelantos > 0) {
      doc.text('Adelantos', marginLeft + 2, yPos);
      doc.text(formatCurrency(liquidacion.adelantos), marginRight - 2, yPos, { align: 'right' });
      totalDeducciones += liquidacion.adelantos;
      yPos += 4;
    }

    // Descuentos personalizados
    if (descuentosDetalle.length > 0) {
      descuentosDetalle.forEach(descuento => {
        const tipoLabel = TIPOS_DESCUENTO[descuento.tipo as keyof typeof TIPOS_DESCUENTO] || descuento.tipo;
        const rawMonto = descuento.montoCalculado ?? descuento.monto ?? 0;
        const monto = Math.abs(rawMonto);
        doc.text(`Desc: ${tipoLabel}`, marginLeft + 2, yPos);
        doc.text(formatCurrency(monto), marginRight - 2, yPos, { align: 'right' });
        totalDeducciones += monto;
        yPos += 4;
      });
    } else if (totalDescuentosVisual > 0) {
      // Fallback: solo mostrar total si no hay desglose
      doc.text('Otros Descuentos', marginLeft + 2, yPos);
      doc.text(formatCurrency(totalDescuentosVisual), marginRight - 2, yPos, { align: 'right' });
      totalDeducciones += totalDescuentosVisual;
      yPos += 4;
    }
    // (Ya no usamos el bloque else-if antiguo que sumaba siempre totalDescuentosVisual si length===0)

    yPos += 2;

    // ============ TOTALES ============
    doc.setLineWidth(0.5);
    doc.line(marginLeft, yPos, marginRight, yPos);
    yPos += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    
    // Fila de totales
    doc.text('TOTALES', marginLeft + 2, yPos);
    doc.text(formatCurrency(totalHaberes), 130, yPos, { align: 'right' });
    doc.text(formatCurrency(totalDeducciones), marginRight - 2, yPos, { align: 'right' });
    yPos += 6;

    // Línea doble
    doc.setLineWidth(0.3);
    doc.line(marginLeft, yPos, marginRight, yPos);
    yPos += 1;
    doc.line(marginLeft, yPos, marginRight, yPos);
    yPos += 6;

    // NETO A COBRAR
    doc.setFillColor(230, 245, 230);
    doc.rect(marginLeft, yPos - 4, pageWidth - 24, 10, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    const netoACobrar = totalHaberes - totalDeducciones;
    // Preferir el total calculado por el util; si no existe, usar la suma local
    const netoPreferido = (typeof enrichedTotalAPagar === 'number')
      ? enrichedTotalAPagar
      : netoACobrar;
    // Si el usuario eligió NO incluir aportes, mostrar el neto sin aportes (sumar aportes de nuevo)
    const netoParaMostrarPDF = incluirAportes ? netoPreferido : (netoPreferido + (typeof enrichedTotalAportes === 'number' ? enrichedTotalAportes : totalAportes));

    doc.text('NETO A COBRAR:', marginLeft + 5, yPos + 2);
    doc.text(`$ ${formatCurrency(netoParaMostrarPDF > 0 ? netoParaMostrarPDF : (liquidacion.totalAPagar || 0))}`, marginRight - 5, yPos + 2, { align: 'right' });
    yPos += 12;

    // ============ FORMA DE PAGO ============
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    
    if (liquidacion.fechaPago) {
      doc.text(`Fecha de Pago: ${formatDateForDisplay(liquidacion.fechaPago)}`, marginLeft, yPos);
    }
    doc.text(`Medio de Pago: ${liquidacion.medioDePago || 'EFECTIVO'}`, colMid, yPos);
    yPos += 4;
    
    if (liquidacion.banco && liquidacion.banco !== 'EFECTIVO') {
      doc.text(`Banco: ${liquidacion.banco}`, marginLeft, yPos);
      yPos += 4;
    }

    // ============ OBSERVACIONES ============
    if (liquidacion.observaciones) {
      yPos += 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('Observaciones:', marginLeft, yPos);
      yPos += 4;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      const observacionesLines = doc.splitTextToSize(liquidacion.observaciones, pageWidth - 30);
      doc.text(observacionesLines, marginLeft, yPos);
      yPos += (observacionesLines.length * 3) + 2;
    }

    // ============ CONTRIBUCIONES PATRONALES (opcional) ============
    if (incluirAportes && liquidacion.costoTotal) {
      yPos += 4;
      doc.setLineWidth(0.2);
      doc.setDrawColor(180, 180, 180);
      doc.line(marginLeft, yPos, marginRight, yPos);
      yPos += 4;
      
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text('Información adicional - Contribuciones Patronales:', marginLeft, yPos);
      yPos += 3;
      doc.text(`Costo Total Empresa: $ ${formatCurrency(liquidacion.costoTotal)}`, marginLeft, yPos);
      doc.setTextColor(0, 0, 0);
    }

    // ============ FIRMAS ============
    yPos = doc.internal.pageSize.getHeight() - 35;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setDrawColor(0, 0, 0);
    
    doc.setLineWidth(0.3);
    doc.line(20, yPos, 80, yPos);
    doc.line(130, yPos, 190, yPos);
    yPos += 4;
    
    doc.text('Firma del Trabajador', 50, yPos, { align: 'center' });
    doc.text('Firma y Sello del Empleador', 160, yPos, { align: 'center' });
    yPos += 4;
    doc.setFontSize(7);
    doc.text(`DNI: ${liquidacion.empleadoDocumento || '________________'}`, 50, yPos, { align: 'center' });
    
    // Footer
    yPos = doc.internal.pageSize.getHeight() - 10;
    doc.setFontSize(6);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Recibo generado el ${new Date().toLocaleDateString('es-AR')} - Este documento es válido como comprobante de pago`,
      colMid,
      yPos,
      { align: 'center' }
    );

    return doc;
  };

  const handleDescargarPDF = () => {
    const doc = generarPDF();
    const nombreArchivo = `Recibo_${liquidacion.empleadoApellido}_${liquidacion.empleadoNombre}_${periodo.nombre.replace(/\s+/g, '_')}.pdf`;
    doc.save(nombreArchivo);
  };

  const handleImprimir = () => {
    const doc = generarPDF();
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    const printWindow = window.open(pdfUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const handleVer = () => {
    const doc = generarPDF();
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
  };

  // Calcular neto para mostrar en el dialog
  // Mostrar el neto usando el calculador central cuando esté disponible.
  // Si `incluirAportes` es false, sumar los aportes al totalAPagar para mostrar el neto sin aportes.
  const netoMostrar = (() => {
    if (typeof enrichedTotalAPagar === 'number') {
      return incluirAportes ? enrichedTotalAPagar : (enrichedTotalAPagar + (typeof enrichedTotalAportes === 'number' ? enrichedTotalAportes : totalAportes));
    }

    // Fallback legacy: calcular a mano si no hay enriched
    if (incluirAportes) {
      return (sueldoBasePeriodo + liquidacion.totalHorasExtra + adicionalAntiguedadAmount + adicionalPresentismoAmount + adicionalZonaAmount + liquidacion.aguinaldos + incentivos + totalIncentivos - totalAportes - liquidacion.adelantos - totalDescuentosVisual);
    }
    return liquidacion.totalAPagar;
  })();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
        Recibo de Haberes
      </DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Typography variant="h6" gutterBottom>
            {liquidacion.empleadoApellido}, {liquidacion.empleadoNombre}
          </Typography>
          
          <Grid container spacing={1} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Período: {periodo.nombre}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                {formatDateForDisplay(periodo.fechaInicio)} - {formatDateForDisplay(periodo.fechaFin)}
              </Typography>
            </Grid>
            {liquidacion.empleadoLegajo && (
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Legajo: {liquidacion.empleadoLegajo}
                </Typography>
              </Grid>
            )}
          </Grid>

          <Divider sx={{ my: 2 }} />

          {/* Resumen de conceptos */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Resumen de Haberes
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">Sueldo Básico:</Typography>
              <Typography variant="body2">$ {formatCurrency(sueldoBasePeriodo)}</Typography>
            </Box>
            {liquidacion.totalHorasExtra > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Horas Extra:</Typography>
                <Typography variant="body2">$ {formatCurrency(liquidacion.totalHorasExtra)}</Typography>
              </Box>
            )}
            {incentivos > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="success.main">Incentivos:</Typography>
                <Typography variant="body2" color="success.main">$ {formatCurrency(incentivos)}</Typography>
              </Box>
            )}
            {totalIncentivos > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="success.main">Incentivos:</Typography>
                <Typography variant="body2" color="success.main">$ {formatCurrency(totalIncentivos)}</Typography>
              </Box>
            )} 

            {adicionalPresentismoAmount > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Presentismo ({ADICIONALES_LEGALES.PRESENTISMO}%):</Typography>
                <Typography variant="body2">$ {formatCurrency(adicionalPresentismoAmount)}</Typography>
              </Box>
            )}

            {adicionalZonaAmount > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Zona peligrosa:</Typography>
                <Typography variant="body2">$ {formatCurrency(adicionalZonaAmount)}</Typography>
              </Box>
            )}
          </Box>

          {incluirAportes && totalAportes > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Aportes Legales
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="error.main">Total Aportes (17%):</Typography>
                <Typography variant="body2" color="error.main">-$ {formatCurrency(totalAportes)}</Typography>
              </Box>
            </Box>
          )}

          {(liquidacion.adelantos > 0 || totalDescuentosVisual > 0) && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Otras Deducciones
              </Typography>
              {liquidacion.adelantos > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="warning.main">Adelantos:</Typography>
                  <Typography variant="body2" color="warning.main">-$ {formatCurrency(liquidacion.adelantos)}</Typography>
                </Box>
              )}
              {totalDescuentosVisual > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="error.main">Descuentos:</Typography>
                  <Typography variant="body2" color="error.main">-$ {formatCurrency(totalDescuentosVisual)}</Typography>
                </Box>
              )}
            </Box>
          )}

          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
            <Typography variant="h5" color="success.dark" fontWeight="bold" textAlign="center">
              NETO: $ {formatCurrency(netoMostrar > 0 ? netoMostrar : liquidacion.totalAPagar)}
            </Typography>
          </Box>

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              {esEmpleadoFormal 
                ? '📋 Empleado formal - Aportes habilitados por defecto'
                : '💵 Empleado informal - Sin aportes por defecto'}
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={incluirAportes}
                  onChange={(e) => setIncluirAportes(e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="caption">Incluir aportes legales</Typography>}
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose}>Cerrar</Button>
        <Button
          variant="outlined"
          startIcon={<PrintIcon />}
          onClick={handleImprimir}
        >
          Imprimir
        </Button>
        <Button
          variant="outlined"
          startIcon={<PdfIcon />}
          onClick={handleVer}
        >
          Ver PDF
        </Button>
        <Button
          variant="contained"
          startIcon={<PdfIcon />}
          onClick={handleDescargarPDF}
        >
          Descargar PDF
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReciboSueldo;
