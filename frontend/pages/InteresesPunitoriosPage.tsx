import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Grid,
  Card,
  CardContent,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Tooltip,
  InputAdornment
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  Calculate as CalculateIcon,
  Payment as PaymentIcon,
  Cancel as CancelIcon,
  Info as InfoIcon,
  PictureAsPdf as PictureAsPdfIcon
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchIntereses,
  fetchEstadisticas,
  fetchConfiguracionVigente,
  actualizarCalculo,
  cobrarIntereses,
  condonarIntereses,
  clearError
} from '../redux/slices/interesesSlice';
import type { InteresPunitorio, ESTADOS_INTERES } from '../types';
import { formatCurrency, parseCurrency, formatDate } from '../utils/formatters';
import FormaPagoModal from '../components/FormaPagoModal';
import ConfiguracionInteresesModal from '../components/ConfiguracionInteresesModal';
import { AppDispatch, RootState } from '../redux/store';
import { interesesAPI } from '../services/api';

const InteresesPunitoriosPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { intereses, estadisticas, configuracionVigente, loading, error } = useSelector((state: RootState) => state.intereses);
  const user = useSelector((state: RootState) => state.auth.user);

  // Estados de filtros
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState<string>('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState<string>('');
  const [filtroClienteId, setFiltroClienteId] = useState<string>('');

  // Estados de modales
  const [openConfigModal, setOpenConfigModal] = useState(false);
  const [openCobrarModal, setOpenCobrarModal] = useState(false);
  const [openCondonarModal, setOpenCondonarModal] = useState(false);
  const [interesSeleccionado, setInteresSeleccionado] = useState<InteresPunitorio | null>(null);

  // Estados para cobro
  // Observaciones will be provided via FormaPagoModal's general observation field

  // Estados para condonación
  const [montoCondonar, setMontoCondonar] = useState<string>('');
  const [motivoCondonacion, setMotivoCondonacion] = useState<string>('');

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = () => {
    dispatch(fetchConfiguracionVigente());
    dispatch(fetchEstadisticas());
    aplicarFiltros();
  };

  const aplicarFiltros = () => {
    const filtros: any = {};
    if (filtroEstado) filtros.estado = filtroEstado;
    if (filtroFechaDesde) filtros.fechaDesde = filtroFechaDesde;
    if (filtroFechaHasta) filtros.fechaHasta = filtroFechaHasta;
    if (filtroClienteId) filtros.clienteId = filtroClienteId;
    dispatch(fetchIntereses(filtros));
  };

  const limpiarFiltros = () => {
    setFiltroEstado('');
    setFiltroFechaDesde('');
    setFiltroFechaHasta('');
    setFiltroClienteId('');
    dispatch(fetchIntereses(undefined));
  };

  const getEstadoColor = (estado: typeof ESTADOS_INTERES[number]) => {
    switch (estado) {
      case 'devengando': return 'warning';
      case 'cobrado_parcial': return 'info';
      case 'cobrado_total': return 'success';
      case 'condonado_parcial': return 'secondary';
      case 'condonado_total': return 'default';
      default: return 'default';
    }
  };

  const getEstadoLabel = (estado: typeof ESTADOS_INTERES[number]) => {
    switch (estado) {
      case 'devengando': return 'Devengando';
      case 'cobrado_parcial': return 'Cobrado Parcial';
      case 'cobrado_total': return 'Cobrado Total';
      case 'condonado_parcial': return 'Condonado Parcial';
      case 'condonado_total': return 'Condonado Total';
      default: return estado;
    }
  };

  const getNombreCliente = (interes: InteresPunitorio): string => {
    if (typeof interes.clienteId === 'string') return 'N/A';
    const cliente = interes.clienteId;
    return cliente.razonSocial || `${cliente.apellido || ''} ${cliente.nombre || ''}`.trim() || 'N/A';
  };

  const handleActualizarCalculo = async (interesId: string) => {
    try {
      await dispatch(actualizarCalculo(interesId)).unwrap();
    } catch (error) {
      console.error('Error al actualizar cálculo:', error);
    }
  };

  const handleAbrirCobrar = (interes: InteresPunitorio) => {
    setInteresSeleccionado(interes);
    // clear derived states
    setOpenCobrarModal(true);
  };

  const handleConfirmCobro = async (formasPago: any[], observacionesGenerales?: string) => {
    if (!interesSeleccionado) return;
    const totalFormas = formasPago.reduce((sum, f) => sum + (f.monto || 0), 0);
    if (totalFormas <= 0 || totalFormas > interesSeleccionado.interesPendiente) {
      alert(`El monto total debe ser mayor a 0 y no superar el pendiente ($${formatCurrency(interesSeleccionado.interesPendiente)})`);
      return;
    }
    try {
      await dispatch(cobrarIntereses({
        id: interesSeleccionado._id!,
        datos: {
          formasPago,
          observaciones: observacionesGenerales?.trim() || undefined
        }
      })).unwrap();

      setOpenCobrarModal(false);
      setInteresSeleccionado(null);
      cargarDatos();
    } catch (error) {
      console.error('Error al cobrar intereses:', error);
    }
  };

  const handleAbrirCondonar = (interes: InteresPunitorio) => {
    setInteresSeleccionado(interes);
    setMontoCondonar(formatCurrency(interes.interesPendiente));
    setMotivoCondonacion('');
    setOpenCondonarModal(true);
  };

  const handleCondonar = async () => {
    if (!interesSeleccionado) return;

    const monto = parseCurrency(montoCondonar);
    if (monto <= 0 || monto > interesSeleccionado.interesPendiente) {
      alert(`El monto debe ser mayor a 0 y no superar el pendiente ($${formatCurrency(interesSeleccionado.interesPendiente)})`);
      return;
    }

    if (!motivoCondonacion.trim()) {
      alert('El motivo de condonación es obligatorio');
      return;
    }

    try {
      await dispatch(condonarIntereses({
        id: interesSeleccionado._id!,
        datos: {
          montoCondonar: monto,
          motivo: motivoCondonacion.trim()
        }
      })).unwrap();

      setOpenCondonarModal(false);
      setInteresSeleccionado(null);
      cargarDatos();
    } catch (error) {
      console.error('Error al condonar intereses:', error);
    }
  };

  const handleMontoChange = (valor: string, setter: (v: string) => void) => {
    const numericValue = valor.replace(/[^0-9]/g, '');
    if (numericValue) {
      setter(formatCurrency(Number(numericValue) / 100));
    } else {
      setter('');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Intereses Punitorios</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={cargarDatos}
            disabled={loading}
          >
            Actualizar
          </Button>
          <Button
            variant="contained"
            startIcon={<SettingsIcon />}
            onClick={() => setOpenConfigModal(true)}
          >
            Configurar Tasa
          </Button>
        </Box>
      </Box>

      {/* Configuración Actual */}
      {configuracionVigente && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2">
              <strong>Tasa vigente:</strong> {configuracionVigente.tasaMensualVigente?.toFixed?.(3) ?? configuracionVigente.tasaMensualVigente}% mensual 
              ({(configuracionVigente.tasaMensualVigente / 30).toFixed(6)}% diario) | 
              <strong> Aplica desde:</strong> día {configuracionVigente.aplicaDesde} | 
              <strong> Fuente:</strong> {configuracionVigente.fuenteReferencia}
            </Typography>
            {filtroClienteId && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<PictureAsPdfIcon />}
                onClick={async () => {
                  await interesesAPI.descargarPDFInteresesCliente(
                    filtroClienteId, 
                    filtroEstado
                  );
                }}
              >
                Descargar PDF Cliente
              </Button>
            )}
          </Box>
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch(clearError())}>
          {error}
        </Alert>
      )}

      {/* Estadísticas */}
      {estadisticas && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Total Devengado
                </Typography>
                <Typography variant="h5" color="warning.main">
                  ${formatCurrency(estadisticas.totalDevengado)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {estadisticas.totalRegistros} registros
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Total Cobrado
                </Typography>
                <Typography variant="h5" color="success.main">
                  ${formatCurrency(estadisticas.totalCobrado)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Total Condonado
                </Typography>
                <Typography variant="h5" color="info.main">
                  ${formatCurrency(estadisticas.totalCondonado)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Total Pendiente
                </Typography>
                <Typography variant="h5" color="error.main">
                  ${formatCurrency(estadisticas.totalPendiente)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Promedio: {estadisticas.diasPromedio} días
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              select
              size="small"
              label="Estado"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="devengando">Devengando</MenuItem>
              <MenuItem value="cobrado_parcial">Cobrado Parcial</MenuItem>
              <MenuItem value="cobrado_total">Cobrado Total</MenuItem>
              <MenuItem value="condonado_parcial">Condonado Parcial</MenuItem>
              <MenuItem value="condonado_total">Condonado Total</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Desde"
              value={filtroFechaDesde}
              onChange={(e) => setFiltroFechaDesde(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Hasta"
              value={filtroFechaHasta}
              onChange={(e) => setFiltroFechaHasta(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="contained" onClick={aplicarFiltros} fullWidth>
                Filtrar
              </Button>
              <Button variant="outlined" onClick={limpiarFiltros}>
                Limpiar
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabla de Intereses */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Cliente</TableCell>
              <TableCell>Documento</TableCell>
              <TableCell align="right">Capital</TableCell>
              <TableCell align="center">Días</TableCell>
              <TableCell align="right">Devengado</TableCell>
              <TableCell align="right">Cobrado</TableCell>
              <TableCell align="right">Condonado</TableCell>
              <TableCell align="right">Pendiente</TableCell>
              <TableCell align="center">Estado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {intereses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    No hay intereses registrados
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              intereses.map((interes) => (
                <TableRow key={interes._id} hover>
                  <TableCell>{getNombreCliente(interes)}</TableCell>
                  <TableCell>
                    <Tooltip title={`ID: ${interes.documentoRelacionado.documentoId}`}>
                      <span>
                        {interes.documentoRelacionado.tipo.toUpperCase()} #{interes.documentoRelacionado.numeroDocumento}
                      </span>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">${formatCurrency(interes.capitalOriginal)}</TableCell>
                  <TableCell align="center">{interes.diasTranscurridos}</TableCell>
                  <TableCell align="right" sx={{ color: 'warning.main', fontWeight: 'bold' }}>
                    ${formatCurrency(interes.interesDevengado)}
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'success.main' }}>
                    ${formatCurrency(interes.interesCobrado)}
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'info.main' }}>
                    ${formatCurrency(interes.interesCondonado)}
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                    ${formatCurrency(interes.interesPendiente)}
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={getEstadoLabel(interes.estado)} 
                      color={getEstadoColor(interes.estado)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      {interes.estado === 'devengando' && (
                        <Tooltip title="Actualizar cálculo">
                          <IconButton
                            size="small"
                            onClick={() => handleActualizarCalculo(interes._id!)}
                            disabled={loading}
                          >
                            <CalculateIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      
                      {interes.interesPendiente > 0 && (
                        <>
                          <Tooltip title="Cobrar">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleAbrirCobrar(interes)}
                              disabled={loading}
                            >
                              <PaymentIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          
                          {user?.userType === 'admin' && (
                            <Tooltip title="Condonar (solo admin)">
                              <IconButton
                                size="small"
                                color="warning"
                                onClick={() => handleAbrirCondonar(interes)}
                                disabled={loading}
                              >
                                <CancelIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modal Configuración */}
      <ConfiguracionInteresesModal
        open={openConfigModal}
        onClose={() => {
          setOpenConfigModal(false);
          cargarDatos();
        }}
      />

      {/* Modal Cobrar (reutiliza FormaPagoModal) */}
      <FormaPagoModal
        open={openCobrarModal}
        onClose={() => setOpenCobrarModal(false)}
        montoTotal={interesSeleccionado?.interesPendiente || 0}
        cliente={typeof interesSeleccionado?.clienteId === 'object' ? (interesSeleccionado?.clienteId as any) : undefined}
        permitirPagoParcial={true}
        onConfirm={handleConfirmCobro}
      />

      {/* Modal Condonar */}
      <Dialog open={openCondonarModal} onClose={() => setOpenCondonarModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Condonar Intereses</DialogTitle>
        <DialogContent>
          {interesSeleccionado && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Cliente:</strong> {getNombreCliente(interesSeleccionado)}<br />
                  <strong>Pendiente:</strong> ${formatCurrency(interesSeleccionado.interesPendiente)}
                </Typography>
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  Esta acción quedará registrada en el historial y requiere motivo obligatorio.
                </Typography>
              </Alert>

              <TextField
                fullWidth
                required
                label="Monto a Condonar"
                value={montoCondonar}
                onChange={(e) => handleMontoChange(e.target.value, setMontoCondonar)}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>
                }}
                helperText="Formato: 1.000,00"
              />

              <TextField
                fullWidth
                required
                multiline
                rows={3}
                label="Motivo de Condonación"
                value={motivoCondonacion}
                onChange={(e) => setMotivoCondonacion(e.target.value)}
                helperText="Obligatorio: explicar por qué se condona este interés"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCondonarModal(false)}>Cancelar</Button>
          <Button onClick={handleCondonar} variant="contained" color="warning">
            Confirmar Condonación
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InteresesPunitoriosPage;
