import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Chip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Card,
  CardContent,
  Divider,
  Autocomplete,
  Collapse
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  Visibility as ViewIcon,
  Cancel as CancelIcon,
  Print as PrintIcon,
  Payment as PaymentIcon,
  FilterList as FilterIcon,
  MonetizationOn as MoneyIcon,
  AccountBalance as AccountBalanceIcon,
  LocalShipping as LocalShippingIcon,
  Warning as WarningIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { AppDispatch, RootState } from '../redux/store';
import { fetchVentas } from '../redux/slices/ventasSlice';
import { fetchClientes } from '../redux/slices/clientesSlice';
import {
  fetchRecibos,
  fetchReciboById,
  crearRecibo,
  anularRecibo,
  fetchEstadisticasCobranza,
  clearError
} from '../redux/slices/recibosSlice';
import { generarRemitoDesdeVenta } from '../redux/slices/remitosSlice';
import FormaPagoModal from '../components/FormaPagoModal';
import CuentaCorrienteDetalle from '../components/CuentaCorrienteDetalle';
import InteresesPunitoriosPage from './InteresesPunitoriosPage';
import { formatCurrency, formatDate, formatNumberInput, getNumericValue } from '../utils/formatters';
import { generarPDFRecibo, generarPDFRemito } from '../utils/pdfGenerator';
import { Venta, Cliente, ReciboPago, FormaPago, ESTADOS_RECIBO, Remito, MOTIVOS_CORRECCION, MOTIVOS_CORRECCION_LABELS } from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`cobranzas-tabpanel-${index}`}
      aria-labelledby={`cobranzas-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const CobranzasPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { items: ventas, status: statusVentas } = useSelector((state: RootState) => state.ventas);
  const { items: clientes } = useSelector((state: RootState) => state.clientes);
  const { items: recibos, estadisticas, loading: loadingRecibos, error } = useSelector(
    (state: RootState) => state.recibos
  );
  
  const loadingVentas = statusVentas === 'loading';

  // Verificación de seguridad
  if (!user) {
    return null;
  }

  // Estados locales
  const [tabValue, setTabValue] = useState(0);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtros, setFiltros] = useState({
    clienteId: '',
    estadoCobranza: '',
    fechaInicio: '',
    fechaFin: ''
  });

  // Estados para modal de pago
  const [modalPagoOpen, setModalPagoOpen] = useState(false);
  const [ventasSeleccionadas, setVentasSeleccionadas] = useState<Venta[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);

  // Estados para ver detalle de recibo
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [reciboSeleccionado, setReciboSeleccionado] = useState<ReciboPago | null>(null);

  // Estados para anular recibo
  const [modalAnularOpen, setModalAnularOpen] = useState(false);
  const [reciboAAnular, setReciboAAnular] = useState<ReciboPago | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');

  // Estados para cuenta corriente
  const [clienteCuentaCorriente, setClienteCuentaCorriente] = useState<Cliente | null>(null);

  // Estados para deudores
  const [filtroDeudores, setFiltroDeudores] = useState<'todos' | 'morosos' | 'criticos'>('todos');
  const [ordenDeudores, setOrdenDeudores] = useState<'monto' | 'antiguedad'>('monto');

  // Estados para generar remito
  const [modalRemitoOpen, setModalRemitoOpen] = useState(false);
  const [ventaParaRemito, setVentaParaRemito] = useState<Venta | null>(null);
  const [datosRemito, setDatosRemito] = useState({
    direccionEntrega: '',
    repartidor: '',
    medioEnvio: '',
    observaciones: ''
  });
  const [generandoRemito, setGenerandoRemito] = useState(false);

  // Estados para corrección de monto
  const [modalCorreccionOpen, setModalCorreccionOpen] = useState(false);
  const [reciboACorregir, setReciboACorregir] = useState<ReciboPago | null>(null);
  const [datosCorreccion, setDatosCorreccion] = useState({
    montoOriginal: 0,
    montoCorrecto: 0,
    motivo: '' as typeof MOTIVOS_CORRECCION[number] | '',
    observaciones: '',
    banco: 'EFECTIVO' as string
  });
  const [montoCorrectoFormatted, setMontoCorrectoFormatted] = useState('');
  const [corrigiendoMonto, setCorrigiendoMonto] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    dispatch(fetchVentas());
    dispatch(fetchClientes());
    dispatch(fetchRecibos());
    dispatch(fetchEstadisticasCobranza());
  }, [dispatch]);

  // Auto-limpiar errores
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  // Handlers de tabs
  const handleChangeTab = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Filtrar ventas pendientes de cobro
  const ventasPendientes = ventas.filter((venta) => {
    if (venta.estado !== 'confirmada') return false;
    if (venta.estadoCobranza === 'cobrado') return false;
    if (venta.saldoPendiente <= 0) return false;

    // Aplicar filtros
    if (filtros.clienteId && venta.clienteId !== filtros.clienteId) return false;
    if (filtros.estadoCobranza && venta.estadoCobranza !== filtros.estadoCobranza) return false;
    if (filtros.fechaInicio && venta.fecha < filtros.fechaInicio) return false;
    if (filtros.fechaFin && venta.fecha > filtros.fechaFin) return false;

    return true;
  });

  // Calcular deudores (clientes con saldo pendiente)
  const calcularDeudores = () => {
    // Agrupar ventas pendientes por cliente
    const deudoresPorCliente = new Map<string, {
      cliente: Cliente;
      totalDeuda: number;
      ventasPendientes: number;
      ventaMasAntigua: string;
      diasDeuda: number;
    }>();

    ventasPendientes.forEach((venta) => {
      const clienteId = typeof venta.clienteId === 'object' && venta.clienteId !== null
        ? (venta.clienteId as any)._id || (venta.clienteId as any).id
        : venta.clienteId;
      
      const cliente = clientes.find((c) => c._id === clienteId);
      if (!cliente) return;

      const existente = deudoresPorCliente.get(clienteId);
      const diasVencimiento = Math.floor(
        (new Date().getTime() - new Date(venta.fecha).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (existente) {
        existente.totalDeuda += venta.saldoPendiente;
        existente.ventasPendientes += 1;
        if (new Date(venta.fecha) < new Date(existente.ventaMasAntigua)) {
          existente.ventaMasAntigua = venta.fecha;
          existente.diasDeuda = diasVencimiento;
        }
      } else {
        deudoresPorCliente.set(clienteId, {
          cliente,
          totalDeuda: venta.saldoPendiente,
          ventasPendientes: 1,
          ventaMasAntigua: venta.fecha,
          diasDeuda: diasVencimiento
        });
      }
    });

    // Convertir a array y filtrar
    let deudoresArray = Array.from(deudoresPorCliente.values());

    // Aplicar filtros
    if (filtroDeudores === 'morosos') {
      deudoresArray = deudoresArray.filter(d => d.diasDeuda > 30);
    } else if (filtroDeudores === 'criticos') {
      deudoresArray = deudoresArray.filter(d => d.diasDeuda > 60 || d.totalDeuda > d.cliente.limiteCredito);
    }

    // Ordenar
    if (ordenDeudores === 'monto') {
      deudoresArray.sort((a, b) => b.totalDeuda - a.totalDeuda);
    } else {
      deudoresArray.sort((a, b) => b.diasDeuda - a.diasDeuda);
    }

    return deudoresArray;
  };

  const deudores = calcularDeudores();

  // Handler para abrir modal de pago
  const handleAbrirModalPago = (venta: Venta) => {

    // Extraer el ID del cliente (puede venir como objeto poblado o como string)
    const clienteId = typeof venta.clienteId === 'object' && venta.clienteId !== null
      ? (venta.clienteId as any)._id || (venta.clienteId as any).id
      : venta.clienteId;   
    
    const cliente = clientes.find((c) => c._id === clienteId);
    
    if (!cliente) {
      console.error('❌ Cliente no encontrado para la venta:', clienteId);
      console.log('📋 Clientes disponibles:', clientes.map(c => ({ id: c._id, nombre: c.nombreCompleto })));
      alert('No se pudo encontrar el cliente asociado a esta venta. Por favor, recargue la página.');
      return;
    }
    
    console.log('✅ Cliente encontrado:', cliente.nombreCompleto);
    setVentasSeleccionadas([venta]);
    setClienteSeleccionado(cliente);
    setModalPagoOpen(true);
    console.log('✅ Modal abierto');
  };

  // Handler para confirmar pago
  const handleConfirmarPago = async (formasPago: FormaPago[]) => {
    console.log('💰 Confirmando pago...');
    console.log('👤 Usuario:', user?.id);
    console.log('🛒 Ventas seleccionadas:', ventasSeleccionadas.length);
    console.log('💳 Formas de pago:', formasPago);
    
    if (!user || ventasSeleccionadas.length === 0) {
      console.error('❌ Validación falló - Usuario o ventas vacías');
      return;
    }

    const ventasIds = ventasSeleccionadas.map((v) => v._id!);
    
    // Extraer el ID del cliente (puede venir como objeto poblado o como string)
    const clienteId = typeof ventasSeleccionadas[0].clienteId === 'object' && ventasSeleccionadas[0].clienteId !== null
      ? (ventasSeleccionadas[0].clienteId as any)._id
      : ventasSeleccionadas[0].clienteId;

    try {
      console.log('🚀 Creando recibo...');
      console.log('🔑 Cliente ID para recibo:', clienteId);
      await dispatch(
        crearRecibo({
          clienteId,
          ventasIds,
          formasPago,
          momentoCobro: 'diferido',
          creadoPor: user.id
        })
      ).unwrap();
      
      console.log('✅ Recibo creado exitosamente');

      // Recargar datos
      dispatch(fetchVentas());
      dispatch(fetchRecibos());
      dispatch(fetchEstadisticasCobranza());

      setModalPagoOpen(false);
      setVentasSeleccionadas([]);
      setClienteSeleccionado(null);
    } catch (err) {
      console.error('Error al crear recibo:', err);
    }
  };

  // Handler para ver detalle de recibo
  const handleVerDetalle = async (recibo: ReciboPago) => {
    try {
      const reciboCompleto = await dispatch(fetchReciboById(recibo._id!)).unwrap();
      setReciboSeleccionado(reciboCompleto);
      setModalDetalleOpen(true);
    } catch (err) {
      console.error('Error al obtener recibo:', err);
    }
  };

  // Handler para abrir modal de anular
  const handleAbrirModalAnular = (recibo: ReciboPago) => {
    setReciboAAnular(recibo);
    setMotivoAnulacion('');
    setModalAnularOpen(true);
  };

  // Handler para confirmar anulación
  const handleConfirmarAnular = async () => {
    if (!reciboAAnular || !motivoAnulacion || !user) return;

    try {
      await dispatch(
        anularRecibo({
          id: reciboAAnular._id!,
          motivoAnulacion,
          modificadoPor: user.id
        })
      ).unwrap();

      // Recargar datos
      dispatch(fetchVentas());
      dispatch(fetchRecibos());
      dispatch(fetchEstadisticasCobranza());

      setModalAnularOpen(false);
      setReciboAAnular(null);
      setMotivoAnulacion('');
    } catch (err) {
      console.error('Error al anular recibo:', err);
    }
  };

  // Handler para imprimir recibo
  const handleImprimirRecibo = (recibo: ReciboPago) => {
    try {
      generarPDFRecibo(recibo);
    } catch (err) {
      console.error('Error al generar PDF del recibo:', err);
      alert('Error al generar el PDF del recibo');
    }
  };

  // Handler para imprimir remito (si se implementa en otra página)
  const handleImprimirRemito = (remito: Remito) => {
    try {
      generarPDFRemito(remito);
    } catch (err) {
      console.error('Error al generar PDF del remito:', err);
      alert('Error al generar el PDF del remito');
    }
  };

  // Handler para abrir modal de remito
  const handleAbrirModalRemito = (venta: Venta) => {
    // Extraer el ID del cliente (puede venir como objeto poblado o como string)
    const clienteId = typeof venta.clienteId === 'object' && venta.clienteId !== null
      ? (venta.clienteId as any)._id || (venta.clienteId as any).id
      : venta.clienteId;
    
    const cliente = clientes.find((c) => c._id === clienteId);
    setVentaParaRemito(venta);
    setDatosRemito({
      direccionEntrega: venta.direccionEntrega || cliente?.direccionEntrega || cliente?.direccion || '',
      repartidor: '',
      medioEnvio: '',
      observaciones: ''
    });
    setModalRemitoOpen(true);
  };

  // Handler para confirmar generación de remito
  const handleConfirmarRemito = async () => {
    if (!ventaParaRemito || !user) return;

    setGenerandoRemito(true);
    try {
      await dispatch(
        generarRemitoDesdeVenta({
          ventaId: ventaParaRemito._id!,
          direccionEntrega: datosRemito.direccionEntrega,
          repartidor: datosRemito.repartidor || undefined,
          medioEnvio: datosRemito.medioEnvio || undefined,
          observaciones: datosRemito.observaciones || undefined,
          creadoPor: user.id
        })
      ).unwrap();

      // Recargar ventas para actualizar estado de entrega
      dispatch(fetchVentas());

      setModalRemitoOpen(false);
      setVentaParaRemito(null);
      setDatosRemito({
        direccionEntrega: '',
        repartidor: '',
        medioEnvio: '',
        observaciones: ''
      });
    } catch (err: any) {
      console.error('Error al generar remito:', err);
      alert(err.message || 'Error al generar remito');
    } finally {
      setGenerandoRemito(false);
    }
  };

  // Handler para abrir modal de corrección de monto
  const handleAbrirModalCorreccion = (recibo: ReciboPago) => {
    setReciboACorregir(recibo);
    const montoInicial = recibo.totales.totalCobrado;
    setDatosCorreccion({
      montoOriginal: montoInicial,
      montoCorrecto: montoInicial,
      motivo: '',
      observaciones: '',
      banco: 'EFECTIVO'
    });
    // Inicializar el valor formateado 
    setMontoCorrectoFormatted(formatCurrency(montoInicial));
    setModalCorreccionOpen(true);
  };

  // Handler para confirmar corrección de monto
  const handleConfirmarCorreccion = async () => {
    if (!reciboACorregir || !datosCorreccion.motivo) return;

    setCorrigiendoMonto(true);
    try {
      const response = await fetch(`/api/recibos/${reciboACorregir._id}/corregir-monto`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          montoOriginal: datosCorreccion.montoOriginal,
          montoCorrecto: datosCorreccion.montoCorrecto,
          motivo: datosCorreccion.motivo,
          observaciones: datosCorreccion.observaciones,
          banco: datosCorreccion.banco
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al corregir monto');
      }

      const result = await response.json();
      alert(`✅ ${result.message}`);

      // Recargar datos
      dispatch(fetchRecibos());
      dispatch(fetchEstadisticasCobranza());
      dispatch(fetchVentas());

      setModalCorreccionOpen(false);
      setReciboACorregir(null);
    } catch (err: any) {
      console.error('Error al corregir monto:', err);
      alert(err.message || 'Error al corregir monto');
    } finally {
      setCorrigiendoMonto(false);
    }
  };

  // Obtener color del chip de estado
  const getEstadoCobranzaColor = (estado: string): 'error' | 'warning' | 'success' => {
    switch (estado) {
      case 'sin_cobrar':
        return 'error';
      case 'parcialmente_cobrado':
        return 'warning';
      case 'cobrado':
        return 'success';
      default:
        return 'error';
    }
  };

  const getEstadoCobranzaLabel = (estado: string): string => {
    switch (estado) {
      case 'sin_cobrar':
        return 'Sin Cobrar';
      case 'parcialmente_cobrado':
        return 'Parcial';
      case 'cobrado':
        return 'Cobrado';
      default:
        return estado;
    }
  };

  const getEstadoReciboColor = (estado: typeof ESTADOS_RECIBO[number]): 'success' | 'error' => {
    return estado === 'activo' ? 'success' : 'error';
  };

  // Función para obtener color según días de deuda
  const getColorDeuda = (dias: number): 'success' | 'warning' | 'error' => {
    if (dias <= 30) return 'success';
    if (dias <= 60) return 'warning';
    return 'error';
  };

  // Función para obtener etiqueta según días de deuda
  const getEtiquetaDeuda = (dias: number): string => {
    if (dias <= 30) return 'Corriente';
    if (dias <= 60) return 'Vencida';
    return 'Morosa';
  };

  const canEdit = user?.userType === 'admin' || user?.userType === 'oper_ad' || user?.userType === 'oper';

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <MoneyIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Typography variant="h4">Cobranzas</Typography>
        </Box>
      </Box>

      {/* Estadísticas */}
      {estadisticas && (
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Total Recibos
                </Typography>
                <Typography variant="h5">{estadisticas.totalRecibos}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Monto Cobrado
                </Typography>
                <Typography variant="h5" color="success.main">
                  {formatCurrency(estadisticas.montoTotalCobrado)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Ventas Pendientes
                </Typography>
                <Typography variant="h5" color="error.main">
                  {estadisticas.ventasPendientesCobro.cantidad}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatCurrency(estadisticas.ventasPendientesCobro.montoTotal)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Cheques Pendientes
                </Typography>
                <Typography variant="h5" color="warning.main">
                  {estadisticas.chequesPendientes.cantidad}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatCurrency(estadisticas.chequesPendientes.montoTotal)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch(clearError())}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Paper>
        <Tabs value={tabValue} onChange={handleChangeTab}>
          <Tab
            label={`Ventas Pendientes (${ventasPendientes.length})`}
            icon={<PaymentIcon />}
            iconPosition="start"
          />
          <Tab
            label={`Recibos Emitidos (${recibos.filter((r) => r.estadoRecibo === 'activo').length})`}
            icon={<ReceiptIcon />}
            iconPosition="start"
          />
          <Tab
            label={`Deudores (${deudores.length})`}
            icon={<WarningIcon />}
            iconPosition="start"
          />
          <Tab label="Cuenta Corriente" icon={<AccountBalanceIcon />} iconPosition="start" />
          <Tab label="Intereses Punitorios" icon={<MoneyIcon />} iconPosition="start" />
        </Tabs>

        {/* TAB 1: Ventas Pendientes */}
        <TabPanel value={tabValue} index={0}>
          {/* Filtros */}
          <Box mb={2}>
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              sx={{ mb: 2 }}
            >
              {mostrarFiltros ? 'Ocultar' : 'Mostrar'} Filtros
            </Button>

            <Collapse in={mostrarFiltros}>
              <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Cliente</InputLabel>
                      <Select
                        value={filtros.clienteId}
                        label="Cliente"
                        onChange={(e) => setFiltros({ ...filtros, clienteId: e.target.value })}
                      >
                        <MenuItem value="">Todos</MenuItem>
                        {clientes.map((cliente) => (
                          <MenuItem key={cliente._id} value={cliente._id}>
                            {cliente.nombre} {cliente.apellido}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Estado Cobranza</InputLabel>
                      <Select
                        value={filtros.estadoCobranza}
                        label="Estado Cobranza"
                        onChange={(e) => setFiltros({ ...filtros, estadoCobranza: e.target.value })}
                      >
                        <MenuItem value="">Todos</MenuItem>
                        <MenuItem value="sin_cobrar">Sin Cobrar</MenuItem>
                        <MenuItem value="parcialmente_cobrado">Parcialmente Cobrado</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      type="date"
                      label="Fecha Desde"
                      value={filtros.fechaInicio}
                      onChange={(e) => setFiltros({ ...filtros, fechaInicio: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      type="date"
                      label="Fecha Hasta"
                      value={filtros.fechaFin}
                      onChange={(e) => setFiltros({ ...filtros, fechaFin: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                </Grid>
                <Box mt={2} display="flex" gap={1}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => {
                      // Los filtros ya se aplican en tiempo real
                    }}
                  >
                    Aplicar
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() =>
                      setFiltros({
                        clienteId: '',
                        estadoCobranza: '',
                        fechaInicio: '',
                        fechaFin: ''
                      })
                    }
                  >
                    Limpiar
                  </Button>
                </Box>
              </Paper>
            </Collapse>
          </Box>

          {/* Tabla de ventas pendientes */}
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>N° Venta</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Cliente</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="right">Cobrado</TableCell>
                  <TableCell align="right">Saldo Pendiente</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingVentas ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : ventasPendientes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      No hay ventas pendientes de cobro
                    </TableCell>
                  </TableRow>
                ) : (
                  ventasPendientes.map((venta) => (
                    <TableRow key={venta._id} hover>
                      <TableCell>{venta.numeroVenta || venta._id}</TableCell>
                      <TableCell>{formatDate(venta.fecha)}</TableCell>
                      <TableCell>
                        {venta.nombreCliente}
                        <Typography variant="caption" display="block" color="text.secondary">
                          {venta.documentoCliente}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{formatCurrency(venta.total)}</TableCell>
                      <TableCell align="right">{formatCurrency(venta.montoCobrado)}</TableCell>
                      <TableCell align="right">
                        <Typography color="error.main" fontWeight="bold">
                          {formatCurrency(venta.saldoPendiente)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getEstadoCobranzaLabel(venta.estadoCobranza)}
                          color={getEstadoCobranzaColor(venta.estadoCobranza)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<PaymentIcon />}
                            onClick={() => handleAbrirModalPago(venta)}
                            disabled={!canEdit}
                          >
                            Cobrar
                          </Button>
                          {(venta.estadoCobranza === 'cobrado' || venta.estadoCobranza === 'parcialmente_cobrado') && 
                           !venta.remitoId && (
                            <Button
                              variant="outlined"
                              size="small"
                              color="success"
                              startIcon={<LocalShippingIcon />}
                              onClick={() => handleAbrirModalRemito(venta)}
                              disabled={!canEdit}
                            >
                              Remito
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* TAB 2: Recibos Emitidos */}
        <TabPanel value={tabValue} index={1}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>N° Recibo</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Ventas</TableCell>
                  <TableCell align="right">Monto Cobrado</TableCell>
                  <TableCell>Momento Cobro</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingRecibos ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : recibos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      No hay recibos emitidos
                    </TableCell>
                  </TableRow>
                ) : (
                  recibos.map((recibo) => (
                    <TableRow key={recibo._id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {recibo.numeroRecibo}
                        </Typography>
                      </TableCell>
                      <TableCell>{formatDate(recibo.fecha)}</TableCell>
                      <TableCell>
                        {recibo.nombreCliente}
                        <Typography variant="caption" display="block" color="text.secondary">
                          {recibo.documentoCliente}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${recibo.ventasRelacionadas.length} venta(s)`}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight="bold" color="success.main">
                          {formatCurrency(recibo.totales.totalCobrado)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={recibo.momentoCobro.replace(/_/g, ' ')}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={recibo.estadoRecibo === 'activo' ? 'Activo' : 'Anulado'}
                          color={getEstadoReciboColor(recibo.estadoRecibo)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton size="small" onClick={() => handleVerDetalle(recibo)} title="Ver detalle">
                          <ViewIcon />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleImprimirRecibo(recibo)} title="Imprimir" >
                          <PrintIcon />
                        </IconButton>
                        {recibo.estadoRecibo === 'activo' && (user?.userType === 'admin' || user?.userType === 'oper_ad') && (
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleAbrirModalCorreccion(recibo)}
                            title="Corregir Monto"
                          >
                            <EditIcon />
                          </IconButton>
                        )}
                        {recibo.estadoRecibo === 'activo' && canEdit && user?.userType === 'admin' && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleAbrirModalAnular(recibo)}
                            title="Anular"
                          >
                            <CancelIcon />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* TAB 3: Deudores */}
        <TabPanel value={tabValue} index={2}>
          {/* Controles de filtro */}
          <Box mb={2}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Filtrar por Estado</InputLabel>
                  <Select
                    value={filtroDeudores}
                    label="Filtrar por Estado"
                    onChange={(e) => setFiltroDeudores(e.target.value as any)}
                  >
                    <MenuItem value="todos">Todos los Deudores</MenuItem>
                    <MenuItem value="morosos">Morosos (+30 días)</MenuItem>
                    <MenuItem value="criticos">Críticos (+60 días o límite excedido)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Ordenar por</InputLabel>
                  <Select
                    value={ordenDeudores}
                    label="Ordenar por"
                    onChange={(e) => setOrdenDeudores(e.target.value as any)}
                  >
                    <MenuItem value="monto">Mayor Deuda</MenuItem>
                    <MenuItem value="antiguedad">Mayor Antigüedad</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>

          {/* Resumen de deudores */}
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Total Deudores
                  </Typography>
                  <Typography variant="h5">{deudores.length}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Deuda Total
                  </Typography>
                  <Typography variant="h5" color="error.main">
                    {formatCurrency(deudores.reduce((sum, d) => sum + d.totalDeuda, 0))}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Morosos (+30d)
                  </Typography>
                  <Typography variant="h5" color="warning.main">
                    {deudores.filter(d => d.diasDeuda > 30).length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Críticos (+60d)
                  </Typography>
                  <Typography variant="h5" color="error.main">
                    {deudores.filter(d => d.diasDeuda > 60).length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Tabla de deudores */}
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Documento</TableCell>
                  <TableCell align="right">Deuda Total</TableCell>
                  <TableCell align="center">Ventas Pendientes</TableCell>
                  <TableCell>Desde</TableCell>
                  <TableCell align="center">Días de Deuda</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Límite Crédito</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {deudores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      No hay deudores registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  deudores.map((deudor) => (
                    <TableRow 
                      key={deudor.cliente._id} 
                      hover
                      sx={{
                        bgcolor: deudor.diasDeuda > 60 ? 'error.50' : 
                                deudor.diasDeuda > 30 ? 'warning.50' : 'inherit'
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {deudor.cliente.nombre} {deudor.cliente.apellido || ''}
                        </Typography>
                        {deudor.cliente.razonSocial && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {deudor.cliente.razonSocial}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {deudor.cliente.numeroDocumento}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold" color="error.main">
                          {formatCurrency(deudor.totalDeuda)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={deudor.ventasPendientes}
                          size="small"
                          color="primary"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(deudor.ventaMasAntigua)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${deudor.diasDeuda} días`}
                          size="small"
                          color={getColorDeuda(deudor.diasDeuda)}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getEtiquetaDeuda(deudor.diasDeuda)}
                          size="small"
                          color={getColorDeuda(deudor.diasDeuda)}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="text.secondary">
                          {formatCurrency(deudor.cliente.limiteCredito)}
                        </Typography>
                        {deudor.totalDeuda > deudor.cliente.limiteCredito && (
                          <Typography variant="caption" color="error.main" display="block">
                            ¡Límite Excedido!
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            setClienteCuentaCorriente(deudor.cliente);
                            setTabValue(3); // Cambiar a tab de Cuenta Corriente
                          }}
                        >
                          Ver Detalle
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* TAB 4: Cuenta Corriente */}
        <TabPanel value={tabValue} index={3}>
          <Box mb={3}>
            <Autocomplete
              options={clientes}
              getOptionLabel={(option) =>
                `${option.nombre} ${option.apellido || ''} - ${option.numeroDocumento}`
              }
              value={clienteCuentaCorriente}
              onChange={(event, newValue) => setClienteCuentaCorriente(newValue)}
              renderInput={(params) => <TextField {...params} label="Seleccionar Cliente" />}
              fullWidth
            />
          </Box>

          <CuentaCorrienteDetalle cliente={clienteCuentaCorriente} />
        </TabPanel>

        {/* TAB 5: Intereses Punitorios */}
        <TabPanel value={tabValue} index={4}>
          <InteresesPunitoriosPage />
        </TabPanel>
      </Paper>

      {/* Modal Forma de Pago */}
      <FormaPagoModal
        open={modalPagoOpen}
        onClose={() => {
          setModalPagoOpen(false);
          setVentasSeleccionadas([]);
          setClienteSeleccionado(null);
        }}
        montoTotal={ventasSeleccionadas.reduce((sum, v) => sum + v.saldoPendiente, 0)}
        cliente={clienteSeleccionado || undefined}
        onConfirm={handleConfirmarPago}
        permitirPagoParcial={true}
      />

      {/* Modal Ver Detalle Recibo */}
      <Dialog open={modalDetalleOpen} onClose={() => setModalDetalleOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <ReceiptIcon />
            Detalle del Recibo
          </Box>
        </DialogTitle>
        <DialogContent>
          {reciboSeleccionado && (
            <>
              {/* Información del recibo */}
              <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Número de Recibo
                    </Typography>
                    <Typography variant="h6">{reciboSeleccionado.numeroRecibo}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Fecha
                    </Typography>
                    <Typography variant="h6">{formatDate(reciboSeleccionado.fecha)}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Cliente
                    </Typography>
                    <Typography>
                      {reciboSeleccionado.nombreCliente} - {reciboSeleccionado.documentoCliente}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Estado
                    </Typography>
                    <Chip
                      label={reciboSeleccionado.estadoRecibo === 'activo' ? 'Activo' : 'Anulado'}
                      color={getEstadoReciboColor(reciboSeleccionado.estadoRecibo)}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Momento de Cobro
                    </Typography>
                    <Typography>{reciboSeleccionado.momentoCobro.replace(/_/g, ' ')}</Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Ventas relacionadas */}
              <Typography variant="h6" gutterBottom>
                Ventas Cobradas
              </Typography>
              <TableContainer component={Paper} sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>N° Venta</TableCell>
                      <TableCell align="right">Monto Original</TableCell>
                      <TableCell align="right">Saldo Anterior</TableCell>
                      <TableCell align="right">Monto Cobrado</TableCell>
                      <TableCell align="right">Saldo Restante</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reciboSeleccionado.ventasRelacionadas.map((vr, index) => (
                      <TableRow key={index}>
                        <TableCell>{vr.numeroVenta}</TableCell>
                        <TableCell align="right">{formatCurrency(vr.montoOriginal)}</TableCell>
                        <TableCell align="right">{formatCurrency(vr.saldoAnterior)}</TableCell>
                        <TableCell align="right">
                          <Typography color="success.main" fontWeight="bold">
                            {formatCurrency(vr.montoCobrado)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{formatCurrency(vr.saldoRestante)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Formas de pago */}
              <Typography variant="h6" gutterBottom>
                Formas de Pago
              </Typography>
              <TableContainer component={Paper} sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Medio</TableCell>
                      <TableCell>Banco</TableCell>
                      <TableCell align="right">Monto</TableCell>
                      <TableCell>Detalles</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reciboSeleccionado.formasPago.map((fp, index) => (
                      <TableRow key={index}>
                        <TableCell>{fp.medioPago.replace(/_/g, ' ')}</TableCell>
                        <TableCell>{fp.banco || '-'}</TableCell>
                        <TableCell align="right">{formatCurrency(fp.monto)}</TableCell>
                        <TableCell>
                          {fp.datosCheque && (
                            <Typography variant="caption">
                              Cheque N° {fp.datosCheque.numeroCheque} - Venc:{' '}
                              {formatDate(fp.datosCheque.fechaVencimiento)}
                            </Typography>
                          )}
                          {fp.datosTransferencia && (
                            <Typography variant="caption">
                              Op. N° {fp.datosTransferencia.numeroOperacion}
                            </Typography>
                          )}
                          {fp.datosTarjeta && (
                            <Typography variant="caption">
                              {fp.datosTarjeta.marca} - {fp.datosTarjeta.cuotas} cuota(s)
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Totales */}
              <Paper elevation={2} sx={{ p: 2, bgcolor: 'primary.50' }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Total a Cobrar
                    </Typography>
                    <Typography variant="h6">{formatCurrency(reciboSeleccionado.totales.totalACobrar)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Total Cobrado
                    </Typography>
                    <Typography variant="h6" color="success.main">
                      {formatCurrency(reciboSeleccionado.totales.totalCobrado)}
                    </Typography>
                  </Grid>
                  {reciboSeleccionado.totales.vuelto > 0 && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">
                        Vuelto
                      </Typography>
                      <Typography variant="h6" color="info.main">
                        {formatCurrency(reciboSeleccionado.totales.vuelto)}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Paper>

              {/* Observaciones */}
              {reciboSeleccionado.observaciones && (
                <Box mt={2}>
                  <Typography variant="body2" color="text.secondary">
                    Observaciones
                  </Typography>
                  <Paper elevation={1} sx={{ p: 1 }}>
                    <Typography variant="body2">{reciboSeleccionado.observaciones}</Typography>
                  </Paper>
                </Box>
              )}

              {/* Información de anulación */}
              {reciboSeleccionado.estadoRecibo === 'anulado' && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">Recibo Anulado</Typography>
                  <Typography variant="body2">Fecha: {formatDate(reciboSeleccionado.fechaAnulacion!)}</Typography>
                  <Typography variant="body2">Motivo: {reciboSeleccionado.motivoAnulacion}</Typography>
                </Alert>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalDetalleOpen(false)}>Cerrar</Button>
          <Button 
            variant="contained" 
            startIcon={<PrintIcon />}
            onClick={() => reciboSeleccionado && handleImprimirRecibo(reciboSeleccionado)}
            disabled={!reciboSeleccionado}
          >
            Imprimir
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Anular Recibo */}
      <Dialog open={modalAnularOpen} onClose={() => setModalAnularOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <CancelIcon color="error" />
            Anular Recibo
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Esta acción revertirá todos los pagos registrados en este recibo. Las ventas volverán a su estado
            anterior de cobranza.
          </Alert>

          {reciboAAnular && (
            <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Recibo a anular
              </Typography>
              <Typography variant="h6">{reciboAAnular.numeroRecibo}</Typography>
              <Typography variant="body2">
                Cliente: {reciboAAnular.nombreCliente}
              </Typography>
              <Typography variant="body2" color="success.main">
                Monto: {formatCurrency(reciboAAnular.totales.totalCobrado)}
              </Typography>
            </Paper>
          )}

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Motivo de Anulación *"
            value={motivoAnulacion}
            onChange={(e) => setMotivoAnulacion(e.target.value)}
            placeholder="Describa el motivo de la anulación..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalAnularOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmarAnular}
            disabled={!motivoAnulacion || loadingRecibos}
          >
            Confirmar Anulación
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Generar Remito */}
      <Dialog open={modalRemitoOpen} onClose={() => setModalRemitoOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <LocalShippingIcon color="success" />
            Generar Remito
          </Box>
        </DialogTitle>
        <DialogContent>
          {ventaParaRemito && (
            <>
              <Alert severity="info" sx={{ mb: 3 }}>
                Se generará un remito para la venta <strong>{ventaParaRemito.numeroVenta}</strong>
              </Alert>

              <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      Cliente
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {ventaParaRemito.nombreCliente}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      Total Venta
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {formatCurrency(ventaParaRemito.total)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      Estado Cobranza
                    </Typography>
                    <Chip
                      label={ventaParaRemito.estadoCobranza?.replace(/_/g, ' ')}
                      color={ventaParaRemito.estadoCobranza === 'cobrado' ? 'success' : 'warning'}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      Items
                    </Typography>
                    <Typography variant="body1">
                      {ventaParaRemito.items.length} producto(s)
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Dirección de Entrega *"
                    value={datosRemito.direccionEntrega}
                    onChange={(e) => setDatosRemito({ ...datosRemito, direccionEntrega: e.target.value })}
                    placeholder="Ingrese dirección completa"
                    required
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Repartidor"
                    value={datosRemito.repartidor}
                    onChange={(e) => setDatosRemito({ ...datosRemito, repartidor: e.target.value })}
                    placeholder="Nombre del repartidor"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Medio Envío"
                    value={datosRemito.medioEnvio}
                    onChange={(e) => setDatosRemito({ ...datosRemito, medioEnvio: e.target.value })}
                    placeholder="Ej: Camioneta ABC-123"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Observaciones"
                    value={datosRemito.observaciones}
                    onChange={(e) => setDatosRemito({ ...datosRemito, observaciones: e.target.value })}
                    placeholder="Información adicional sobre la entrega..."
                  />
                </Grid>
              </Grid>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalRemitoOpen(false)} disabled={generandoRemito}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<LocalShippingIcon />}
            onClick={handleConfirmarRemito}
            disabled={!datosRemito.direccionEntrega || generandoRemito}
          >
            {generandoRemito ? 'Generando...' : 'Generar Remito'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Corrección de Monto */}
      <Dialog open={modalCorreccionOpen} onClose={() => setModalCorreccionOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Corregir Monto del Recibo</DialogTitle>
        <DialogContent>
          {reciboACorregir && (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Recibo:</strong> {reciboACorregir.numeroRecibo} | 
                  <strong> Cliente:</strong> {reciboACorregir.nombreCliente}
                </Typography>
              </Alert>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Monto Original"
                    type="text"
                    value={formatCurrency(datosCorreccion.montoOriginal)}
                    disabled
                    InputProps={{
                      startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Monto Correcto"
                    type="text"
                    value={montoCorrectoFormatted}
                    onChange={(e) => {
                      const formatted = formatNumberInput(e.target.value);
                      setMontoCorrectoFormatted(formatted);
                      const numericValue = getNumericValue(formatted);
                      setDatosCorreccion(prev => ({
                        ...prev,
                        montoCorrecto: numericValue
                      }));
                    }}
                    placeholder="Ej: 350.000,00"
                    helperText="Formato: 1.000,50 (coma para decimales)"
                    InputProps={{
                      startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Motivo de Corrección *</InputLabel>
                    <Select
                      value={datosCorreccion.motivo}
                      label="Motivo de Corrección *"
                      onChange={(e) => setDatosCorreccion({
                        ...datosCorreccion,
                        motivo: e.target.value as typeof MOTIVOS_CORRECCION[number]
                      })}
                    >
                      {MOTIVOS_CORRECCION.map((motivo) => (
                        <MenuItem key={motivo} value={motivo}>
                          {MOTIVOS_CORRECCION_LABELS[motivo]}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Observaciones"
                    value={datosCorreccion.observaciones}
                    onChange={(e) => setDatosCorreccion({
                      ...datosCorreccion,
                      observaciones: e.target.value
                    })}
                    placeholder="Detalles adicionales..."
                  />
                </Grid>
              </Grid>

              {/* Preview de la operación */}
              {datosCorreccion.montoCorrecto !== datosCorreccion.montoOriginal && (
                <Alert 
                  severity={datosCorreccion.montoCorrecto < datosCorreccion.montoOriginal ? 'warning' : 'success'}
                  sx={{ mt: 2 }}
                >
                  <Typography variant="body2">
                    <strong>Operación:</strong>{' '}
                    {datosCorreccion.montoCorrecto < datosCorreccion.montoOriginal 
                      ? `Devolución de $${(datosCorreccion.montoOriginal - datosCorreccion.montoCorrecto).toFixed(2)}`
                      : `Cobro adicional de $${(datosCorreccion.montoCorrecto - datosCorreccion.montoOriginal).toFixed(2)}`
                    }
                  </Typography>
                </Alert>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalCorreccionOpen(false)} disabled={corrigiendoMonto}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmarCorreccion}
            disabled={
              !datosCorreccion.motivo || 
              datosCorreccion.montoCorrecto === datosCorreccion.montoOriginal ||
              datosCorreccion.montoCorrecto <= 0 ||
              corrigiendoMonto
            }
          >
            {corrigiendoMonto ? 'Procesando...' : 'Aplicar Corrección'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CobranzasPage;
