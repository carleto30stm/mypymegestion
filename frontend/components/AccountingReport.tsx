import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import { fetchGastos } from '../redux/slices/gastosSlice';
import { fetchVentas } from '../redux/slices/ventasSlice';
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
import { Gasto, Venta } from '../types';

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
  ventasNetas: AccountingCategory;
  ingresosOperacionales: AccountingCategory;
  gastosFijos: AccountingCategory;
  gastosVariables: AccountingCategory;
  gastosPersonal: AccountingCategory;
  gastosAdministrativos: AccountingCategory;
  gastosOperacionales: AccountingCategory;
  gastosFinancieros: AccountingCategory;
  // Información complementaria
  flujoCaja: {
    cobrosDelPeriodo: number;
    pagosDelPeriodo: number;
    flujoNeto: number;
  };
  // Métricas financieras
  margenBruto: number;
  margenOperacional: number;
  margenNeto: number;
  puntoEquilibrio: number;
}

const AccountingReport: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: gastos, status, error } = useSelector((state: RootState) => state.gastos);
  const { items: ventas, status: ventasStatus } = useSelector((state: RootState) => state.ventas);
  const loading = status === 'loading' || ventasStatus === 'loading';
  const [reportPeriod, setReportPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [reportData, setReportData] = useState<AccountingSummary | null>(null);

  useEffect(() => {
    dispatch(fetchGastos());
    dispatch(fetchVentas());
  }, [dispatch]);

  useEffect(() => {
    // Permitir generar reporte con solo gastos (ventas pueden estar vacías)
    if (gastos.length > 0) {
      generateReport();
    }
  }, [gastos, ventas, reportPeriod, selectedMonth, selectedYear]);

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

  const filterVentasByPeriod = (): Venta[] => {
    // Si no hay ventas, retornar array vacío
    if (!ventas || ventas.length === 0) {
      return [];
    }
    
    return ventas.filter(venta => {
      // Solo ventas confirmadas
      if (venta.estado !== 'confirmada') return false;
      
      // Usar fechaConfirmacion si existe, sino fechaCreacion
      const ventaDate = new Date(venta.fechaCreacion || venta.fecha);
      const currentDate = new Date();

      switch (reportPeriod) {
        case 'month':
          const [year, month] = selectedMonth.split('-').map(Number);
          return ventaDate.getFullYear() === year && ventaDate.getMonth() + 1 === month;
        
        case 'quarter':
          const selectedYearNum = parseInt(selectedYear);
          const currentQuarter = Math.floor(currentDate.getMonth() / 3) + 1;
          const ventaQuarter = Math.floor(ventaDate.getMonth() / 3) + 1;
          return ventaDate.getFullYear() === selectedYearNum && ventaQuarter === currentQuarter;
        
        case 'year':
          return ventaDate.getFullYear() === parseInt(selectedYear);
        
        default:
          return true;
      }
    });
  };

  const calculateAccountingSummary = (filteredGastos: Gasto[]): AccountingSummary => {
    // ===== PASO 1: CALCULAR VENTAS NETAS =====
    
    // 1A. Ventas desde tabla Venta (nuevo sistema)
    const ventasDelPeriodo = filterVentasByPeriod();
    const ventasBrutasTabla = ventasDelPeriodo
      .filter(v => v.estado === 'confirmada' && !v.motivoAnulacion)
      .reduce((sum, v) => sum + v.total, 0);
    
    // 1B. Ventas legacy: registradas manualmente como gastos COBRO.VENTA (antes del módulo de ventas)
    const ventasLegacy = filteredGastos
      .filter(g => 
        g.tipoOperacion === 'entrada' && 
        g.rubro === 'COBRO.VENTA' && 
        (g.subRubro === 'COBRO' || g.subRubro === 'ADEUDADO')
      )
      .reduce((sum, g) => sum + (g.entrada || 0), 0);
    
    // Total ventas brutas (tabla + legacy)
    const ventasBrutas = ventasBrutasTabla + ventasLegacy;
    
    // Devoluciones: obtener de gastos con subRubro DEVOLUCION (son NEGATIVAS)
    const devolucionesGastos = filteredGastos
      .filter(g => g.tipoOperacion === 'entrada' && g.subRubro === 'DEVOLUCION')
      .reduce((sum, g) => sum + (g.entrada || 0), 0);
    
    const ventasNetas = ventasBrutas - devolucionesGastos;

    // ===== PASO 2: INGRESOS OPERACIONALES (Flete, Comisiones, Ajustes) =====
    const conceptMaps = {
      ventasNetas: new Map<string, { amount: number; count: number; rubros: Set<string> }>(),
      ingresosOperacionales: new Map<string, { amount: number; count: number; rubros: Set<string> }>(),
      gastosFijos: new Map<string, { amount: number; count: number; rubros: Set<string> }>(),
      gastosVariables: new Map<string, { amount: number; count: number; rubros: Set<string> }>(),
      gastosPersonal: new Map<string, { amount: number; count: number; rubros: Set<string> }>(),
      gastosAdministrativos: new Map<string, { amount: number; count: number; rubros: Set<string> }>(),
      gastosOperacionales: new Map<string, { amount: number; count: number; rubros: Set<string> }>(),
      gastosFinancieros: new Map<string, { amount: number; count: number; rubros: Set<string> }>()
    };

    // Agregar ventas brutas y devoluciones a conceptMaps
    if (ventasBrutasTabla > 0) {
      addToConceptMap(conceptMaps.ventasNetas, 'Ventas (Módulo Ventas)', ventasBrutasTabla, 'VENTAS');
    }
    if (ventasLegacy > 0) {
      addToConceptMap(conceptMaps.ventasNetas, 'Ventas (Registros Manuales)', ventasLegacy, 'COBRO.VENTA');
    }
    if (devolucionesGastos > 0) {
      addToConceptMap(conceptMaps.ventasNetas, 'Devoluciones', -devolucionesGastos, 'COBRO.VENTA');
    }

    let totalIngresosOperacionales = 0;
    let totalEgresos = 0;
    let flujoCobros = 0;

    // Procesar cada gasto
    filteredGastos.forEach(gasto => {
      const amount = gasto.tipoOperacion === 'entrada' ? (gasto.entrada || 0) : (gasto.salida || 0);
      
      if (gasto.tipoOperacion === 'entrada') {
        // SEPARAR: Ingresos operacionales vs Ventas legacy vs Flujo de cobranzas
        if (gasto.rubro === 'COBRO.VENTA' && ['FLETE', 'COMISION', 'AJUSTE'].includes(gasto.subRubro)) {
          // Ingresos operacionales (accesorios de ventas)
          totalIngresosOperacionales += amount;
          addToConceptMap(conceptMaps.ingresosOperacionales, getOperationalIncomeCategory(gasto), amount, gasto.rubro);
        } else if (gasto.rubro === 'COBRO.VENTA' && (gasto.subRubro === 'COBRO' || gasto.subRubro === 'ADEUDADO')) {
          // COBRO/ADEUDADO en COBRO.VENTA → Son ventas legacy (ya contadas arriba)
          // NO contar en flujo de cobros para evitar duplicación
          // (Ya están incluidas en ventasLegacy)
        } else if (gasto.rubro === 'BANCO' && (gasto.subRubro === 'AJUSTE DE BANCO' || gasto.subRubro === 'AJUSTE CAJA' || gasto.subRubro === 'AJUSTE')) {
          // Ajustes bancarios/caja son ingresos operacionales
          totalIngresosOperacionales += amount;
          addToConceptMap(conceptMaps.ingresosOperacionales, 'Ajustes Bancarios', amount, gasto.rubro);
        }
        // NOTA: DEVOLUCION ya se procesó arriba como NEGATIVO en ventas
      } else if (gasto.tipoOperacion === 'salida') {
        totalEgresos += amount;
        
        // IMPORTANTE: Capital de préstamos NO es gasto contable (solo movimiento de caja)
        const esCapitalPrestamo = gasto.rubro === 'BANCO' && gasto.subRubro === 'PRESTAMO';
        
        if (esCapitalPrestamo) {
          // Solo registrar en conceptMap para visibilidad en flujo de caja, pero NO sumar a gastos financieros
          addToConceptMap(conceptMaps.gastosFinancieros, getFinancialCategory(gasto), amount, gasto.rubro);
        } else {
          // Clasificar por tipo de gasto contable
          const category = classifyExpense(gasto);
          switch (category) {
            case 'fijo':
              const fixedCategory = getFixedExpenseCategory(gasto);
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

    const ventasNetasItems = convertMapToItems(conceptMaps.ventasNetas);
    const ingresosOperacionalesItems = convertMapToItems(conceptMaps.ingresosOperacionales);
    const gastosFijosItems = convertMapToItems(conceptMaps.gastosFijos);
    const gastosVariablesItems = convertMapToItems(conceptMaps.gastosVariables);
    const gastosPersonalItems = convertMapToItems(conceptMaps.gastosPersonal);
    const gastosAdministrativosItems = convertMapToItems(conceptMaps.gastosAdministrativos);
    const gastosOperacionalesItems = convertMapToItems(conceptMaps.gastosOperacionales);
    const gastosFinancierosItems = convertMapToItems(conceptMaps.gastosFinancieros);

    const totalGastosFijos = gastosFijosItems.reduce((sum: number, item: AccountingItem) => sum + item.amount, 0);
    const totalGastosVariables = gastosVariablesItems.reduce((sum: number, item: AccountingItem) => sum + item.amount, 0);
    const totalGastosPersonal = gastosPersonalItems.reduce((sum: number, item: AccountingItem) => sum + item.amount, 0);
    const totalGastosAdministrativos = gastosAdministrativosItems.reduce((sum: number, item: AccountingItem) => sum + item.amount, 0);
    const totalGastosOperacionales = gastosOperacionalesItems.reduce((sum: number, item: AccountingItem) => sum + item.amount, 0);
    
    // IMPORTANTE: Excluir capital de préstamos del total de gastos financieros (no es gasto contable)
    const totalGastosFinancieros = gastosFinancierosItems.reduce((sum: number, item: AccountingItem) => {
      // Capital de préstamos NO se suma al gasto financiero (solo movimiento de caja)
      if (item.concept === 'Amortización de Préstamos') {
        return sum; // No sumar
      }
      return sum + item.amount;
    }, 0);

    // ===== CALCULOS FINALES =====
    const totalIngresos = ventasNetas + totalIngresosOperacionales;
    const costoVentas = totalGastosVariables; // Simplificación: gastos variables = costo de ventas
    const utilidadBruta = ventasNetas - costoVentas;
    const gastosOperacionalesCombinados = totalGastosFijos + totalGastosPersonal + totalGastosAdministrativos + totalGastosOperacionales;
    const EBITDA = utilidadBruta - gastosOperacionalesCombinados;
    const resultadoNeto = EBITDA - totalGastosFinancieros + totalIngresosOperacionales;
    
    // Métricas financieras
    const margenBruto = ventasNetas > 0 ? (utilidadBruta / ventasNetas) * 100 : 0;
    const margenOperacional = ventasNetas > 0 ? (EBITDA / ventasNetas) * 100 : 0;
    const margenNeto = totalIngresos > 0 ? (resultadoNeto / totalIngresos) * 100 : 0;
    const puntoEquilibrio = totalGastosFijos + totalGastosPersonal;

    return {
      period: getPeriodDescription(),
      totalIngresos,
      totalEgresos,
      resultadoNeto,
      ventasNetas: {
        name: 'Ventas Netas',
        description: 'Ventas confirmadas menos devoluciones',
        items: ventasNetasItems,
        total: ventasNetas,
        percentage: 100
      },
      ingresosOperacionales: {
        name: 'Otros Ingresos Operacionales',
        description: 'Fletes, comisiones y ajustes',
        items: ingresosOperacionalesItems,
        total: totalIngresosOperacionales,
        percentage: ventasNetas > 0 ? (totalIngresosOperacionales / ventasNetas) * 100 : 0
      },
      gastosFijos: {
        name: 'Gastos Fijos',
        description: 'Gastos que no varían con el volumen de producción',
        items: gastosFijosItems,
        total: totalGastosFijos,
        percentage: totalEgresos > 0 ? (totalGastosFijos / totalEgresos) * 100 : 0
      },
      gastosVariables: {
        name: 'Costo de Ventas',
        description: 'Costos directos de producción (materia prima, mano de obra)',
        items: gastosVariablesItems,
        total: totalGastosVariables,
        percentage: totalEgresos > 0 ? (totalGastosVariables / totalEgresos) * 100 : 0
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
      },
      flujoCaja: {
        cobrosDelPeriodo: flujoCobros,
        pagosDelPeriodo: totalEgresos,
        flujoNeto: flujoCobros - totalEgresos
      },
      margenBruto,
      margenOperacional,
      margenNeto,
      puntoEquilibrio
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
      case 'ELECTRICIDAD':
        return 'Energía Eléctrica';
      case 'AGUA':
        return 'Servicios de Agua';
      case 'GAS':
        return 'Gas Natural';
      case 'RED NET':
      case 'Servicios de Internet/Telecomunicaciones':
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
      switch (gasto.subRubro) {
        case 'PRESTAMO':
          // PRESTAMO = capital puro (NO es gasto, solo flujo de caja)
          // Para intereses, crear gasto separado con subRubro='INTERES'
          return 'Amortización de Préstamos';
        case 'INTERES':
        case 'INTERESES':
          return 'Intereses de Préstamos'; // Gasto financiero real
        case 'COMISION BANCARIA':
        case 'COMISIONES':
          return 'Comisiones Bancarias';
        case 'MANTENIMIENTO':
        case 'MANTENIMIENTO CUENTA':
          return 'Mantenimiento de Cuenta';
        default:
          return 'Gastos Bancarios'; // Otros gastos bancarios sí cuentan
      }
    } else if (gasto.rubro === 'ARCA') {
      return 'Impuestos - IVA';
    }
    return gasto.subRubro;
  };

  const getOperationalIncomeCategory = (gasto: Gasto): string => {
    switch (gasto.subRubro) {
      case 'FLETE':
        return 'Ingresos por Flete';
      case 'COMISION':
        return 'Comisiones Cobradas';
      case 'AJUSTE':
        return 'Ajustes Positivos';
      default:
        return `Otros Ingresos - ${gasto.subRubro}`;
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
                  .map((item, index) => {
                    const esAmortizacion = item.concept === 'Amortización de Préstamos';
                    return (
                      <TableRow 
                        key={index}
                        sx={esAmortizacion ? { bgcolor: 'info.light', opacity: 0.7 } : {}}
                      >
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {item.concept}
                              {esAmortizacion && (
                                <Chip 
                                  label="No sumado" 
                                  size="small" 
                                  color="info" 
                                  sx={{ ml: 1, fontSize: '0.7rem' }}
                                />
                              )}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              Rubros: {item.rubros.join(', ')}
                              {esAmortizacion && ' • Capital pagado (solo flujo de caja)'}
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
                            {esAmortizacion ? '-' : `${((item.amount / category.total) * 100).toFixed(1)}%`}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
      ['Ventas Netas', formatCurrency(reportData.ventasNetas.total)],
      ['Otros Ingresos', formatCurrency(reportData.ingresosOperacionales.total)],
      ['Total Ingresos', formatCurrency(reportData.totalIngresos)],
      ['Total Egresos', formatCurrency(reportData.totalEgresos)],
      ['Resultado Neto', formatCurrency(reportData.resultadoNeto)],
      ['Margen Bruto', `${reportData.margenBruto.toFixed(1)}%`],
      ['Margen Operacional', `${reportData.margenOperacional.toFixed(1)}%`],
      ['Margen Neto', `${reportData.margenNeto.toFixed(1)}%`]
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

    // Agregar todas las categorías - Estado de Resultados
    addCategoryTable(reportData.ventasNetas, 'A. Ventas Netas');
    addCategoryTable(reportData.ingresosOperacionales, 'Otros Ingresos Operacionales');
    addCategoryTable(reportData.gastosVariables, 'B. Costo de Ventas');
    addCategoryTable(reportData.gastosPersonal, 'C. Gastos de Personal');
    addCategoryTable(reportData.gastosFijos, 'Gastos Fijos');
    addCategoryTable(reportData.gastosOperacionales, 'Gastos Operacionales');
    addCategoryTable(reportData.gastosAdministrativos, 'Gastos Administrativos');
    addCategoryTable(reportData.gastosFinancieros, 'D. Gastos Financieros');

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
      ['Margen Bruto', `${reportData.margenBruto.toFixed(1)}%`],
      ['Margen Operacional', `${reportData.margenOperacional.toFixed(1)}%`],
      ['Margen Neto', `${reportData.margenNeto.toFixed(1)}%`],
      ['Punto de Equilibrio', formatCurrency(reportData.puntoEquilibrio)],
      ['Flujo de Caja Neto', formatCurrency(reportData.flujoCaja.flujoNeto)]
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
      ['ESTADO DE RESULTADOS'],
      [`Período: ${reportData.period}`],
      [],
      ['A. INGRESOS'],
      ['Ventas Netas', reportData.ventasNetas.total],
      ['Otros Ingresos Operacionales', reportData.ingresosOperacionales.total],
      ['Total Ingresos', reportData.totalIngresos],
      [],
      ['B. COSTO DE VENTAS'],
      ['Costo de Ventas', reportData.gastosVariables.total],
      [],
      ['UTILIDAD BRUTA', reportData.ventasNetas.total - reportData.gastosVariables.total],
      ['Margen Bruto (%)', reportData.margenBruto.toFixed(2)],
      [],
      ['C. GASTOS OPERACIONALES'],
      ['Gastos de Personal', reportData.gastosPersonal.total],
      ['Gastos Fijos', reportData.gastosFijos.total],
      ['Gastos Operacionales', reportData.gastosOperacionales.total],
      ['Gastos Administrativos', reportData.gastosAdministrativos.total],
      [],
      ['EBITDA', reportData.ventasNetas.total - reportData.gastosVariables.total - reportData.gastosPersonal.total - reportData.gastosFijos.total - reportData.gastosOperacionales.total - reportData.gastosAdministrativos.total],
      ['Margen Operacional (%)', reportData.margenOperacional.toFixed(2)],
      [],
      ['D. GASTOS FINANCIEROS'],
      ['Gastos Financieros', reportData.gastosFinancieros.total],
      [],
      ['RESULTADO NETO', reportData.resultadoNeto],
      ['Margen Neto (%)', reportData.margenNeto.toFixed(2)],
      [],
      ['INFORMACIÓN DE FLUJO DE CAJA'],
      ['Cobros del Período', reportData.flujoCaja.cobrosDelPeriodo],
      ['Pagos del Período', reportData.flujoCaja.pagosDelPeriodo],
      ['Flujo Neto', reportData.flujoCaja.flujoNeto]
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
    createCategorySheet(reportData.ventasNetas, 'Ventas Netas');
    createCategorySheet(reportData.ingresosOperacionales, 'Otros Ingresos');
    createCategorySheet(reportData.gastosVariables, 'Costo de Ventas');
    createCategorySheet(reportData.gastosPersonal, 'Gastos Personal');
    createCategorySheet(reportData.gastosFijos, 'Gastos Fijos');
    createCategorySheet(reportData.gastosOperacionales, 'Gastos Operacionales');
    createCategorySheet(reportData.gastosAdministrativos, 'Gastos Administrativos');
    createCategorySheet(reportData.gastosFinancieros, 'Gastos Financieros');

    // Hoja de análisis
    const analysisData = [
      ['ANÁLISIS FINANCIERO'],
      [],
      ['Indicador', 'Valor'],
      ['Margen Bruto (%)', reportData.margenBruto.toFixed(2)],
      ['Margen Operacional (%)', reportData.margenOperacional.toFixed(2)],
      ['Margen Neto (%)', reportData.margenNeto.toFixed(2)],
      ['Punto de Equilibrio', reportData.puntoEquilibrio],
      ['Gastos de Personal (% de ventas)', reportData.ventasNetas.total > 0 ? ((reportData.gastosPersonal.total / reportData.ventasNetas.total) * 100).toFixed(2) : '0'],
      ['Gastos Fijos (% de ventas)', reportData.ventasNetas.total > 0 ? ((reportData.gastosFijos.total / reportData.ventasNetas.total) * 100).toFixed(2) : '0'],
      ['Costo de Ventas (% de ventas)', reportData.ventasNetas.total > 0 ? ((reportData.gastosVariables.total / reportData.ventasNetas.total) * 100).toFixed(2) : '0']
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
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <Card sx={{ bgcolor: 'success.light', color: 'white' }}>
                  <CardContent>
                    <Typography variant="subtitle2">Ventas Netas</Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {formatCurrency(reportData.ventasNetas.total)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card sx={{ bgcolor: 'info.light', color: 'white' }}>
                  <CardContent>
                    <Typography variant="subtitle2">Otros Ingresos</Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {formatCurrency(reportData.ingresosOperacionales.total)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card sx={{ bgcolor: 'error.light', color: 'white' }}>
                  <CardContent>
                    <Typography variant="subtitle2">Total Egresos</Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {formatCurrency(reportData.totalEgresos)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card sx={{ bgcolor: reportData.resultadoNeto >= 0 ? 'success.main' : 'error.main', color: 'white' }}>
                  <CardContent>
                    <Typography variant="subtitle2">Resultado Neto</Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {formatCurrency(reportData.resultadoNeto)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Métricas Financieras */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Indicadores Clave
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <Box textAlign="center" p={2} bgcolor="background.paper" borderRadius={1}>
                    <Typography variant="body2" color="textSecondary">Margen Bruto</Typography>
                    <Typography variant="h6" fontWeight="bold" color={reportData.margenBruto > 30 ? 'success.main' : 'warning.main'}>
                      {reportData.margenBruto.toFixed(1)}%
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {reportData.margenBruto > 30 ? 'Saludable' : 'Bajo'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box textAlign="center" p={2} bgcolor="background.paper" borderRadius={1}>
                    <Typography variant="body2" color="textSecondary">Margen Operacional</Typography>
                    <Typography variant="h6" fontWeight="bold" color={reportData.margenOperacional > 15 ? 'success.main' : 'warning.main'}>
                      {reportData.margenOperacional.toFixed(1)}%
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {reportData.margenOperacional > 15 ? 'Saludable' : 'Mejorable'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box textAlign="center" p={2} bgcolor="background.paper" borderRadius={1}>
                    <Typography variant="body2" color="textSecondary">Margen Neto</Typography>
                    <Typography variant="h6" fontWeight="bold" color={reportData.margenNeto > 10 ? 'success.main' : 'error.main'}>
                      {reportData.margenNeto.toFixed(1)}%
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {reportData.margenNeto > 10 ? 'Rentable' : 'Ajustar'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box textAlign="center" p={2} bgcolor="background.paper" borderRadius={1}>
                    <Typography variant="body2" color="textSecondary">Punto de Equilibrio</Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {formatCurrency(reportData.puntoEquilibrio)}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {reportData.ventasNetas.total > reportData.puntoEquilibrio ? '✓ Superado' : '✗ No alcanzado'}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>

            {/* Flujo de Caja */}
            <Box sx={{ mt: 3 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  Información de Flujo de Caja (No contable)
                </Typography>
              </Alert>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="textSecondary">Cobros del Período</Typography>
                  <Typography variant="h6">{formatCurrency(reportData.flujoCaja.cobrosDelPeriodo)}</Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="textSecondary">Pagos del Período</Typography>
                  <Typography variant="h6">{formatCurrency(reportData.flujoCaja.pagosDelPeriodo)}</Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="textSecondary">Flujo Neto</Typography>
                  <Typography variant="h6" color={reportData.flujoCaja.flujoNeto >= 0 ? 'success.main' : 'error.main'}>
                    {formatCurrency(reportData.flujoCaja.flujoNeto)}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </Paper>

          {/* Estado de Resultados */}
          <Typography variant="h5" gutterBottom sx={{ mt: 4, mb: 2 }}>
            Estado de Resultados (Estructura Contable)
          </Typography>

          {/* INGRESOS */}
          <Typography variant="h6" sx={{ mt: 3, mb: 2, color: 'success.main' }}>
            A. INGRESOS
          </Typography>
          {renderCategoryTable(reportData.ventasNetas)}
          {renderCategoryTable(reportData.ingresosOperacionales)}

          {/* COSTOS */}
          <Typography variant="h6" sx={{ mt: 3, mb: 2, color: 'error.main' }}>
            B. COSTO DE VENTAS
          </Typography>
          {renderCategoryTable(reportData.gastosVariables)}
          
          <Paper sx={{ p: 2, mb: 3, bgcolor: 'info.light' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Utilidad Bruta</Typography>
              <Typography variant="h5" fontWeight="bold">
                {formatCurrency(reportData.ventasNetas.total - reportData.gastosVariables.total)}
              </Typography>
            </Box>
            <Typography variant="caption" color="textSecondary">
              Margen Bruto: {reportData.margenBruto.toFixed(1)}%
            </Typography>
          </Paper>

          {/* GASTOS OPERACIONALES */}
          <Typography variant="h6" sx={{ mt: 3, mb: 2, color: 'warning.main' }}>
            C. GASTOS OPERACIONALES
          </Typography>
          {renderCategoryTable(reportData.gastosPersonal)}
          {renderCategoryTable(reportData.gastosFijos)}
          {renderCategoryTable(reportData.gastosOperacionales)}
          {renderCategoryTable(reportData.gastosAdministrativos)}

          <Paper sx={{ p: 2, mb: 3, bgcolor: 'warning.light' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">EBITDA (Utilidad Operacional)</Typography>
              <Typography variant="h5" fontWeight="bold">
                {formatCurrency(
                  reportData.ventasNetas.total - 
                  reportData.gastosVariables.total - 
                  reportData.gastosPersonal.total -
                  reportData.gastosFijos.total -
                  reportData.gastosOperacionales.total -
                  reportData.gastosAdministrativos.total
                )}
              </Typography>
            </Box>
            <Typography variant="caption" color="textSecondary">
              Margen Operacional: {reportData.margenOperacional.toFixed(1)}%
            </Typography>
          </Paper>

          {/* GASTOS FINANCIEROS */}
          <Typography variant="h6" sx={{ mt: 3, mb: 2, color: 'error.main' }}>
            D. GASTOS FINANCIEROS
          </Typography>
          
          {/* Nota explicativa sobre préstamos */}
          {reportData.gastosFinancieros.items.some(item => item.concept === 'Amortización de Préstamos') && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Nota Contable:</strong> La "Amortización de Préstamos" (capital pagado) se muestra para transparencia del flujo de caja, 
                pero <strong>NO se suma al total de Gastos Financieros</strong> ya que contablemente el pago de capital solo reduce el pasivo, no es un gasto. 
                Solo los <strong>intereses</strong> se consideran gasto financiero.
              </Typography>
            </Alert>
          )}
          
          {renderCategoryTable(reportData.gastosFinancieros)}

          {/* RESULTADO FINAL */}
          <Paper sx={{ p: 3, mb: 3, bgcolor: reportData.resultadoNeto >= 0 ? 'success.light' : 'error.light' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="h5" fontWeight="bold">
                  RESULTADO NETO
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Margen Neto: {reportData.margenNeto.toFixed(1)}%
                </Typography>
              </Box>
              <Typography variant="h3" fontWeight="bold">
                {formatCurrency(reportData.resultadoNeto)}
              </Typography>
            </Box>
          </Paper>

          {/* Análisis y Alertas */}
          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Análisis y Recomendaciones
            </Typography>
            
            {/* Alertas críticas */}
            {reportData.margenBruto < 30 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  ⚠️ Margen bruto bajo ({reportData.margenBruto.toFixed(1)}%)
                </Typography>
                <Typography variant="body2">
                  El margen bruto está por debajo del 30% recomendado. Considerar: revisar precios de venta, negociar mejores costos con proveedores, o reducir desperdicios en producción.
                </Typography>
              </Alert>
            )}

            {reportData.ventasNetas.total < reportData.puntoEquilibrio && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  🚨 Ventas por debajo del punto de equilibrio
                </Typography>
                <Typography variant="body2">
                  Las ventas ({formatCurrency(reportData.ventasNetas.total)}) no cubren los costos fijos + personal ({formatCurrency(reportData.puntoEquilibrio)}). 
                  Déficit: {formatCurrency(reportData.puntoEquilibrio - reportData.ventasNetas.total)}. 
                  Acción urgente: aumentar ventas o reducir costos fijos.
                </Typography>
              </Alert>
            )}

            {reportData.flujoCaja.flujoNeto < 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  💰 Flujo de caja negativo
                </Typography>
                <Typography variant="body2">
                  Los pagos ({formatCurrency(reportData.flujoCaja.pagosDelPeriodo)}) superan los cobros ({formatCurrency(reportData.flujoCaja.cobrosDelPeriodo)}). 
                  Déficit: {formatCurrency(Math.abs(reportData.flujoCaja.flujoNeto))}. 
                  Revisar políticas de crédito y acelerar cobranzas.
                </Typography>
              </Alert>
            )}

            {reportData.gastosPersonal.total / reportData.ventasNetas.total > 0.35 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  👥 Gastos de personal elevados
                </Typography>
                <Typography variant="body2">
                  Los gastos de personal representan {((reportData.gastosPersonal.total / reportData.ventasNetas.total) * 100).toFixed(1)}% de las ventas (ideal: 15-25%). 
                  Evaluar productividad y estructura organizacional.
                </Typography>
              </Alert>
            )}

            {/* Métricas comparativas */}
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={12} md={4}>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    <strong>Gastos de Personal vs Ventas:</strong>
                  </Typography>
                  <Typography variant="h6" color={reportData.gastosPersonal.total / reportData.ventasNetas.total > 0.25 ? 'error.main' : 'success.main'}>
                    {((reportData.gastosPersonal.total / reportData.ventasNetas.total) * 100).toFixed(1)}%
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Ideal: 15-25%
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    <strong>Gastos Fijos vs Ventas:</strong>
                  </Typography>
                  <Typography variant="h6" color={reportData.gastosFijos.total / reportData.ventasNetas.total > 0.25 ? 'warning.main' : 'success.main'}>
                    {((reportData.gastosFijos.total / reportData.ventasNetas.total) * 100).toFixed(1)}%
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Ideal: &lt; 25%
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    <strong>Margen de Seguridad:</strong>
                  </Typography>
                  <Typography variant="h6" color={reportData.ventasNetas.total > reportData.puntoEquilibrio ? 'success.main' : 'error.main'}>
                    {reportData.ventasNetas.total > 0 ? (((reportData.ventasNetas.total - reportData.puntoEquilibrio) / reportData.ventasNetas.total) * 100).toFixed(1) : '0'}%
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Cushion sobre punto de equilibrio
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default AccountingReport;