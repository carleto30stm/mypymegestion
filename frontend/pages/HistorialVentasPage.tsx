import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { AppDispatch, RootState } from '../redux/store';
import { fetchVentas, anularVenta, confirmarVenta, updateVenta } from '../redux/slices/ventasSlice';
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
  CircularProgress
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  Visibility as ViewIcon,
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { formatCurrency, formatDate } from '../utils/formatters';

const HistorialVentasPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { items: ventas, status } = useSelector((state: RootState) => state.ventas);
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

  useEffect(() => {
    dispatch(fetchVentas());
    dispatch(fetchFacturas({}));
  }, [dispatch]);

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

  const handleConfirmAnular = async () => {
    if (!ventaAnular || !motivoAnulacion.trim()) {
      alert('Debe ingresar un motivo');
      return;
    }

    await dispatch(anularVenta({ id: ventaAnular._id!, motivoAnulacion }));
    setOpenAnular(false);
    setVentaAnular(null);
    setMotivoAnulacion('');
    dispatch(fetchVentas());
  };

  const handleConfirmarVenta = async (ventaId: string) => {
    if (!user?.username) {
      alert('Error: Usuario no identificado');
      return;
    }

    setConfirmandoVenta(ventaId);
    try {
      await dispatch(confirmarVenta({ id: ventaId, usuarioConfirmacion: user.username })).unwrap();
      dispatch(fetchVentas());
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
      dispatch(fetchVentas());
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
    
    // Navegar a VentasPage con los datos de la venta para editar
    navigate('/ventas', { state: { ventaParaEditar: venta } });
  };

  const handleConfirmEditar = async () => {
    if (!ventaEditar) return;

    setEditandoVenta(ventaEditar._id!);
    try {
      // Por ahora solo permitir editar observaciones
      // En una implementación completa se podría editar items, cliente, etc.
      await dispatch(updateVenta({ 
        id: ventaEditar._id!, 
        ventaData: {
          observaciones: ventaEditar.observaciones
        }
      })).unwrap();
      
      setOpenEditar(false);
      setVentaEditar(null);
      dispatch(fetchVentas());
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

    if (venta.momentoCobro === 'contra_entrega') {
      // Contra entrega requiere cobro Y entrega simultáneos
      if (venta.estadoCobranza !== 'cobrado') {
        return { 
          puede: false, 
          razon: 'Venta contra entrega requiere cobro registrado. Debe registrar el cobro junto con la entrega.' 
        };
      }
      if (venta.estadoEntrega !== 'entregado') {
        return { 
          puede: false, 
          razon: 'Venta contra entrega requiere entrega completada. Debe marcar la entrega junto con el cobro.' 
        };
      }
    }

    // Ventas diferidas (a crédito) pueden confirmarse sin cobro previo
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

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>N° Venta</strong></TableCell>
              <TableCell><strong>Fecha</strong></TableCell>
              <TableCell><strong>Cliente</strong></TableCell>
              <TableCell align="center"><strong>Items</strong></TableCell>
              <TableCell align="right"><strong>Total</strong></TableCell>
              <TableCell><strong>Medio Pago</strong></TableCell>
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
                <TableCell align="center">{venta.items.length}</TableCell>
                <TableCell align="right">
                  <Typography fontWeight="bold">{formatCurrency(venta.total)}</Typography>
                </TableCell>
                <TableCell>
                  <Chip label={venta.medioPago} size="small" />
                  {venta.banco && (
                    <Typography variant="caption" display="block">{venta.banco}</Typography>
                  )}
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

      {/* Dialog Detalle */}
      <Dialog open={openDetalle} onClose={() => setOpenDetalle(false)} maxWidth="md" fullWidth>
        <DialogTitle>Detalle de Venta - {ventaDetalle?.numeroVenta}</DialogTitle>
        <DialogContent>
          {ventaDetalle && (
            <>
              <Typography variant="body2" gutterBottom><strong>Fecha:</strong> {formatDate(ventaDetalle.fecha)}</Typography>
              <Typography variant="body2" gutterBottom><strong>Estado:</strong> {ventaDetalle.estado}</Typography>
              <Typography variant="body2" gutterBottom><strong>Medio de Pago:</strong> {ventaDetalle.medioPago}</Typography>
              {ventaDetalle.observaciones && (
                <Typography variant="body2" gutterBottom><strong>Observaciones:</strong> {ventaDetalle.observaciones}</Typography>
              )}
              
              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Items</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Producto</strong></TableCell>
                      <TableCell align="center"><strong>Cant</strong></TableCell>
                      <TableCell align="right"><strong>P. Unit</strong></TableCell>
                      <TableCell align="right"><strong>Subtotal</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ventaDetalle.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Typography variant="body2">{item.nombreProducto}</Typography>
                          <Typography variant="caption">{item.codigoProducto}</Typography>
                        </TableCell>
                        <TableCell align="center">{item.cantidad}</TableCell>
                        <TableCell align="right">{formatCurrency(item.precioUnitario)}</TableCell>
                        <TableCell align="right">{formatCurrency(item.subtotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <Typography><strong>Subtotal:</strong> {formatCurrency(ventaDetalle.subtotal)}</Typography>
                <Typography><strong>IVA:</strong> {formatCurrency(ventaDetalle.iva)}</Typography>
                <Typography variant="h6" color="primary"><strong>TOTAL:</strong> {formatCurrency(ventaDetalle.total)}</Typography>
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
      <Dialog open={openEditar} onClose={() => setOpenEditar(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Venta - {ventaEditar?.numeroVenta}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Solo se pueden editar observaciones en ventas pendientes.
          </Typography>
          {ventaEditar && (
            <TextField
              fullWidth
              label="Observaciones"
              multiline
              rows={3}
              value={ventaEditar.observaciones || ''}
              onChange={(e) => setVentaEditar({
                ...ventaEditar,
                observaciones: e.target.value
              })}
              sx={{ mt: 2 }}
              placeholder="Ingrese observaciones adicionales..."
            />
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
      <Dialog
        open={openConfirmar}
        onClose={() => setOpenConfirmar(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircleIcon color="success" />
          Confirmar Venta
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom sx={{ mb: 2 }}>
            ¿Estás seguro de que deseas confirmar la venta <strong>{ventaConfirmar?.numeroVenta}</strong>?
          </Typography>
          <Typography variant="caption" color="textSecondary" gutterBottom>
            Esta acción confirmará la venta, actualizará el stock de productos y afectará el saldo del cliente.
          </Typography>

          {ventaConfirmar && (() => {
            const validacion = puedeConfirmar(ventaConfirmar);
            return (
              <>
                {/* Alerta de validación si NO puede confirmar */}
                {!validacion.puede && (
                  <Box sx={{ mt: 2, mb: 2 }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        bgcolor: 'error.light', 
                        color: 'error.contrastText',
                        p: 2, 
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'error.main'
                      }}
                    >
                      ⚠️ <strong>No se puede confirmar:</strong> {validacion.razon}
                    </Typography>
                  </Box>
                )}

                {/* Detalle de la venta */}
                <Box sx={{
                  bgcolor: 'background.default',
                  p: 2,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  mt: 2
                }}>
                  <Typography variant="body2" gutterBottom>
                    <strong>Cliente:</strong> {ventaConfirmar.nombreCliente}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Fecha:</strong> {formatDate(ventaConfirmar.fecha)}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Items:</strong> {ventaConfirmar.items.length}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Medio de Pago:</strong> {ventaConfirmar.medioPago}
                  </Typography>
                  {ventaConfirmar.momentoCobro && (
                    <Typography variant="body2" gutterBottom>
                      <strong>Momento de Cobro:</strong> {
                        ventaConfirmar.momentoCobro === 'anticipado' ? '📥 Anticipado' :
                        ventaConfirmar.momentoCobro === 'contra_entrega' ? '🚚 Contra Entrega' :
                        '💳 Diferido (A crédito)'
                      }
                    </Typography>
                  )}
                  <Typography variant="body2" gutterBottom>
                    <strong>Estado Cobro:</strong> {ventaConfirmar.estadoCobranza || 'pendiente'}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Estado Entrega:</strong> {ventaConfirmar.estadoEntrega || 'pendiente'}
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      color: 'success.main',
                      mt: 1
                    }}
                  >
                    <strong>Total:</strong> {formatCurrency(ventaConfirmar.total)}
                  </Typography>
                </Box>
              </>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setOpenConfirmar(false)}
            variant="outlined"
            color="inherit"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmConfirmar}
            variant="contained"
            color="success"
            startIcon={<CheckCircleIcon />}
            disabled={
              confirmandoVenta === ventaConfirmar?._id || 
              !ventaConfirmar ||
              !puedeConfirmar(ventaConfirmar).puede
            }
            autoFocus
          >
            {confirmandoVenta === ventaConfirmar?._id ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Confirmando...
              </>
            ) : (
              'Confirmar Venta'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HistorialVentasPage;
