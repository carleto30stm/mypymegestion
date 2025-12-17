import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { AppDispatch, RootState } from '../redux/store';
import { fetchVentas, fetchVentasByRango, anularVenta, confirmarVenta, updateVenta } from '../redux/slices/ventasSlice';
import { crearFacturaDesdeVenta, fetchFacturas } from '../redux/slices/facturasSlice';
import { Venta } from '../types';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Tooltip,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  TablePagination
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  Visibility as ViewIcon,
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { formatCurrency, formatDate, formatCurrencyDecimals } from '../utils/formatters';
import ConfirmDialog from '../components/modal/ConfirmDialog';

const HistorialVentasPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { items: ventas, status, total } = useSelector((state: RootState) => state.ventas);
  const { items: facturas } = useSelector((state: RootState) => state.facturas);
  const { user } = useSelector((state: RootState) => state.auth);

  const [openDetalle, setOpenDetalle] = useState(false);
  const [ventaDetalle, setVentaDetalle] = useState<Venta | null>(null);
  const [openAnular, setOpenAnular] = useState(false);
  const [ventaAnular, setVentaAnular] = useState<Venta | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [confirmandoVenta, setConfirmandoVenta] = useState<string | null>(null);
  const [openEditar, setOpenEditar] = useState(false);
  const [ventaEditar, setVentaEditar] = useState<Venta | null>(null);
  const [editandoVenta, setEditandoVenta] = useState<string | null>(null);
  const [openConfirmar, setOpenConfirmar] = useState(false);
  const [ventaConfirmar, setVentaConfirmar] = useState<Venta | null>(null);

  // Pagination & range
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [mostrarTodo, setMostrarTodo] = useState(false);
  const [fechaInicio, setFechaInicio] = useState<string | null>(null);
  const [fechaFin, setFechaFin] = useState<string | null>(null);
  const [estadoFiltro, setEstadoFiltro] = useState<string>('');

  useEffect(() => {
    // Default: load current month
    const now = new Date();
    const inicio = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const fin = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const inicioISO = inicio.toISOString();
    const finISO = fin.toISOString();
    setFechaInicio(inicioISO);
    setFechaFin(finISO);
    setMostrarTodo(false);
    // fetch first page of current month
    dispatch(fetchVentas({ page: 1, limit: rowsPerPage, fechaInicio: inicioISO, fechaFin: finISO, ...(estadoFiltro ? { estado: estadoFiltro } : {}) }));
    dispatch(fetchFacturas({}));
  }, [dispatch, estadoFiltro]);

  const handleVerDetalle = (venta: Venta) => {
    setVentaDetalle(venta);
    setOpenDetalle(true);
  };

  const handleOpenAnular = (venta: Venta) => {
    setVentaAnular(venta);
    setOpenAnular(true);
  };

  const handleOpenConfirmar = (venta: Venta) => {
    setVentaConfirmar(venta);
    setOpenConfirmar(true);
  };

  const refreshVentas = () => {
    if (mostrarTodo) {
      dispatch(fetchVentas({ all: true, page: page + 1, limit: rowsPerPage, ...(estadoFiltro ? { estado: estadoFiltro } : {}) }));
    } else if (fechaInicio && fechaFin) {
      dispatch(fetchVentas({ page: page + 1, limit: rowsPerPage, fechaInicio, fechaFin, ...(estadoFiltro ? { estado: estadoFiltro } : {}) }));
    } else {
      dispatch(fetchVentas({ page: page + 1, limit: rowsPerPage, ...(estadoFiltro ? { estado: estadoFiltro } : {}) }));
    }
  };

  const handleConfirmAnular = async () => {
    if (!ventaAnular || !motivoAnulacion.trim()) {
      alert('Debe ingresar un motivo');
      return;
    }

    await dispatch(anularVenta({ id: ventaAnular._id!, motivoAnulacion }));
    setOpenAnular(false);
    setVentaAnular(null);
    setMotivoAnulacion('');
    refreshVentas();
  };

  const handleConfirmarVenta = async (ventaId: string) => {
    if (!user?.username) {
      alert('Error: Usuario no identificado');
      return;
    }

    setConfirmandoVenta(ventaId);
    try {
      await dispatch(confirmarVenta({ id: ventaId, usuarioConfirmacion: user.username })).unwrap();
      // After confirming, ensure we refetch the current page
      refreshVentas();
    } catch (err: any) {
      alert(err.message || 'Error al confirmar la venta');
    } finally {
      setConfirmandoVenta(null);
    }
  };

  const handleConfirmConfirmar = async () => {
    if (!ventaConfirmar || !user?.username) return;

    setConfirmandoVenta(ventaConfirmar._id!);
    try {
      await dispatch(confirmarVenta({ id: ventaConfirmar._id!, usuarioConfirmacion: user.username })).unwrap();
      refreshVentas();
      setOpenConfirmar(false);
      setVentaConfirmar(null);
    } catch (err: any) {
      alert(err.message || 'Error al confirmar la venta');
    } finally {
      setConfirmandoVenta(null);
    }
  };

  const handleFacturar = async (ventaId: string) => {
    // DEPRECATED: La facturación ahora se hace desde FacturasPage
    alert('La facturación ahora se realiza desde la página de Facturas');
  };

  const getFacturaByVentaId = (ventaId: string) => {
    return facturas.find((f) => f.ventaId === ventaId);
  };

  const handleEditarVenta = (venta: Venta) => {
    // Solo se pueden editar ventas pendientes
    if (venta.estado !== 'pendiente') {
      alert('Solo se pueden editar ventas en estado pendiente');
      return;
    }
    
    // Abrir dialog de edición rápida (momentoCobro y observaciones)
    setVentaEditar(venta);
    setOpenEditar(true);
  };

  const handleEditarVentaCompleta = (venta: Venta) => {
    // Solo se pueden editar ventas pendientes
    if (venta.estado !== 'pendiente') {
      alert('Solo se pueden editar ventas en estado pendiente');
      return;
    }
    
    // Navegar a VentasPage con los datos de la venta para editar items/cliente
    navigate('/ventas', { state: { ventaParaEditar: venta } });
  };

  const handleConfirmEditar = async () => {
    if (!ventaEditar) return;

    setEditandoVenta(ventaEditar._id!);
    try {
      // Permitir editar items, momentoCobro y observaciones en ventas pendientes
      await dispatch(updateVenta({ 
        id: ventaEditar._id!, 
        ventaData: {
          items: ventaEditar.items,
          subtotal: ventaEditar.subtotal,
          iva: ventaEditar.iva,
          total: ventaEditar.total,
          momentoCobro: ventaEditar.momentoCobro,
          observaciones: ventaEditar.observaciones
        }
      })).unwrap();
      
      setOpenEditar(false);
      setVentaEditar(null);
      refreshVentas();
      alert('Venta actualizada exitosamente');
    } catch (err: any) {
      alert(err.message || 'Error al actualizar la venta');
    } finally {
      setEditandoVenta(null);
    }
  };

  // Validación para determinar si una venta puede confirmarse según momentoCobro
  const puedeConfirmar = (venta: Venta): { puede: boolean; razon?: string } => {
    if (!venta.momentoCobro) {
      // Si no tiene momentoCobro (ventas antiguas), permitir confirmar (comportamiento legacy)
      return { puede: true };
    }

    if (venta.momentoCobro === 'anticipado') {
      // Ventas anticipadas requieren cobro ANTES de confirmar
      if (venta.estadoCobranza !== 'cobrado') {
        return { 
          puede: false, 
          razon: 'Venta anticipada requiere cobro previo. Debe registrar el cobro ANTES de confirmar.' 
        };
      }
    }

    // Ventas contra_entrega y diferidas pueden confirmarse sin cobro previo
    // - contra_entrega: se confirma para crear remito, el cobro se hace al entregar
    // - diferido: genera deuda en cuenta corriente
    return { puede: true };
  };

  // Helper para obtener propiedades de visualización del estado granular
  const getEstadoGranularProps = (venta: Venta) => {
    const estadoGranular = venta.estadoGranular || venta.estado; // Fallback a estado legacy
    
    const configs = {
      borrador: { color: 'default' as const, emoji: '📝', label: 'Borrador' },
      pendiente: { color: 'warning' as const, emoji: '⏳', label: 'Pendiente' },
      confirmada: { color: 'success' as const, emoji: '✅', label: 'Confirmada' },
      facturada: { color: 'info' as const, emoji: '📄', label: 'Facturada' },
      entregada: { color: 'primary' as const, emoji: '🚚', label: 'Entregada' },
      cobrada: { color: 'secondary' as const, emoji: '💰', label: 'Cobrada' },
      completada: { color: 'success' as const, emoji: '🎉', label: 'Completada' },
      anulada: { color: 'error' as const, emoji: '❌', label: 'Anulada' },
      parcial: { color: 'warning' as const, emoji: '⚠️', label: 'Parcial' }
    };

    return configs[estadoGranular as keyof typeof configs] || configs.pendiente;
  };

  const canAnular = user?.userType === 'admin';
  const canConfirm = user?.userType === 'admin' || user?.userType === 'oper_ad' || user?.userType === 'oper';
  const canEdit = user?.userType === 'admin' || user?.userType === 'oper_ad' || user?.userType === 'oper';

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <ReceiptIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
        <Typography variant="h4">Historial de Ventas</Typography>
      </Box>

      {/* Toolbar: periodo */}
      <Box sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
        <Button
          variant={!mostrarTodo ? 'contained' : 'outlined'}
          onClick={() => {
            // establecer mes actual
            const now = new Date();
            const inicio = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
            const fin = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            const inicioISO = inicio.toISOString();
            const finISO = fin.toISOString();
            setFechaInicio(inicioISO);
            setFechaFin(finISO);
            setMostrarTodo(false);
            setPage(0);
            dispatch(fetchVentas({ page: 1, limit: rowsPerPage, fechaInicio: inicioISO, fechaFin: finISO, ...(estadoFiltro ? { estado: estadoFiltro } : {}) }));
          }}
        >
          Mes actual
        </Button>
        <Button
          variant={mostrarTodo ? 'contained' : 'outlined'}
          onClick={() => {
            setMostrarTodo(true);
            setPage(0);
            setFechaInicio(null);
            setFechaFin(null);
            dispatch(fetchVentas({ all: true, page: 1, limit: rowsPerPage, ...(estadoFiltro ? { estado: estadoFiltro } : {}) }));
          }}
        >
          Mostrar todo
        </Button>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Estado</InputLabel>
          <Select
            value={estadoFiltro}
            label="Estado"
            onChange={(e) => {
              const val = e.target.value as string;
              setEstadoFiltro(val);
              setPage(0);
              // Fetch first page with selected estado
              if (val === '') {
                if (mostrarTodo) dispatch(fetchVentas({ all: true, page: 1, limit: rowsPerPage }));
                else if (fechaInicio && fechaFin) dispatch(fetchVentas({ page: 1, limit: rowsPerPage, fechaInicio, fechaFin }));
                else dispatch(fetchVentas({ page: 1, limit: rowsPerPage }));
              } else {
                if (mostrarTodo) dispatch(fetchVentas({ all: true, page: 1, limit: rowsPerPage, estado: val }));
                else if (fechaInicio && fechaFin) dispatch(fetchVentas({ page: 1, limit: rowsPerPage, fechaInicio, fechaFin, estado: val }));
                else dispatch(fetchVentas({ page: 1, limit: rowsPerPage, estado: val }));
              }
            }}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="pendiente">Pendiente</MenuItem>
            <MenuItem value="confirmada">Confirmada</MenuItem>
            <MenuItem value="facturada">Facturada</MenuItem>
            <MenuItem value="entregada">Entregada</MenuItem>
            <MenuItem value="anulada">Anulada</MenuItem>
          </Select>
        </FormControl>
        <Box sx={{ ml: 'auto', color: 'text.secondary' }}>
          {fechaInicio && fechaFin && (
            <Typography variant="caption">Periodo: {formatDate(fechaInicio)} — {formatDate(fechaFin)}</Typography>
          )}
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>N° Venta</strong></TableCell>
              <TableCell><strong>Fecha</strong></TableCell>
              <TableCell><strong>Cliente</strong></TableCell>
              <TableCell><strong>Productos</strong></TableCell>
              <TableCell align="center"><strong>IVA</strong></TableCell>
              <TableCell align="right"><strong>Total</strong></TableCell>
              <TableCell><strong>M. Cobro</strong></TableCell>
              <TableCell><strong>Estado</strong></TableCell>
              <TableCell align="center"><strong>Acciones</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ventas.map((venta) => (
              <TableRow key={venta._id}>
                <TableCell>{venta.numeroVenta}</TableCell>
                <TableCell>{formatDate(venta.fecha)}</TableCell>
                <TableCell>
                  <Typography variant="body2">{venta.nombreCliente}</Typography>
                  <Typography variant="caption" color="textSecondary">{venta.documentoCliente}</Typography>
                </TableCell>
                <TableCell>
                  <Tooltip title={venta.items.map(i => `${i.nombreProducto} (x${i.cantidad})`).join(', ')}>
                    <Box>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                        {venta.items.map(i => i.nombreProducto).join(', ')}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {venta.items.length} item(s)
                      </Typography>
                    </Box>
                  </Tooltip>
                </TableCell>
                <TableCell align="center">
                  <Chip 
                    label={venta.aplicaIVA ? 'Sí' : 'No'} 
                    color={venta.aplicaIVA ? 'success' : 'default'} 
                    size="small"
                    sx={{ fontSize: '0.7rem' }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Typography fontWeight="bold">{formatCurrencyDecimals(venta.total, 3)}</Typography>
                  {venta.aplicaIVA && (
                    <Typography variant="caption" color="textSecondary" display="block">
                      IVA: {formatCurrencyDecimals(venta.iva || 0, 3)}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={
                      venta.momentoCobro === 'anticipado' ? '📥 Antic.' :
                      venta.momentoCobro === 'contra_entrega' ? '🚚 C/Ent.' :
                      '💳 Diferido'
                    } 
                    size="small" 
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  {(() => {
                    const estadoProps = getEstadoGranularProps(venta);
                    return (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Chip
                          label={`${estadoProps.emoji} ${estadoProps.label}`}
                          color={estadoProps.color}
                          size="small"
                        />
                        {/* Mostrar sub-estados si aplica */}
                        {venta.estadoGranular && venta.estadoGranular !== 'anulada' && venta.estadoGranular !== 'completada' && (
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {venta.estadoCobranza !== 'sin_cobrar' && (
                              <Chip 
                                label={venta.estadoCobranza === 'cobrado' ? '💰' : '💵'} 
                                size="small" 
                                variant="outlined"
                                sx={{ fontSize: '0.65rem', height: '18px' }}
                              />
                            )}
                            {venta.estadoEntrega !== 'sin_remito' && (
                              <Chip 
                                label={venta.estadoEntrega === 'entregado' ? '📦' : '🚛'} 
                                size="small" 
                                variant="outlined"
                                sx={{ fontSize: '0.65rem', height: '18px' }}
                              />
                            )}
                            {venta.facturada && (
                              <Chip 
                                label="📄" 
                                size="small" 
                                variant="outlined"
                                sx={{ fontSize: '0.65rem', height: '18px' }}
                              />
                            )}
                          </Box>
                        )}
                      </Box>
                    );
                  })()}
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                    {canConfirm && venta.estado === 'pendiente' && (() => {
                      const validacion = puedeConfirmar(venta);
                      const tooltipMessage = validacion.puede 
                        ? "Confirmar Venta" 
                        : validacion.razon || "No se puede confirmar";
                      
                      return (
                        <Tooltip title={tooltipMessage}>
                          <span>
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleOpenConfirmar(venta)}
                              disabled={confirmandoVenta === venta._id || !validacion.puede}
                            >
                              {confirmandoVenta === venta._id ? (
                                <CircularProgress size={20} />
                              ) : (
                                <CheckCircleIcon fontSize="small" />
                              )}
                            </IconButton>
                          </span>
                        </Tooltip>
                      );
                    })()}

                    {canEdit && venta.estado === 'pendiente' && (
                      <Tooltip title="Editar Venta">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleEditarVenta(venta)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}

                    <Tooltip title="Ver Detalle">
                      <IconButton size="small" onClick={() => handleVerDetalle(venta)}>
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    {canAnular && venta.estado === 'confirmada' && (
                      <Tooltip title="Anular">
                        <IconButton size="small" color="error" onClick={() => handleOpenAnular(venta)}>
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(_e, newPage) => {
          setPage(newPage);
          // Fetch new page
          if (mostrarTodo) {
            dispatch(fetchVentas({ all: true, page: newPage + 1, limit: rowsPerPage, ...(estadoFiltro ? { estado: estadoFiltro } : {}) }));
          } else if (fechaInicio && fechaFin) {
            dispatch(fetchVentas({ page: newPage + 1, limit: rowsPerPage, fechaInicio, fechaFin, ...(estadoFiltro ? { estado: estadoFiltro } : {}) }));
          } else {
            dispatch(fetchVentas({ page: newPage + 1, limit: rowsPerPage, ...(estadoFiltro ? { estado: estadoFiltro } : {}) }));
          }
        }}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => { const newLimit = parseInt((e.target as HTMLInputElement).value, 10); setRowsPerPage(newLimit); setPage(0);
          if (mostrarTodo) {
            dispatch(fetchVentas({ all: true, page: 1, limit: newLimit, ...(estadoFiltro ? { estado: estadoFiltro } : {}) }));
          } else if (fechaInicio && fechaFin) {
            dispatch(fetchVentas({ page: 1, limit: newLimit, fechaInicio, fechaFin, ...(estadoFiltro ? { estado: estadoFiltro } : {}) }));
          } else {
            dispatch(fetchVentas({ page: 1, limit: newLimit, ...(estadoFiltro ? { estado: estadoFiltro } : {}) }));
          }
        }}
        rowsPerPageOptions={[5,10,25,50]}
      />

      {/* Dialog Detalle */}
      <Dialog open={openDetalle} onClose={() => setOpenDetalle(false)} maxWidth="md" fullWidth>
        <DialogTitle>Detalle de Venta - {ventaDetalle?.numeroVenta}</DialogTitle>
        <DialogContent>
          {ventaDetalle && (
            <>
              {/* Información General */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>Información General</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                  <Typography variant="body2"><strong>Fecha:</strong> {formatDate(ventaDetalle.fecha)}</Typography>
                  <Typography variant="body2"><strong>Vendedor:</strong> {ventaDetalle.vendedor || '-'}</Typography>
                  <Typography variant="body2"><strong>Cliente:</strong> {ventaDetalle.nombreCliente}</Typography>
                  <Typography variant="body2"><strong>Documento:</strong> {ventaDetalle.documentoCliente || '-'}</Typography>
                  <Typography variant="body2">
                    <strong>Estado:</strong>{' '}
                    <Chip 
                      label={ventaDetalle.estado?.toUpperCase()} 
                      size="small" 
                      color={
                        ventaDetalle.estado === 'confirmada' ? 'success' :
                        ventaDetalle.estado === 'pendiente' ? 'warning' :
                        ventaDetalle.estado === 'anulada' ? 'error' : 'default'
                      }
                    />
                  </Typography>
                  <Typography variant="body2">
                    <strong>Momento Cobro:</strong>{' '}
                    {ventaDetalle.momentoCobro === 'anticipado' ? '📥 Anticipado' :
                     ventaDetalle.momentoCobro === 'contra_entrega' ? '🚚 Contra Entrega' :
                     '💳 Diferido'}
                  </Typography>
                </Box>
              </Paper>

              {/* Información Fiscal */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>Información Fiscal</Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Chip 
                    label={ventaDetalle.aplicaIVA ? '✓ Aplica IVA 21%' : '✗ Exento de IVA'} 
                    color={ventaDetalle.aplicaIVA ? 'success' : 'default'}
                    variant="outlined"
                  />
                  {ventaDetalle.requiereFacturaAFIP && (
                    <Chip label="Requiere Factura AFIP" color="info" variant="outlined" />
                  )}
                  {ventaDetalle.facturada && (
                    <Chip label="✓ Facturada" color="success" />
                  )}
                </Box>
              </Paper>

              {/* Estado de Cobranza */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>Estado de Cobranza</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                  <Typography variant="body2">
                    <strong>Estado:</strong>{' '}
                    <Chip 
                      label={ventaDetalle.estadoCobranza || 'pendiente'} 
                      size="small"
                      color={ventaDetalle.estadoCobranza === 'cobrado' ? 'success' : 'warning'}
                    />
                  </Typography>
                  <Typography variant="body2"><strong>Medio de Pago:</strong> {ventaDetalle.medioPago || '-'}</Typography>
                  <Typography variant="body2"><strong>Monto Cobrado:</strong> {formatCurrency(ventaDetalle.montoCobrado || 0)}</Typography>
                  <Typography variant="body2"><strong>Saldo Pendiente:</strong> {formatCurrency(ventaDetalle.saldoPendiente || 0)}</Typography>
                </Box>
              </Paper>

              {ventaDetalle.observaciones && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <strong>Observaciones:</strong> {ventaDetalle.observaciones}
                </Alert>
              )}
              
              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Items ({ventaDetalle.items.length})</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Código</strong></TableCell>
                      <TableCell><strong>Producto</strong></TableCell>
                      <TableCell align="center"><strong>Cant</strong></TableCell>
                      <TableCell align="right"><strong>P. Unit</strong></TableCell>
                      <TableCell align="center"><strong>Dto %</strong></TableCell>
                      <TableCell align="right"><strong>Subtotal</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ventaDetalle.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">{item.codigoProducto}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{item.nombreProducto}</Typography>
                        </TableCell>
                        <TableCell align="center">{item.cantidad}</TableCell>
                        <TableCell align="right">{formatCurrencyDecimals(item.precioUnitario, 3)}</TableCell>
                        <TableCell align="center">
                          {item.porcentajeDescuento ? `${item.porcentajeDescuento}%` : '-'}
                        </TableCell>
                        <TableCell align="right">{formatCurrencyDecimals(item.subtotal, 3)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">Subtotal:</Typography>
                  <Typography variant="body2">{formatCurrencyDecimals(ventaDetalle.subtotal, 3)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">
                    IVA {ventaDetalle.aplicaIVA ? '(21%)' : '(Exento)'}:
                  </Typography>
                  <Typography variant="body2">{formatCurrencyDecimals(ventaDetalle.iva || 0, 3)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: '1px solid', borderColor: 'grey.300' }}>
                  <Typography variant="h6">TOTAL:</Typography>
                  <Typography variant="h6" color="primary">{formatCurrencyDecimals(ventaDetalle.total, 3)}</Typography>
                </Box>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetalle(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Anular */}
      <Dialog open={openAnular} onClose={() => setOpenAnular(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Anular Venta</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            ¿Está seguro de anular la venta <strong>{ventaAnular?.numeroVenta}</strong>?
          </Typography>
          <Typography variant="caption" color="textSecondary" gutterBottom>
            Esta acción restaurará el stock de los productos y revertirá el saldo del cliente.
          </Typography>
          <TextField
            fullWidth
            label="Motivo de anulación *"
            multiline
            rows={3}
            value={motivoAnulacion}
            onChange={(e) => setMotivoAnulacion(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAnular(false)}>Cancelar</Button>
          <Button
            onClick={handleConfirmAnular}
            color="error"
            variant="contained"
            disabled={!motivoAnulacion.trim()}
          >
            Confirmar Anulación
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Editar Venta */}
      <Dialog open={openEditar} onClose={() => setOpenEditar(false)} maxWidth="md" fullWidth>
        <DialogTitle>Editar Venta - {ventaEditar?.numeroVenta}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Puede modificar items, momento de cobro y observaciones en ventas pendientes.
          </Typography>
          {ventaEditar && (
            <>
              {/* Tabla de Items Editables */}
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Items de la Venta</Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Producto</strong></TableCell>
                      <TableCell align="center" sx={{ width: 100 }}><strong>Cantidad</strong></TableCell>
                      <TableCell align="right" sx={{ width: 120 }}><strong>P. Unitario</strong></TableCell>
                      <TableCell align="center" sx={{ width: 100 }}><strong>Dto. %</strong></TableCell>
                      <TableCell align="right" sx={{ width: 120 }}><strong>Subtotal</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ventaEditar.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2">{item.nombreProducto}</Typography>
                          <Typography variant="caption" color="text.secondary">{item.codigoProducto}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <TextField
                            size="small"
                            type="text"
                            value={String(item.cantidad)}
                            onChange={(e) => {
                              // Permitir edición fácil: solo dígitos
                              const raw = e.target.value.replace(/\D/g, '');
                              const nuevaCantidad = raw === '' ? 0 : parseInt(raw, 10);
                              if (nuevaCantidad < 0) return;
                              const nuevosItems = [...ventaEditar.items];
                              const descuento = (nuevaCantidad * item.precioUnitario) * ((item.porcentajeDescuento || 0) / 100);
                              nuevosItems[index] = {
                                ...item,
                                cantidad: nuevaCantidad,
                                subtotal: (nuevaCantidad * item.precioUnitario) - descuento,
                                total: (nuevaCantidad * item.precioUnitario) - descuento,
                                descuento
                              };
                              // Recalcular totales
                              const nuevoSubtotal = nuevosItems.reduce((sum, i) => sum + i.subtotal, 0);
                              const nuevoIVA = ventaEditar.aplicaIVA !== false ? nuevoSubtotal * 0.21 : 0;
                              setVentaEditar({
                                ...ventaEditar,
                                items: nuevosItems,
                                subtotal: nuevoSubtotal,
                                iva: nuevoIVA,
                                total: nuevoSubtotal + nuevoIVA
                              });
                            }}
                            inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', style: { textAlign: 'center' } }}
                            sx={{ width: 80 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            size="small"
                            value={formatCurrencyDecimals(item.precioUnitario, 3)}
                            disabled
                            inputProps={{ style: { textAlign: 'right' } }}
                            sx={{ width: 100 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <TextField
                            size="small"
                            type="text"
                            value={String(item.porcentajeDescuento ?? '')}
                            onChange={(e) => {
                              // Permitir coma o punto como separador decimal y solo dígitos
                              let raw = e.target.value.replace(/[^0-9,\.]/g, '');
                              raw = raw.replace(',', '.');
                              // Mantener solo un punto
                              const parts = raw.split('.');
                              if (parts.length > 2) raw = parts[0] + '.' + parts.slice(1).join('');
                              const nuevoPorcentaje = raw === '' ? 0 : parseFloat(raw);
                              if (nuevoPorcentaje < 0 || nuevoPorcentaje > 100) return;
                              const nuevosItems = [...ventaEditar.items];
                              const descuento = (item.cantidad * item.precioUnitario) * (nuevoPorcentaje / 100);
                              nuevosItems[index] = {
                                ...item,
                                porcentajeDescuento: nuevoPorcentaje,
                                descuento,
                                subtotal: (item.cantidad * item.precioUnitario) - descuento,
                                total: (item.cantidad * item.precioUnitario) - descuento
                              };
                              // Recalcular totales
                              const nuevoSubtotal = nuevosItems.reduce((sum, i) => sum + i.subtotal, 0);
                              const nuevoIVA = ventaEditar.aplicaIVA !== false ? nuevoSubtotal * 0.21 : 0;
                              setVentaEditar({
                                ...ventaEditar,
                                items: nuevosItems,
                                subtotal: nuevoSubtotal,
                                iva: nuevoIVA,
                                total: nuevoSubtotal + nuevoIVA
                              });
                            }}
                            inputProps={{ inputMode: 'decimal', style: { textAlign: 'center' }, placeholder: '0' }}
                            sx={{ width: 80 }}
                            InputProps={{ endAdornment: <Typography variant="caption">%</Typography> }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="bold">
                            {formatCurrencyDecimals(item.subtotal, 3)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Resumen de Totales */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2">
                    Subtotal: <strong>{formatCurrencyDecimals(ventaEditar.subtotal, 3)}</strong>
                  </Typography>
                  <Typography variant="body2">
                    IVA ({ventaEditar.aplicaIVA !== false ? '21%' : '0%'}): <strong>{formatCurrencyDecimals(ventaEditar.iva, 3)}</strong>
                  </Typography>
                  <Typography variant="h6" color="primary">
                    Total: {formatCurrencyDecimals(ventaEditar.total, 3)}
                  </Typography>
                </Box>
              </Box>

              {/* Selector de Momento de Cobro */}
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Momento de Cobro</InputLabel>
                <Select
                  value={ventaEditar.momentoCobro || 'diferido'}
                  onChange={(e) => setVentaEditar({
                    ...ventaEditar,
                    momentoCobro: e.target.value as 'anticipado' | 'contra_entrega' | 'diferido'
                  })}
                  label="Momento de Cobro"
                >
                  <MenuItem value="anticipado">
                    <Box>
                      <Typography variant="body2">📥 Anticipado</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Cobrar ANTES de confirmar venta
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="contra_entrega">
                    <Box>
                      <Typography variant="body2">🚚 Contra Entrega</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Cobrar AL MOMENTO de entregar
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="diferido">
                    <Box>
                      <Typography variant="body2">💳 Diferido (A crédito)</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Cobrar DESPUÉS de confirmar
                      </Typography>
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
              
              {ventaEditar.momentoCobro === 'anticipado' && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  Deberá registrar el cobro ANTES de confirmar la venta
                </Alert>
              )}
              {ventaEditar.momentoCobro === 'contra_entrega' && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  El cobro se registrará junto con la entrega del pedido
                </Alert>
              )}
              {ventaEditar.momentoCobro === 'diferido' && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  Se generará deuda en cuenta corriente al confirmar
                </Alert>
              )}

              <TextField
                fullWidth
                label="Observaciones"
                multiline
                rows={2}
                value={ventaEditar.observaciones || ''}
                onChange={(e) => setVentaEditar({
                  ...ventaEditar,
                  observaciones: e.target.value
                })}
                sx={{ mt: 2 }}
                placeholder="Ingrese observaciones adicionales..."
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditar(false)}>Cancelar</Button>
          <Button
            onClick={handleConfirmEditar}
            color="primary"
            variant="contained"
            disabled={editandoVenta === ventaEditar?._id}
          >
            {editandoVenta === ventaEditar?._id ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Guardando...
              </>
            ) : (
              'Guardar Cambios'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Confirmar Venta */}
      {/* Reemplazado por ConfirmDialog reutilizable */}
      <ConfirmDialog
        open={openConfirmar}
        onClose={() => setOpenConfirmar(false)}
        onConfirm={handleConfirmConfirmar}
        title={`Confirmar Venta ${ventaConfirmar?.numeroVenta || ''}`}
        message={ventaConfirmar ? (
          `Cliente: ${ventaConfirmar.nombreCliente}\n` +
          `Fecha: ${formatDate(ventaConfirmar.fecha)}\n` +
          `Items: ${ventaConfirmar.items.length}\n` +
          `Medio de Pago: ${ventaConfirmar.medioPago || '-'}\n` +
          (ventaConfirmar.momentoCobro ? `Momento de Cobro: ${ventaConfirmar.momentoCobro}` : '') +
          `\nEstado Cobro: ${ventaConfirmar.estadoCobranza || 'pendiente'}\nEstado Entrega: ${ventaConfirmar.estadoEntrega || 'pendiente'}\n\nTotal: ${formatCurrencyDecimals(ventaConfirmar.total, 3)}`
        ) : 'Confirmar esta venta'}
        confirmText={confirmandoVenta === ventaConfirmar?._id ? 'Confirmando...' : 'Confirmar Venta'}
        confirmColor="success"
        severity={puedeConfirmar(ventaConfirmar || ({} as Venta)).puede ? 'question' : 'warning'}
        showAlert={true}
        confirmDisabled={confirmandoVenta === ventaConfirmar?._id || !ventaConfirmar || !puedeConfirmar(ventaConfirmar || ({} as Venta)).puede}
      />
    </Box>
  );
};

export default HistorialVentasPage;
