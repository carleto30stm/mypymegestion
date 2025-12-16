import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppDispatch, RootState } from '../redux/store';
import { fetchProductos } from '../redux/slices/productosSlice';
import { fetchClientesActivos } from '../redux/slices/clientesSlice';
import { createVenta, updateVenta } from '../redux/slices/ventasSlice';
import { crearFacturaDesdeVenta } from '../redux/slices/facturasSlice';
import { Producto, ItemVenta, Cliente, Venta } from '../types';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Autocomplete,
  Grid,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Chip,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import {
  PointOfSale as PosIcon,
  Delete as DeleteIcon,
  ShoppingCart as CartIcon,
  Receipt as ReceiptIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { formatCurrency, formatNumberInput, getNumericValue, formatCurrencyDecimals } from '../utils/formatters';
import { ConfirmDialog } from '../components/modal';

const VentasPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  const navigate = useNavigate();
  const { items: productos } = useSelector((state: RootState) => state.productos);
  const { clientesActivos } = useSelector((state: RootState) => state.clientes);
  const { user } = useSelector((state: RootState) => state.auth);

  // Detectar si se está editando una venta
  const ventaParaEditar = location.state?.ventaParaEditar as Venta | undefined;
  const esEdicion = !!ventaParaEditar;

  const [carrito, setCarrito] = useState<ItemVenta[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [cantidad, setCantidad] = useState<number>(1);
  const [clienteId, setClienteId] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');
  const [error, setError] = useState<string>('');
  // Estado para controlar si esta venta específica aplica IVA
  const [aplicaIVAVenta, setAplicaIVAVenta] = useState<boolean>(true);
  // Estado para momento de cobro
  const [momentoCobro, setMomentoCobro] = useState<'anticipado' | 'contra_entrega' | 'diferido'>('diferido');
  // Diálogos de confirmación
  const [openConfirmVenta, setOpenConfirmVenta] = useState(false);
  const [openConfirmCancelar, setOpenConfirmCancelar] = useState(false);
  // Estados para diálogos de resultado
  const [openSuccessDialog, setOpenSuccessDialog] = useState(false);
  const [successDialogMessage, setSuccessDialogMessage] = useState<string>('');
  const [navigateAfterSuccess, setNavigateAfterSuccess] = useState(false);
  const [openErrorDialog, setOpenErrorDialog] = useState(false);
  const [errorDialogMessage, setErrorDialogMessage] = useState<string>('');

  useEffect(() => {
    dispatch(fetchProductos());
    dispatch(fetchClientesActivos());
  }, [dispatch]);

  // Inicializar formulario si es edición
  useEffect(() => {
    if (ventaParaEditar) {
      setCarrito(ventaParaEditar.items || []);
      setClienteId(ventaParaEditar.clienteId || '');
      setObservaciones(ventaParaEditar.observaciones || '');
      setAplicaIVAVenta(ventaParaEditar.aplicaIVA !== undefined ? ventaParaEditar.aplicaIVA : true);
      setMomentoCobro(ventaParaEditar.momentoCobro || 'diferido');
    }
  }, [ventaParaEditar]);

  // Actualizar sugerencia de IVA cuando cambia el cliente seleccionado (solo para nuevas ventas)
  useEffect(() => {
    if (clienteId && !esEdicion) {
      const clienteSeleccionado = clientesActivos.find(c => c._id === clienteId);
      // Sugerir el IVA del cliente, pero el usuario puede cambiarlo
      setAplicaIVAVenta(clienteSeleccionado?.aplicaIVA !== false);
    }
  }, [clienteId, clientesActivos, esEdicion]);

  const productosActivos = productos.filter(p => p.estado === 'activo');

  const agregarAlCarrito = () => {
    if (!productoSeleccionado) return;
    
    if (cantidad <= 0 || cantidad > productoSeleccionado.stock) {
      setError(`Stock disponible: ${productoSeleccionado.stock}`);
      return;
    }

    const itemExistente = carrito.find(i => i.productoId === productoSeleccionado._id);
    
    if (itemExistente) {
      const nuevaCantidad = itemExistente.cantidad + cantidad;
      if (nuevaCantidad > productoSeleccionado.stock) {
        setError(`Stock máximo disponible: ${productoSeleccionado.stock}`);
        return;
      }
      setCarrito(carrito.map(i => 
        i.productoId === productoSeleccionado._id 
          ? { 
              ...i, 
              cantidad: nuevaCantidad,
              subtotal: (nuevaCantidad * i.precioUnitario) * (1 - ((i.porcentajeDescuento || 0) / 100)),
              total: (nuevaCantidad * i.precioUnitario) * (1 - ((i.porcentajeDescuento || 0) / 100)),
              descuento: (nuevaCantidad * i.precioUnitario) * ((i.porcentajeDescuento || 0) / 100)
            }
          : i
      ));
    } else {
      const nuevoItem: ItemVenta = {
        productoId: productoSeleccionado._id!,
        codigoProducto: productoSeleccionado.codigo,
        nombreProducto: productoSeleccionado.nombre,
        cantidad,
        precioUnitario: productoSeleccionado.precioVenta,
        subtotal: cantidad * productoSeleccionado.precioVenta,
        descuento: 0,
        total: cantidad * productoSeleccionado.precioVenta,
        porcentajeDescuento: 0
      };
      setCarrito([...carrito, nuevoItem]);
    }

    setProductoSeleccionado(null);
    setCantidad(1);
    setError('');
  };

  const eliminarDelCarrito = (productoId: string) => {
    setCarrito(carrito.filter(i => i.productoId !== productoId));
  };

  const actualizarDescuentoItem = (productoId: string, porcentajeStr: string) => {
    // Permitir que el usuario escriba mientras edita
    const porcentaje = porcentajeStr === '' ? 0 : parseFloat(porcentajeStr.replace(',', '.'));
    
    // Validar que el porcentaje esté entre 0 y 100
    const porcentajeValido = Math.max(0, Math.min(100, porcentaje || 0));
    
    const carritoActualizado = carrito.map(item => {
      if (item.productoId === productoId) {
        const subtotalSinDescuento = item.precioUnitario * item.cantidad;
        const montoDescuento = (subtotalSinDescuento * porcentajeValido) / 100;
        const subtotalConDescuento = subtotalSinDescuento - montoDescuento;
        
        return {
          ...item,
          descuento: montoDescuento, // Guardamos el monto del descuento
          subtotal: subtotalConDescuento,
          total: subtotalConDescuento,
          porcentajeDescuento: porcentajeValido // Guardamos también el porcentaje para mostrarlo
        };
      }
      return item;
    });
    
    setCarrito(carritoActualizado);
  };

  const calcularTotales = () => {
    const subtotal = carrito.reduce((sum, item) => sum + item.subtotal, 0);
    
    // Buscar el cliente seleccionado (para info adicional)
    const clienteSeleccionado = clientesActivos.find(c => c._id === clienteId);
    
    // Usar el estado local de IVA (decisión por venta, no por cliente)
    const iva = aplicaIVAVenta ? subtotal * 0.21 : 0;
    const total = subtotal + iva;
    
    return { subtotal, iva, total, aplicaIVA: aplicaIVAVenta, clienteSeleccionado };
  };

  const handleConfirmarVenta = () => {
    if (carrito.length === 0) {
      setError('Debe agregar al menos un producto');
      return;
    }

    if (!clienteId) {
      setError('Debe seleccionar un cliente');
      return;
    }

    // Abrir diálogo de confirmación
    setOpenConfirmVenta(true);
  };

  const submitVenta = async () => {
    const totales = calcularTotales();

    const nuevaVenta: any = {
      clienteId,
      items: carrito,
      subtotal: totales.subtotal,
      descuentoTotal: 0,
      iva: totales.iva,
      total: totales.total,
      observaciones: observaciones || undefined,
      vendedor: user?.username || 'sistema',
      aplicaIVA: aplicaIVAVenta,
      momentoCobro: momentoCobro,
      requiereFacturaAFIP: totales.clienteSeleccionado?.requiereFacturaAFIP || false
    };

    try {
      if (esEdicion && ventaParaEditar) {
        await dispatch(updateVenta({ id: ventaParaEditar._id!, ventaData: nuevaVenta })).unwrap();
        // Mostrar diálogo de éxito y navegar al cerrar
        setSuccessDialogMessage('Venta actualizada exitosamente');
        setNavigateAfterSuccess(true);
        setOpenSuccessDialog(true);
        return;
      } else {
        await dispatch(createVenta(nuevaVenta)).unwrap();
        // Mostrar diálogo de éxito (permite al usuario decidir si navegar o permanecer)
        setSuccessDialogMessage('Venta registrada exitosamente. Puede facturarla desde la página de Facturas.');
        setNavigateAfterSuccess(false);
        setOpenSuccessDialog(true);

        // Limpiar formulario
        setCarrito([]);
        setClienteId('');
        setObservaciones('');
        setAplicaIVAVenta(true);
        setMomentoCobro('diferido');
        setError('');
        dispatch(fetchProductos());
      }
    } catch (err: any) {
      const msg = err?.message || 'Error al registrar la venta';
      setError(msg);
      setErrorDialogMessage(msg);
      setOpenErrorDialog(true);
    }
  };

  const handleCancelar = () => {
    const hasChanges = carrito.length > 0 || clienteId !== '' || observaciones !== '';
    if (hasChanges || esEdicion) {
      setOpenConfirmCancelar(true);
      return;
    }

    if (esEdicion) {
      navigate('/historial-ventas');
    } else {
      setCarrito([]);
      setClienteId('');
      setObservaciones('');
      setError('');
    }
  };

  const totales = calcularTotales();

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <PosIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
        <Typography variant="h4">
          {esEdicion ? `Editar Venta #${ventaParaEditar?.numeroVenta || ventaParaEditar?._id?.slice(-6)}` : 'Punto de Venta'}
        </Typography>
      </Box>

      {esEdicion && (
        <Box sx={{ mb: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/historial-ventas')}
            variant="outlined"
            size="small"
          >
            Volver al Historial
          </Button>
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>Seleccionar Producto</Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
              <Autocomplete
                sx={{ flex: 1 }}
                options={productosActivos}
                getOptionLabel={(p) => `${p.codigo} - ${p.nombre} (Stock: ${p.stock})`}
                value={productoSeleccionado}
                onChange={(_, value) => setProductoSeleccionado(value)}
                renderInput={(params) => <TextField {...params} label="Buscar producto" />}
              />
              <TextField
                type="text"
                label="Cantidad"
                value={cantidad || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    setCantidad(0);
                  } else {
                    const num = parseInt(value);
                    if (!isNaN(num) && num >= 0) {
                      setCantidad(num);
                    }
                  }
                }}
                inputProps={{ min: 1 }}
                sx={{ width: 100 }}
              />
              <Button variant="contained" onClick={agregarAlCarrito} disabled={!productoSeleccionado}>
                Agregar
              </Button>
            </Box>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CartIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Carrito ({carrito.length} items)</Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Producto</strong></TableCell>
                    <TableCell align="right"><strong>P. Unit</strong></TableCell>
                    <TableCell align="center"><strong>Cant</strong></TableCell>
                    <TableCell align="right"><strong>Descuento</strong></TableCell>
                    <TableCell align="right"><strong>Subtotal</strong></TableCell>
                    <TableCell align="center"></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {carrito.map((item) => (
                    <TableRow key={item.productoId}>
                      <TableCell>
                        <Typography variant="body2">{item.nombreProducto}</Typography>
                        <Typography variant="caption" color="textSecondary">{item.codigoProducto}</Typography>
                      </TableCell>
                      <TableCell align="right">{formatCurrency(item.precioUnitario)}</TableCell>
                      <TableCell align="center">{item.cantidad}</TableCell>
                      <TableCell align="right">
                        <TextField
                          size="small"
                          value={item.porcentajeDescuento }
                          onChange={(e) => actualizarDescuentoItem(item.productoId, e.target.value)}
                          variant="outlined"
                          sx={{ width: '80px' }}
                          inputProps={{ 
                            style: { textAlign: 'right', fontSize: '0.875rem' },
                            min: 0,
                            max: 100,
                            step: 0.1
                          }}
                          type="text"
                          placeholder=""
                          InputProps={{
                            endAdornment: '%'
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">{formatCurrencyDecimals(item.subtotal, 3)}</TableCell>
                      <TableCell align="center">
                        <IconButton size="small" color="error" onClick={() => eliminarDelCarrito(item.productoId)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {carrito.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2" color="textSecondary">Carrito vacío</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>Totales</Typography>
            
            {/* Indicadores fiscales */}
            {totales.clienteSeleccionado && (
              <Box sx={{ mb: 2 }}>
                {totales.clienteSeleccionado.requiereFacturaAFIP && (
                  <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 1, py: 0.5 }}>
                    <Typography variant="caption">
                      <strong>Cliente requiere factura electrónica AFIP</strong>
                    </Typography>
                  </Alert>
                )}
                {!totales.aplicaIVA && (
                  <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 1, py: 0.5 }}>
                    <Typography variant="caption">
                      <strong>Venta sin IVA</strong> - No se aplicará IVA en esta operación
                    </Typography>
                  </Alert>
                )}
              </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>Subtotal:</Typography>
              <Typography>{formatCurrencyDecimals(totales.subtotal, 3)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>
                IVA {totales.aplicaIVA ? '(21%)' : '(0% - Exento)'}:
              </Typography>
              <Typography>{formatCurrencyDecimals(totales.iva, 3)}</Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6">TOTAL:</Typography>
              <Typography variant="h6" color="primary">{formatCurrencyDecimals(totales.total, 3)}</Typography>
            </Box>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Datos de la Venta</Typography>
            <Autocomplete
              fullWidth
              sx={{ mb: 2 }}
              options={clientesActivos}
              getOptionLabel={(c) => c.razonSocial || `${c.apellido || ''} ${c.nombre}`.trim()}
              value={clientesActivos.find(c => c._id === clienteId) || null}
              onChange={(_, value) => setClienteId(value?._id || '')}
              filterOptions={(options, { inputValue }) => {
                const term = inputValue.toLowerCase().trim();
                if (!term) return options;
                return options.filter(c => {
                  const nombre = (c.razonSocial || `${c.apellido || ''} ${c.nombre}`.trim()).toLowerCase();
                  const documento = (c.numeroDocumento || '').toLowerCase();
                  return nombre.includes(term) || documento.includes(term);
                });
              }}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="Cliente *" 
                  placeholder="Buscar por nombre o documento..."
                />
              )}
              renderOption={(props, c) => (
                <li {...props} key={c._id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <Typography sx={{ flex: 1 }}>
                      {c.razonSocial || `${c.apellido} ${c.nombre}`}
                    </Typography>
                    {c.requiereFacturaAFIP && (
                      <Chip label="AFIP" color="info" size="small" sx={{ fontSize: '0.65rem', height: 18 }} />
                    )}
                    {!c.aplicaIVA && (
                      <Chip label="Sin IVA" color="warning" size="small" sx={{ fontSize: '0.65rem', height: 18 }} />
                    )}
                  </Box>
                </li>
              )}
              isOptionEqualToValue={(option, value) => option._id === value._id}
            />

            {/* Control de IVA para esta venta específica */}
            <Box sx={{ mb: 2, p: 1.5, bgcolor: 'background.default', borderRadius: 1, border: '1px solid', borderColor: aplicaIVAVenta ? 'success.main' : 'warning.main' }}>
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={aplicaIVAVenta} 
                    onChange={(e) => setAplicaIVAVenta(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      Aplicar IVA (21%) en esta venta
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {aplicaIVAVenta 
                        ? 'Se sumará el 21% de IVA al total' 
                        : 'Venta sin IVA - Factura X o sin facturar'}
                    </Typography>
                  </Box>
                }
              />
            </Box>

            {/* Selector de Momento de Cobro */}
            <Box sx={{ mb: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Momento de Cobro *</InputLabel>
                <Select 
                  value={momentoCobro} 
                  onChange={(e) => setMomentoCobro(e.target.value as any)}
                  label="Momento de Cobro *"
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
              {momentoCobro === 'anticipado' && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  Deberá registrar el cobro ANTES de confirmar la venta
                </Alert>
              )}
              {momentoCobro === 'diferido' && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  Se generará deuda en cuenta corriente al confirmar
                </Alert>
              )}
            </Box>

            <TextField
              fullWidth
              label="Observaciones"
              multiline
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              sx={{ mb: 2 }}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                fullWidth
                color="secondary"
                onClick={() => handleCancelar()}
              >
                {esEdicion ? 'Cancelar Edición' : 'Cancelar'}
              </Button>
              <Button
                fullWidth
                variant="contained"
                onClick={handleConfirmarVenta}
                disabled={carrito.length === 0 || !clienteId}
              >
                {esEdicion ? 'Guardar Cambios' : 'Confirmar Venta'}
              </Button>
            </Box>

            {/* Diálogos de confirmación */}
            <ConfirmDialog
              open={openConfirmVenta}
              onClose={() => setOpenConfirmVenta(false)}
              onConfirm={async () => { await submitVenta(); setOpenConfirmVenta(false); }}
              title={esEdicion ? 'Guardar cambios' : 'Confirmar venta'}
              message={esEdicion ? '¿Desea guardar los cambios de esta venta?' : '¿Confirmar y registrar la venta?'}
              confirmText={esEdicion ? 'Guardar cambios' : 'Confirmar venta'}
              cancelText="Cancelar"
              severity="info"
              confirmColor="primary"
            />

            <ConfirmDialog
              open={openConfirmCancelar}
              onClose={() => setOpenConfirmCancelar(false)}
              onConfirm={() => {
                setOpenConfirmCancelar(false);
                if (esEdicion) {
                  navigate('/historial-ventas');
                } else {
                  setCarrito([]);
                  setClienteId('');
                  setObservaciones('');
                  setError('');
                }
              }}
              title="Cancelar"
              message="Hay cambios sin guardar. ¿Desea cancelar y perder los cambios?"
              confirmText="Sí, cancelar"
              cancelText="No"
              severity="warning"
              confirmColor="error"
            />

            {/* Diálogos de resultado: éxito y error */}
            <ConfirmDialog
              open={openSuccessDialog}
              onClose={() => setOpenSuccessDialog(false)}
              onConfirm={() => {
                setOpenSuccessDialog(false);
                if (navigateAfterSuccess) {
                  navigate('/historial-ventas');
                }
              }}
              title="Operación exitosa"
              message={successDialogMessage}
              confirmText="Aceptar"
              cancelText={undefined}
              severity="info"
              confirmColor="success"
            />

            <ConfirmDialog
              open={openErrorDialog}
              onClose={() => setOpenErrorDialog(false)}
              onConfirm={() => setOpenErrorDialog(false)}
              title="Error"
              message={errorDialogMessage}
              confirmText="Aceptar"
              cancelText={undefined}
              severity="error"
              confirmColor="error"
            />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default VentasPage;
