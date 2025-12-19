import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
  Chip,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Collapse,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import {
  AttachMoney as MoneyIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Receipt as ReceiptIcon,
  CheckCircle as CheckIcon,
  PersonAdd as PersonAddIcon,
  TrendingDown as DescuentoIcon,
  TrendingUp as IncentivoIcon
} from '@mui/icons-material';
import { AppDispatch, RootState } from '../redux/store';
import { LiquidacionPeriodo, LiquidacionEmpleado, TIPOS_DESCUENTO, TIPOS_INCENTIVO, APORTES_EMPLEADO, CONTRIBUCIONES_EMPLEADOR } from '../types';
import { liquidarEmpleado, fetchPeriodoById, cerrarPeriodo, agregarEmpleado } from '../redux/slices/liquidacionSlice';
import { fetchGastos } from '../redux/slices/gastosSlice';
import { fetchEmployees } from '../redux/slices/employeesSlice';
import { fetchDescuentos } from '../redux/slices/descuentosEmpleadoSlice';
import { fetchIncentivos } from '../redux/slices/incentivosEmpleadoSlice';
import { formatCurrency } from '../utils/formatters';
import ReciboSueldo from './ReciboSueldo';
import { ConfirmDialog } from './modal';

interface ResumenLiquidacionProps {
  periodo: LiquidacionPeriodo;
}

