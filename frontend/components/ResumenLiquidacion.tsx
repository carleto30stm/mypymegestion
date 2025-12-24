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
import { LiquidacionPeriodo, LiquidacionEmpleado, TIPOS_DESCUENTO, TIPOS_INCENTIVO, APORTES_EMPLEADO, CONTRIBUCIONES_EMPLEADOR, ADICIONALES_LEGALES } from '../types';
import { liquidarEmpleado, fetchPeriodoById, cerrarPeriodo, agregarEmpleado } from '../redux/slices/liquidacionSlice';
import { conveniosAPI } from '../services/rrhhService';
import { fetchGastos } from '../redux/slices/gastosSlice';
import { fetchEmployees } from '../redux/slices/employeesSlice';
import { fetchDescuentos } from '../redux/slices/descuentosEmpleadoSlice';
import { fetchIncentivos } from '../redux/slices/incentivosEmpleadoSlice';
import { formatCurrency } from '../utils/formatters';
import ReciboSueldo from './ReciboSueldo';
import calcularLiquidacionEmpleado, { calcularAntiguedadYearsAndAmount } from '../utils/liquidacionCalculator';
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

  // Adicionales calculados por convenio (presentismo, zona) por empleadoId
  const [adicionalesPorEmpleado, setAdicionalesPorEmpleado] = useState<Record<string, { presentismo: number; zona: number; loading?: boolean }>>({});

  // Helper: calcula totales a partir del objeto `calculada` (misma fórmula
  // que se usa en el modal). Permite overrides para descuentos/incentivos.
  const calcularTotalesDesdeCalculada = (
    calculada: any,
    empleadoData: any,
    selectedEmpleadoArg: LiquidacionEmpleado,
    periodoArg: LiquidacionPeriodo,
    descuentosMap: Record<string, number>,
    incentivosMap: Record<string, number>,
    descuentosOverride?: number | null,
    incentivosOverride?: number | null
  ) => {
    const sueldoBasePeriodo = periodoArg.tipo === 'quincenal' ? selectedEmpleadoArg.sueldoBase / 2 : selectedEmpleadoArg.sueldoBase;
    const totalHorasExtra = calculada.totalHorasExtra ?? selectedEmpleadoArg.totalHorasExtra ?? 0;
    const adelantos = calculada.adelantos ?? selectedEmpleadoArg.adelantos ?? 0;

    const descuentosSistema = typeof descuentosOverride === 'number' ? descuentosOverride : (calculada.descuentos ?? (descuentosMap[selectedEmpleadoArg.empleadoId] || 0));
    const incentivosSistema = typeof incentivosOverride === 'number' ? incentivosOverride : (calculada.incentivos ?? (incentivosMap[selectedEmpleadoArg.empleadoId] || 0));

    const esEmpleadoFormal = empleadoData?.modalidadContratacion === 'formal';

    const aporteJubilacion = calculada.aporteJubilacion ?? (esEmpleadoFormal ? (calculada.baseImponible ?? (sueldoBasePeriodo + totalHorasExtra)) * (APORTES_EMPLEADO.JUBILACION / 100) : 0);
    const aporteObraSocial = calculada.aporteObraSocial ?? (esEmpleadoFormal ? (calculada.baseImponible ?? (sueldoBasePeriodo + totalHorasExtra)) * (APORTES_EMPLEADO.OBRA_SOCIAL / 100) : 0);
    const aportePami = calculada.aportePami ?? (esEmpleadoFormal ? (calculada.baseImponible ?? (sueldoBasePeriodo + totalHorasExtra)) * (APORTES_EMPLEADO.PAMI / 100) : 0);
    const aporteSindicato = calculada.aporteSindicato ?? (esEmpleadoFormal && empleadoData?.sindicato ? (calculada.baseImponible ?? (sueldoBasePeriodo + totalHorasExtra)) * (APORTES_EMPLEADO.SINDICATO / 100) : 0);
    const totalAportesEmp = aporteJubilacion + aporteObraSocial + aportePami + aporteSindicato;

    const contribJubilacion = calculada.contribJubilacion ?? (esEmpleadoFormal ? (calculada.baseImponible ?? (sueldoBasePeriodo + totalHorasExtra)) * (CONTRIBUCIONES_EMPLEADOR.JUBILACION / 100) : 0);
    const contribObraSocial = calculada.contribObraSocial ?? (esEmpleadoFormal ? (calculada.baseImponible ?? (sueldoBasePeriodo + totalHorasExtra)) * (CONTRIBUCIONES_EMPLEADOR.OBRA_SOCIAL / 100) : 0);
    const contribPami = calculada.contribPami ?? (esEmpleadoFormal ? (calculada.baseImponible ?? (sueldoBasePeriodo + totalHorasExtra)) * (CONTRIBUCIONES_EMPLEADOR.PAMI / 100) : 0);
    const contribART = calculada.contribART ?? (esEmpleadoFormal ? (calculada.baseImponible ?? (sueldoBasePeriodo + totalHorasExtra)) * (CONTRIBUCIONES_EMPLEADOR.ART / 100) : 0);
    const totalContribuciones = contribJubilacion + contribObraSocial + contribPami + contribART;

    const totalAPagar = calculada.totalAPagar ?? (sueldoBasePeriodo + totalHorasExtra - adelantos - descuentosSistema + incentivosSistema - totalAportesEmp);
    const costoTotalEmpresa = calculada.costoTotalEmpresa ?? (totalAPagar + totalAportesEmp + totalContribuciones);

    return {
      sueldoBasePeriodo,
      totalHorasExtra,
      adelantos,
      descuentosSistema,
      incentivosSistema,
      aporteJubilacion,
      aporteObraSocial,
      aportePami,
      aporteSindicato,
      totalAportesEmp,
      contribJubilacion,
      contribObraSocial,
      contribPami,
      contribART,
      totalContribuciones,
      totalAPagar,
      costoTotalEmpresa
    };
  };

  const isEditable = periodo.estado === 'abierto' && (user?.userType === 'admin' || user?.userType === 'oper_ad');

  // Obtener período en formato YYYY-MM desde las fechas del período (si aplica)
  const periodoMes = useMemo(() => {
    const raw = periodo?.fechaInicio;
    if (!raw) return '';

    // `fechaInicio` está tipado como string en `LiquidacionPeriodo` — parseamos y validamos
    const d = new Date(raw);
    if (isNaN(d.getTime())) return '';

    return d.toISOString().slice(0,7); // YYYY-MM
  }, [periodo.fechaInicio]);

  // Cargar empleados si no están cargados
  useEffect(() => {
    if (empleados.length === 0) {
      dispatch(fetchEmployees());
    }
  }, [dispatch, empleados.length]);

  // Calcular adicionales (presentismo, zona) por empleado usando el convenio cuando corresponda
  useEffect(() => {
    // Lista de empleados a procesar: los que están en el período actual
    const empleadosEnPeriodo = periodo.liquidaciones.map(l => l.empleadoId).filter(Boolean);
    const toProcess = empleados.filter(e => empleadosEnPeriodo.includes(e._id as string));

    // For each employee, if they have presentismo or zonaPeligrosa true, compute amounts
    const procesarEmpleados = async () => {
      for (const emp of toProcess) {
        if (!emp || !emp._id) continue;
        // Considerar solo las flags top-level `aplica*` (legacy `adicionales` removed)
        const shouldPresentismo = ((emp as any).aplicaPresentismo !== false);
        const shouldZona = ((emp as any).aplicaZonaPeligrosa === true);
        if (!shouldPresentismo && !shouldZona) {
          // Ensure map has zeroes if not present
          setAdicionalesPorEmpleado(prev => ({ ...prev, [emp._id as string]: { presentismo: 0, zona: 0 } }));
          continue;
        }

        // If already computed, skip
        const existing = adicionalesPorEmpleado[emp._id as string];
        if (existing && existing.loading === false) continue;

        // Set loading placeholder
        setAdicionalesPorEmpleado(prev => ({ ...prev, [emp._id as string]: { presentismo: 0, zona: 0, loading: true } }));

        // Try to compute via convenio API if convenioId and categoriaConvenio exist
        try {
          if (emp.convenioId && emp.categoriaConvenio) {
            const antig = emp.fechaIngreso ? Math.floor((new Date().getTime() - new Date(emp.fechaIngreso).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 0;
            const response = await conveniosAPI.calcularSueldo(emp.convenioId, {
              codigoCategoria: emp.categoriaConvenio,
              antiguedadAnios: antig,
              // pasar la intención real: si al empleado se le debe aplicar el adicional
              aplicaPresentismo: !!((emp as any).aplicaPresentismo !== false),
              tieneZonaPeligrosa: !!((emp as any).aplicaZonaPeligrosa === true)
            });

            const calculo = response.calculo as { basico: number; adicionales: { concepto: string; monto: number }[]; total: number };
            const presentismoMonto = calculo.adicionales.find(a => a.concepto.toLowerCase().includes('presentismo'))?.monto || 0;
            const zonaMonto = calculo.adicionales.find(a => a.concepto.toLowerCase().includes('zona'))?.monto || 0;

            setAdicionalesPorEmpleado(prev => ({ ...prev, [emp._id as string]: { presentismo: presentismoMonto, zona: zonaMonto, loading: false } }));
            continue;
          }

          // Fallback: calcular localmente usando porcentajes por defecto
          const presentismoFallback = shouldPresentismo ? (emp.sueldoBase * (ADICIONALES_LEGALES.PRESENTISMO / 100)) : 0;
          const zonaFallback = 0; // Sin info del convenio, no sumar zona
          setAdicionalesPorEmpleado(prev => ({ ...prev, [emp._id as string]: { presentismo: presentismoFallback, zona: zonaFallback, loading: false } }));
        } catch (error) {
          console.error('Error calculando adicionales para empleado', emp._id, error);
          // Fallback zeros
          setAdicionalesPorEmpleado(prev => ({ ...prev, [emp._id as string]: { presentismo: 0, zona: 0, loading: false } }));
        }
      }
    };

    procesarEmpleados();
  }, [periodo.liquidaciones, empleados]);

  // Cargar descuentos e incentivos del período
  useEffect(() => {
    // Si es quincenal, usamos periodoId para filtrar exactamente por ese periodo
    if (periodo.tipo === 'quincenal' && periodo._id) {
      dispatch(fetchDescuentos({ periodoId: periodo._id } as any));
      dispatch(fetchIncentivos({ periodoId: periodo._id } as any));
      return;
    }

    // Si es mensual u otro, filtramos por YYYY-MM derivado de la fecha de inicio
    if (periodoMes) {
      dispatch(fetchDescuentos({ periodoAplicacion: periodoMes }));
      dispatch(fetchIncentivos({ periodoAplicacion: periodoMes }));
    }
  }, [dispatch, periodo.tipo, periodo._id, periodoMes]);

  // Calcular descuentos e incentivos por empleado (solo los del período correspondiente)
  const descuentosPorEmpleado = useMemo(() => {
    const map: Record<string, number> = {};
    descuentosPeriodo.forEach(d => {
      if (!d) return;
      // Filtrar por estado válido
      if (!(d.estado === 'aplicado' || d.estado === 'pendiente')) return;

      // Verificar que el registro pertenece al período actual
      let perteneceAlPeriodo = false;
      if (periodo.tipo === 'quincenal') {
        if (d.periodoId) {
          if (typeof d.periodoId === 'string') perteneceAlPeriodo = d.periodoId === periodo._id;
          else if ((d.periodoId as any)?._id) perteneceAlPeriodo = (d.periodoId as any)._id === periodo._id;
        }
      } else {
        perteneceAlPeriodo = d.periodoAplicacion === periodoMes;
      }

      if (!perteneceAlPeriodo) return;

      // Obtener empleadoId de forma segura
      const empId = typeof d.empleadoId === 'string' ? d.empleadoId : ((d.empleadoId && (d.empleadoId as any)._id) ? ((typeof (d.empleadoId as any)._id === 'string') ? (d.empleadoId as any)._id : (d.empleadoId as any)._id.toString()) : undefined);
      if (!empId) return;

      const monto = d.montoCalculado ?? d.monto ?? 0;
      map[empId] = (map[empId] || 0) + monto;
    });
    return map;
  }, [descuentosPeriodo, periodo.tipo, periodo._id, periodoMes]);

  const incentivosPorEmpleado = useMemo(() => {
    const map: Record<string, number> = {};
    incentivosPeriodo.forEach(i => {
      if (!i) return;
      if (!(i.estado === 'pagado' || i.estado === 'pendiente')) return;

      let perteneceAlPeriodo = false;
      if (periodo.tipo === 'quincenal') {
        if (i.periodoId) {
          if (typeof i.periodoId === 'string') perteneceAlPeriodo = i.periodoId === periodo._id;
          else if ((i.periodoId as any)?._id) perteneceAlPeriodo = (i.periodoId as any)._id === periodo._id;
        }
      } else {
        perteneceAlPeriodo = i.periodoAplicacion === periodoMes;
      }

      if (!perteneceAlPeriodo) return;

      const empId = typeof i.empleadoId === 'string' ? i.empleadoId : ((i.empleadoId && (i.empleadoId as any)._id) ? ((typeof (i.empleadoId as any)._id === 'string') ? (i.empleadoId as any)._id : (i.empleadoId as any)._id.toString()) : undefined);
      if (!empId) return;

      const monto = i.montoCalculado ?? i.monto ?? 0;
      map[empId] = (map[empId] || 0) + monto;
    });
    return map;
  }, [incentivosPeriodo, periodo.tipo, periodo._id, periodoMes]);

  // Detalle de descuentos por empleado (solo del período actual)
  const descuentosDetalleEmpleado = useMemo(() => {
    const map: Record<string, typeof descuentosPeriodo> = {};
    descuentosPeriodo.forEach(d => {
      if (!d) return;

      let perteneceAlPeriodo = false;
      if (periodo.tipo === 'quincenal') {
        if (d.periodoId) {
          if (typeof d.periodoId === 'string') perteneceAlPeriodo = d.periodoId === periodo._id;
          else if ((d.periodoId as any)?._id) perteneceAlPeriodo = (d.periodoId as any)._id === periodo._id;
        }
      } else {
        perteneceAlPeriodo = d.periodoAplicacion === periodoMes;
      }
      if (!perteneceAlPeriodo) return;

      const empId = typeof d.empleadoId === 'string' ? d.empleadoId : ((d.empleadoId && (d.empleadoId as any)._id) ? ((typeof (d.empleadoId as any)._id === 'string') ? (d.empleadoId as any)._id : (d.empleadoId as any)._id.toString()) : undefined);
      if (!empId) return;

      if (!map[empId]) map[empId] = [];
      map[empId].push(d);
    });
    return map;
  }, [descuentosPeriodo, periodo.tipo, periodo._id, periodoMes]);

  const incentivosDetalleEmpleado = useMemo(() => {
    const map: Record<string, typeof incentivosPeriodo> = {};
    incentivosPeriodo.forEach(i => {
      if (!i) return;

      let perteneceAlPeriodo = false;
      if (periodo.tipo === 'quincenal') {
        if (i.periodoId) {
          if (typeof i.periodoId === 'string') perteneceAlPeriodo = i.periodoId === periodo._id;
          else if ((i.periodoId as any)?._id) perteneceAlPeriodo = (i.periodoId as any)._id === periodo._id;
        }
      } else {
        perteneceAlPeriodo = i.periodoAplicacion === periodoMes;
      }
      if (!perteneceAlPeriodo) return;

      const empId = typeof i.empleadoId === 'string' ? i.empleadoId : ((i.empleadoId && (i.empleadoId as any)._id) ? ((typeof (i.empleadoId as any)._id === 'string') ? (i.empleadoId as any)._id : (i.empleadoId as any)._id.toString()) : undefined);
      if (!empId) return;

      if (!map[empId]) map[empId] = [];
      map[empId].push(i);
    });
    return map;
  }, [incentivosPeriodo, periodo.tipo, periodo._id, periodoMes]);

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
      .filter(d => d.estado === 'pendiente')
      // Asegurar que pertenecen al período actual
      .filter(d => periodo.tipo === 'quincenal' ? ((d.periodoId && (typeof d.periodoId === 'string' ? d.periodoId === periodo._id : (d.periodoId as any)._id === periodo._id))) : (d.periodoAplicacion === periodoMes))
      .map(d => (typeof d._id === 'string' ? d._id : (d._id as any).toString()));
    const inicialIncentivos = incentivosList
      .filter(i => i.estado === 'pendiente')
      .filter(i => periodo.tipo === 'quincenal' ? ((i.periodoId && (typeof i.periodoId === 'string' ? i.periodoId === periodo._id : (i.periodoId as any)._id === periodo._id))) : (i.periodoAplicacion === periodoMes))
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
      // Calculamos en el frontend usando el util para asegurar consistencia
      const empleadoData = empleados.find(e => e._id === selectedEmpleado.empleadoId);
      const calculado = calcularLiquidacionEmpleado({
        liquidacion: selectedEmpleado,
        empleadoData,
        periodo,
        descuentosDetalle: descuentosDetalleEmpleado[selectedEmpleado.empleadoId] || [],
        incentivosDetalle: incentivosDetalleEmpleado[selectedEmpleado.empleadoId] || [],
        adicionalesConvenio: adicionalesPorEmpleado[selectedEmpleado.empleadoId] || null
      });

      const sueldoBasePeriodo = periodo.tipo === 'quincenal' ? (selectedEmpleado.sueldoBase / 2) : selectedEmpleado.sueldoBase;

      const calculosPayload = {
        adicionalPresentismo: Number((calculado as any).adicionalPresentismo || 0),
        adicionalZona: Number((calculado as any).adicionalZona || 0),
        adicionalAntiguedad: Number((calculado as any).adicionalAntiguedad || 0),
        totalAportesEmpleado: Number((calculado as any).totalAportes || 0),
        // Backend acepta contribuciones patronales; el frontend no las calcula en detalle, dejar 0 si no disponible
        totalContribucionesPatronales: Number((calculado as any).totalContribucionesPatronales || 0),
        sueldoBasePeriodo: Number(sueldoBasePeriodo || 0),
        montoNetoPagar: Number((calculado as any).totalAPagar || 0),
        costoTotalEmpresa: Number((calculado as any).costoTotalEmpresa || 0),
        aporteJubilacion: Number((calculado as any).aporteJubilacion || 0),
        aporteObraSocial: Number((calculado as any).aporteObraSocial || 0),
        aportePami: Number((calculado as any).aportePami || 0),
        aporteSindicato: Number((calculado as any).aporteSindicato || 0),
        // Campos de contribuciones patronales individuales (opcionales)
        contribJubilacion: Number((calculado as any).contribJubilacion || 0),
        contribObraSocial: Number((calculado as any).contribObraSocial || 0),
        contribPami: Number((calculado as any).contribPami || 0),
        contribART: Number((calculado as any).contribART || 0),
        totalAPagar: Number((calculado as any).totalAPagar || 0)
      };

      await dispatch(liquidarEmpleado({
        periodoId: periodo._id,
        empleadoId: selectedEmpleado.empleadoId,
        observaciones,
        medioDePago,
        banco,
        descuentos: selectedDescuentosIds.map(id => ({ id })),
        incentivos: selectedIncentivosIds.map(id => ({ id })),
        calculos: calculosPayload
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

  // Centralizar cálculo de liquidación por empleado usando util
  // Enriquecer cada liquidación con datos del empleado y cálculos
  const liquidacionesEnriquecidas = useMemo(() => {
    return periodo.liquidaciones.map(l => {
      const emp = empleados.find(e => e._id === l.empleadoId);
      const descuentosDetalle = descuentosDetalleEmpleado[l.empleadoId] || [];
      const incentivosDetalle = incentivosDetalleEmpleado[l.empleadoId] || [];
      const adicionalesConv = adicionalesPorEmpleado[l.empleadoId] || null;
      return calcularLiquidacionEmpleado({
        liquidacion: l,
        empleadoData: emp,
        periodo,
        descuentosDetalle,
        incentivosDetalle,
        adicionalesConvenio: adicionalesConv
      });
    });
  }, [periodo.liquidaciones, empleados, descuentosDetalleEmpleado, incentivosDetalleEmpleado, adicionalesPorEmpleado, periodo]);

  const handleOpenRecibo = (empleado: LiquidacionEmpleado) => {
    // Intentar obtener la liquidación ya enriquecida desde el memo
    const encontrada = liquidacionesEnriquecidas.find(l => l.empleadoId === empleado.empleadoId);
    const liquidacionEnriquecida = encontrada ?? calcularLiquidacionEmpleado({
      liquidacion: empleado,
      empleadoData: empleados.find(e => e._id === empleado.empleadoId),
      periodo,
      descuentosDetalle: descuentosDetalleEmpleado[empleado.empleadoId] || [],
      incentivosDetalle: incentivosDetalleEmpleado[empleado.empleadoId] || [],
      adicionalesConvenio: adicionalesPorEmpleado[empleado.empleadoId] || null
    });

    // Si tenemos cálculos de adicionales por convenio, inyectarlos para impresión
    const adicionales = adicionalesPorEmpleado[empleado.empleadoId] || { presentismo: 0, zona: 0 };
    const enrichedWithAd = {
      ...liquidacionEnriquecida,
      adicionalPresentismo: adicionales.presentismo || (liquidacionEnriquecida as any).adicionalPresentismo || 0,
      adicionalZona: adicionales.zona || (liquidacionEnriquecida as any).adicionalZona || 0
    } as LiquidacionEmpleado;

    setReciboEmpleado(enrichedWithAd);
    setOpenRecibo(true);
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
            {liquidacionesEnriquecidas.map((liquidacion) => {
              // Calcular descuentos e incentivos para este empleado
              const descuentosEmp = liquidacion.descuentos || 0;
              const incentivosEmp = liquidacion.incentivos || 0;
              const descuentosDetalleEmp = descuentosDetalleEmpleado[liquidacion.empleadoId] || [];
              const incentivosDetalleEmp = incentivosDetalleEmpleado[liquidacion.empleadoId] || [];

              const sueldoBaseAjustado = periodo.tipo === 'quincenal' ? (liquidacion.sueldoBase / 2) : liquidacion.sueldoBase;
              const esEmpleadoFormal = liquidacion.empleadoModalidad === 'formal';

              const presentismoLocal = liquidacion.adicionalPresentismo || 0;
              const zonaLocal = liquidacion.adicionalZona || 0;

              // Calcular antigüedad reutilizando el helper (no dentro del JSX)
              const empleadoFull = empleados.find(e => e._id === liquidacion.empleadoId);
              const { years: antiguedadYears, amount: antiguedadAmount } = calcularAntiguedadYearsAndAmount({
                fechaIngreso: liquidacion.empleadoFechaIngreso || empleadoFull?.fechaIngreso,
                empleadoAntiguedad: liquidacion.empleadoAntiguedad ?? empleadoFull?.antiguedad,
                adicionalAntiguedad: liquidacion.adicionalAntiguedad ?? null,
                sueldoBasePeriodo: sueldoBaseAjustado,
                porcentajePorAnio: ADICIONALES_LEGALES.ANTIGUEDAD
              });

              const totalAjustado = liquidacion.totalHaberes - liquidacion.totalDeducciones;
              // Si ya está pagado, mostrar 0 como total a pagar (ya fue liquidadó)
              const displayTotal = liquidacion.estado === 'pagado' ? 0 : totalAjustado;
              
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
                        {formatCurrency(displayTotal)}
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
                            <Typography variant="body2">{formatCurrency(sueldoBaseAjustado)}</Typography>
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
                          {/* Presentismo, Antiguedad y Zona (cuando aplican) */}
                          <Box>
                            <Typography variant="caption" color="text.secondary">Presentismo:</Typography>
                            <Typography variant="body2" color="success.main">
                              {liquidacion.adicionalPresentismo && liquidacion.adicionalPresentismo > 0 ? `+${formatCurrency(liquidacion.adicionalPresentismo)}` : '-'}
                            </Typography>
                          </Box>
                          {/* Calcular antigüedad en años y mostrar el adicional correspondiente */}
                          <Box>
                            <Typography variant="caption" color="text.secondary">Antiguedad:</Typography>
                            <Typography variant="body2" color="success.main">
                              {liquidacion.adicionalAntiguedad && liquidacion.adicionalAntiguedad > 0 ? `+${formatCurrency(antiguedadAmount)} (${antiguedadYears} años)` : '-'}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">Zona peligrosa:</Typography>
                            <Typography variant="body2" color="success.main">
                              {liquidacion.adicionalZona && liquidacion.adicionalZona > 0 ? `+${formatCurrency(liquidacion.adicionalZona)}` : '-'}
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
            // Usar el calculador central para este empleado (fuente de verdad)
            const empleadoData = empleados.find(e => e._id === selectedEmpleado.empleadoId);
            const calculada = calcularLiquidacionEmpleado({
              liquidacion: selectedEmpleado,
              empleadoData,
              periodo,
              descuentosDetalle: descuentosDetalleEmpleado[selectedEmpleado.empleadoId] || [],
              incentivosDetalle: incentivosDetalleEmpleado[selectedEmpleado.empleadoId] || [],
              adicionalesConvenio: adicionalesPorEmpleado[selectedEmpleado.empleadoId] || null
            }) as any;

            const esEmpleadoFormal = empleadoData?.modalidadContratacion === 'formal';

            // Reutilizar la fórmula centralizada para evitar cálculos inline.
            const totales = calcularTotalesDesdeCalculada(
              calculada,
              empleadoData,
              selectedEmpleado,
              periodo,
              descuentosPorEmpleado,
              incentivosPorEmpleado
            );

            const {
              sueldoBasePeriodo,
              totalHorasExtra,
              adelantos,
              descuentosSistema,
              incentivosSistema,
              aporteJubilacion,
              aporteObraSocial,
              aportePami,
              aporteSindicato,
              totalAportesEmp,
              contribJubilacion,
              contribObraSocial,
              contribPami,
              contribART,
              totalContribuciones,
              totalAPagar,
              costoTotalEmpresa
            } = totales;

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

              {/* Selección de descuentos (solo pendientes) */}
              {selectedEmpleado && ((descuentosDetalleEmpleado[selectedEmpleado.empleadoId] || []).filter((d: any) => d.estado === 'pendiente').length > 0) && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">Descuentos disponibles</Typography>
                  {(descuentosDetalleEmpleado[selectedEmpleado.empleadoId] || []).filter((d: any) => d.estado === 'pendiente' && (periodo.tipo === 'quincenal' ? (d.periodoId && (typeof d.periodoId === 'string' ? d.periodoId === periodo._id : (d.periodoId as any)._id === periodo._id)) : (d.periodoAplicacion === periodoMes))).map((d: any) => {
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

              {/* Selección de incentivos (solo pendientes) */}
              {selectedEmpleado && ((incentivosDetalleEmpleado[selectedEmpleado.empleadoId] || []).filter((i: any) => i.estado === 'pendiente').length > 0) && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">Incentivos disponibles</Typography>
                  {(incentivosDetalleEmpleado[selectedEmpleado.empleadoId] || []).filter((i: any) => i.estado === 'pendiente' && (periodo.tipo === 'quincenal' ? (i.periodoId && (typeof i.periodoId === 'string' ? i.periodoId === periodo._id : (i.periodoId as any)._id === periodo._id)) : (i.periodoAplicacion === periodoMes))).map((i: any) => {
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
          // message={`¿Confirmar liquidación de ${selectedEmpleado ? `${selectedEmpleado.empleadoApellido}, ${selectedEmpleado.empleadoNombre}` : 'este empleado'} por ${formatCurrency(computeTotalAPagarForSelected())}? Se generarán los gastos correspondientes.`}
          message={`¿Confirmar liquidación de ${selectedEmpleado ? `${selectedEmpleado.empleadoApellido}, ${selectedEmpleado.empleadoNombre}` : 'este empleado'}? Se generarán los gastos correspondientes.`}
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
