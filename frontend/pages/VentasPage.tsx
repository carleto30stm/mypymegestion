import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import { fetchProductos } from '../redux/slices/productosSlice';
import { fetchClientesActivos } from '../redux/slices/clientesSlice';
import { createVenta } from '../redux/slices/ventasSlice';
import { Producto, ItemVenta, BANCOS, MEDIOS_PAGO_VENTAS } from '../types';
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
  Alert
} from '@mui/material';
import {
  PointOfSale as PosIcon,
  Delete as DeleteIcon,
  ShoppingCart as CartIcon
} from '@mui/icons-material';
import { formatCurrency } from '../utils/formatters';

const VentasPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: productos } = useSelector((state: RootState) => state.productos);
  const { clientesActivos } = useSelector((state: RootState) => state.clientes);
  const { user } = useSelector((state: RootState) => state.auth);

  const [carrito, setCarrito] = useState<ItemVenta[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [cantidad, setCantidad] = useState<number>(1);
  const [clienteId, setClienteId] = useState<string>('');
  const [medioPago, setMedioPago] = useState<string>('Efectivo');
  const [banco, setBanco] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    dispatch(fetchProductos());
    dispatch(fetchClientesActivos());
  }, [dispatch]);

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
          ? { ...i, cantidad: nuevaCantidad, subtotal: nuevaCantidad * i.precioUnitario }
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
        total: cantidad * productoSeleccionado.precioVenta
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

  const calcularTotales = () => {
    const subtotal = carrito.reduce((sum, item) => sum + item.subtotal, 0);
    const iva = subtotal * 0.21;
    const total = subtotal + iva;
    return { subtotal, iva, total };
  };

  const handleConfirmarVenta = async () => {
    if (carrito.length === 0) {
      setError('Debe agregar al menos un producto');
      return;
    }

    if (!clienteId) {
      setError('Debe seleccionar un cliente');
      return;
    }

    const totales = calcularTotales();

    const nuevaVenta: any = {
      clienteId,
      items: carrito,
      subtotal: totales.subtotal,
      descuentoTotal: 0,
      iva: totales.iva,
      total: totales.total,
      medioPago: medioPago as any,
      banco: medioPago !== 'Efectivo' ? banco : undefined,
      observaciones: observaciones || undefined,
      vendedor: user?.id || ''
    };

    try {
      await dispatch(createVenta(nuevaVenta)).unwrap();
      // Limpiar formulario
      setCarrito([]);
      setClienteId('');
      setMedioPago('Efectivo');
      setBanco('');
      setObservaciones('');
      setError('');
      alert('Venta registrada exitosamente');
      dispatch(fetchProductos()); // Actualizar stock
    } catch (err: any) {
      setError(err.message || 'Error al registrar la venta');
    }
  };

  const totales = calcularTotales();

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <PosIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
        <Typography variant="h4">Punto de Venta</Typography>
      </Box>

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
                type="number"
                label="Cantidad"
                value={cantidad}
                onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
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
                      <TableCell colSpan={5} align="center">
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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>Subtotal:</Typography>
              <Typography>{formatCurrency(totales.subtotal)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>IVA (21%):</Typography>
              <Typography>{formatCurrency(totales.iva)}</Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6">TOTAL:</Typography>
              <Typography variant="h6" color="primary">{formatCurrency(totales.total)}</Typography>
            </Box>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Datos de la Venta</Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Cliente *</InputLabel>
              <Select value={clienteId} onChange={(e) => setClienteId(e.target.value)} label="Cliente *">
                {clientesActivos.map((c) => (
                  <MenuItem key={c._id} value={c._id}>
                    {c.razonSocial || `${c.apellido} ${c.nombre}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Medio de Pago *</InputLabel>
              <Select value={medioPago} onChange={(e) => setMedioPago(e.target.value)} label="Medio de Pago *">
                {MEDIOS_PAGO_VENTAS.map((medio) => (
                  <MenuItem key={medio} value={medio}>
                    {medio}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {medioPago !== 'Efectivo' && medioPago !== 'Cuenta Corriente' && (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Banco *</InputLabel>
                <Select 
                  value={banco} 
                  onChange={(e) => setBanco(e.target.value)} 
                  label="Banco *"
                >
                  {BANCOS.map((b) => (
                    <MenuItem key={b} value={b}>
                      {b}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

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
                variant="outlined"
                onClick={() => {
                  setCarrito([]);
                  setClienteId('');
                  setObservaciones('');
                  setError('');
                }}
              >
                Cancelar
              </Button>
              <Button
                fullWidth
                variant="contained"
                onClick={handleConfirmarVenta}
                disabled={carrito.length === 0 || !clienteId}
              >
                Confirmar Venta
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default VentasPage;
