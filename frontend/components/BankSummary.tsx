import React, { useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { 
  Paper, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Box,
  Button,
  CircularProgress
} from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';

interface BankSummaryProps {
  filterType: 'total' | 'month';
  selectedMonth: string;
  availableMonths: Array<{ value: string; label: string }>;
}

interface BankBalance {
  banco: string;
  entradas: number;
  salidas: number;
  saldo: number;
}

// Lista de bancos disponibles
const BANCOS = ['SANTANDER', 'EFECTIVO', 'PROVINCIA', 'FCI', 'CHEQUES 3ro', 'CHEQUE PRO.','RESERVA'];

const BankSummary: React.FC<BankSummaryProps> = ({ filterType, selectedMonth }) => {
  const { items: gastos } = useSelector((state: RootState) => state.gastos);
  
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  // Referencia para el contenido del PDF
  const pdfContentRef = useRef<HTMLDivElement>(null);
  
  // Todos los usuarios pueden descargar PDF (es solo lectura)
  const canDownloadPDF = true;

  // Obtener fecha de hoy en formato YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];
  
  // Generar lista de meses disponibles (últimos 12 meses)
  const availableMonths = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return {
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })
    };
  });

  // Función para filtrar gastos según el tipo de filtro
  const getFilteredGastos = () => {
    // Primero aplicar la lógica de StandBy
    let gastosStandBy = gastos.filter(gasto => {
      // Si no tiene fechaStandBy, se incluye normalmente
      if (!gasto.fechaStandBy) {
        return true;
      }
      
      // Si tiene fechaStandBy, solo se incluye cuando la fecha StandBy sea hoy o anterior
      const fechaStandBy = new Date(gasto.fechaStandBy).toISOString().split('T')[0];
      return fechaStandBy <= today; // Cambio: <= en lugar de ===
    });

    // Luego aplicar filtro de fecha según el tipo
    if (filterType === 'total') {
      return gastosStandBy;
    } else {
      // Filtrar por mes seleccionado
      return gastosStandBy.filter(gasto => {
        const fechaGasto = new Date(gasto.fecha).toISOString().slice(0, 7); // YYYY-MM
        return fechaGasto === selectedMonth;
      });
    }
  };

  const gastosActivos = getFilteredGastos();

  // Función para generar PDF
  const generatePDF = async () => {
    setIsGeneratingPDF(true);
    
    try {
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const monthName = filterType === 'month' ? 
        new Date(selectedMonth + '-01').toLocaleDateString('es-ES', { year: 'numeric', month: 'long' }) :
        'Histórico Total';
      
      // Título del documento
      pdf.setFontSize(18);
      pdf.text('Reporte Financiero', 20, 20);
      
      pdf.setFontSize(12);
      pdf.text(`Período: ${monthName}`, 20, 30);
      pdf.text(`Fecha de generación: ${new Date().toLocaleDateString('es-ES')}`, 20, 40);
      
      let yPosition = 50;
      
      // 1. Tabla de resumen por banco
      pdf.setFontSize(14);
      pdf.text('Resumen por Banco', 20, yPosition);
      yPosition += 10;
      
      const bankTableData = bankBalances.map(balance => [
        balance.banco,
        `$${balance.entradas.toLocaleString('es-AR')}`,
        `$${balance.salidas.toLocaleString('es-AR')}`,
        `$${balance.saldo.toLocaleString('es-AR')}`
      ]);
      
      autoTable(pdf, {
        startY: yPosition,
        head: [['Banco', 'Entradas', 'Salidas', 'Saldo']],
        body: bankTableData,
        theme: 'grid',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [41, 128, 185] }
      });
      
      yPosition = (pdf as any).lastAutoTable.finalY + 20;
      
      // 2. Tabla detallada de transacciones
      pdf.setFontSize(14);
      pdf.text('Detalle de Transacciones', 20, yPosition);
      yPosition += 10;
      
      const transactionTableData = gastosActivos.map(gasto => [
        new Date(gasto.fecha).toLocaleDateString('es-ES'),
        gasto.rubro,
        gasto.subRubro,
        gasto.detalleGastos,
        gasto.banco,
        gasto.entrada ? `$${gasto.entrada.toLocaleString('es-AR')}` : '-',
        gasto.salida ? `$${gasto.salida.toLocaleString('es-AR')}` : '-'
      ]);
      
      autoTable(pdf, {
        startY: yPosition,
        head: [['Fecha', 'Rubro', 'Sub-Rubro', 'Detalle', 'Banco', 'Entrada', 'Salida']],
        body: transactionTableData,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] },
        columnStyles: {
          3: { cellWidth: 40 }, // Detalle column wider
          5: { halign: 'right' }, // Entrada alignment
          6: { halign: 'right' }  // Salida alignment
        }
      });

      yPosition = (pdf as any).lastAutoTable.finalY + 20;

      // 3. Totales por banco consolidados
      pdf.setFontSize(14);
      pdf.text('Totales Consolidados por Banco', 20, yPosition);
      yPosition += 10;

      // Crear tabla con totales por banco incluyendo saldo total
      const bankTotalsData = bankBalances.map(balance => [
        balance.banco,
        `$${balance.entradas.toLocaleString('es-AR')}`,
        `$${balance.salidas.toLocaleString('es-AR')}`,
        `$${balance.saldo.toLocaleString('es-AR')}`,
        balance.saldo >= 0 ? 'POSITIVO' : 'NEGATIVO'
      ]);

      // Agregar fila de totales generales
      const totalEntradas = bankBalances.reduce((sum, balance) => sum + balance.entradas, 0);
      const totalSalidas = bankBalances.reduce((sum, balance) => sum + balance.salidas, 0);
      const saldoGeneral = totalEntradas - totalSalidas;
      
      bankTotalsData.push([
        'TOTAL GENERAL',
        `$${totalEntradas.toLocaleString('es-AR')}`,
        `$${totalSalidas.toLocaleString('es-AR')}`,
        `$${saldoGeneral.toLocaleString('es-AR')}`,
        saldoGeneral >= 0 ? 'POSITIVO' : 'NEGATIVO'
      ]);

      autoTable(pdf, {
        startY: yPosition,
        head: [['Banco', 'Total Entradas', 'Total Salidas', 'Saldo Final', 'Estado']],
        body: bankTotalsData,
        theme: 'striped',
        styles: { 
          fontSize: 10,
          halign: 'center'
        },
        headStyles: { 
          fillColor: [52, 152, 219],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { halign: 'left', fontStyle: 'bold' },
          1: { halign: 'right' },
          2: { halign: 'right' },
          3: { halign: 'right', fontStyle: 'bold' },
          4: { halign: 'center' }
        },
        didParseCell: function (data) {
          // Resaltar la fila del total general
          if (data.row.index === bankTotalsData.length - 1) {
            data.cell.styles.fillColor = [44, 62, 80]; // Azul oscuro
            data.cell.styles.textColor = [255, 255, 255]; // Texto blanco
            data.cell.styles.fontStyle = 'bold';
          }
          // Colorear el estado según sea positivo o negativo
          else if (data.column.index === 4) {
            const isPositive = data.cell.text[0] === 'POSITIVO';
            data.cell.styles.fillColor = isPositive ? [46, 204, 113] : [231, 76, 60];
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontStyle = 'bold';
          }
          // Colorear los saldos según sean positivos o negativos
          else if (data.column.index === 3) {
            const saldoText = data.cell.text[0];
            const isPositive = !saldoText.includes('-');
            data.cell.styles.textColor = isPositive ? [39, 174, 96] : [192, 57, 43];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      });

      yPosition = (pdf as any).lastAutoTable.finalY + 20;

      // 4. Resumen ejecutivo
      pdf.setFontSize(14);
      pdf.text('Resumen Ejecutivo', 20, yPosition);
      yPosition += 10;

      // Calcular totales generales
      const totalEntradas_exec = gastosActivos.reduce((sum, gasto) => sum + (gasto.entrada || 0), 0);
      const totalSalidas_exec = gastosActivos.reduce((sum, gasto) => sum + (gasto.salida || 0), 0);
      const saldoTotal = totalEntradas_exec - totalSalidas_exec;

      const executiveSummaryData = [
        ['Total Entradas', `$${totalEntradas_exec.toLocaleString('es-AR')}`],
        ['Total Salidas', `$${totalSalidas_exec.toLocaleString('es-AR')}`],
        ['SALDO FINAL', `$${saldoTotal.toLocaleString('es-AR')}`]
      ];

      autoTable(pdf, {
        startY: yPosition,
        body: executiveSummaryData,
        theme: 'plain',
        styles: { 
          fontSize: 14,
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { halign: 'left', cellWidth: 50 },
          1: { halign: 'right', cellWidth: 50 }
        },
        didParseCell: function (data) {
          // Resaltar la fila del saldo final pero con colores más suaves
          if (data.row.index === 2) {
            // Solo cambiar el color del texto, sin fondo
            data.cell.styles.textColor = saldoTotal >= 0 ? [39, 174, 96] : [192, 57, 43];
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fontSize = 14;
          }
        }
      });

      pdf.save(`Reporte_Financiero_${monthName.replace(/ /g, '_')}.pdf`);
      
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Por favor, intenta nuevamente.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Calcular saldos por banco con gastos activos
  const bankBalances: BankBalance[] = BANCOS.map(banco => {
    const gastosDelBanco = gastosActivos.filter(gasto => gasto.banco === banco);
    
    const entradas = gastosDelBanco.reduce((sum, gasto) => sum + (gasto.entrada || 0), 0);
    const salidas = gastosDelBanco.reduce((sum, gasto) => sum + (gasto.salida || 0), 0);
    const saldo = entradas - salidas;

    return {
      banco,
      entradas,
      salidas,
      saldo
    };
  });

  // Calcular totales generales
  const totales = bankBalances.reduce((acc, bank) => ({
    entradas: acc.entradas + bank.entradas,
    salidas: acc.salidas + bank.salidas,
    saldo: acc.saldo + bank.saldo
  }), { entradas: 0, salidas: 0, saldo: 0 });

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('es-AR', { 
      style: 'currency', 
      currency: 'ARS',
      minimumFractionDigits: 2 
    });
  };



  return (
    <Paper sx={{ p: 3, mt: 2 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Resumen por Banco
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Gastos activos + StandBy que vencen hoy ({new Date().toLocaleDateString('es-ES')})
        </Typography>
        
        {/* Botón de descarga PDF - Solo para usuarios admin y oper_ad */}
        {canDownloadPDF && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={isGeneratingPDF ? <CircularProgress size={16} /> : <DownloadIcon />}
              onClick={generatePDF}
              disabled={isGeneratingPDF}
            >
              {isGeneratingPDF ? 'Generando...' : 'Descargar PDF'}
            </Button>
          </Box>
        )}
      </Box>

      <div ref={pdfContentRef}>
        {/* Encabezado para el PDF */}
        <Box sx={{ mb: 2, textAlign: 'center' }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Resumen Bancario
          </Typography>
          <Typography variant="h6" color="text.secondary">
            {filterType === 'month' 
              ? `${availableMonths.find(m => m.value === selectedMonth)?.label}` 
              : 'Histórico Completo'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Generado el {new Date().toLocaleDateString('es-ES')} a las {new Date().toLocaleTimeString('es-ES')}
          </Typography>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Banco</strong></TableCell>
                <TableCell align="right"><strong>Entradas</strong></TableCell>
                <TableCell align="right"><strong>Salidas</strong></TableCell>
                <TableCell align="right"><strong>Saldo</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
            {bankBalances.map((bank) => (
              <TableRow key={bank.banco} hover>
                <TableCell component="th" scope="row">
                  <Typography variant="body2" fontWeight="medium">
                    {bank.banco}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography color="success.main">
                    {formatCurrency(bank.entradas)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography color="error.main">
                    {formatCurrency(bank.salidas)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography 
                    variant="body2" 
                    fontWeight="medium"
                    sx={{ 
                      color: bank.saldo > 0 ? 'success.main' : bank.saldo < 0 ? 'error.main' : 'text.primary',
                      backgroundColor: bank.saldo > 0 ? 'success.light' : bank.saldo < 0 ? 'error.light' : 'grey.100',
                      padding: '2px 6px',
                      borderRadius: 1,
                      display: 'inline-block',
                      fontSize: '0.875rem'
                    }}
                  >
                    {formatCurrency(bank.saldo)}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
            {/* Fila de totales */}
            <TableRow sx={{ backgroundColor: 'grey.50', borderTop: 2 }}>
              <TableCell component="th" scope="row">
                <Typography variant="h6" fontWeight="bold">
                  TOTAL GENERAL
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="h6" color="success.main" fontWeight="bold">
                  {formatCurrency(totales.entradas)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="h6" color="error.main" fontWeight="bold">
                  {formatCurrency(totales.salidas)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography 
                  variant="h6" 
                  fontWeight="bold"
                  sx={{ 
                    color: totales.saldo > 0 ? 'success.main' : totales.saldo < 0 ? 'error.main' : 'text.primary',
                    backgroundColor: totales.saldo > 0 ? 'success.light' : totales.saldo < 0 ? 'error.light' : 'grey.100',
                    padding: '4px 8px',
                    borderRadius: 1,
                    display: 'inline-block'
                  }}
                >
                  {formatCurrency(totales.saldo)}
                </Typography>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Información adicional */}
      <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          📊 <strong>Gastos incluidos:</strong> {gastosActivos.length} de {gastos.length} registros totales
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          �️ <strong>Filtro:</strong> {filterType === 'total' ? 'Histórico completo' : `Mes de ${availableMonths.find(m => m.value === selectedMonth)?.label}`}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          📅 <strong>Lógica StandBy:</strong> Solo se suman cuando fechaStandBy ≤ hoy ({today})
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          💰 <strong>Cálculo:</strong> Saldo = Entradas - Salidas
        </Typography>
      </Box>
      </div>

      {/* Información adicional fuera del PDF */}
      <Box sx={{ mt: 2, p: 2, backgroundColor: 'info.light', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          🗓️ <strong>Filtro aplicado:</strong> {filterType === 'total' ? 'Histórico completo' : `Mes de ${availableMonths.find(m => m.value === selectedMonth)?.label}`}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          📊 <strong>Total:</strong> {gastosActivos.length} de {gastos.length} gastos
        </Typography>
      </Box>
    </Paper>
  );
};

export default BankSummary;