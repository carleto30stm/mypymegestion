import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import { fetchProductos } from '../redux/slices/productosSlice';
import { fetchClientesActivos } from '../redux/slices/clientesSlice';
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
  FormControlLabel,
  Switch,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ShoppingCart as CartIcon
} from '@mui/icons-material';
import { formatCurrency, parseCurrency } from '../utils/formatters';

interface VentaFormProps {
  ventaParaEditar?: Venta | null; // Si se pasa, el formulario se inicializa con estos datos
  onSubmit: (ventaData: {
    clienteId: string;
    items: ItemVenta[];
    observaciones: string;
    aplicaIVA: boolean;
    subtotal: number;
    iva: number;
    total: number;
  }) => void;
  onCancel?: () => void;
  submitButtonText?: string;
  loading?: boolean;
}

const VentaForm: React.FC<VentaFormProps> = ({
  ventaParaEditar,
  onSubmit,
  onCancel,
  submitButtonText = 'Confirmar Venta',
  loading = false
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: productos } = useSelector((state: RootState) => state.productos);
  const { clientesActivos } = useSelector((state: RootState) => state.clientes);

  const [carrito, setCarrito] = useState<ItemVenta[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [cantidad, setCantidad] = useState<number>(1);
  const [clienteId, setClienteId] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [aplicaIVAVenta, setAplicaIVAVenta] = useState<boolean>(true);

  useEffect(() => {
    dispatch(fetchProductos());
    dispatch(fetchClientesActivos());
  }, [dispatch]);

  // Inicializar formulario con datos de venta para edición
  useEffect(() => {
    if (ventaParaEditar) {
      setCarrito(ventaParaEditar.items || []);
      setClienteId(ventaParaEditar.clienteId || '');
      setObservaciones(ventaParaEditar.observaciones || '');
      setAplicaIVAVenta(ventaParaEditar.aplicaIVA || false);
    }
  }, [ventaParaEditar]);

  // Actualizar sugerencia de IVA cuando cambia el cliente seleccionado
  useEffect(() => {
    if (clienteId && !ventaParaEditar) { // Solo sugerir si no estamos editando
      const clienteSeleccionado = clientesActivos.find(c => c._id === clienteId);
      setAplicaIVAVenta(clienteSeleccionado?.aplicaIVA !== false);
    }
  }, [clienteId, clientesActivos, ventaParaEditar]);

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
    const porcentaje = porcentajeStr === '' ? 0 : parseFloat(porcentajeStr.replace(',', '.'));
    const porcentajeValido = Math.max(0, Math.min(100, porcentaje || 0));
    
    const carritoActualizado = carrito.map(item => {
      if (item.productoId === productoId) {
        const subtotalSinDescuento = item.precioUnitario * item.cantidad;
        const montoDescuento = (subtotalSinDescuento * porcentajeValido) / 100;
        const subtotalConDescuento = subtotalSinDescuento - montoDescuento;
        
        return {
          ...item,
          descuento: montoDescuento,
          subtotal: subtotalConDescuento,
          total: subtotalConDescuento,
          porcentajeDescuento: porcentajeValido
        };
      }
      return item;
    });
    
    setCarrito(carritoActualizado);
  };

  const calcularTotales = () => {
    const subtotal = carrito.reduce((sum, item) => sum + item.subtotal, 0);
    const clienteSeleccionado = clientesActivos.find(c => c._id === clienteId);
    const iva = aplicaIVAVenta ? subtotal * 0.21 : 0;
    const total = subtotal + iva;
    
    return { subtotal, iva, total, aplicaIVA: aplicaIVAVenta, clienteSeleccionado };
  };

  const handleSubmit = () => {
    if (carrito.length === 0) {
      setError('Debe agregar al menos un producto');
      return;
    }

    if (!clienteId) {
      setError('Debe seleccionar un cliente');
      return;
    }

    const totales = calcularTotales();
    
    onSubmit({
      clienteId,
      items: carrito,
      observaciones,
      aplicaIVA: aplicaIVAVenta,
      subtotal: totales.subtotal,
      iva: totales.iva,
      total: totales.total
    });
  };

  const totales = calcularTotales();

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          {/* Selector de productos */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>Agregar Productos</Typography>
            
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={productosActivos}
                  getOptionLabel={(option) => `${option.codigo} - ${option.nombre}`}
                  value={productoSeleccionado}
                  onChange={(_, newValue) => setProductoSeleccionado(newValue)}
                  renderInput={(params) => <TextField {...params} label="Buscar producto" />}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <Box>
                        <Typography variant="body2">{option.codigo} - {option.nombre}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          Stock: {option.stock} | Precio: {formatCurrency(option.precioVenta)}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                />
              </Grid>
              
              <Grid item xs={12} md={3}>
                <TextField
                  type="number"
                  label="Cantidad"
                  value={cantidad}
                  onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                  inputProps={{ min: 1 }}
                  fullWidth
                />
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Button
                  variant="contained"
                  onClick={agregarAlCarrito}
                  disabled={!productoSeleccionado}
                  startIcon={<AddIcon />}
                  fullWidth
                >
                  Agregar
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Carrito */}
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
                          value={item.porcentajeDescuento || 0}
                          onChange={(e) => actualizarDescuentoItem(item.productoId, e.target.value)}
                          variant="outlined"
                          sx={{ width: '80px' }}
                          inputProps={{ 
                            style: { textAlign: 'right', fontSize: '0.875rem' },
                            min: 0,
                            max: 100,
                            step: 0.1
                          }}
                          type="number"
                          placeholder="0"
                          InputProps={{
                            endAdornment: '%'
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">{formatCurrency(item.subtotal)}</TableCell>
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
          {/* Cliente y totales */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>Cliente</Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Cliente</InputLabel>
              <Select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                label="Cliente"
              >
                {clientesActivos.map((cliente) => (
                  <MenuItem key={cliente._id} value={cliente._id}>
                    {cliente.razonSocial || `${cliente.apellido} ${cliente.nombre}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Observaciones"
              multiline
              rows={3}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Observaciones adicionales..."
            />
          </Paper>

          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>Totales</Typography>
            
            {/* Indicadores fiscales */}
            {totales.clienteSeleccionado && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Cliente {totales.clienteSeleccionado.aplicaIVA ? 'aplica' : 'NO aplica'} IVA por defecto
              </Alert>
            )}

            <FormControlLabel
              control={
                <Switch
                  checked={aplicaIVAVenta}
                  onChange={(e) => setAplicaIVAVenta(e.target.checked)}
                />
              }
              label="Aplicar IVA (21%)"
              sx={{ mb: 2 }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>Subtotal:</Typography>
              <Typography>{formatCurrency(totales.subtotal)}</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>IVA (21%):</Typography>
              <Typography>{formatCurrency(totales.iva)}</Typography>
            </Box>
            
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" color="primary">Total:</Typography>
              <Typography variant="h6" color="primary">{formatCurrency(totales.total)}</Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              {onCancel && (
                <Button
                  variant="outlined"
                  onClick={onCancel}
                  fullWidth
                >
                  Cancelar
                </Button>
              )}
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={carrito.length === 0 || !clienteId || loading}
                fullWidth
              >
                {loading ? 'Procesando...' : submitButtonText}
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default VentaForm;