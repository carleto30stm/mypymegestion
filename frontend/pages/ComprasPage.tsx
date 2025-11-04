import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import {
  Box,
  Button,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  FormControl,
  InputLabel,
  Select,
  Stack,
  Autocomplete
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckIcon,
  LocalShipping as ShippingIcon,
  Payment as PaymentIcon,
  Cancel as CancelIcon,
  Receipt as ReceiptIcon,
  RemoveCircle as RemoveIcon
} from '@mui/icons-material';
import { comprasAPI, proveedoresAPI, materiasPrimasAPI } from '../services/api';
import type { Compra, ItemCompra, Proveedor, MateriaPrima } from '../types';
import { MEDIOS_PAGO_GASTOS, BANCOS } from '../types';

const ComprasPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [materiasPrimas, setMateriasPrimas] = useState<MateriaPrima[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estados para filtros
  const [filtroEstado, setFiltroEstado] = useState<string>('');

  // Estados para diálogos
  const [openDialog, setOpenDialog] = useState(false);
  const [openDetalleDialog, setOpenDetalleDialog] = useState(false);
  const [openRecepcionDialog, setOpenRecepcionDialog] = useState(false);
  const [openPagoDialog, setOpenPagoDialog] = useState(false);
  const [openAnularDialog, setOpenAnularDialog] = useState(false);
  const [compraSeleccionada, setCompraSeleccionada] = useState<Compra | null>(null);
  const [modoEdicion, setModoEdicion] = useState(false);

  // Estados para formulario de compra
  const [formData, setFormData] = useState<Partial<Compra>>({
    fecha: new Date().toISOString().split('T')[0],
    proveedorId: '',
    razonSocialProveedor: '',
    documentoProveedor: '',
    items: [],
    subtotal: 0,
    descuentoTotal: 0,
    iva: 0,
    total: 0,
    estado: 'presupuesto',
    comprador: (user as any)?.nombre || (user as any)?.name || 'Sistema' || '',
    observaciones: ''
  });

  // Estados para agregar items
  const [materiaPrimaSeleccionada, setMateriaPrimaSeleccionada] = useState<MateriaPrima | null>(null);
  const [cantidadItem, setCantidadItem] = useState<number>(0);
  const [precioItem, setPrecioItem] = useState<number>(0);
  const [descuentoItem, setDescuentoItem] = useState<number>(0);

  // Estados para recepción y pago
  const [fechaRecepcion, setFechaRecepcion] = useState<string>(new Date().toISOString().split('T')[0]);
  const [medioPago, setMedioPago] = useState<string>('');
  const [banco, setBanco] = useState<string>('');
  const [detallesPago, setDetallesPago] = useState<string>('');
  const [motivoAnulacion, setMotivoAnulacion] = useState<string>('');

  useEffect(() => {
    cargarDatos();
  }, [filtroEstado]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const filtros = filtroEstado ? { estado: filtroEstado } : {};
      const [comprasData, proveedoresData, materiasData] = await Promise.all([
        comprasAPI.obtenerTodas(filtros),
        proveedoresAPI.obtenerTodos({ estado: 'activo' }),
        materiasPrimasAPI.obtenerTodas({ estado: 'activo' })
      ]);
      setCompras(comprasData);
      setProveedores(proveedoresData);
      setMateriasPrimas(materiasData);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (compra?: Compra) => {
    if (compra) {
      setModoEdicion(true);
      setFormData(compra);
    } else {
      setModoEdicion(false);
      setFormData({
        fecha: new Date().toISOString().split('T')[0],
        proveedorId: '',
        razonSocialProveedor: '',
        documentoProveedor: '',
        items: [],
        subtotal: 0,
        descuentoTotal: 0,
        iva: 0,
        total: 0,
        estado: 'presupuesto',
        comprador: (user as any)?.nombre || (user as any)?.name || 'Sistema' || '',
        observaciones: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setModoEdicion(false);
    setFormData({
      fecha: new Date().toISOString().split('T')[0],
      proveedorId: '',
      razonSocialProveedor: '',
      documentoProveedor: '',
      items: [],
      subtotal: 0,
      descuentoTotal: 0,
      iva: 0,
      total: 0,
      estado: 'presupuesto',
      comprador: (user as any)?.nombre || (user as any)?.name || 'Sistema' || '',
      observaciones: ''
    });
  };

  const handleProveedorChange = (proveedorId: string) => {
    const proveedor = proveedores.find(p => p._id === proveedorId);
    if (proveedor) {
      setFormData({
        ...formData,
        proveedorId: proveedor._id!,
        razonSocialProveedor: proveedor.razonSocial,
        documentoProveedor: proveedor.numeroDocumento
      });
    }
  };

  const agregarItem = () => {
    if (!materiaPrimaSeleccionada || cantidadItem <= 0 || precioItem <= 0) {
      setError('Complete todos los campos del item');
      return;
    }

    const subtotalItem = cantidadItem * precioItem;
    const totalItem = subtotalItem - descuentoItem;

    const nuevoItem: ItemCompra = {
      materiaPrimaId: materiaPrimaSeleccionada._id!,
      codigoMateriaPrima: materiaPrimaSeleccionada.codigo,
      nombreMateriaPrima: materiaPrimaSeleccionada.nombre,
      cantidad: cantidadItem,
      precioUnitario: precioItem,
      subtotal: subtotalItem,
      descuento: descuentoItem,
      total: totalItem
    };

    const nuevosItems = [...(formData.items || []), nuevoItem];
    const nuevoSubtotal = nuevosItems.reduce((sum, item) => sum + item.subtotal, 0);
    const nuevoDescuentoTotal = nuevosItems.reduce((sum, item) => sum + item.descuento, 0);
    const nuevoTotal = nuevoSubtotal - nuevoDescuentoTotal + (formData.iva || 0);

    setFormData({
      ...formData,
      items: nuevosItems,
      subtotal: nuevoSubtotal,
      descuentoTotal: nuevoDescuentoTotal,
      total: nuevoTotal
    });

    // Limpiar campos
    setMateriaPrimaSeleccionada(null);
    setCantidadItem(0);
    setPrecioItem(0);
    setDescuentoItem(0);
    setError(null);
  };

  const eliminarItem = (index: number) => {
    const nuevosItems = formData.items?.filter((_, i) => i !== index) || [];
    const nuevoSubtotal = nuevosItems.reduce((sum, item) => sum + item.subtotal, 0);
    const nuevoDescuentoTotal = nuevosItems.reduce((sum, item) => sum + item.descuento, 0);
    const nuevoTotal = nuevoSubtotal - nuevoDescuentoTotal + (formData.iva || 0);

    setFormData({
      ...formData,
      items: nuevosItems,
      subtotal: nuevoSubtotal,
      descuentoTotal: nuevoDescuentoTotal,
      total: nuevoTotal
    });
  };

  const handleIVAChange = (iva: number) => {
    const nuevoTotal = (formData.subtotal || 0) - (formData.descuentoTotal || 0) + iva;
    setFormData({
      ...formData,
      iva,
      total: nuevoTotal
    });
  };

  const handleSubmit = async () => {
    try {
      if (!formData.proveedorId || !formData.items || formData.items.length === 0) {
        setError('Debe seleccionar un proveedor y agregar al menos un item');
        return;
      }

      setLoading(true);

      if (modoEdicion && formData._id) {
        await comprasAPI.actualizar(formData._id, formData);
        setSuccess('Compra actualizada exitosamente');
      } else {
        await comprasAPI.crear(formData);
        setSuccess('Compra creada exitosamente');
      }

      handleCloseDialog();
      cargarDatos();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar compra');
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalle = (compra: Compra) => {
    setCompraSeleccionada(compra);
    setOpenDetalleDialog(true);
  };

  const handleCambiarEstado = async (compraId: string, nuevoEstado: string) => {
    try {
      setLoading(true);
      await comprasAPI.cambiarEstado(compraId, nuevoEstado);
      setSuccess(`Estado actualizado a: ${nuevoEstado}`);
      cargarDatos();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cambiar estado');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarRecepcion = async () => {
    try {
      if (!compraSeleccionada?._id) return;
      
      setLoading(true);
      await comprasAPI.confirmarRecepcion(compraSeleccionada._id, { fechaRecepcion });
      setSuccess('Recepción confirmada y stock actualizado');
      setOpenRecepcionDialog(false);
      setOpenDetalleDialog(false);
      cargarDatos();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al confirmar recepción');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarPago = async () => {
    try {
      if (!compraSeleccionada?._id || !medioPago) {
        setError('Complete todos los campos requeridos');
        return;
      }
      
      setLoading(true);
      await comprasAPI.confirmarPago(compraSeleccionada._id, {
        medioPago,
        banco,
        detallesPago
      });
      setSuccess('Pago registrado exitosamente');
      setOpenPagoDialog(false);
      setOpenDetalleDialog(false);
      cargarDatos();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al confirmar pago');
    } finally {
      setLoading(false);
    }
  };

  const handleAnular = async () => {
    try {
      if (!compraSeleccionada?._id || !motivoAnulacion) {
        setError('Debe indicar el motivo de anulación');
        return;
      }
      
      setLoading(true);
      await comprasAPI.anular(compraSeleccionada._id, motivoAnulacion);
      setSuccess('Compra anulada exitosamente');
      setOpenAnularDialog(false);
      setOpenDetalleDialog(false);
      cargarDatos();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al anular compra');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (compraId: string) => {
    if (!window.confirm('¿Está seguro de eliminar esta compra?')) return;
    
    try {
      setLoading(true);
      await comprasAPI.eliminar(compraId);
      setSuccess('Compra eliminada exitosamente');
      cargarDatos();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al eliminar compra');
    } finally {
      setLoading(false);
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pagado': return 'success';
      case 'recibido': return 'info';
      case 'pedido': return 'warning';
      case 'presupuesto': return 'default';
      case 'parcial': return 'warning';
      case 'anulado': return 'error';
      default: return 'default';
    }
  };

  const comprasFiltradas = compras.filter(c => {
    if (filtroEstado && c.estado !== filtroEstado) return false;
    return true;
  });

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Gestión de Compras</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Nueva Compra
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Estado</InputLabel>
              <Select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                label="Estado"
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="presupuesto">Presupuesto</MenuItem>
                <MenuItem value="pedido">Pedido</MenuItem>
                <MenuItem value="parcial">Parcial</MenuItem>
                <MenuItem value="recibido">Recibido</MenuItem>
                <MenuItem value="pagado">Pagado</MenuItem>
                <MenuItem value="anulado">Anulado</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabla de compras */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>N° Compra</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Proveedor</TableCell>
              <TableCell>Items</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {comprasFiltradas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No hay compras registradas
                </TableCell>
              </TableRow>
            ) : (
              comprasFiltradas.map((compra) => (
                <TableRow key={compra._id}>
                  <TableCell>{compra.numeroCompra || 'N/A'}</TableCell>
                  <TableCell>{new Date(compra.fecha).toLocaleDateString()}</TableCell>
                  <TableCell>{compra.razonSocialProveedor}</TableCell>
                  <TableCell>{compra.items.length}</TableCell>
                  <TableCell align="right">${compra.total.toFixed(2)}</TableCell>
                  <TableCell>
                    <Chip
                      label={compra.estado}
                      color={getEstadoColor(compra.estado) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Ver Detalle">
                      <IconButton size="small" onClick={() => handleVerDetalle(compra)}>
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    {compra.estado === 'presupuesto' && (
                      <>
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => handleOpenDialog(compra)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar">
                          <IconButton size="small" onClick={() => handleEliminar(compra._id!)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog: Crear/Editar Compra */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {modoEdicion ? 'Editar Compra' : 'Nueva Compra'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Fecha"
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Proveedor *</InputLabel>
                <Select
                  value={formData.proveedorId}
                  onChange={(e) => handleProveedorChange(e.target.value)}
                  label="Proveedor *"
                >
                  {proveedores.map((p) => (
                    <MenuItem key={p._id} value={p._id}>
                      {p.razonSocial}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="subtitle2">Items de Compra</Typography>
              </Divider>
            </Grid>

            {/* Agregar Items */}
            <Grid item xs={12} md={4}>
              <Autocomplete
                options={materiasPrimas}
                getOptionLabel={(option) => `${option.codigo} - ${option.nombre}`}
                value={materiaPrimaSeleccionada}
                onChange={(_, value) => {
                  setMateriaPrimaSeleccionada(value);
                  if (value) {
                    setPrecioItem(value.precioPromedio || 0);
                  }
                }}
                renderInput={(params) => <TextField {...params} label="Materia Prima" />}
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField
                fullWidth
                label="Cantidad"
                type="number"
                value={cantidadItem}
                onChange={(e) => setCantidadItem(parseFloat(e.target.value))}
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField
                fullWidth
                label="Precio Unit."
                type="number"
                value={precioItem}
                onChange={(e) => setPrecioItem(parseFloat(e.target.value))}
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField
                fullWidth
                label="Descuento"
                type="number"
                value={descuentoItem}
                onChange={(e) => setDescuentoItem(parseFloat(e.target.value))}
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <Button
                fullWidth
                variant="contained"
                onClick={agregarItem}
                sx={{ height: '100%' }}
              >
                Agregar
              </Button>
            </Grid>

            {/* Lista de Items */}
            <Grid item xs={12}>
              <List>
                {formData.items?.map((item, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={`${item.nombreMateriaPrima} - ${item.cantidad} unidades`}
                      secondary={`Precio: $${item.precioUnitario.toFixed(2)} | Subtotal: $${item.subtotal.toFixed(2)} | Desc: $${item.descuento.toFixed(2)} | Total: $${item.total.toFixed(2)}`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" onClick={() => eliminarItem(index)}>
                        <RemoveIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Grid>

            {/* Totales */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography>Subtotal:</Typography>
                    </Grid>
                    <Grid item xs={6} sx={{ textAlign: 'right' }}>
                      <Typography>${formData.subtotal?.toFixed(2) || '0.00'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography>Descuento Total:</Typography>
                    </Grid>
                    <Grid item xs={6} sx={{ textAlign: 'right' }}>
                      <Typography>${formData.descuentoTotal?.toFixed(2) || '0.00'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="IVA"
                        type="number"
                        value={formData.iva || 0}
                        onChange={(e) => handleIVAChange(parseFloat(e.target.value) || 0)}
                      />
                    </Grid>
                    <Grid item xs={6} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                      <Typography variant="h6">Total: ${formData.total?.toFixed(2) || '0.00'}</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Observaciones"
                multiline
                rows={2}
                value={formData.observaciones || ''}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading || !formData.proveedorId || !formData.items || formData.items.length === 0}
          >
            {modoEdicion ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Ver Detalle */}
      <Dialog open={openDetalleDialog} onClose={() => setOpenDetalleDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Detalle de Compra {compraSeleccionada?.numeroCompra}
        </DialogTitle>
        <DialogContent>
          {compraSeleccionada && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>Información General</Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={6}><Typography variant="body2">Fecha:</Typography></Grid>
                      <Grid item xs={6}><Typography variant="body2">{new Date(compraSeleccionada.fecha).toLocaleDateString()}</Typography></Grid>
                      
                      <Grid item xs={6}><Typography variant="body2">Proveedor:</Typography></Grid>
                      <Grid item xs={6}><Typography variant="body2">{compraSeleccionada.razonSocialProveedor}</Typography></Grid>
                      
                      <Grid item xs={6}><Typography variant="body2">Estado:</Typography></Grid>
                      <Grid item xs={6}>
                        <Chip label={compraSeleccionada.estado} color={getEstadoColor(compraSeleccionada.estado) as any} size="small" />
                      </Grid>
                      
                      <Grid item xs={6}><Typography variant="body2">Comprador:</Typography></Grid>
                      <Grid item xs={6}><Typography variant="body2">{compraSeleccionada.comprador}</Typography></Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>Items</Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Materia Prima</TableCell>
                        <TableCell align="right">Cantidad</TableCell>
                        <TableCell align="right">Precio Unit.</TableCell>
                        <TableCell align="right">Subtotal</TableCell>
                        <TableCell align="right">Descuento</TableCell>
                        <TableCell align="right">Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {compraSeleccionada.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.nombreMateriaPrima}</TableCell>
                          <TableCell align="right">{item.cantidad}</TableCell>
                          <TableCell align="right">${item.precioUnitario.toFixed(2)}</TableCell>
                          <TableCell align="right">${item.subtotal.toFixed(2)}</TableCell>
                          <TableCell align="right">${item.descuento.toFixed(2)}</TableCell>
                          <TableCell align="right">${item.total.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Grid container spacing={1}>
                      <Grid item xs={6}><Typography>Subtotal:</Typography></Grid>
                      <Grid item xs={6} sx={{ textAlign: 'right' }}>
                        <Typography>${compraSeleccionada.subtotal.toFixed(2)}</Typography>
                      </Grid>
                      <Grid item xs={6}><Typography>Descuento:</Typography></Grid>
                      <Grid item xs={6} sx={{ textAlign: 'right' }}>
                        <Typography>${compraSeleccionada.descuentoTotal.toFixed(2)}</Typography>
                      </Grid>
                      <Grid item xs={6}><Typography>IVA:</Typography></Grid>
                      <Grid item xs={6} sx={{ textAlign: 'right' }}>
                        <Typography>${compraSeleccionada.iva.toFixed(2)}</Typography>
                      </Grid>
                      <Grid item xs={6}><Typography variant="h6">Total:</Typography></Grid>
                      <Grid item xs={6} sx={{ textAlign: 'right' }}>
                        <Typography variant="h6">${compraSeleccionada.total.toFixed(2)}</Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {compraSeleccionada.observaciones && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    <Typography variant="body2"><strong>Observaciones:</strong> {compraSeleccionada.observaciones}</Typography>
                  </Alert>
                </Grid>
              )}

              {/* Acciones según estado */}
              <Grid item xs={12}>
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  {compraSeleccionada.estado === 'presupuesto' && (
                    <Button
                      variant="contained"
                      startIcon={<CheckIcon />}
                      onClick={() => handleCambiarEstado(compraSeleccionada._id!, 'pedido')}
                    >
                      Confirmar Pedido
                    </Button>
                  )}
                  
                  {(compraSeleccionada.estado === 'pedido' || compraSeleccionada.estado === 'parcial') && (
                    <Button
                      variant="contained"
                      color="info"
                      startIcon={<ShippingIcon />}
                      onClick={() => {
                        setOpenRecepcionDialog(true);
                        setFechaRecepcion(new Date().toISOString().split('T')[0]);
                      }}
                    >
                      Confirmar Recepción
                    </Button>
                  )}
                  
                  {compraSeleccionada.estado === 'recibido' && (
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<PaymentIcon />}
                      onClick={() => {
                        setOpenPagoDialog(true);
                        setMedioPago('');
                        setBanco('');
                        setDetallesPago('');
                      }}
                    >
                      Registrar Pago
                    </Button>
                  )}
                  
                  {(compraSeleccionada.estado === 'presupuesto' || compraSeleccionada.estado === 'pedido') && (
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<CancelIcon />}
                      onClick={() => {
                        setOpenAnularDialog(true);
                        setMotivoAnulacion('');
                      }}
                    >
                      Anular
                    </Button>
                  )}
                </Stack>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetalleDialog(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Confirmar Recepción */}
      <Dialog open={openRecepcionDialog} onClose={() => setOpenRecepcionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirmar Recepción</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Al confirmar la recepción, se actualizará el stock de las materias primas
          </Alert>
          <TextField
            fullWidth
            label="Fecha de Recepción"
            type="date"
            value={fechaRecepcion}
            onChange={(e) => setFechaRecepcion(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRecepcionDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleConfirmarRecepcion}>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Registrar Pago */}
      <Dialog open={openPagoDialog} onClose={() => setOpenPagoDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Registrar Pago</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Se creará un gasto asociado a esta compra
          </Alert>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Medio de Pago</InputLabel>
                <Select
                  value={medioPago}
                  onChange={(e) => setMedioPago(e.target.value)}
                  label="Medio de Pago"
                >
                  {MEDIOS_PAGO_GASTOS.map((mp) => (
                    <MenuItem key={mp} value={mp}>{mp}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {medioPago && medioPago !== 'CHEQUE TERCERO' && (
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Caja/Banco *</InputLabel>
                  <Select
                    value={banco}
                    onChange={(e) => setBanco(e.target.value)}
                    label="Caja/Banco *"
                  >
                    {BANCOS.map((b) => (
                      <MenuItem key={b} value={b}>{b}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Detalles del Pago"
                multiline
                rows={2}
                value={detallesPago}
                onChange={(e) => setDetallesPago(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPagoDialog(false)}>Cancelar</Button>
          <Button 
            variant="contained" 
            onClick={handleConfirmarPago} 
            disabled={!medioPago || (medioPago !== 'CHEQUE TERCERO' && !banco)}
          >
            Registrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Anular Compra */}
      <Dialog open={openAnularDialog} onClose={() => setOpenAnularDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Anular Compra</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Esta acción no se puede deshacer
          </Alert>
          <TextField
            fullWidth
            required
            label="Motivo de Anulación"
            multiline
            rows={3}
            value={motivoAnulacion}
            onChange={(e) => setMotivoAnulacion(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAnularDialog(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleAnular}
            disabled={!motivoAnulacion}
          >
            Anular
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ComprasPage;
