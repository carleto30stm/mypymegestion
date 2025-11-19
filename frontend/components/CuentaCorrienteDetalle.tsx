import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress
} from '@mui/material';
import {
  AccountBalance,
  TrendingUp,
  TrendingDown,
  Add,
  Error,
  CheckCircle,
  Warning,
  Payment,
  PictureAsPdf
} from '@mui/icons-material';
import { AppDispatch, RootState } from '../redux/store';
import {
  fetchMovimientos,
  fetchResumen,
  fetchAntiguedad,
  crearAjuste
} from '../redux/slices/cuentaCorrienteSlice';
import { crearRecibo } from '../redux/slices/recibosSlice';
import { fetchVentas } from '../redux/slices/ventasSlice';
import { Cliente, FormaPago } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import FormaPagoModal from './FormaPagoModal';
import { cuentaCorrienteAPI } from '../services/api';

interface CuentaCorrienteDetalleProps {
  cliente: Cliente | null;
}

const CuentaCorrienteDetalle: React.FC<CuentaCorrienteDetalleProps> = ({ cliente }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { movimientos, resumen, antiguedad, loading, error } = useSelector((state: RootState) => state.cuentaCorriente);
  const { items: ventas } = useSelector((state: RootState) => state.ventas);
  const { user } = useSelector((state: RootState) => state.auth);

  const [openAjusteModal, setOpenAjusteModal] = useState(false);
  const [openPagoModal, setOpenPagoModal] = useState(false);
  const [openPreviewVentas, setOpenPreviewVentas] = useState(false);
  const [observacionesPago, setObservacionesPago] = useState('');
  
  const [ajusteForm, setAjusteForm] = useState({
    tipo: 'ajuste_cargo' as 'ajuste_cargo' | 'ajuste_descuento',
    monto: '',
    concepto: '',
    observaciones: ''
  });

  useEffect(() => {
    if (cliente?._id) {
      dispatch(fetchMovimientos({ clienteId: cliente._id, incluirAnulados: false }));
      dispatch(fetchResumen(cliente._id));
      dispatch(fetchAntiguedad(cliente._id));
      dispatch(fetchVentas()); // Cargar ventas para poder identificar cuáles están pendientes
    }
  }, [cliente, dispatch]);

  const handleCrearAjuste = async () => {
    if (!cliente?._id || !ajusteForm.concepto || !ajusteForm.monto) {
      return;
    }

    await dispatch(crearAjuste({
      clienteId: cliente._id,
      tipo: ajusteForm.tipo,
      monto: parseFloat(ajusteForm.monto),
      concepto: ajusteForm.concepto,
      observaciones: ajusteForm.observaciones
    }));

    // Refrescar datos
    dispatch(fetchMovimientos({ clienteId: cliente._id, incluirAnulados: false }));
    dispatch(fetchResumen(cliente._id));
    dispatch(fetchAntiguedad(cliente._id));

    // Limpiar y cerrar modal
    setAjusteForm({ tipo: 'ajuste_cargo', monto: '', concepto: '', observaciones: '' });
    setOpenAjusteModal(false);
  };

  const handleRegistrarPago = async (formasPago: FormaPago[], observacionesGenerales?: string) => {
    if (!cliente?._id || !user?.id || !resumen) {
      return;
    }

    // Calcular monto del pago
    const totalPago = formasPago.reduce((sum, fp) => sum + fp.monto, 0);
    const deudaActual = resumen.saldoActual;
    const espagoCompleto = totalPago >= deudaActual;

    // IMPORTANTE: Identificar ventas pendientes del cliente para vincularlas al recibo
    // Esto asegura que el estado de cobranza se actualice correctamente
    const ventasPendientesCliente = ventas.filter(v => {
      // Extraer clienteId (puede venir como objeto poblado o string)
      const ventaClienteId = typeof v.clienteId === 'object' && v.clienteId !== null
        ? (v.clienteId as any)._id || (v.clienteId as any).id
        : v.clienteId;
      
      return ventaClienteId === cliente._id && 
             v.estado === 'confirmada' && 
             v.saldoPendiente > 0;
    }).sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()); // Ordenar por fecha (más antiguas primero)

    // Obtener IDs de las ventas pendientes
    const ventasIds = ventasPendientesCliente.map(v => v._id!);

    try {
      await dispatch(crearRecibo({
        clienteId: cliente._id,
        ventasIds, // ✅ Ahora incluye las ventas pendientes para que se actualicen correctamente
        formasPago,
        momentoCobro: 'diferido',
        observaciones: observacionesGenerales || observacionesPago || `Regularización de deuda - Pago ${espagoCompleto ? 'total' : 'parcial'} - ${ventasIds.length} venta(s) cobrada(s)`,
        creadoPor: user.id
      })).unwrap();

      // Refrescar datos de cuenta corriente
      dispatch(fetchMovimientos({ clienteId: cliente._id, incluirAnulados: false }));
      dispatch(fetchResumen(cliente._id));
      dispatch(fetchAntiguedad(cliente._id));
      dispatch(fetchVentas()); // Refrescar ventas para actualizar estado de cobranza

      // Limpiar y cerrar modal
      setObservacionesPago('');
      setOpenPagoModal(false);

      // Mostrar mensaje de éxito con detalles
      const saldoRestante = deudaActual - totalPago;
      if (espagoCompleto) {
        alert(`✅ Pago registrado exitosamente!\n\n💰 Monto pagado: ${formatCurrency(totalPago)}\n✔️ Deuda saldada completamente\n📋 ${ventasIds.length} venta(s) cobrada(s)\n📊 El ingreso se registró en caja`);
      } else {
        alert(`✅ Pago parcial registrado exitosamente!\n\n💰 Monto pagado: ${formatCurrency(totalPago)}\n⚠️ Saldo pendiente: ${formatCurrency(saldoRestante)}\n📋 ${ventasIds.length} venta(s) actualizada(s)\n📊 El ingreso se registró en caja`);
      }
    } catch (error: any) {
      alert('❌ Error al registrar el pago: ' + (error.message || 'Error desconocido'));
    }
  };

  if (!cliente) {
    return (
      <Alert severity="info">
        Seleccione un cliente para ver su cuenta corriente
      </Alert>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  // Función para obtener el color del estado de cuenta
  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'al_dia': return 'success';
      case 'proximo_limite': return 'warning';
      case 'limite_excedido': return 'error';
      case 'moroso': return 'error';
      default: return 'default';
    }
  };

  // Función para obtener el label del estado
  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'al_dia': return 'Al Día';
      case 'proximo_limite': return 'Próximo al Límite';
      case 'limite_excedido': return 'Límite Excedido';
      case 'moroso': return 'Moroso';
      default: return estado;
    }
  };

  return (
    <Box>
      {/* Resumen del cliente */}
      {resumen && (
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={3}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <AccountBalance color="primary" />
                <Typography variant="body2" color="text.secondary">
                  Límite de Crédito
                </Typography>
              </Box>
              <Typography variant="h5">
                {formatCurrency(resumen.limiteCredito)}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={3}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <TrendingUp color="error" />
                <Typography variant="body2" color="text.secondary">
                  {resumen.saldoActual > 0 ? 'Saldo Deudor' : resumen.saldoActual < 0 ? 'Saldo a Favor' : 'Saldo Actual'}
                </Typography>
              </Box>
              <Typography variant="h5" color={resumen.saldoActual > 0 ? 'error.main' : resumen.saldoActual < 0 ? 'success.main' : 'text.primary'}>
                {resumen.saldoActual > 0 && 'Debe: '}
                {resumen.saldoActual < 0 && 'A favor: '}
                {formatCurrency(Math.abs(resumen.saldoActual))}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={3}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <CheckCircle color="success" />
                <Typography variant="body2" color="text.secondary">
                  Crédito Disponible
                </Typography>
              </Box>
              <Typography variant="h5" color="success.main">
                {formatCurrency(resumen.saldoDisponible)}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={3}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Warning color="warning" />
                <Typography variant="body2" color="text.secondary">
                  Estado de Cuenta
                </Typography>
              </Box>
              <Chip 
                label={getEstadoLabel(resumen.estadoCuenta)} 
                color={getEstadoColor(resumen.estadoCuenta) as any}
                size="medium"
              />
            </Grid>

            <Grid item xs={12}>
              <Box mb={1}>
                <Typography variant="caption" color="text.secondary">
                  Uso del Crédito: {resumen.porcentajeUso}%
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={Math.min(resumen.porcentajeUso, 100)}
                color={resumen.porcentajeUso > 80 ? 'error' : resumen.porcentajeUso > 60 ? 'warning' : 'success'}
                sx={{ height: 10, borderRadius: 5 }}
              />
            </Grid>

            {/* Botón de Registrar Pago Real - visible solo si hay deuda */}
            {resumen.saldoActual > 0 && (
              <Grid item xs={12}>
                <Alert 
                  severity="warning" 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between' 
                  }}
                  action={
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="outlined"
                        color="primary"
                        startIcon={<PictureAsPdf />}
                        onClick={async () => {
                          if (cliente?._id) {
                            await cuentaCorrienteAPI.descargarPDFEstadoCuenta(cliente._id, { incluirIntereses: true });
                          }
                        }}
                      >
                        Descargar PDF
                      </Button>
                      <Button
                        variant="contained"
                        color="success"
                        size="large"
                        startIcon={<Payment />}
                        onClick={() => {
                          setOpenPreviewVentas(true);
                          setOpenPagoModal(true);
                        }}
                        sx={{ minWidth: 200 }}
                      >
                        Registrar Pago Real
                      </Button>
                    </Box>
                  }
                >
                  <Box>
                    <Typography variant="body1" fontWeight="bold">
                      Deuda Pendiente: {formatCurrency(resumen.saldoActual)}
                    </Typography>
                    <Typography variant="caption" display="block">
                      Use este botón para registrar pagos en efectivo, cheque, transferencia o tarjeta.
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                      ℹ️ El pago se aplicará automáticamente a las ventas pendientes (priorizando las más antiguas).
                    </Typography>
                  </Box>
                </Alert>
              </Grid>
            )}

            {/* Mensaje cuando tiene saldo a favor */}
            {resumen.saldoActual < 0 && (
              <Grid item xs={12}>
                <Alert 
                  severity="success"
                  action={
                    <Button
                      variant="outlined"
                      color="success"
                      startIcon={<PictureAsPdf />}
                      onClick={async () => {
                        if (cliente?._id) {
                          await cuentaCorrienteAPI.descargarPDFEstadoCuenta(cliente._id, { incluirIntereses: true });
                        }
                      }}
                    >
                      Descargar PDF
                    </Button>
                  }
                >
                  <Typography variant="body1" fontWeight="bold">
                    Cliente tiene saldo a favor: {formatCurrency(Math.abs(resumen.saldoActual))}
                  </Typography>
                  <Typography variant="caption">
                    Este saldo puede usarse en futuras compras. El crédito disponible se incrementa con este anticipo.
                  </Typography>
                </Alert>
              </Grid>
            )}
          </Grid>
        </Paper>
      )}

      {/* Antigüedad de deuda */}
      {antiguedad && antiguedad.total > 0 && (
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Antigüedad de Deuda
          </Typography>
          {antiguedad.alerta && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {antiguedad.alerta}
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={3}>
              <Paper elevation={1} sx={{ p: 2, bgcolor: 'success.50' }}>
                <Typography variant="body2" color="text.secondary">
                  0-30 días
                </Typography>
                <Typography variant="h6">
                  {formatCurrency(antiguedad.antiguedad.corriente.monto)}
                </Typography>
                <Typography variant="caption">
                  {antiguedad.antiguedad.corriente.cantidad} comprobantes
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Paper elevation={1} sx={{ p: 2, bgcolor: 'warning.50' }}>
                <Typography variant="body2" color="text.secondary">
                  31-60 días
                </Typography>
                <Typography variant="h6">
                  {formatCurrency(antiguedad.antiguedad.treintaDias.monto)}
                </Typography>
                <Typography variant="caption">
                  {antiguedad.antiguedad.treintaDias.cantidad} comprobantes
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Paper elevation={1} sx={{ p: 2, bgcolor: 'orange.50' }}>
                <Typography variant="body2" color="text.secondary">
                  61-90 días
                </Typography>
                <Typography variant="h6">
                  {formatCurrency(antiguedad.antiguedad.sesentaDias.monto)}
                </Typography>
                <Typography variant="caption">
                  {antiguedad.antiguedad.sesentaDias.cantidad} comprobantes
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Paper elevation={1} sx={{ p: 2, bgcolor: 'error.50' }}>
                <Typography variant="body2" color="text.secondary">
                  +90 días
                </Typography>
                <Typography variant="h6">
                  {formatCurrency(antiguedad.antiguedad.noventaDias.monto)}
                </Typography>
                <Typography variant="caption">
                  {antiguedad.antiguedad.noventaDias.cantidad} comprobantes
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Movimientos */}
      <Paper elevation={2} sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            Movimientos de Cuenta Corriente
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<PictureAsPdf />}
              onClick={async () => {
                if (cliente?._id) {
                  await cuentaCorrienteAPI.descargarPDFMovimientos(cliente._id, {});
                }
              }}
            >
              Descargar Movimientos PDF
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setOpenAjusteModal(true)}
            >
              Crear Ajuste
            </Button>
          </Box>
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Documento</TableCell>
                <TableCell>Concepto</TableCell>
                <TableCell align="right">Debe</TableCell>
                <TableCell align="right">Haber</TableCell>
                <TableCell align="right">Saldo</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {movimientos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No hay movimientos registrados
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                movimientos.map((mov) => (
                  <TableRow
                    key={mov._id}
                    sx={{
                      bgcolor: mov.anulado ? 'error.50' : 'inherit',
                      opacity: mov.anulado ? 0.6 : 1
                    }}
                  >
                    <TableCell>{formatDate(mov.fecha)}</TableCell>
                    <TableCell>
                      <Chip 
                        label={mov.tipo.replace(/_/g, ' ').toUpperCase()} 
                        size="small"
                        color={mov.tipo === 'venta' ? 'error' : mov.tipo === 'recibo' ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      {mov.documentoTipo} {mov.documentoNumero}
                    </TableCell>
                    <TableCell>
                      {mov.concepto}
                      {mov.anulado && (
                        <Chip label="ANULADO" size="small" color="error" sx={{ ml: 1 }} />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {mov.debe > 0 && (
                        <Typography color="error.main">
                          {formatCurrency(mov.debe)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {mov.haber > 0 && (
                        <Typography color="success.main">
                          {formatCurrency(mov.haber)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight="bold">
                        {formatCurrency(mov.saldo)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Modal de Ajuste */}
      <Dialog open={openAjusteModal} onClose={() => setOpenAjusteModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Crear Ajuste Manual</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="caption">
                    <strong>Ajuste Cargo:</strong> Aumenta la deuda del cliente (ej: intereses, recargos)<br />
                    <strong>Ajuste Descuento:</strong> Reduce la deuda SIN ingreso de dinero (ej: condonación, nota de crédito)
                  </Typography>
                </Alert>
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Tipo de Ajuste</InputLabel>
                  <Select
                    value={ajusteForm.tipo}
                    label="Tipo de Ajuste"
                    onChange={(e) => setAjusteForm({ ...ajusteForm, tipo: e.target.value as any })}
                  >
                    <MenuItem value="ajuste_cargo">Cargo (Aumenta Deuda)</MenuItem>
                    <MenuItem value="ajuste_descuento">Descuento (Reduce Deuda)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Monto"
                  type="number"
                  value={ajusteForm.monto}
                  onChange={(e) => setAjusteForm({ ...ajusteForm, monto: e.target.value })}
                  required
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Concepto"
                  value={ajusteForm.concepto}
                  onChange={(e) => setAjusteForm({ ...ajusteForm, concepto: e.target.value })}
                  required
                  multiline
                  rows={2}
                  placeholder="Ej: Descuento comercial por fidelidad, Interés por mora, etc."
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Observaciones"
                  value={ajusteForm.observaciones}
                  onChange={(e) => setAjusteForm({ ...ajusteForm, observaciones: e.target.value })}
                  multiline
                  rows={3}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAjusteModal(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleCrearAjuste} 
            variant="contained"
            disabled={!ajusteForm.concepto || !ajusteForm.monto}
          >
            Crear Ajuste
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Registrar Pago Real */}
      {resumen && (
        <FormaPagoModal
          open={openPagoModal}
          onClose={() => {
            setOpenPagoModal(false);
            setOpenPreviewVentas(false);
            setObservacionesPago('');
          }}
          montoTotal={resumen.saldoActual}
          cliente={cliente || undefined}
          onConfirm={handleRegistrarPago}
          permitirPagoParcial={true}
          observacionesIniciales={observacionesPago}
        />
      )}

      {/* Diálogo informativo: Mostrar ventas que se cobrarán */}
      {openPreviewVentas && cliente?._id && (
        <Dialog 
          open={openPreviewVentas} 
          onClose={() => setOpenPreviewVentas(false)}
          maxWidth="sm" 
          fullWidth
        >
          <DialogTitle>
            📋 Ventas Pendientes que se Cobrarán
          </DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              El pago se aplicará automáticamente a estas ventas (priorizando las más antiguas):
            </Alert>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>N° Venta</TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell align="right">Saldo Pendiente</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ventas
                    .filter(v => {
                      const ventaClienteId = typeof v.clienteId === 'object' && v.clienteId !== null
                        ? (v.clienteId as any)._id || (v.clienteId as any).id
                        : v.clienteId;
                      return ventaClienteId === cliente._id && 
                             v.estado === 'confirmada' && 
                             v.saldoPendiente > 0;
                    })
                    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
                    .map((venta) => (
                      <TableRow key={venta._id}>
                        <TableCell>{venta.numeroVenta}</TableCell>
                        <TableCell>{formatDate(venta.fecha)}</TableCell>
                        <TableCell align="right">
                          <Typography color="error.main" fontWeight="bold">
                            {formatCurrency(venta.saldoPendiente)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  {ventas.filter(v => {
                    const ventaClienteId = typeof v.clienteId === 'object' && v.clienteId !== null
                      ? (v.clienteId as any)._id || (v.clienteId as any).id
                      : v.clienteId;
                    return ventaClienteId === cliente._id && 
                           v.estado === 'confirmada' && 
                           v.saldoPendiente > 0;
                  }).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        <Typography variant="caption" color="text.secondary">
                          No hay ventas pendientes (solo movimientos de cuenta corriente)
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenPreviewVentas(false)}>
              Cerrar
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default CuentaCorrienteDetalle;
