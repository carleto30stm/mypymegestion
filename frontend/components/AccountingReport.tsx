import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import { fetchGastos } from '../redux/slices/gastosSlice';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  Divider,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Button,
  IconButton
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  GetApp as ExportIcon,
  Assessment as ReportIcon
} from '@mui/icons-material';
import { Gasto } from '../types';

// Interfaces para el reporte contable
interface AccountingCategory {
  name: string;
  description: string;
  items: AccountingItem[];
  total: number;
  percentage: number;
}

interface AccountingItem {
  concept: string;
  amount: number;
  count: number;
  rubros: string[];
}

interface AccountingSummary {
  period: string;
  totalIngresos: number;
  totalEgresos: number;
  resultadoNeto: number;
  gastosFijos: AccountingCategory;
  gastosVariables: AccountingCategory;
  ingresos: AccountingCategory;
  gastosPersonal: AccountingCategory;
  gastosAdministrativos: AccountingCategory;
  gastosOperacionales: AccountingCategory;
  gastosFinancieros: AccountingCategory;
}

const AccountingReport: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: gastos, status, error } = useSelector((state: RootState) => state.gastos);
  const loading = status === 'loading';
  const [reportPeriod, setReportPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [reportData, setReportData] = useState<AccountingSummary | null>(null);

  useEffect(() => {
    dispatch(fetchGastos());
  }, [dispatch]);

  useEffect(() => {
    if (gastos.length > 0) {
      generateReport();
    }
  }, [gastos, reportPeriod, selectedMonth, selectedYear]);

  const generateReport = () => {
    const filteredGastos = filterGastosByPeriod();
    const summary = calculateAccountingSummary(filteredGastos);
    setReportData(summary);
  };

  const filterGastosByPeriod = (): Gasto[] => {
    return gastos.filter(gasto => {
      if (gasto.estado === 'cancelado') return false;
      
      const gastoDate = new Date(gasto.fecha);
      const currentDate = new Date();

      switch (reportPeriod) {
        case 'month':
          const [year, month] = selectedMonth.split('-').map(Number);
          return gastoDate.getFullYear() === year && gastoDate.getMonth() + 1 === month;
        
        case 'quarter':
          const selectedYearNum = parseInt(selectedYear);
          const currentQuarter = Math.floor(currentDate.getMonth() / 3) + 1;
          const gastoQuarter = Math.floor(gastoDate.getMonth() / 3) + 1;
          return gastoDate.getFullYear() === selectedYearNum && gastoQuarter === currentQuarter;
        
        case 'year':
          return gastoDate.getFullYear() === parseInt(selectedYear);
        
        default:
          return true;
      }
    });
  };

  const calculateAccountingSummary = (filteredGastos: Gasto[]): AccountingSummary => {
    // Inicializar categorías contables
    const gastosFijos: AccountingItem[] = [];
    const gastosVariables: AccountingItem[] = [];
    const ingresos: AccountingItem[] = [];
    const gastosPersonal: AccountingItem[] = [];
    const gastosAdministrativos: AccountingItem[] = [];
    const gastosOperacionales: AccountingItem[] = [];
    const gastosFinancieros: AccountingItem[] = [];

    // Mapas para agrupar conceptos similares
    const conceptMaps = {
      gastosFijos: new Map<string, { amount: number; count: number; rubros: Set<string> }>(),
      gastosVariables: new Map<string, { amount: number; count: number; rubros: Set<string> }>(),
      ingresos: new Map<string, { amount: number; count: number; rubros: Set<string> }>(),
      gastosPersonal: new Map<string, { amount: number; count: number; rubros: Set<string> }>(),
      gastosAdministrativos: new Map<string, { amount: number; count: number; rubros: Set<string> }>(),
      gastosOperacionales: new Map<string, { amount: number; count: number; rubros: Set<string> }>(),
      gastosFinancieros: new Map<string, { amount: number; count: number; rubros: Set<string> }>()
    };

    let totalIngresos = 0;
    let totalEgresos = 0;

    // Procesar cada gasto
    console.log('Procesando gastos filtrados:', filteredGastos.length);
    filteredGastos.forEach(gasto => {
      const amount = gasto.tipoOperacion === 'entrada' ? (gasto.entrada || 0) : (gasto.salida || 0);
      
      if (gasto.tipoOperacion === 'entrada') {
        totalIngresos += amount;
        addToConceptMap(conceptMaps.ingresos, getIncomeCategory(gasto), amount, gasto.rubro);
      } else if (gasto.tipoOperacion === 'salida') {
        totalEgresos += amount;
        
        // Clasificar por tipo de gasto contable
        const category = classifyExpense(gasto);
        console.log(`Gasto: ${gasto.detalleGastos}, SubRubro: ${gasto.subRubro}, Categoría: ${category}, Monto: ${amount}`);
        switch (category) {
          case 'fijo':
            const fixedCategory = getFixedExpenseCategory(gasto);
            console.log(`Agregando a gastos fijos: ${fixedCategory}, Monto: ${amount}`);
            addToConceptMap(conceptMaps.gastosFijos, fixedCategory, amount, gasto.rubro);
            break;
          case 'variable':
            addToConceptMap(conceptMaps.gastosVariables, getVariableExpenseCategory(gasto), amount, gasto.rubro);
            break;
          case 'personal':
            addToConceptMap(conceptMaps.gastosPersonal, getPersonnelCategory(gasto), amount, gasto.rubro);
            break;
          case 'administrativo':
            addToConceptMap(conceptMaps.gastosAdministrativos, getAdministrativeCategory(gasto), amount, gasto.rubro);
            break;
          case 'operacional':
            addToConceptMap(conceptMaps.gastosOperacionales, getOperationalCategory(gasto), amount, gasto.rubro);
            break;
          case 'financiero':
            addToConceptMap(conceptMaps.gastosFinancieros, getFinancialCategory(gasto), amount, gasto.rubro);
            break;
        }
      }
    });

    // Convertir mapas a arrays y calcular totales
    const convertMapToItems = (map: Map<string, { amount: number; count: number; rubros: Set<string> }>) => {
      return Array.from(map.entries()).map(([concept, data]): AccountingItem => ({
        concept,
        amount: data.amount,
        count: data.count,
        rubros: Array.from(data.rubros)
      }));
    };

    const gastosFijosItems = convertMapToItems(conceptMaps.gastosFijos);
    const gastosVariablesItems = convertMapToItems(conceptMaps.gastosVariables);
    const ingresosItems = convertMapToItems(conceptMaps.ingresos);
    const gastosPersonalItems = convertMapToItems(conceptMaps.gastosPersonal);
    const gastosAdministrativosItems = convertMapToItems(conceptMaps.gastosAdministrativos);
    const gastosOperacionalesItems = convertMapToItems(conceptMaps.gastosOperacionales);
    const gastosFinancierosItems = convertMapToItems(conceptMaps.gastosFinancieros);

    console.log('Gastos Fijos Map:', conceptMaps.gastosFijos);
    console.log('Gastos Fijos Items:', gastosFijosItems);

    const totalGastosFijos = gastosFijosItems.reduce((sum: number, item: AccountingItem) => sum + item.amount, 0);
    const totalGastosVariables = gastosVariablesItems.reduce((sum: number, item: AccountingItem) => sum + item.amount, 0);
    const totalGastosPersonal = gastosPersonalItems.reduce((sum: number, item: AccountingItem) => sum + item.amount, 0);
    const totalGastosAdministrativos = gastosAdministrativosItems.reduce((sum: number, item: AccountingItem) => sum + item.amount, 0);
    const totalGastosOperacionales = gastosOperacionalesItems.reduce((sum: number, item: AccountingItem) => sum + item.amount, 0);
    const totalGastosFinancieros = gastosFinancierosItems.reduce((sum: number, item: AccountingItem) => sum + item.amount, 0);

    return {
      period: getPeriodDescription(),
      totalIngresos,
      totalEgresos,
      resultadoNeto: totalIngresos - totalEgresos,
      gastosFijos: {
        name: 'Gastos Fijos',
        description: 'Gastos que no varían con el volumen de producción',
        items: gastosFijosItems,
        total: totalGastosFijos,
        percentage: totalEgresos > 0 ? (totalGastosFijos / totalEgresos) * 100 : 0
      },
      gastosVariables: {
        name: 'Gastos Variables',
        description: 'Gastos que varían según la actividad productiva',
        items: gastosVariablesItems,
        total: totalGastosVariables,
        percentage: totalEgresos > 0 ? (totalGastosVariables / totalEgresos) * 100 : 0
      },
      ingresos: {
        name: 'Ingresos',
        description: 'Entradas de dinero por ventas y otros conceptos',
        items: ingresosItems,
        total: totalIngresos,
        percentage: 100
      },
      gastosPersonal: {
        name: 'Gastos de Personal',
        description: 'Sueldos, salarios y beneficios del personal',
        items: gastosPersonalItems,
        total: totalGastosPersonal,
        percentage: totalEgresos > 0 ? (totalGastosPersonal / totalEgresos) * 100 : 0
      },
      gastosAdministrativos: {
        name: 'Gastos Administrativos',
        description: 'Gastos de administración y gestión',
        items: gastosAdministrativosItems,
        total: totalGastosAdministrativos,
        percentage: totalEgresos > 0 ? (totalGastosAdministrativos / totalEgresos) * 100 : 0
      },
      gastosOperacionales: {
        name: 'Gastos Operacionales',
        description: 'Gastos directos de la operación del negocio',
        items: gastosOperacionalesItems,
        total: totalGastosOperacionales,
        percentage: totalEgresos > 0 ? (totalGastosOperacionales / totalEgresos) * 100 : 0
      },
      gastosFinancieros: {
        name: 'Gastos Financieros',
        description: 'Gastos bancarios y financieros',
        items: gastosFinancierosItems,
        total: totalGastosFinancieros,
        percentage: totalEgresos > 0 ? (totalGastosFinancieros / totalEgresos) * 100 : 0
      }
    };
  };

  const addToConceptMap = (
    map: Map<string, { amount: number; count: number; rubros: Set<string> }>,
    concept: string,
    amount: number,
    rubro: string
  ) => {
    if (map.has(concept)) {
      const existing = map.get(concept)!;
      existing.amount += amount;
      existing.count += 1;
      existing.rubros.add(rubro);
    } else {
      map.set(concept, { amount, count: 1, rubros: new Set([rubro]) });
    }
  };

  // Funciones de clasificación contable
  const classifyExpense = (gasto: Gasto): string => {
    switch (gasto.rubro) {
      case 'SUELDOS':
        return 'personal';
      case 'SERVICIOS':
        return 'fijo';
      case 'GASTOS ADMINISTRATIVOS':
      case 'GASTOS.ADMIN':
        return 'administrativo';
      case 'PROOV.MATERIA.PRIMA':
      case 'PROOVMANO.DE.OBRA':
        return 'variable';
      case 'MANT.MAQ':
      case 'MOVILIDAD':
        return 'operacional';
      case 'BANCO':
      case 'ARCA':
        return 'financiero';
      default:
        return 'operacional';
    }
  };

  const getFixedExpenseCategory = (gasto: Gasto): string => {
    switch (gasto.subRubro) {
      case 'EDENOR':
        return 'Energía Eléctrica';
      case 'AGUA':
        return 'Servicios de Agua';
      case 'GAS':
        return 'Gas Natural';
      case 'RED NET':
      case 'NIC AR':
        return 'Servicios de Internet/Telecomunicaciones';
      case 'PROGRAMACION':
        return 'Servicios de Programación/IT';
      case 'JARDIN':
        return 'Mantenimiento de Jardín';
      case 'LIMPIEZA':
        return 'Servicios de Limpieza';
      default:
        return `Servicios - ${gasto.subRubro}`;
    }
  };

  const getVariableExpenseCategory = (gasto: Gasto): string => {
    if (gasto.rubro === 'PROOV.MATERIA.PRIMA') {
      switch (gasto.subRubro) {
        case 'ALAMBRE INDUSTRIA':
        case 'ALAMBRE RAUP':
          return 'Materia Prima - Alambre';
        case 'EMBALAJE':
          return 'Materiales de Embalaje';
        case 'POLIESTIRENO':
          return 'Materia Prima - Poliestireno';
        case 'FUNDICION':
          return 'Servicios de Fundición';
        default:
          return `Materia Prima - ${gasto.subRubro}`;
      }
    } else if (gasto.rubro === 'PROOVMANO.DE.OBRA') {
      return `Mano de Obra - ${gasto.subRubro}`;
    }
    return gasto.subRubro;
  };

  const getPersonnelCategory = (gasto: Gasto): string => {
    if (gasto.concepto) {
      switch (gasto.concepto) {
        case 'sueldo':
          return `Sueldos - ${gasto.subRubro}`;
        case 'adelanto':
          return `Adelantos - ${gasto.subRubro}`;
        case 'hora_extra':
          return `Horas Extra - ${gasto.subRubro}`;
        case 'aguinaldo':
          return `Aguinaldos - ${gasto.subRubro}`;
        case 'bonus':
          return `Bonus - ${gasto.subRubro}`;
        default:
          return `Personal - ${gasto.subRubro}`;
      }
    }
    return `Personal - ${gasto.subRubro}`;
  };

  const getAdministrativeCategory = (gasto: Gasto): string => {
    switch (gasto.subRubro) {
      case 'HONORARIOS':
        return 'Honorarios Profesionales';
      case 'IMPUESTO BANCARIOS':
        return 'Impuestos Bancarios';
      case 'IMPUESTO TARJETAS':
        return 'Impuestos de Tarjetas';
      case 'MONOTRIBUTO':
        return 'Monotributo';
      case 'II.BB/SIRCREB':
        return 'Ingresos Brutos';
      case 'CONSULTORIAS':
        return 'Servicios de Consultoría';
      default:
        return `Administrativo - ${gasto.subRubro}`;
    }
  };

  const getOperationalCategory = (gasto: Gasto): string => {
    if (gasto.rubro === 'MANT.MAQ') {
      switch (gasto.subRubro) {
        case 'MECANICO':
          return 'Mantenimiento Mecánico';
        case 'MATERIALES':
          return 'Materiales de Mantenimiento';
        case 'MAQ. NUEVA':
          return 'Maquinaria Nueva';
        default:
          return `Mantenimiento - ${gasto.subRubro}`;
      }
    } else if (gasto.rubro === 'MOVILIDAD') {
      switch (gasto.subRubro) {
        case 'COMBUSTIBLE':
          return 'Combustible';
        case 'PEAJES':
          return 'Peajes';
        case 'ESTACIONAMIENTO':
          return 'Estacionamiento';
        case 'MECANICO':
        case 'SERVICE':
          return 'Mantenimiento Vehículos';
        default:
          return `Movilidad - ${gasto.subRubro}`;
      }
    }
    return gasto.subRubro;
  };

  const getFinancialCategory = (gasto: Gasto): string => {
    if (gasto.rubro === 'BANCO') {
      return 'Gastos Bancarios';
    } else if (gasto.rubro === 'ARCA') {
      return 'Impuestos - IVA';
    }
    return gasto.subRubro;
  };

  const getIncomeCategory = (gasto: Gasto): string => {
    switch (gasto.subRubro) {
      case 'COBRO':
        return 'Cobranzas';
      case 'DEVOLUCION':
        return 'Devoluciones';
      case 'ADEUDADO':
        return 'Recupero de Deudas';
      case 'FLETE':
        return 'Ingresos por Flete';
      case 'COMISION':
        return 'Comisiones';
      default:
        return `Ingresos - ${gasto.subRubro}`;
    }
  };

  const getPeriodDescription = (): string => {
    switch (reportPeriod) {
      case 'month':
        const [year, month] = selectedMonth.split('-').map(Number);
        const date = new Date(year, month - 1);
        return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
      case 'quarter':
        const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;
        return `Q${currentQuarter} ${selectedYear}`;
      case 'year':
        return selectedYear;
      default:
        return '';
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const renderCategoryTable = (category: AccountingCategory) => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h6" color="primary">
              {category.name}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {category.description}
            </Typography>
          </Box>
          <Box textAlign="right">
            <Typography variant="h6" fontWeight="bold">
              {formatCurrency(category.total)}
            </Typography>
            <Chip 
              label={`${category.percentage.toFixed(1)}%`}
              size="small"
              color={category.percentage > 30 ? 'error' : category.percentage > 15 ? 'warning' : 'success'}
            />
          </Box>
        </Box>
        
        {category.items.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Concepto</TableCell>
                  <TableCell align="center">Cantidad</TableCell>
                  <TableCell align="right">Monto</TableCell>
                  <TableCell align="center">% del Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {category.items
                  .sort((a, b) => b.amount - a.amount)
                  .map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {item.concept}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Rubros: {item.rubros.join(', ')}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={item.count} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium">
                          {formatCurrency(item.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">
                          {((item.amount / category.total) * 100).toFixed(1)}%
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Alert severity="info">No hay datos para mostrar en esta categoría</Alert>
        )}
      </CardContent>
    </Card>
  );

  const exportToPDF = () => {
    if (!reportData) {
      alert('No hay datos para exportar');
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Título principal
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Reporte Contable', pageWidth / 2, 15, { align: 'center' });
    
    // Período
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${reportData.period}`, pageWidth / 2, 22, { align: 'center' });
    
    let yPos = 30;

    // Resumen Ejecutivo
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen Ejecutivo', 14, yPos);
    yPos += 7;

    const summaryData = [
      ['Total Ingresos', formatCurrency(reportData.totalIngresos)],
      ['Total Egresos', formatCurrency(reportData.totalEgresos)],
      ['Resultado Neto', formatCurrency(reportData.resultadoNeto)],
      ['Margen', reportData.totalIngresos > 0 
        ? `${((reportData.resultadoNeto / reportData.totalIngresos) * 100).toFixed(1)}%`
        : '0%'
      ]
    ];

    autoTable(doc, {
      startY: yPos,
      head: [['Concepto', 'Valor']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      styles: { fontSize: 10 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Función para agregar tabla de categoría
    const addCategoryTable = (category: AccountingCategory, title: string) => {
      // Verificar si necesitamos nueva página
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 14, yPos);
      yPos += 2;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total: ${formatCurrency(category.total)} (${category.percentage.toFixed(1)}%)`, 14, yPos + 5);
      yPos += 10;

      if (category.items.length > 0) {
        const tableData = category.items
          .sort((a, b) => b.amount - a.amount)
          .map(item => [
            item.concept,
            item.count.toString(),
            formatCurrency(item.amount),
            `${((item.amount / category.total) * 100).toFixed(1)}%`
          ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Concepto', 'Cantidad', 'Monto', '% del Total']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [52, 152, 219], textColor: 255 },
          styles: { fontSize: 9 },
          columnStyles: {
            0: { cellWidth: 70 },
            1: { cellWidth: 25, halign: 'center' },
            2: { cellWidth: 45, halign: 'right' },
            3: { cellWidth: 30, halign: 'center' }
          }
        });

        yPos = (doc as any).lastAutoTable.finalY + 8;
      }
    };

    // Agregar todas las categorías
    addCategoryTable(reportData.ingresos, 'Ingresos');
    addCategoryTable(reportData.gastosPersonal, 'Gastos de Personal');
    addCategoryTable(reportData.gastosFijos, 'Gastos Fijos');
    addCategoryTable(reportData.gastosVariables, 'Gastos Variables');
    addCategoryTable(reportData.gastosOperacionales, 'Gastos Operacionales');
    addCategoryTable(reportData.gastosAdministrativos, 'Gastos Administrativos');
    addCategoryTable(reportData.gastosFinancieros, 'Gastos Financieros');

    // Análisis final
    if (yPos > 230) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Análisis de Estructura de Costos', 14, yPos);
    yPos += 10;

    const analysisData = [
      ['Gastos de Personal', `${reportData.gastosPersonal.percentage.toFixed(1)}%`],
      ['Gastos Fijos', `${reportData.gastosFijos.percentage.toFixed(1)}%`],
      ['Gastos Variables', `${reportData.gastosVariables.percentage.toFixed(1)}%`],
      ['Punto de Equilibrio Aprox.', formatCurrency(reportData.gastosFijos.total + reportData.gastosPersonal.total)]
    ];

    autoTable(doc, {
      startY: yPos,
      head: [['Indicador', 'Valor']],
      body: analysisData,
      theme: 'grid',
      headStyles: { fillColor: [46, 204, 113], textColor: 255 },
      styles: { fontSize: 10 }
    });

    // Guardar PDF
    const fileName = `reporte-contable-${reportData.period.replace(/ /g, '-')}.pdf`;
    doc.save(fileName);
  };

  const exportToExcel = () => {
    if (!reportData) {
      alert('No hay datos para exportar');
      return;
    }

    // Crear libro de trabajo
    const wb = XLSX.utils.book_new();

    // Hoja 1: Resumen Ejecutivo
    const summaryData = [
      ['REPORTE CONTABLE'],
      [`Período: ${reportData.period}`],
      [],
      ['RESUMEN EJECUTIVO'],
      ['Concepto', 'Valor'],
      ['Total Ingresos', reportData.totalIngresos],
      ['Total Egresos', reportData.totalEgresos],
      ['Resultado Neto', reportData.resultadoNeto],
      ['Margen (%)', reportData.totalIngresos > 0 
        ? ((reportData.resultadoNeto / reportData.totalIngresos) * 100).toFixed(2)
        : '0'
      ]
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

    // Función para crear hoja de categoría
    const createCategorySheet = (category: AccountingCategory, sheetName: string) => {
      const headerData = [
        [category.name],
        [`Total: ${formatCurrency(category.total)}`],
        [`Porcentaje del total de egresos: ${category.percentage.toFixed(2)}%`],
        [],
        ['Concepto', 'Cantidad', 'Monto', '% del Total', 'Rubros']
      ];

      const itemsData = category.items
        .sort((a, b) => b.amount - a.amount)
        .map(item => [
          item.concept,
          item.count,
          item.amount,
          ((item.amount / category.total) * 100).toFixed(2),
          item.rubros.join(', ')
        ]);

      const sheetData = [...headerData, ...itemsData];
      const ws = XLSX.utils.aoa_to_sheet(sheetData);

      // Ajustar ancho de columnas
      ws['!cols'] = [
        { wch: 40 }, // Concepto
        { wch: 10 }, // Cantidad
        { wch: 15 }, // Monto
        { wch: 12 }, // % del Total
        { wch: 30 }  // Rubros
      ];

      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    };

    // Crear hojas para cada categoría
    createCategorySheet(reportData.ingresos, 'Ingresos');
    createCategorySheet(reportData.gastosPersonal, 'Gastos Personal');
    createCategorySheet(reportData.gastosFijos, 'Gastos Fijos');
    createCategorySheet(reportData.gastosVariables, 'Gastos Variables');
    createCategorySheet(reportData.gastosOperacionales, 'Gastos Operacionales');
    createCategorySheet(reportData.gastosAdministrativos, 'Gastos Administrativos');
    createCategorySheet(reportData.gastosFinancieros, 'Gastos Financieros');

    // Hoja de análisis
    const analysisData = [
      ['ANÁLISIS DE ESTRUCTURA DE COSTOS'],
      [],
      ['Indicador', 'Valor'],
      ['Gastos de Personal (%)', reportData.gastosPersonal.percentage.toFixed(2)],
      ['Gastos Fijos (%)', reportData.gastosFijos.percentage.toFixed(2)],
      ['Gastos Variables (%)', reportData.gastosVariables.percentage.toFixed(2)],
      ['Punto de Equilibrio Aproximado', reportData.gastosFijos.total + reportData.gastosPersonal.total]
    ];

    const wsAnalysis = XLSX.utils.aoa_to_sheet(analysisData);
    XLSX.utils.book_append_sheet(wb, wsAnalysis, 'Análisis');

    // Guardar archivo
    const fileName = `reporte-contable-${reportData.period.replace(/ /g, '-')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Error al cargar los datos: {error}</Alert>;
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header del Reporte */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box display="flex" alignItems="center" gap={2}>
            <ReportIcon color="primary" sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h4" fontWeight="bold">
                Reporte Contable
              </Typography>
              <Typography variant="subtitle1" color="textSecondary">
                Análisis financiero por categorías contables
              </Typography>
            </Box>
          </Box>
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              startIcon={<PdfIcon />}
              onClick={exportToPDF}
            >
              PDF
            </Button>
            <Button
              variant="outlined"
              startIcon={<ExportIcon />}
              onClick={exportToExcel}
            >
              Excel
            </Button>
          </Box>
        </Box>

        {/* Controles de filtro */}
        <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Período</InputLabel>
              <Select
                value={reportPeriod}
                onChange={(e) => setReportPeriod(e.target.value as 'month' | 'quarter' | 'year')}
                label='Período'
              >
                <MenuItem value="month">Mensual</MenuItem>
                <MenuItem value="quarter">Trimestral</MenuItem>
                <MenuItem value="year">Anual</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          {reportPeriod === 'month' && (
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Mes</InputLabel>
                <Select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  label='Mes'
                >
                  {Array.from({ length: 12 }, (_, i) => {
                    const date = new Date();
                    date.setMonth(date.getMonth() - i);
                    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    const label = date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
                    return (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Grid>
          )}
          
          {(reportPeriod === 'quarter' || reportPeriod === 'year') && (
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Año</InputLabel>
                <Select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  label='Año'
                >
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = (new Date().getFullYear() - i).toString();
                    return (
                      <MenuItem key={year} value={year}>
                        {year}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Grid>
          )}
        </Grid>
      </Paper>

      {reportData && (
        <>
          {/* Resumen Ejecutivo */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" gutterBottom>
              Resumen Ejecutivo - {reportData.period}
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <Card sx={{ bgcolor: 'success.light', color: 'white' }}>
                  <CardContent>
                    <Typography variant="h6">Total Ingresos</Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {formatCurrency(reportData.totalIngresos)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card sx={{ bgcolor: 'error.light', color: 'white' }}>
                  <CardContent>
                    <Typography variant="h6">Total Egresos</Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {formatCurrency(reportData.totalEgresos)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card sx={{ bgcolor: reportData.resultadoNeto >= 0 ? 'success.main' : 'error.main', color: 'white' }}>
                  <CardContent>
                    <Typography variant="h6">Resultado Neto</Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {formatCurrency(reportData.resultadoNeto)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card sx={{ bgcolor: 'info.main', color: 'white' }}>
                  <CardContent>
                    <Typography variant="h6">Margen</Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {reportData.totalIngresos > 0 
                        ? `${((reportData.resultadoNeto / reportData.totalIngresos) * 100).toFixed(1)}%`
                        : '0%'
                      }
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>

          {/* Análisis por Categorías */}
          <Typography variant="h5" gutterBottom sx={{ mt: 4, mb: 2 }}>
            Análisis por Categorías Contables
          </Typography>

          {/* Ingresos */}
          {renderCategoryTable(reportData.ingresos)}

          {/* Gastos de Personal */}
          {renderCategoryTable(reportData.gastosPersonal)}

          {/* Gastos Fijos */}
          {renderCategoryTable(reportData.gastosFijos)}

          {/* Gastos Variables */}
          {renderCategoryTable(reportData.gastosVariables)}

          {/* Gastos Operacionales */}
          {renderCategoryTable(reportData.gastosOperacionales)}

          {/* Gastos Administrativos */}
          {renderCategoryTable(reportData.gastosAdministrativos)}

          {/* Gastos Financieros */}
          {renderCategoryTable(reportData.gastosFinancieros)}

          {/* Análisis Adicional */}
          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Análisis de Estructura de Costos
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="textSecondary">
                  <strong>Gastos de Personal:</strong> {reportData.gastosPersonal.percentage.toFixed(1)}% del total
                  {reportData.gastosPersonal.percentage > 40 && (
                    <Chip label="Alto" color="warning" size="small" sx={{ ml: 1 }} />
                  )}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="textSecondary">
                  <strong>Gastos Fijos:</strong> {reportData.gastosFijos.percentage.toFixed(1)}% del total
                  {reportData.gastosFijos.percentage > 25 && (
                    <Chip label="Alto" color="warning" size="small" sx={{ ml: 1 }} />
                  )}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="textSecondary">
                  <strong>Gastos Variables:</strong> {reportData.gastosVariables.percentage.toFixed(1)}% del total
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="textSecondary">
                  <strong>Punto de Equilibrio Aprox:</strong> {formatCurrency(reportData.gastosFijos.total + reportData.gastosPersonal.total)}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default AccountingReport;