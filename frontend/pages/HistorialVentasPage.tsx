import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import { fetchVentas, anularVenta, confirmarVenta } from '../redux/slices/ventasSlice';
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
  Description as DescriptionIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { formatCurrency, formatDate } from '../utils/formatters';

const HistorialVentasPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: ventas, status } = useSelector((state: RootState) => state.ventas);
  const { items: facturas } = useSelector((state: RootState) => state.facturas);
  const { user } = useSelector((state: RootState) => state.auth);

  const [openDetalle, setOpenDetalle] = useState(false);
  const [ventaDetalle, setVentaDetalle] = useState<Venta | null>(null);
  const [openAnular, setOpenAnular] = useState(false);
  const [ventaAnular, setVentaAnular] = useState<Venta | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [facturandoVenta, setFacturandoVenta] = useState<string | null>(null);
  const [confirmandoVenta, setConfirmandoVenta] = useState<string | null>(null);

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

  const handleFacturar = async (ventaId: string) => {
    setFacturandoVenta(ventaId);
    try {
      await dispatch(crearFacturaDesdeVenta(ventaId)).unwrap();
      alert('Factura creada exitosamente');
      dispatch(fetchFacturas({}));
    } catch (err: any) {
      alert(err.message || 'Error al crear la factura');
    } finally {
      setFacturandoVenta(null);
    }
  };

  const getFacturaByVentaId = (ventaId: string) => {
    return facturas.find((f) => f.ventaId === ventaId);
  };

  const canAnular = user?.userType === 'admin';
  const canConfirm = user?.userType === 'admin' || user?.userType === 'oper_ad';

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
              <TableCell align="center"><strong>Factura</strong></TableCell>
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
                  <Chip
                    label={venta.estado.toUpperCase()}
                    color={venta.estado === 'confirmada' ? 'success' : venta.estado === 'anulada' ? 'error' : 'warning'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  {(() => {
                    const factura = getFacturaByVentaId(venta._id!);
                    if (factura) {
                      return (
                        <Chip
                          label={factura.estado.toUpperCase()}
                          color={
                            factura.estado === 'autorizada'
                              ? 'success'
                              : factura.estado === 'borrador'
                              ? 'default'
                              : 'error'
                          }
                          size="small"
                        />
                      );
                    }
                    return <Typography variant="body2" color="text.secondary">-</Typography>;
                  })()}
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                    {canConfirm && venta.estado === 'pendiente' && (
                      <Tooltip title="Confirmar Venta">
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handleConfirmarVenta(venta._id!)}
                          disabled={confirmandoVenta === venta._id}
                        >
                          {confirmandoVenta === venta._id ? (
                            <CircularProgress size={20} />
                          ) : (
                            <CheckCircleIcon fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>
                    )}

                    <Tooltip title="Ver Detalle">
                      <IconButton size="small" onClick={() => handleVerDetalle(venta)}>
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    
                    {venta.estado === 'confirmada' && !getFacturaByVentaId(venta._id!) && (
                      <Tooltip title="Crear Factura">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleFacturar(venta._id!)}
                          disabled={facturandoVenta === venta._id}
                        >
                          {facturandoVenta === venta._id ? (
                            <CircularProgress size={20} />
                          ) : (
                            <DescriptionIcon fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>
                    )}

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
    </Box>
  );
};

export default HistorialVentasPage;