const ResumenLiquidacion: React.FC<ResumenLiquidacionProps> = ({ periodo }) => {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const { items: empleados } = useSelector((state: RootState) => state.employees);
  const { items: descuentosPeriodo } = useSelector((state: RootState) => state.descuentosEmpleado);
  const { items: incentivosPeriodo } = useSelector((state: RootState) => state.incentivosEmpleado);
  
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [openLiquidar, setOpenLiquidar] = useState(false);
  const [selectedEmpleado, setSelectedEmpleado] = useState<LiquidacionEmpleado | null>(null);
  const [observaciones, setObservaciones] = useState('');
  const [medioDePago, setMedioDePago] = useState<string>('TRANSFERENCIA');
  const [banco, setBanco] = useState<string>('PROVINCIA');
  const [openCerrar, setOpenCerrar] = useState(false);
  const [observacionesCierre, setObservacionesCierre] = useState('');
  const [openRecibo, setOpenRecibo] = useState(false);
  const [reciboEmpleado, setReciboEmpleado] = useState<LiquidacionEmpleado | null>(null);
  const [openAgregarEmpleado, setOpenAgregarEmpleado] = useState(false);
  const [nuevoEmpleadoId, setNuevoEmpleadoId] = useState('');
  const [openConfirmLiquidar, setOpenConfirmLiquidar] = useState(false);
  const [selectedDescuentosIds, setSelectedDescuentosIds] = useState<string[]>([]);
  const [selectedIncentivosIds, setSelectedIncentivosIds] = useState<string[]>([]);

  const isEditable = periodo.estado === 'abierto' && (user?.userType === 'admin' || user?.userType === 'oper_ad');

  // Obtener período en formato YYYY-MM desde las fechas del período
  const periodoMes = useMemo(() => {
    if (!periodo.fechaInicio) return '';
    return periodo.fechaInicio.slice(0, 7); // YYYY-MM
  }, [periodo.fechaInicio]);

  // Cargar empleados si no están cargados
  useEffect(() => {
    if (empleados.length === 0) {
      dispatch(fetchEmployees());
    }
  }, [dispatch, empleados.length]);

  // Cargar descuentos e incentivos del período
  useEffect(() => {
    if (periodoMes) {
      // Traer todos los descuentos e incentivos del período (pendientes y aplicados/pagados)
      dispatch(fetchDescuentos({ periodoAplicacion: periodoMes }));
      dispatch(fetchIncentivos({ periodoAplicacion: periodoMes }));
    }
  }, [dispatch, periodoMes]);

  // Calcular descuentos e incentivos por empleado
  const descuentosPorEmpleado = useMemo(() => {
    const map: Record<string, number> = {};
    descuentosPeriodo.forEach(d => {
      if (d.estado === 'aplicado' || d.estado === 'pendiente') {
        const empId = typeof d.empleadoId === 'string' ? d.empleadoId : d.empleadoId._id;
        map[empId] = (map[empId] || 0) + (d.montoCalculado || d.monto);
      }
    });
    return map;
  }, [descuentosPeriodo]);

  const incentivosPorEmpleado = useMemo(() => {
    const map: Record<string, number> = {};
    incentivosPeriodo.forEach(i => {
      if (i.estado === 'pagado' || i.estado === 'pendiente') {
        const empId = typeof i.empleadoId === 'string' ? i.empleadoId : i.empleadoId._id;
        map[empId] = (map[empId] || 0) + (i.montoCalculado || i.monto);
      }
    });
    return map;
  }, [incentivosPeriodo]);

  // Detalle de descuentos por empleado
  const descuentosDetalleEmpleado = useMemo(() => {
    const map: Record<string, typeof descuentosPeriodo> = {};
    descuentosPeriodo.forEach(d => {
      const empId = typeof d.empleadoId === 'string' ? d.empleadoId : d.empleadoId._id;
      if (!map[empId]) map[empId] = [];
      map[empId].push(d);
    });
    return map;
  }, [descuentosPeriodo]);

  const incentivosDetalleEmpleado = useMemo(() => {
    const map: Record<string, typeof incentivosPeriodo> = {};
    incentivosPeriodo.forEach(i => {
      const empId = typeof i.empleadoId === 'string' ? i.empleadoId : i.empleadoId._id;
      if (!map[empId]) map[empId] = [];
      map[empId].push(i);
    });
    return map;
  }, [incentivosPeriodo]);

  // Filtrar empleados que no están en el período
  const empleadosDisponibles = empleados.filter(emp => 
    emp.estado === 'activo' && 
    !periodo.liquidaciones.some(liq => liq.empleadoId === emp._id)
  );

  const toggleRow = (empleadoId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(empleadoId)) {
      newExpanded.delete(empleadoId);
    } else {
      newExpanded.add(empleadoId);
    }
    setExpandedRows(newExpanded);
  };

  const handleOpenLiquidar = (empleado: LiquidacionEmpleado) => {
    setSelectedEmpleado(empleado);
    setObservaciones('');
    setMedioDePago('TRANSFERENCIA');
    setBanco('PROVINCIA');

    // Inicializar selección de descuentos e incentivos para este empleado
    const empId = empleado.empleadoId;
    const descuentosList = descuentosDetalleEmpleado[empId] || [];
    const incentivosList = incentivosDetalleEmpleado[empId] || [];

    const inicialDescuentos = descuentosList
      .filter(d => d.estado !== 'anulado')
      .map(d => (typeof d._id === 'string' ? d._id : (d._id as any).toString()));
    const inicialIncentivos = incentivosList
      .filter(i => i.estado !== 'anulado')
      .map(i => (typeof i._id === 'string' ? i._id : (i._id as any).toString()));

    setSelectedDescuentosIds(inicialDescuentos);
    setSelectedIncentivosIds(inicialIncentivos);

    setOpenLiquidar(true);
  };

  const handleCloseLiquidar = () => {
    setOpenLiquidar(false);
    setSelectedEmpleado(null);
    setObservaciones('');
    setSelectedDescuentosIds([]);
    setSelectedIncentivosIds([]);
  };

  const handleLiquidar = async () => {
    if (!selectedEmpleado || !periodo._id) return;

    try {
      await dispatch(liquidarEmpleado({
        periodoId: periodo._id,
        empleadoId: selectedEmpleado.empleadoId,
        observaciones,
        medioDePago,
        banco,
        descuentos: selectedDescuentosIds.map(id => ({ id })),
        incentivos: selectedIncentivosIds.map(id => ({ id }))
      })).unwrap();
      
      // Refrescar el período y los gastos (default: últimos 3 meses)
      await dispatch(fetchPeriodoById(periodo._id));
      // Refrescar descuentos e incentivos del período para reflejar cambios de estado
      const periodoMes = periodo.fechaInicio ? (new Date(periodo.fechaInicio)).toISOString().slice(0,7) : '';
      if (periodoMes) {
        // Refrescar todos los descuentos e incentivos del período (no filtrar por estado)
        await dispatch(fetchDescuentos({ periodoAplicacion: periodoMes }));
        await dispatch(fetchIncentivos({ periodoAplicacion: periodoMes }));
      }
      await dispatch(fetchGastos({}));
      handleCloseLiquidar();
      setOpenConfirmLiquidar(false);

      // Limpiar selecciones
      setSelectedDescuentosIds([]);
      setSelectedIncentivosIds([]);
    } catch (error) {
      console.error('Error al liquidar empleado:', error);
    }
  };

  const handleOpenCerrar = () => {
    setOpenCerrar(true);
  };

  const handleCloseCerrar = () => {
    setOpenCerrar(false);
    setObservacionesCierre('');
  };

  const handleCerrarPeriodo = async () => {
    if (!periodo._id || !user) return;

    try {
      await dispatch(cerrarPeriodo({
        id: periodo._id,
        cerradoPor: user.username,
        observaciones: observacionesCierre
      })).unwrap();
      
      handleCloseCerrar();
    } catch (error) {
      console.error('Error al cerrar período:', error);
    }
  };

  // Función para enriquecer datos de liquidación con datos del empleado
  const enriquecerLiquidacionConEmpleado = (liquidacion: LiquidacionEmpleado): LiquidacionEmpleado => {
    const empleadoData = empleados.find(e => e._id === liquidacion.empleadoId);
    if (!empleadoData) return liquidacion;

    // Calcular antigüedad en años
    let antiguedad = 0;
    if (empleadoData.fechaIngreso) {
      const fechaIngreso = new Date(empleadoData.fechaIngreso);
      const hoy = new Date();
      antiguedad = Math.floor((hoy.getTime() - fechaIngreso.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    }

    // Calcular adicionales
    const adicionalAntiguedad = liquidacion.sueldoBase * (antiguedad * 0.01); // 1% por año
    const adicionalPresentismo = empleadoData.adicionales?.presentismo 
      ? liquidacion.sueldoBase * 0.0833 // 8.33%
      : 0;

    // Base imponible para aportes
    const baseImponible = liquidacion.sueldoBase + liquidacion.totalHorasExtra + adicionalAntiguedad + adicionalPresentismo;
    
    // Determinar si es empleado formal (con aportes)
    const esEmpleadoFormal = empleadoData.modalidadContratacion === 'formal';
    
    // Calcular aportes solo si es empleado formal
    const aporteJubilacion = esEmpleadoFormal ? baseImponible * (APORTES_EMPLEADO.JUBILACION / 100) : 0;
    const aporteObraSocial = esEmpleadoFormal ? baseImponible * (APORTES_EMPLEADO.OBRA_SOCIAL / 100) : 0;
    const aportePami = esEmpleadoFormal ? baseImponible * (APORTES_EMPLEADO.PAMI / 100) : 0;
    const aporteSindicato = esEmpleadoFormal && empleadoData.sindicato ? baseImponible * (APORTES_EMPLEADO.SINDICATO / 100) : 0;
    const totalAportes = aporteJubilacion + aporteObraSocial + aportePami + aporteSindicato;

    // Calcular contribuciones patronales (para el gasto AFIP)
    const contribJubilacion = esEmpleadoFormal ? baseImponible * (CONTRIBUCIONES_EMPLEADOR.JUBILACION / 100) : 0;
    const contribObraSocial = esEmpleadoFormal ? baseImponible * (CONTRIBUCIONES_EMPLEADOR.OBRA_SOCIAL / 100) : 0;
    const contribPami = esEmpleadoFormal ? baseImponible * (CONTRIBUCIONES_EMPLEADOR.PAMI / 100) : 0;
    const contribART = esEmpleadoFormal ? baseImponible * (CONTRIBUCIONES_EMPLEADOR.ART / 100) : 0;
    const totalContribuciones = contribJubilacion + contribObraSocial + contribPami + contribART;

    // Costo total para el empleador
    const costoTotal = baseImponible + totalContribuciones;

    // Obtener descuentos e incentivos
    const descuentosEmp = descuentosPorEmpleado[liquidacion.empleadoId] || 0;
    const incentivosEmp = incentivosPorEmpleado[liquidacion.empleadoId] || 0;

    return {
      ...liquidacion,
      empleadoDocumento: empleadoData.documento,
      empleadoCuit: empleadoData.cuit,
      empleadoLegajo: empleadoData.legajo,
      empleadoPuesto: empleadoData.puesto,
      empleadoFechaIngreso: empleadoData.fechaIngreso,
      empleadoCategoria: empleadoData.categoriaConvenio,
      empleadoObraSocial: empleadoData.obraSocial?.nombre,
      empleadoSindicato: empleadoData.sindicato,
      empleadoAntiguedad: antiguedad,
      empleadoModalidad: empleadoData.modalidadContratacion || 'informal',
      adicionalAntiguedad,
      adicionalPresentismo,
      adicionalZona: 0,
      otrosAdicionales: 0,
      viaticos: 0,
      otrosNoRemunerativos: 0,
      totalNoRemunerativo: 0,
      totalRemunerativo: baseImponible,
      totalBruto: baseImponible + liquidacion.aguinaldos + liquidacion.bonus + incentivosEmp,
      // Aportes del empleado (solo para formales)
      aporteJubilacion,
      aporteObraSocial,
      aportePami,
      aporteSindicato,
      totalAportes,
      // Deducciones totales
      totalDeducciones: liquidacion.adelantos + descuentosEmp + totalAportes,
      // Contribuciones patronales (guardar en campos personalizados)
      contribJubilacion,
      contribObraSocial,
      contribPami,
      contribArt: contribART,
      totalContribuciones,
      costoTotal,
    };
  };

  const handleOpenRecibo = (empleado: LiquidacionEmpleado) => {
    const liquidacionEnriquecida = enriquecerLiquidacionConEmpleado(empleado);
    setReciboEmpleado(liquidacionEnriquecida);
    setOpenRecibo(true);
  };

  // Calcula el total a pagar para el empleado seleccionado (usado en el ConfirmDialog)
  const computeTotalAPagarForSelected = () => {
    if (!selectedEmpleado) return 0;
    const empleadoData = empleados.find(e => e._id === selectedEmpleado.empleadoId);
    const esEmpleadoFormal = empleadoData?.modalidadContratacion === 'formal';
    const sueldoBasePeriodo = periodo.tipo === 'quincenal' ? selectedEmpleado.sueldoBase / 2 : selectedEmpleado.sueldoBase;
    const baseImponible = sueldoBasePeriodo + selectedEmpleado.totalHorasExtra;
    const aporteJubilacion = esEmpleadoFormal ? baseImponible * (APORTES_EMPLEADO.JUBILACION / 100) : 0;
    const aporteObraSocial = esEmpleadoFormal ? baseImponible * (APORTES_EMPLEADO.OBRA_SOCIAL / 100) : 0;
    const aportePami = esEmpleadoFormal ? baseImponible * (APORTES_EMPLEADO.PAMI / 100) : 0;
    const aporteSindicato = esEmpleadoFormal && empleadoData?.sindicato ? baseImponible * (APORTES_EMPLEADO.SINDICATO / 100) : 0;
    const totalAportesEmp = aporteJubilacion + aporteObraSocial + aportePami + aporteSindicato;

    // calcular totales según selección hecha en el modal (si hay)
    const descuentosList = descuentosDetalleEmpleado[selectedEmpleado.empleadoId] || [];
    const incentivosList = incentivosDetalleEmpleado[selectedEmpleado.empleadoId] || [];

    const totalDescuentosSeleccionados = selectedDescuentosIds.reduce((sum, id) => {
      const d = descuentosList.find(x => (typeof x._id === 'string' ? x._id : (x._id as any).toString()) === id);
      if (!d) return sum;
      const monto = d.montoCalculado ?? (d.esPorcentaje ? (d.monto / 100) * sueldoBasePeriodo : d.monto);
      return sum + monto;
    }, 0);

    const totalIncentivosSeleccionados = selectedIncentivosIds.reduce((sum, id) => {
      const it = incentivosList.find(x => (typeof x._id === 'string' ? x._id : (x._id as any).toString()) === id);
      if (!it) return sum;
      const monto = it.montoCalculado ?? (it.esPorcentaje ? (it.monto / 100) * sueldoBasePeriodo : it.monto);
      return sum + monto;
    }, 0);

    const totalAPagar = sueldoBasePeriodo + selectedEmpleado.totalHorasExtra
      - selectedEmpleado.adelantos
      - totalDescuentosSeleccionados
      + totalIncentivosSeleccionados
      - totalAportesEmp;

    return totalAPagar;
  }; 

  const handleCloseRecibo = () => {
    setOpenRecibo(false);
    setReciboEmpleado(null);
  };

  const handleOpenAgregarEmpleado = () => {
    setNuevoEmpleadoId('');
    setOpenAgregarEmpleado(true);
  };

  const handleCloseAgregarEmpleado = () => {
    setOpenAgregarEmpleado(false);
    setNuevoEmpleadoId('');
  };

  const handleAgregarEmpleado = async () => {
    if (!nuevoEmpleadoId || !periodo._id) return;

    try {
      await dispatch(agregarEmpleado({
        periodoId: periodo._id,
        empleadoId: nuevoEmpleadoId
      })).unwrap();
      
      // Refrescar el período
      await dispatch(fetchPeriodoById(periodo._id));
      handleCloseAgregarEmpleado();
    } catch (error) {
      console.error('Error al agregar empleado:', error);
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'warning';
      case 'pagado':
        return 'success';
      case 'cancelado':
        return 'error';
      default:
        return 'default';
    }
  };

  const pendientesCount = periodo.liquidaciones.filter(l => l.estado === 'pendiente').length;
  const pagadosCount = periodo.liquidaciones.filter(l => l.estado === 'pagado').length;
  
  // Totales de descuentos e incentivos del período
  const totalDescuentosPeriodo = Object.values(descuentosPorEmpleado).reduce((sum, val) => sum + val, 0);
  const totalIncentivosPeriodo = Object.values(incentivosPorEmpleado).reduce((sum, val) => sum + val, 0);

  return (
    <Box>
      {/* Estadísticas */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Paper sx={{ flex: '1 1 150px', p: 2 }}>
          <Typography variant="body2" color="text.secondary">Empleados Totales</Typography>
          <Typography variant="h4" fontWeight="bold">{periodo.liquidaciones.length}</Typography>
        </Paper>
        <Paper sx={{ flex: '1 1 150px', p: 2 }}>
          <Typography variant="body2" color="text.secondary">Pendientes de Pago</Typography>
          <Typography variant="h4" fontWeight="bold" color="warning.main">{pendientesCount}</Typography>
        </Paper>
        <Paper sx={{ flex: '1 1 150px', p: 2 }}>
          <Typography variant="body2" color="text.secondary">Pagados</Typography>
          <Typography variant="h4" fontWeight="bold" color="success.main">{pagadosCount}</Typography>
        </Paper>
        <Paper sx={{ flex: '1 1 150px', p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <DescuentoIcon fontSize="small" color="error" />
            <Typography variant="body2" color="text.secondary">Descuentos</Typography>
          </Box>
          <Typography variant="h5" fontWeight="bold" color="error.main">
            -{formatCurrency(totalDescuentosPeriodo)}
          </Typography>
        </Paper>
        <Paper sx={{ flex: '1 1 150px', p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IncentivoIcon fontSize="small" color="success" />
            <Typography variant="body2" color="text.secondary">Incentivos</Typography>
          </Box>
          <Typography variant="h5" fontWeight="bold" color="success.main">
            +{formatCurrency(totalIncentivosPeriodo)}
          </Typography>
        </Paper>
        <Paper sx={{ flex: '1 1 150px', p: 2 }}>
          <Typography variant="body2" color="text.secondary">Total a Liquidar</Typography>
          <Typography variant="h4" fontWeight="bold" color="primary.main">
            {formatCurrency(
              (periodo.tipo === 'quincenal' ? periodo.totalGeneral / 2 : periodo.totalGeneral) 
              - totalDescuentosPeriodo 
              + totalIncentivosPeriodo
            )}
          </Typography>
        </Paper>
      </Box>

      {/* Alertas y acciones */}
      {empleadosDisponibles.length > 0 && isEditable && (
        <Alert severity="info" sx={{ mb: 2 }} action={
          <Button 
            color="inherit" 
            size="small" 
            startIcon={<PersonAddIcon />}
            onClick={handleOpenAgregarEmpleado}
          >
            Agregar Empleado
          </Button>
        }>
          Hay {empleadosDisponibles.length} empleado(s) activo(s) que no están en este período.
        </Alert>
      )}

      {isEditable && pendientesCount === 0 && (
        <Alert severity="success" sx={{ mb: 2 }} action={
          <Button color="inherit" size="small" onClick={handleOpenCerrar}>
            Cerrar Período
          </Button>
        }>
          Todos los empleados han sido liquidados. Puedes cerrar el período.
        </Alert>
      )}

      {/* Tabla de liquidaciones */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell width={50}></TableCell>
              <TableCell><strong>Empleado</strong></TableCell>
              <TableCell align="right"><strong>Sueldo Base</strong></TableCell>
              <TableCell align="right"><strong>Horas Extra</strong></TableCell>
              <TableCell align="right"><strong>Adelantos</strong></TableCell>
              <TableCell align="right">
                <Tooltip title="Descuentos por sanciones, faltantes, etc.">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                    <DescuentoIcon fontSize="small" color="error" />
                    <strong>Descuentos</strong>
                  </Box>
                </Tooltip>
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Incentivos por productividad, ventas, etc.">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                    <IncentivoIcon fontSize="small" color="success" />
                    <strong>Incentivos</strong>
                  </Box>
                </Tooltip>
              </TableCell>
              <TableCell align="right"><strong>Total a Pagar</strong></TableCell>
              <TableCell align="center"><strong>Estado</strong></TableCell>
              <TableCell align="center"><strong>Acciones</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {periodo.liquidaciones.map((liquidacion) => {
              // Calcular descuentos e incentivos para este empleado
              const descuentosEmp = descuentosPorEmpleado[liquidacion.empleadoId] || 0;
              const incentivosEmp = incentivosPorEmpleado[liquidacion.empleadoId] || 0;
              const descuentosDetalleEmp = descuentosDetalleEmpleado[liquidacion.empleadoId] || [];
              const incentivosDetalleEmp = incentivosDetalleEmpleado[liquidacion.empleadoId] || [];
              
              // Calcular total ajustado
              const sueldoBaseAjustado = periodo.tipo === 'quincenal' ? liquidacion.sueldoBase / 2 : liquidacion.sueldoBase;
              
              // Obtener modalidad del empleado
              const empleadoData = empleados.find(e => e._id === liquidacion.empleadoId);
              const esEmpleadoFormal = empleadoData?.modalidadContratacion === 'formal';
              
              // Calcular aportes si es formal
              const baseImponible = sueldoBaseAjustado + liquidacion.totalHorasExtra;
              const totalAportesEmp = esEmpleadoFormal 
                ? baseImponible * ((APORTES_EMPLEADO.JUBILACION + APORTES_EMPLEADO.OBRA_SOCIAL + APORTES_EMPLEADO.PAMI + (empleadoData?.sindicato ? APORTES_EMPLEADO.SINDICATO : 0)) / 100)
                : 0;
              
              // Total ajustado (informal = bruto, formal = neto)
              const totalAjustado = sueldoBaseAjustado + liquidacion.totalHorasExtra - liquidacion.adelantos - descuentosEmp + incentivosEmp - totalAportesEmp;
              
              return (
              <React.Fragment key={liquidacion.empleadoId}>
                <TableRow hover>
                  <TableCell>
                    <IconButton size="small" onClick={() => toggleRow(liquidacion.empleadoId)}>
                      {expandedRows.has(liquidacion.empleadoId) ? <CollapseIcon /> : <ExpandIcon />}
                    </IconButton>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight="medium">
                        {liquidacion.empleadoApellido}, {liquidacion.empleadoNombre}
                      </Typography>
                      <Tooltip title={esEmpleadoFormal ? 'Empleado formal - Con aportes' : 'Empleado informal - Pago en mano'}>
                        <Chip 
                          label={esEmpleadoFormal ? '📋' : '💵'} 
                          size="small" 
                          variant="outlined"
                          color={esEmpleadoFormal ? 'primary' : 'default'}
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="text.secondary">
                      {formatCurrency(sueldoBaseAjustado)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="info.main">
                      +{formatCurrency(liquidacion.totalHorasExtra)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="warning.main">
                      -{formatCurrency(liquidacion.adelantos)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="error.main" fontWeight={descuentosEmp > 0 ? 'medium' : 'normal'}>
                      {descuentosEmp > 0 ? `-${formatCurrency(descuentosEmp)}` : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="success.main" fontWeight={incentivosEmp > 0 ? 'medium' : 'normal'}>
                      {incentivosEmp > 0 ? `+${formatCurrency(incentivosEmp)}` : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Box>
                      <Typography variant="body2" fontWeight="bold" color="primary.main">
                        {formatCurrency(totalAjustado)}
                      </Typography>
                      {esEmpleadoFormal && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          (Neto)
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={liquidacion.estado.toUpperCase()}
                      color={getEstadoColor(liquidacion.estado)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    {liquidacion.estado === 'pendiente' && isEditable && (
                      <Tooltip title="Liquidar">
                        <IconButton
                          color="primary"
                          onClick={() => handleOpenLiquidar(liquidacion)}
                        >
                          <MoneyIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    {liquidacion.estado === 'pagado' && (
                      <Tooltip title="Ver recibo">
                        <IconButton 
                          color="success"
                          onClick={() => handleOpenRecibo(liquidacion)}
                        >
                          <ReceiptIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
                
                {/* Fila expandida con detalles */}
                <TableRow>
                  <TableCell colSpan={10} sx={{ p: 0 }}>
                    <Collapse in={expandedRows.has(liquidacion.empleadoId)} timeout="auto" unmountOnExit>
                      <Box sx={{ p: 2, backgroundColor: 'grey.50' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="subtitle2">Detalle de Liquidación</Typography>
                          <Chip 
                            label={esEmpleadoFormal ? '📋 Formal (con aportes)' : '💵 Informal (en mano)'} 
                            size="small" 
                            color={esEmpleadoFormal ? 'primary' : 'default'}
                          />
                        </Box>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, mt: 1 }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary">Sueldo Base:</Typography>
                            <Typography variant="body2">{formatCurrency(liquidacion.sueldoBase)}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">Horas Extra ({liquidacion.horasExtra.length}):</Typography>
                            <Typography variant="body2" color="info.main">
                              +{formatCurrency(liquidacion.totalHorasExtra)}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">Aguinaldos:</Typography>
                            <Typography variant="body2" color="secondary.main">
                              +{formatCurrency(liquidacion.aguinaldos)}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">Bonus:</Typography>
                            <Typography variant="body2" color="secondary.main">
                              +{formatCurrency(liquidacion.bonus)}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">Adelantos:</Typography>
                            <Typography variant="body2" color="warning.main">
                              -{formatCurrency(liquidacion.adelantos)}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">Descuentos (sistema):</Typography>
                            <Typography variant="body2" color="error.main">
                              -{formatCurrency(descuentosEmp)}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">Incentivos:</Typography>
                            <Typography variant="body2" color="success.main">
                              +{formatCurrency(incentivosEmp)}
                            </Typography>
                          </Box>
                        </Box>
                        
                        {/* Detalle de descuentos del sistema */}
                        {descuentosDetalleEmp.length > 0 && (
                          <Box sx={{ mt: 2, p: 1.5, backgroundColor: 'error.50', borderRadius: 1, border: '1px solid', borderColor: 'error.200' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                              <DescuentoIcon fontSize="small" color="error" />
                              <Typography variant="caption" color="error.main" fontWeight="medium">
                                Descuentos aplicados ({descuentosDetalleEmp.length}):
                              </Typography>
                            </Box>
                            {descuentosDetalleEmp.map((d, index) => (
                              <Typography key={index} variant="caption" display="block" color="error.dark">
                                • {TIPOS_DESCUENTO[d.tipo as keyof typeof TIPOS_DESCUENTO] || d.tipo}: {d.motivo} - {formatCurrency(d.montoCalculado || d.monto)}
                                {d.esPorcentaje && ` (${d.monto}%)`}
                              </Typography>
                            ))}
                          </Box>
                        )}

                        {/* Detalle de incentivos del sistema */}
                        {incentivosDetalleEmp.length > 0 && (
                          <Box sx={{ mt: 2, p: 1.5, backgroundColor: 'success.50', borderRadius: 1, border: '1px solid', borderColor: 'success.200' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                              <IncentivoIcon fontSize="small" color="success" />
                              <Typography variant="caption" color="success.main" fontWeight="medium">
                                Incentivos aplicados ({incentivosDetalleEmp.length}):
                              </Typography>
                            </Box>
                            {incentivosDetalleEmp.map((i, index) => (
                              <Typography key={index} variant="caption" display="block" color="success.dark">
                                • {TIPOS_INCENTIVO[i.tipo as keyof typeof TIPOS_INCENTIVO] || i.tipo}: {i.motivo} - {formatCurrency(i.montoCalculado || i.monto)}
                                {i.esPorcentaje && ` (${i.monto}%)`}
                              </Typography>
                            ))}
                          </Box>
                        )}
                        
                        {liquidacion.horasExtra.length > 0 && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="caption" color="text.secondary">Horas Extra Registradas:</Typography>
                            <Box sx={{ mt: 0.5 }}>
                              {liquidacion.horasExtra.map((he, index) => (
                                <Typography key={index} variant="caption" display="block">
                                  • {new Date(he.fecha).toLocaleDateString('es-ES')}: {he.cantidadHoras}hs × {formatCurrency(he.valorHora)} = {formatCurrency(he.montoTotal)}
                                </Typography>
                              ))}
                            </Box>
                          </Box>
                        )}
                        
                        {liquidacion.observaciones && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="caption" color="text.secondary">Observaciones:</Typography>
                            <Typography variant="body2">{liquidacion.observaciones}</Typography>
                          </Box>
                        )}
                        
                        {liquidacion.fechaPago && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="caption" color="text.secondary">Fecha de Pago:</Typography>
                            <Typography variant="body2">
                              {new Date(liquidacion.fechaPago).toLocaleString('es-ES')}
                            </Typography>
                          </Box>
                        )}
                        
                        {liquidacion.medioDePago && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="caption" color="text.secondary">Medio de Pago:</Typography>
                            <Typography variant="body2">
                              {liquidacion.medioDePago} - {liquidacion.banco}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog Liquidar Empleado */}
      <Dialog open={openLiquidar} onClose={handleCloseLiquidar} maxWidth="sm" fullWidth>
        <DialogTitle>
          Liquidar Sueldo
        </DialogTitle>
        <DialogContent>
          {selectedEmpleado && (() => {
            // Calcular valores para este empleado
            const empleadoData = empleados.find(e => e._id === selectedEmpleado.empleadoId);
            const esEmpleadoFormal = empleadoData?.modalidadContratacion === 'formal';
            const sueldoBasePeriodo = periodo.tipo === 'quincenal' ? selectedEmpleado.sueldoBase / 2 : selectedEmpleado.sueldoBase;
            const baseImponible = sueldoBasePeriodo + selectedEmpleado.totalHorasExtra;
            
            // Aportes del empleado (solo formales)
            const aporteJubilacion = esEmpleadoFormal ? baseImponible * (APORTES_EMPLEADO.JUBILACION / 100) : 0;
            const aporteObraSocial = esEmpleadoFormal ? baseImponible * (APORTES_EMPLEADO.OBRA_SOCIAL / 100) : 0;
            const aportePami = esEmpleadoFormal ? baseImponible * (APORTES_EMPLEADO.PAMI / 100) : 0;
            const aporteSindicato = esEmpleadoFormal && empleadoData?.sindicato ? baseImponible * (APORTES_EMPLEADO.SINDICATO / 100) : 0;
            const totalAportesEmp = aporteJubilacion + aporteObraSocial + aportePami + aporteSindicato;
            
            // Contribuciones patronales (solo formales)
            const contribJubilacion = esEmpleadoFormal ? baseImponible * (CONTRIBUCIONES_EMPLEADOR.JUBILACION / 100) : 0;
            const contribObraSocial = esEmpleadoFormal ? baseImponible * (CONTRIBUCIONES_EMPLEADOR.OBRA_SOCIAL / 100) : 0;
            const contribPami = esEmpleadoFormal ? baseImponible * (CONTRIBUCIONES_EMPLEADOR.PAMI / 100) : 0;
            const contribART = esEmpleadoFormal ? baseImponible * (CONTRIBUCIONES_EMPLEADOR.ART / 100) : 0;
            const totalContribuciones = contribJubilacion + contribObraSocial + contribPami + contribART;
            
            // Total a pagar al empleado
            const totalAPagar = sueldoBasePeriodo + selectedEmpleado.totalHorasExtra 
              - selectedEmpleado.adelantos 
              - (descuentosPorEmpleado[selectedEmpleado.empleadoId] || 0) 
              + (incentivosPorEmpleado[selectedEmpleado.empleadoId] || 0)
              - totalAportesEmp;
            
            // Costo total para la empresa
            const costoTotalEmpresa = totalAPagar + totalAportesEmp + totalContribuciones;
            
            return (
            <Box sx={{ pt: 2 }}>
              {esEmpleadoFormal ? (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <strong>Empleado FORMAL:</strong> Se generarán 2 gastos:
                  <br/>• Sueldo neto al empleado
                  <br/>• Cargas sociales (AFIP) - pendiente de pago
                </Alert>
              ) : (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <strong>Empleado INFORMAL:</strong> Se genera un único gasto por el monto bruto (pago en mano)
                </Alert>
              )}
              
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="subtitle2">Empleado:</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedEmpleado.empleadoApellido}, {selectedEmpleado.empleadoNombre}
                  </Typography>
                </Box>
                <Chip 
                  label={esEmpleadoFormal ? '📋 Formal' : '💵 Informal'} 
                  color={esEmpleadoFormal ? 'primary' : 'default'}
                />
              </Box>
              
              <Box sx={{ mb: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">Haberes:</Typography>
                <Box sx={{ mt: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">Sueldo Base:</Typography>
                    <Typography variant="body2">{formatCurrency(sueldoBasePeriodo)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" color="info.main">Horas Extra:</Typography>
                    <Typography variant="body2" color="info.main">+{formatCurrency(selectedEmpleado.totalHorasExtra)}</Typography>
                  </Box>
                  {incentivosPorEmpleado[selectedEmpleado.empleadoId] > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" color="success.main">
                        <IncentivoIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                        Incentivos:
                      </Typography>
                      <Typography variant="body2" color="success.main">+{formatCurrency(incentivosPorEmpleado[selectedEmpleado.empleadoId])}</Typography>
                    </Box>
                  )}
                </Box>
                
                <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ display: 'block', mt: 2 }}>Deducciones:</Typography>
                <Box sx={{ mt: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" color="warning.main">Adelantos:</Typography>
                    <Typography variant="body2" color="warning.main">-{formatCurrency(selectedEmpleado.adelantos)}</Typography>
                  </Box>
                  {descuentosPorEmpleado[selectedEmpleado.empleadoId] > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" color="error.main">
                        <DescuentoIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                        Descuentos:
                      </Typography>
                      <Typography variant="body2" color="error.main">-{formatCurrency(descuentosPorEmpleado[selectedEmpleado.empleadoId])}</Typography>
                    </Box>
                  )}
                  
                  {/* Aportes (solo formales) */}
                  {esEmpleadoFormal && (
                    <>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" color="error.main">Jubilación (11%):</Typography>
                        <Typography variant="body2" color="error.main">-{formatCurrency(aporteJubilacion)}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" color="error.main">Obra Social (3%):</Typography>
                        <Typography variant="body2" color="error.main">-{formatCurrency(aporteObraSocial)}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" color="error.main">PAMI (3%):</Typography>
                        <Typography variant="body2" color="error.main">-{formatCurrency(aportePami)}</Typography>
                      </Box>
                      {aporteSindicato > 0 && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2" color="error.main">Sindicato (2%):</Typography>
                          <Typography variant="body2" color="error.main">-{formatCurrency(aporteSindicato)}</Typography>
                        </Box>
                      )}
                    </>
                  )}
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, pt: 1, borderTop: 1, borderColor: 'divider' }}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {esEmpleadoFormal ? 'Sueldo NETO:' : 'Total a Pagar:'}
                  </Typography>
                  <Typography variant="subtitle2" fontWeight="bold" color="primary.main">
                    {formatCurrency(totalAPagar)}
                  </Typography>
                </Box>
                
                {/* Contribuciones patronales (solo formales) */}
                {esEmpleadoFormal && (
                  <Box sx={{ mt: 2, p: 1.5, backgroundColor: 'warning.50', borderRadius: 1, border: '1px solid', borderColor: 'warning.200' }}>
                    <Typography variant="caption" color="warning.dark" fontWeight="bold">
                      Contribuciones patronales (carga AFIP):
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                      <Typography variant="caption" color="warning.dark">Jubilación (10.17%):</Typography>
                      <Typography variant="caption" color="warning.dark">{formatCurrency(contribJubilacion)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="warning.dark">Obra Social (6%):</Typography>
                      <Typography variant="caption" color="warning.dark">{formatCurrency(contribObraSocial)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="warning.dark">PAMI (1.5%):</Typography>
                      <Typography variant="caption" color="warning.dark">{formatCurrency(contribPami)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="warning.dark">ART (2.5%):</Typography>
                      <Typography variant="caption" color="warning.dark">{formatCurrency(contribART)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, pt: 0.5, borderTop: 1, borderColor: 'warning.300' }}>
                      <Typography variant="caption" color="warning.dark" fontWeight="bold">Total AFIP:</Typography>
                      <Typography variant="caption" color="warning.dark" fontWeight="bold">
                        {formatCurrency(totalAportesEmp + totalContribuciones)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Typography variant="body2" fontWeight="bold" color="error.main">COSTO TOTAL EMPRESA:</Typography>
                      <Typography variant="body2" fontWeight="bold" color="error.main">
                        {formatCurrency(costoTotalEmpresa)}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <FormControl fullWidth required>
                  <InputLabel>Medio de Pago</InputLabel>
                  <Select
                    value={medioDePago}
                    onChange={(e) => setMedioDePago(e.target.value)}
                    label="Medio de Pago"
                  >
                    <MenuItem value="CHEQUE TERCERO">Cheque Tercero</MenuItem>
                    <MenuItem value="CHEQUE PROPIO">Cheque Propio</MenuItem>
                    <MenuItem value="EFECTIVO">Efectivo</MenuItem>
                    <MenuItem value="TARJETA DÉBITO">Tarjeta Débito</MenuItem>
                    <MenuItem value="TARJETA CRÉDITO">Tarjeta Crédito</MenuItem>
                    <MenuItem value="TRANSFERENCIA">Transferencia</MenuItem>
                    <MenuItem value="RESERVA">Reserva</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth required>
                  <InputLabel>Banco/Caja</InputLabel>
                  <Select
                    value={banco}
                    onChange={(e) => setBanco(e.target.value)}
                    label="Banco/Caja"
                  >
                    <MenuItem value="PROVINCIA">Banco Provincia</MenuItem>
                    <MenuItem value="SANTANDER">Banco Santander</MenuItem>
                    <MenuItem value="EFECTIVO">Efectivo</MenuItem>
                    <MenuItem value="FCI">FCI</MenuItem>
                    <MenuItem value="RESERVA">Reserva</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Selección de descuentos */}
              {selectedEmpleado && (descuentosDetalleEmpleado[selectedEmpleado.empleadoId] || []).length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">Descuentos disponibles</Typography>
                  {(descuentosDetalleEmpleado[selectedEmpleado.empleadoId] || []).map((d: any) => {
                    const id = typeof d._id === 'string' ? d._id : (d._id as any).toString();
                    const monto = d.montoCalculado ?? (d.esPorcentaje ? (d.monto / 100) * (periodo.tipo === 'quincenal' ? selectedEmpleado.sueldoBase / 2 : selectedEmpleado.sueldoBase) : d.monto);
                    return (
                      <FormControlLabel
                        key={id}
                        control={<Checkbox checked={selectedDescuentosIds.includes(id)} onChange={() => {
                          setSelectedDescuentosIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
                        }} />}
                        label={`${TIPOS_DESCUENTO[d.tipo as keyof typeof TIPOS_DESCUENTO] || d.tipo}: ${d.motivo} - ${formatCurrency(monto)}`}
                      />
                    );
                  })}
                </Box>
              )}

              {/* Selección de incentivos */}
              {selectedEmpleado && (incentivosDetalleEmpleado[selectedEmpleado.empleadoId] || []).length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">Incentivos disponibles</Typography>
                  {(incentivosDetalleEmpleado[selectedEmpleado.empleadoId] || []).map((i: any) => {
                    const id = typeof i._id === 'string' ? i._id : (i._id as any).toString();
                    const monto = i.montoCalculado ?? (i.esPorcentaje ? (i.monto / 100) * (periodo.tipo === 'quincenal' ? selectedEmpleado.sueldoBase / 2 : selectedEmpleado.sueldoBase) : i.monto);
                    return (
                      <FormControlLabel
                        key={id}
                        control={<Checkbox checked={selectedIncentivosIds.includes(id)} onChange={() => {
                          setSelectedIncentivosIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
                        }} />}
                        label={`${TIPOS_INCENTIVO[i.tipo as keyof typeof TIPOS_INCENTIVO] || i.tipo}: ${i.motivo} - ${formatCurrency(monto)}`}
                      />
                    );
                  })}
                </Box>
              )}
              
              <TextField
                label="Observaciones (opcional)"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                fullWidth
                multiline
                rows={3}
              />
            </Box>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseLiquidar}>Cancelar</Button>
          <Button
            onClick={() => setOpenConfirmLiquidar(true)}
            variant="contained"
            startIcon={<CheckIcon />}
            disabled={!medioDePago || !banco}
          >
            Confirmar Liquidación
          </Button>
        </DialogActions>

        {/* Confirmación final antes de liquidar */}
        <ConfirmDialog
          open={openConfirmLiquidar}
          onClose={() => setOpenConfirmLiquidar(false)}
          onConfirm={handleLiquidar}
          title="Confirmar Liquidación"
          message={`¿Confirmar liquidación de ${selectedEmpleado ? `${selectedEmpleado.empleadoApellido}, ${selectedEmpleado.empleadoNombre}` : 'este empleado'} por ${formatCurrency(computeTotalAPagarForSelected())}? Se generarán los gastos correspondientes.`}
          confirmText="Liquidar"
          cancelText="Cancelar"
          severity="question"
          confirmColor="primary"
          showAlert={true}
          confirmDisabled={!medioDePago || !banco}
        />
      </Dialog>

      {/* Dialog Cerrar Período */}
      <Dialog open={openCerrar} onClose={handleCloseCerrar} maxWidth="sm" fullWidth>
        <DialogTitle>Cerrar Período de Liquidación</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Una vez cerrado el período, no se podrán realizar más modificaciones.
            </Alert>
            
            <Typography variant="body2" gutterBottom>
              Todos los empleados han sido liquidados. ¿Deseas cerrar el período?
            </Typography>
            
            <TextField
              label="Observaciones de cierre (opcional)"
              value={observacionesCierre}
              onChange={(e) => setObservacionesCierre(e.target.value)}
              fullWidth
              multiline
              rows={3}
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCerrar}>Cancelar</Button>
          <Button onClick={handleCerrarPeriodo} variant="contained" color="error">
            Cerrar Período
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Agregar Empleado */}
      <Dialog open={openAgregarEmpleado} onClose={handleCloseAgregarEmpleado} maxWidth="sm" fullWidth>
        <DialogTitle>Agregar Empleado al Período</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {empleadosDisponibles.length === 0 ? (
              <Alert severity="info">
                No hay empleados activos disponibles para agregar. Todos los empleados activos ya están en este período.
              </Alert>
            ) : (
              <>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Selecciona un empleado activo para agregarlo a este período de liquidación.
                </Alert>
                <FormControl fullWidth required>
                  <InputLabel>Empleado</InputLabel>
                  <Select
                    value={nuevoEmpleadoId}
                    onChange={(e) => setNuevoEmpleadoId(e.target.value)}
                    label="Empleado"
                  >
                    {empleadosDisponibles.map((emp) => (
                      <MenuItem key={emp._id} value={emp._id}>
                        {emp.apellido}, {emp.nombre} - Sueldo: $ {formatCurrency(emp.sueldoBase)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAgregarEmpleado}>Cancelar</Button>
          <Button
            onClick={handleAgregarEmpleado}
            variant="contained"
            disabled={!nuevoEmpleadoId}
            startIcon={<PersonAddIcon />}
          >
            Agregar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Recibo de Sueldo */}
      {reciboEmpleado && (
        <ReciboSueldo
          liquidacion={reciboEmpleado}
          periodo={periodo}
          open={openRecibo}
          onClose={handleCloseRecibo}
          descuentosDetalle={descuentosDetalleEmpleado[reciboEmpleado.empleadoId] || []}
          incentivosDetalle={incentivosDetalleEmpleado[reciboEmpleado.empleadoId] || []}
        />
      )}
    </Box>
  );
};

export default ResumenLiquidacion;
