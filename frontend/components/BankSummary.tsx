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
import { formatCurrency, formatCurrencyWithSymbol, formatDate } from '../utils/formatters';
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

// Lista de cuentas de caja disponibles
const BANCOS = ['PROVINCIA', 'SANTANDER', 'EFECTIVO', 'FCI', 'RESERVA'];
const MEDIOS_PAGO_CHEQUES = ['Cheque Tercero', 'Cheque Propio']; // Cheque Propio afecta caja, Cheque Tercero se maneja por separado

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
    // Filtrar gastos según el tipo de filtro de fecha
    let gastosFiltrados = gastos;
    
    if (filterType === 'month') {
      gastosFiltrados = gastos.filter(gasto => {
        const fechaGasto = new Date(gasto.fecha).toISOString().slice(0, 7); // YYYY-MM
        return fechaGasto === selectedMonth;
      });
    }

    // Filtrar solo gastos activos/confirmados:
    // 1. Para cheques: solo incluir los confirmados
    // 2. Para otros gastos con fechaStandBy: solo si la fecha StandBy es hoy o anterior
    // 3. Para gastos sin fechaStandBy: incluir siempre
    return gastosFiltrados.filter(gasto => {
      // Si es un cheque, solo incluir si está confirmado
      if (gasto.medioDePago?.includes('Cheque')) {
        return gasto.confirmado === true;
      }
      
      // Si no tiene fechaStandBy, se incluye normalmente
      if (!gasto.fechaStandBy) {
        return true;
      }
      
      // Si tiene fechaStandBy, solo se incluye cuando la fecha StandBy sea hoy o anterior
      const fechaStandBy = new Date(gasto.fechaStandBy).toISOString().split('T')[0];
      return fechaStandBy <= today;
    });
  };

  const gastosActivos = getFilteredGastos();

  // Función para obtener Cheques Tercero sin depositar (confirmados pero aún en poder)
  const getChequesConfirmadosSinDepositar = () => {
    let chequesFiltrados = gastos;
    
    if (filterType === 'month') {
      chequesFiltrados = gastos.filter(gasto => {
        const fechaGasto = new Date(gasto.fecha).toISOString().slice(0, 7);
        return fechaGasto === selectedMonth;
      });
    }

    return chequesFiltrados.filter(gasto => 
      gasto.medioDePago === 'Cheque Tercero' && // Solo Cheques Tercero 
      gasto.confirmado === true &&
      gasto.estadoCheque === 'recibido' // Solo cheques en estado 'recibido' (no depositados ni dispuestos)
    );
  };

  const chequesConfirmados = getChequesConfirmadosSinDepositar();

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
      pdf.text('Reporte de Caja y Cheques', 20, 20);
      
      pdf.setFontSize(12);
      pdf.text(`Período: ${monthName}`, 20, 30);
      pdf.text(`Fecha de generación: ${new Date().toLocaleDateString('es-ES')}`, 20, 40);
      
      let yPosition = 50;
      
      // 1. Resumen de Caja (bancos sin cheques)
      pdf.setFontSize(14);
      pdf.text('Resumen de Caja Disponible', 20, yPosition);
      yPosition += 10;
      
      const bankTableData = bankBalances.map(balance => [
        balance.banco,
        `$${balance.entradas.toLocaleString('es-AR')}`,
        `$${balance.salidas.toLocaleString('es-AR')}`,
        `$${balance.saldo.toLocaleString('es-AR')}`
      ]);
      
      autoTable(pdf, {
        startY: yPosition,
        head: [['Cuenta', 'Entradas', 'Salidas', 'Saldo']],
        body: bankTableData,
        theme: 'grid',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [41, 128, 185] }
      });
      
      yPosition = (pdf as any).lastAutoTable.finalY + 10;

      // Subtotal de caja
      autoTable(pdf, {
        startY: yPosition,
        body: [['TOTAL CAJA DISPONIBLE', '', '', `$${totalesBancos.saldo.toLocaleString('es-AR')}`]],
        theme: 'plain',
        styles: { 
          fontSize: 12,
          fontStyle: 'bold',
          fillColor: [240, 240, 240]
        },
        columnStyles: {
          0: { halign: 'left' },
          3: { halign: 'right', textColor: totalesBancos.saldo >= 0 ? [0, 128, 0] : [255, 0, 0] }
        }
      });

      yPosition = (pdf as any).lastAutoTable.finalY + 20;

      // 2. Resumen de Cheques Tercero sin Depositar
      if (totalesCheques.saldo !== 0) {
        pdf.setFontSize(14);
        pdf.text('Cheques Tercero Sin Depositar', 20, yPosition);
        yPosition += 10;
        
        const chequeTableData = chequeBalances
          .filter(cheque => cheque.saldo !== 0)
          .map(cheque => [
            cheque.banco, // Medio de pago (Cheque Tercero, Cheque Propio)
            `$${cheque.entradas.toLocaleString('es-AR')}`,
            `$${cheque.salidas.toLocaleString('es-AR')}`,
            `$${cheque.saldo.toLocaleString('es-AR')}`
          ]);
        
        if (chequeTableData.length > 0) {
          autoTable(pdf, {
            startY: yPosition,
            head: [['Cheques Tercero', 'Recibidos', 'Dispuestos', 'Disponibles']],
            body: chequeTableData,
            theme: 'grid',
            styles: { fontSize: 10 },
            headStyles: { fillColor: [255, 193, 7] } // Color amarillo para cheques
          });
          
          yPosition = (pdf as any).lastAutoTable.finalY + 10;

          // Subtotal de cheques
          autoTable(pdf, {
            startY: yPosition,
            body: [['TOTAL CHEQUES TERCERO SIN DEPOSITAR', '', '', `$${totalesCheques.saldo.toLocaleString('es-AR')}`]],
            theme: 'plain',
            styles: { 
              fontSize: 12,
              fontStyle: 'bold',
              fillColor: [255, 248, 220] // Fondo amarillo claro
            },
            columnStyles: {
              0: { halign: 'left' },
              3: { halign: 'right', textColor: [255, 140, 0] } // Naranja para cheques
            }
          });

          yPosition = (pdf as any).lastAutoTable.finalY + 10;

          // Nota explicativa
          pdf.setFontSize(10);
          pdf.setTextColor(100, 100, 100);
          pdf.text('NOTA: Los Cheques Tercero sin depositar no se incluyen en el total de caja disponible', 20, yPosition);
          pdf.text('NOTA: Los Cheques Propios emitidos ya están descontados del banco correspondiente', 20, yPosition + 5);
          pdf.setTextColor(0, 0, 0);
          yPosition += 20;
        }
      }
      
      // 3. Detalle de Transacciones (con estado de cheques)
      pdf.setFontSize(14);
      pdf.text('Detalle de Transacciones', 20, yPosition);
      yPosition += 10;
      
      const transactionTableData = gastosActivos.map(gasto => {
        let estadoInfo = '';
        
        // Agregar información de estado para cheques
        if (gasto.medioDePago?.includes('Cheque')) {
          if (gasto.confirmado) {
            switch (gasto.estadoCheque) {
              case 'recibido':
                estadoInfo = 'CONFIRMADO';
                break;
              case 'depositado':
                estadoInfo = 'DEPOSITADO';
                break;
              case 'pagado_proveedor':
                estadoInfo = 'PAGADO';
                break;
              default:
                estadoInfo = 'CONFIRMADO';
            }
          } else {
            estadoInfo = 'PENDIENTE';
          }
        }
        
        return [
          new Date(gasto.fecha).toLocaleDateString('es-ES'),
          gasto.rubro,
          gasto.subRubro,
          gasto.detalleGastos,
          `${gasto.banco}${estadoInfo ? ` (${estadoInfo})` : ''}`,
          gasto.medioDePago || '-',
          gasto.entrada ? `$${gasto.entrada.toLocaleString('es-AR')}` : '-',
          gasto.salida ? `$${gasto.salida.toLocaleString('es-AR')}` : '-'
        ];
      });
      
      autoTable(pdf, {
        startY: yPosition,
        head: [['Fecha', 'Rubro', 'Sub-Rubro', 'Detalle', 'Cuenta', 'Medio Pago', 'Entrada', 'Salida']],
        body: transactionTableData,
        theme: 'grid',
        styles: { fontSize: 7 },
        headStyles: { fillColor: [41, 128, 185] },
        columnStyles: {
          3: { cellWidth: 35 }, // Detalle column
          4: { cellWidth: 25 }, // Cuenta column
          5: { cellWidth: 20 }, // Medio Pago column
          6: { halign: 'right', cellWidth: 18 }, // Entrada alignment
          7: { halign: 'right', cellWidth: 18 }  // Salida alignment
        }
      });

      yPosition = (pdf as any).lastAutoTable.finalY + 20;

      // 4. Resumen Ejecutivo Consolidado
      pdf.setFontSize(14);
      pdf.text('Resumen Ejecutivo', 20, yPosition);
      yPosition += 10;

      // Tabla consolidada con caja y cheques separados
      const resumenData = [
        ['Cuentas de Caja', '', '', ''],
        ...bankBalances.map(balance => [
          `  ${balance.banco}`,
          `$${balance.entradas.toLocaleString('es-AR')}`,
          `$${balance.salidas.toLocaleString('es-AR')}`,
          `$${balance.saldo.toLocaleString('es-AR')}`
        ]),
        ['SUBTOTAL CAJA', `$${totalesBancos.entradas.toLocaleString('es-AR')}`, `$${totalesBancos.salidas.toLocaleString('es-AR')}`, `$${totalesBancos.saldo.toLocaleString('es-AR')}`]
      ];

      // Agregar cheques si existen
      if (totalesCheques.saldo !== 0) {
        resumenData.push(
          ['', '', '', ''], // Separador
          ['Cheques Tercero sin Depositar', '', '', ''],
          ...chequeBalances
            .filter(cheque => cheque.saldo !== 0)
            .map(cheque => [
              `  ${cheque.banco}`,
              `$${cheque.entradas.toLocaleString('es-AR')}`,
              `$${cheque.salidas.toLocaleString('es-AR')}`,
              `$${cheque.saldo.toLocaleString('es-AR')}`
            ]),
          ['SUBTOTAL CHEQUES TERCERO', `$${totalesCheques.entradas.toLocaleString('es-AR')}`, `$${totalesCheques.salidas.toLocaleString('es-AR')}`, `$${totalesCheques.saldo.toLocaleString('es-AR')}`]
        );
      }

      autoTable(pdf, {
        startY: yPosition,
        head: [['Concepto', 'Entradas', 'Salidas', 'Saldo']],
        body: resumenData,
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
          0: { halign: 'left', fontStyle: 'normal' },
          1: { halign: 'right' },
          2: { halign: 'right' },
          3: { halign: 'right', fontStyle: 'bold' }
        },
        didParseCell: function (data) {
          // Resaltar las filas de subtotales
          if (data.cell.text[0]?.includes('SUBTOTAL')) {
            data.cell.styles.fillColor = [44, 62, 80];
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontStyle = 'bold';
          }
          // Resaltar secciones
          else if (data.cell.text[0] === 'Cuentas de Caja' || data.cell.text[0] === 'Cheques Tercero sin Depositar') {
            data.cell.styles.fillColor = [108, 117, 125];
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontStyle = 'bold';
          }
          // Colorear los saldos según sean positivos o negativos
          else if (data.column.index === 3 && data.cell.text[0]?.includes('$')) {
            const isPositive = !data.cell.text[0].includes('-');
            data.cell.styles.textColor = isPositive ? [39, 174, 96] : [192, 57, 43];
          }
        }
      });

      yPosition = (pdf as any).lastAutoTable.finalY + 20;

      // 5. Información Adicional y Notas
      pdf.setFontSize(14);
      pdf.text('Información Adicional', 20, yPosition);
      yPosition += 10;

      // Información clave en tabla
      const infoData = [
        ['Total Disponible en Caja', `$${totalesBancos.saldo.toLocaleString('es-AR')}`],
        ['Cheques Tercero por Depositar', `$${totalesCheques.saldo.toLocaleString('es-AR')}`],
        ['Patrimonio Total (Caja + Cheques)', `$${(totalesBancos.saldo + totalesCheques.saldo).toLocaleString('es-AR')}`]
      ];

      autoTable(pdf, {
        startY: yPosition,
        body: infoData,
        theme: 'plain',
        styles: { 
          fontSize: 12,
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { halign: 'left', cellWidth: 80 },
          1: { halign: 'right', cellWidth: 50 }
        },
        didParseCell: function (data) {
          if (data.row.index === 0) {
            // Total disponible en verde
            data.cell.styles.textColor = [39, 174, 96];
          } else if (data.row.index === 1) {
            // Cheques en naranja
            data.cell.styles.textColor = [255, 140, 0];
          } else if (data.row.index === 2) {
            // Total general en azul
            data.cell.styles.textColor = [52, 152, 219];
            data.cell.styles.fillColor = [240, 248, 255];
          }
        }
      });

      yPosition = (pdf as any).lastAutoTable.finalY + 15;

      // Notas explicativas
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      
      const notas = [
        '  NOTAS IMPORTANTES:',
        '• El "Total Disponible en Caja" representa dinero inmediatamente utilizable',
        '• Los cheques confirmados requieren depósito para convertirse en caja disponible',
        '• Los cheques pueden depositarse en bancos o utilizarse para pagos a proveedores',
        '• Estados de cheques: Pendiente | Confirmado | Depositado | Pagado'
      ];

      notas.forEach((nota, index) => {
        pdf.text(nota, 20, yPosition + (index * 5));
      });

      yPosition += notas.length * 5 + 10;

      // Información de periodo y filtros
      pdf.setFontSize(8);
      pdf.text(`Período: ${filterType === 'total' ? 'Histórico completo' : 'Mes seleccionado'}`, 20, yPosition);
      pdf.text(`Gastos incluidos: ${gastosActivos.length} de ${gastos.length} registros totales`, 20, yPosition + 5);
      pdf.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 20, yPosition + 10);

      pdf.setTextColor(0, 0, 0); // Restaurar color negro

      pdf.save(`Reporte_Financiero_${monthName.replace(/ /g, '_')}.pdf`);
      
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Por favor, intenta nuevamente.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Calcular saldos por cuenta de caja
  const bankBalances: BankBalance[] = BANCOS.map(banco => {
    // Filtrar gastos del banco excluyendo SOLO Cheques Tercero (no los propios)
    const gastosDelBanco = gastosActivos.filter(gasto => 
      gasto.banco === banco && gasto.medioDePago !== 'Cheque Tercero'
    );
    
    // Calcular entradas y salidas normales (incluye Cheques Propios)
    const entradas = gastosDelBanco.reduce((sum, gasto) => sum + (gasto.entrada || 0), 0);
    const salidas = gastosDelBanco.reduce((sum, gasto) => sum + (gasto.salida || 0), 0);
    
    // Calcular transferencias donde este banco es origen (sale dinero)
    const transferenciasOrigen = gastosActivos
      .filter(gasto => gasto.tipoOperacion === 'transferencia' && gasto.cuentaOrigen === banco)
      .reduce((sum, gasto) => sum + (gasto.montoTransferencia || 0), 0);
    
    // Calcular transferencias donde este banco es destino (entra dinero)
    const transferenciasDestino = gastosActivos
      .filter(gasto => gasto.tipoOperacion === 'transferencia' && gasto.cuentaDestino === banco)
      .reduce((sum, gasto) => sum + (gasto.montoTransferencia || 0), 0);
    
    // El saldo incluye las transferencias
    const saldo = entradas - salidas - transferenciasOrigen + transferenciasDestino;

    return {
      banco,
      entradas: entradas + transferenciasDestino,
      salidas: salidas + transferenciasOrigen,
      saldo
    };
  });

  // Calcular saldos de Cheques Tercero sin depositar (solo cheques recibidos)
  const chequeBalances: BankBalance[] = ['Cheque Tercero'].map(medioPago => {
    const chequesCategoria = chequesConfirmados.filter(gasto => gasto.medioDePago === medioPago);
    
    const entradas = chequesCategoria.reduce((sum, gasto) => sum + (gasto.entrada || 0), 0);
    const salidas = chequesCategoria.reduce((sum, gasto) => sum + (gasto.salida || 0), 0);
    const saldo = entradas - salidas;

    return {
      banco: medioPago, // Ahora banco representa el medio de pago
      entradas,
      salidas,
      saldo
    };
  });

  // Calcular totales bancarios (sin cheques)
  const totalesBancos = bankBalances.reduce((acc, bank) => ({
    entradas: acc.entradas + bank.entradas,
    salidas: acc.salidas + bank.salidas,
    saldo: acc.saldo + bank.saldo
  }), { entradas: 0, salidas: 0, saldo: 0 });

  // Calcular totales de cheques
  const totalesCheques = chequeBalances.reduce((acc, cheque) => ({
    entradas: acc.entradas + cheque.entradas,
    salidas: acc.salidas + cheque.salidas,
    saldo: acc.saldo + cheque.saldo
  }), { entradas: 0, salidas: 0, saldo: 0 });

  // Total general (bancos + cheques)
  const totales = {
    entradas: totalesBancos.entradas + totalesCheques.entradas,
    salidas: totalesBancos.salidas + totalesCheques.salidas,
    saldo: totalesBancos.saldo + totalesCheques.saldo
  };





  return (
    <Paper sx={{ p: 3, mt: 2 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Resumen de Caja
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Gastos activos + Cheques confirmados ({formatDate(new Date())})
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
            Resumen de Caja y Cheques
          </Typography>
          <Typography variant="h6" color="text.secondary">
            {filterType === 'month' 
              ? `${availableMonths.find(m => m.value === selectedMonth)?.label}` 
              : 'Histórico Completo'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Generado el {formatDate(new Date())} a las {new Date().toLocaleTimeString('es-ES')}
          </Typography>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Cuenta / Medio</strong></TableCell>
                <TableCell align="right"><strong>Entradas</strong></TableCell>
                <TableCell align="right"><strong>Salidas</strong></TableCell>
                <TableCell align="right"><strong>Saldo</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
            {/* Filas de bancos */}
            {bankBalances.map((bank) => (
              <TableRow key={bank.banco} hover>
                <TableCell component="th" scope="row">
                  <Typography variant="body2" fontWeight="medium">
                    {bank.banco}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography color="success.main">
                    {formatCurrencyWithSymbol(bank.entradas)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography color="error.main">
                    {formatCurrencyWithSymbol(bank.salidas)}
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
                    {formatCurrencyWithSymbol(bank.saldo)}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
            
            {/* Fila de subtotal caja */}
            <TableRow sx={{ backgroundColor: 'grey.100', borderTop: 1 }}>
              <TableCell component="th" scope="row">
                <Typography variant="body1" fontWeight="bold">
                  SUBTOTAL CAJA DISPONIBLE
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body1" color="success.main" fontWeight="bold">
                  {formatCurrencyWithSymbol(totalesBancos.entradas)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body1" color="error.main" fontWeight="bold">
                  {formatCurrencyWithSymbol(totalesBancos.salidas)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography 
                  variant="body1" 
                  fontWeight="bold"
                  sx={{ 
                    color: totalesBancos.saldo > 0 ? 'success.main' : totalesBancos.saldo < 0 ? 'error.main' : 'text.primary'
                  }}
                >
                  {formatCurrencyWithSymbol(totalesBancos.saldo)}
                </Typography>
              </TableCell>
            </TableRow>

            {/* Filas de cheques sin depositar */}
            {chequeBalances.map((cheque) => (
              <TableRow key={cheque.banco} hover>
                <TableCell component="th" scope="row">
                  <Typography variant="body2" fontWeight="medium" sx={{ color: 'warning.main' }}>
                    CHEQUE: {cheque.banco}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography color="success.main">
                    {formatCurrencyWithSymbol(cheque.entradas)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography color="error.main">
                    {formatCurrencyWithSymbol(cheque.salidas)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography 
                    variant="body2" 
                    fontWeight="medium"
                    sx={{ 
                      color: cheque.saldo > 0 ? 'warning.main' : cheque.saldo < 0 ? 'error.main' : 'text.primary',
                      backgroundColor: cheque.saldo > 0 ? 'warning.light' : cheque.saldo < 0 ? 'error.light' : 'grey.100',
                      padding: '2px 6px',
                      borderRadius: 1,
                      display: 'inline-block',
                      fontSize: '0.875rem'
                    }}
                  >
                    {formatCurrencyWithSymbol(cheque.saldo)}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
            
            {/* Fila de subtotal cheques */}
            {totalesCheques.entradas > 0 || totalesCheques.salidas > 0 ? (
              <TableRow sx={{ backgroundColor: 'warning.50', borderTop: 1 }}>
                <TableCell component="th" scope="row">
                  <Typography variant="body1" fontWeight="bold" sx={{ color: 'warning.main' }}>
                    SUBTOTAL CHEQUES TERCERO SIN DEPOSITAR
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body1" color="success.main" fontWeight="bold">
                    {formatCurrencyWithSymbol(totalesCheques.entradas)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body1" color="error.main" fontWeight="bold">
                    {formatCurrencyWithSymbol(totalesCheques.salidas)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography 
                    variant="body1" 
                    fontWeight="bold"
                    sx={{ 
                      color: totalesCheques.saldo > 0 ? 'warning.main' : totalesCheques.saldo < 0 ? 'error.main' : 'text.primary'
                    }}
                  >
                    {formatCurrencyWithSymbol(totalesCheques.saldo)}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
            {/* Fila del total disponible en bancos */}
            <TableRow 
              sx={{ 
                backgroundColor: 'primary.dark',
                borderTop: 2,
                '& .MuiTableCell-root': {
                  color: 'white',
                  fontWeight: 'bold',
                  borderColor: 'rgba(255, 255, 255, 0.3)'
                }
              }}
            >
              <TableCell component="th" scope="row">
                <Typography variant="h6" fontWeight="bold">
                  TOTAL DISPONIBLE EN CAJA
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="h6" fontWeight="bold">
                  {formatCurrencyWithSymbol(totalesBancos.entradas)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="h6" fontWeight="bold">
                  {formatCurrencyWithSymbol(totalesBancos.salidas)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography 
                  variant="h6" 
                  fontWeight="bold"
                  sx={{ 
                    backgroundColor: totalesBancos.saldo > 0 ? 'success.main' : totalesBancos.saldo < 0 ? 'error.main' : 'grey.500',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: 1,
                    display: 'inline-block'
                  }}
                >
                  {formatCurrencyWithSymbol(totalesBancos.saldo)}
                </Typography>
              </TableCell>
            </TableRow>
            
            {/* Información adicional sobre cheques */}
            {totalesCheques.saldo !== 0 && (
              <TableRow sx={{ backgroundColor: 'info.light', '& .MuiTableCell-root': { border: 0 } }}>
                <TableCell colSpan={4}>
                  <Typography variant="body2" sx={{ color: 'info.main', textAlign: 'center', fontStyle: 'italic' }}>
                    NOTA: Los cheques sin depositar ({formatCurrencyWithSymbol(totalesCheques.saldo)}) no se incluyen en el total disponible hasta que sean depositados
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Información adicional */}
      <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Gastos incluidos: {gastosActivos.length} de {gastos.length} registros totales
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Total disponible en caja: {formatCurrencyWithSymbol(totalesBancos.saldo)}
        </Typography>
        {totalesCheques.saldo !== 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Cheques pendientes de depósito: {formatCurrencyWithSymbol(totalesCheques.saldo)}
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Filtro: {filterType === 'total' ? 'Histórico completo' : `Mes de ${availableMonths.find(m => m.value === selectedMonth)?.label}`}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Lógica Cheques: Solo se incluyen cheques confirmados manualmente (separados del flujo bancario)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Cálculo: Los cheques sin depositar no afectan el balance de caja disponible
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