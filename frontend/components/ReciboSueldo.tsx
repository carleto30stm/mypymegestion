import React from 'react';
import { jsPDF } from 'jspdf';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography } from '@mui/material';
import { Print as PrintIcon, PictureAsPdf as PdfIcon } from '@mui/icons-material';
import { LiquidacionEmpleado, LiquidacionPeriodo } from '../types';
import { formatCurrency, formatDateForDisplay } from '../utils/formatters';

interface ReciboSueldoProps {
  liquidacion: LiquidacionEmpleado;
  periodo: LiquidacionPeriodo;
  open: boolean;
  onClose: () => void;
}

const ReciboSueldo: React.FC<ReciboSueldoProps> = ({ liquidacion, periodo, open, onClose }) => {
  
  const generarPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Configurar fuente
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    
    // Título
    doc.text('RECIBO DE SUELDO', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${periodo.nombre}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
    doc.text(
      `${formatDateForDisplay(periodo.fechaInicio)} - ${formatDateForDisplay(periodo.fechaFin)}`,
      pageWidth / 2,
      yPos,
      { align: 'center' }
    );
    yPos += 15;

    // Línea separadora
    doc.setLineWidth(0.5);
    doc.line(15, yPos, pageWidth - 15, yPos);
    yPos += 10;

    // Datos del empleado
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('DATOS DEL EMPLEADO', 15, yPos);
    yPos += 8;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Apellido y Nombre:`, 15, yPos);
    doc.text(`${liquidacion.empleadoApellido}, ${liquidacion.empleadoNombre}`, 70, yPos);
    yPos += 6;
    
    if (liquidacion.fechaPago) {
      doc.text(`Fecha de Pago:`, 15, yPos);
      doc.text(formatDateForDisplay(liquidacion.fechaPago), 70, yPos);
      yPos += 6;
    }
    
    doc.text(`Medio de Pago:`, 15, yPos);
    doc.text(liquidacion.medioDePago || 'Efectivo', 70, yPos);
    yPos += 6;
    
    if (liquidacion.banco && liquidacion.banco !== 'EFECTIVO') {
      doc.text(`Banco:`, 15, yPos);
      doc.text(liquidacion.banco, 70, yPos);
      yPos += 6;
    }
    
    yPos += 5;

    // Línea separadora
    doc.setLineWidth(0.5);
    doc.line(15, yPos, pageWidth - 15, yPos);
    yPos += 10;

    // Detalle de conceptos
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('DETALLE DE LIQUIDACIÓN', 15, yPos);
    yPos += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    // Cabecera de tabla
    doc.setFont('helvetica', 'bold');
    doc.text('Concepto', 15, yPos);
    doc.text('Cantidad', 110, yPos);
    doc.text('Importe', 160, yPos, { align: 'right' });
    yPos += 2;
    doc.setLineWidth(0.3);
    doc.line(15, yPos, pageWidth - 15, yPos);
    yPos += 6;

    doc.setFont('helvetica', 'normal');

    // Sueldo base
    doc.text('Sueldo Base', 15, yPos);
    doc.text('1', 110, yPos);
    doc.text(`$ ${formatCurrency(liquidacion.sueldoBase)}`, 160, yPos, { align: 'right' });
    yPos += 6;

    // Horas extra
    if (liquidacion.horasExtra && liquidacion.horasExtra.length > 0) {
      const totalHorasQty = liquidacion.horasExtra.reduce((sum, he) => sum + he.cantidadHoras, 0);
      doc.text('Horas Extra', 15, yPos);
      doc.text(`${totalHorasQty} hs`, 110, yPos);
      doc.text(`$ ${formatCurrency(liquidacion.totalHorasExtra)}`, 160, yPos, { align: 'right' });
      yPos += 6;
    }

    // Aguinaldos
    if (liquidacion.aguinaldos > 0) {
      doc.text('Aguinaldos', 15, yPos);
      doc.text('1', 110, yPos);
      doc.text(`$ ${formatCurrency(liquidacion.aguinaldos)}`, 160, yPos, { align: 'right' });
      yPos += 6;
    }

    // Bonus
    if (liquidacion.bonus > 0) {
      doc.text('Bonus/Premios', 15, yPos);
      doc.text('1', 110, yPos);
      doc.text(`$ ${formatCurrency(liquidacion.bonus)}`, 160, yPos, { align: 'right' });
      yPos += 6;
    }

    yPos += 2;
    doc.setLineWidth(0.3);
    doc.line(15, yPos, pageWidth - 15, yPos);
    yPos += 6;

    // Subtotal haberes
    const subtotalHaberes = 
      liquidacion.sueldoBase +
      liquidacion.totalHorasExtra +
      liquidacion.aguinaldos +
      liquidacion.bonus;
    
    doc.setFont('helvetica', 'bold');
    doc.text('SUBTOTAL HABERES', 15, yPos);
    doc.text(`$ ${formatCurrency(subtotalHaberes)}`, 160, yPos, { align: 'right' });
    yPos += 10;

    // Deducciones
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('DEDUCCIONES', 15, yPos);
    yPos += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    // Adelantos
    if (liquidacion.adelantos > 0) {
      doc.text('Adelantos', 15, yPos);
      doc.text('-', 110, yPos);
      doc.text(`$ ${formatCurrency(liquidacion.adelantos)}`, 160, yPos, { align: 'right' });
      yPos += 6;
    }

    // Descuentos
    if (liquidacion.descuentos > 0) {
      doc.text('Descuentos', 15, yPos);
      doc.text('-', 110, yPos);
      doc.text(`$ ${formatCurrency(liquidacion.descuentos)}`, 160, yPos, { align: 'right' });
      yPos += 6;
    }

    yPos += 2;
    doc.setLineWidth(0.3);
    doc.line(15, yPos, pageWidth - 15, yPos);
    yPos += 6;

    // Total deducciones
    const totalDeducciones = liquidacion.adelantos + liquidacion.descuentos;
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL DEDUCCIONES', 15, yPos);
    doc.text(`$ ${formatCurrency(totalDeducciones)}`, 160, yPos, { align: 'right' });
    yPos += 10;

    // Línea doble para total neto
    doc.setLineWidth(0.5);
    doc.line(15, yPos, pageWidth - 15, yPos);
    yPos += 1;
    doc.line(15, yPos, pageWidth - 15, yPos);
    yPos += 8;

    // TOTAL NETO
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('TOTAL NETO A COBRAR', 15, yPos);
    doc.text(`$ ${formatCurrency(liquidacion.totalAPagar)}`, 160, yPos, { align: 'right' });
    yPos += 10;

    doc.setLineWidth(0.5);
    doc.line(15, yPos, pageWidth - 15, yPos);
    yPos += 10;

    // Observaciones
    if (liquidacion.observaciones) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Observaciones:', 15, yPos);
      yPos += 6;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const observacionesLines = doc.splitTextToSize(liquidacion.observaciones, pageWidth - 30);
      doc.text(observacionesLines, 15, yPos);
      yPos += (observacionesLines.length * 4) + 5;
    }

    // Footer - Firmas
    yPos = doc.internal.pageSize.getHeight() - 40;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    doc.line(25, yPos, 85, yPos);
    doc.line(125, yPos, 185, yPos);
    yPos += 5;
    
    doc.text('Firma del Empleado', 55, yPos, { align: 'center' });
    doc.text('Firma del Empleador', 155, yPos, { align: 'center' });
    
    yPos += 10;
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Recibo generado el ${new Date().toLocaleDateString('es-ES')}`,
      pageWidth / 2,
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
    
    // Abrir en nueva ventana para imprimir
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Recibo de Sueldo</DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Typography variant="h6" gutterBottom>
            {liquidacion.empleadoApellido}, {liquidacion.empleadoNombre}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Período: {periodo.nombre}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {formatDateForDisplay(periodo.fechaInicio)} - {formatDateForDisplay(periodo.fechaFin)}
          </Typography>
          
          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="h5" color="primary.main" fontWeight="bold">
              Total: $ {formatCurrency(liquidacion.totalAPagar)}
            </Typography>
          </Box>

          <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Selecciona una opción para visualizar o imprimir el recibo:
            </Typography>
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
