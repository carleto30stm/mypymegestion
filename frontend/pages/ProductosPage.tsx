import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import {
  fetchProductos,
  fetchProductosStockBajo,
  createProducto,
  updateProducto,
  ajustarStock,
  deleteProducto,
  reactivarProducto
} from '../redux/slices/productosSlice';
import { Producto, UNIDADES_MEDIDA } from '../types';
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
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Grid,
  Card,
  CardContent,
  Fab,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Inventory as InventoryIcon,
  TrendingDown as TrendingDownIcon,
  Restore as RestoreIcon,
  AddCircle as AddCircleIcon,
  RemoveCircle as RemoveCircleIcon
} from '@mui/icons-material';
import { formatCurrency } from '../utils/formatters';

const ProductosPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: productos, productosStockBajo, status } = useSelector((state: RootState) => state.productos);
  const { user } = useSelector((state: RootState) => state.auth);

  const [openForm, setOpenForm] = useState(false);
  const [productoEdit, setProductoEdit] = useState<Producto | null>(null);
  const [openAjuste, setOpenAjuste] = useState(false);
  const [productoAjuste, setProductoAjuste] = useState<Producto | null>(null);
  const [ajusteData, setAjusteData] = useState({ cantidad: '', tipo: 'entrada' as 'entrada' | 'salida', motivo: '' });
  const [filtro, setFiltro] = useState<'todos' | 'activos' | 'inactivos' | 'stockBajo'>('activos');

  // Estado para formulario de producto
  const [formData, setFormData] = useState<Partial<Producto>>({
    codigo: '',
    nombre: '',
    descripcion: '',
    categoria: '',
    precioCompra: 0,
    precioVenta: 0,
    stock: 0,
    stockMinimo: 5,
    unidadMedida: 'UNIDAD',
    proveedor: '',
    estado: 'activo'
  });

  useEffect(() => {
    dispatch(fetchProductos());
    dispatch(fetchProductosStockBajo());
  }, [dispatch]);

  const handleOpenForm = (producto?: Producto) => {
    if (producto) {
      setProductoEdit(producto);
      setFormData(producto);
    } else {
      setProductoEdit(null);
      setFormData({
        codigo: '',
        nombre: '',
        descripcion: '',
        categoria: '',
        precioCompra: 0,
        precioVenta: 0,
        stock: 0,
        stockMinimo: 5,
        unidadMedida: 'UNIDAD',
        proveedor: '',
        estado: 'activo'
      });
    }
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setProductoEdit(null);
  };

  const handleSubmitForm = async () => {
    if (productoEdit) {
      await dispatch(updateProducto({ ...formData, _id: productoEdit._id } as Producto));
    } else {
      await dispatch(createProducto(formData as Omit<Producto, '_id'>));
    }
    handleCloseForm();
    dispatch(fetchProductos());
    dispatch(fetchProductosStockBajo());
  };

  const handleOpenAjuste = (producto: Producto) => {
    setProductoAjuste(producto);
    setAjusteData({ cantidad: '', tipo: 'entrada', motivo: '' });
    setOpenAjuste(true);
  };

  const handleCloseAjuste = () => {
    setOpenAjuste(false);
    setProductoAjuste(null);
  };

  const handleSubmitAjuste = async () => {
    if (productoAjuste && ajusteData.cantidad && ajusteData.motivo) {
      await dispatch(ajustarStock({
        id: productoAjuste._id!,
        cantidad: parseFloat(ajusteData.cantidad),
        tipo: ajusteData.tipo,
        motivo: ajusteData.motivo
      }));
      handleCloseAjuste();
      dispatch(fetchProductos());
      dispatch(fetchProductosStockBajo());
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Está seguro de desactivar este producto?')) {
      await dispatch(deleteProducto(id));
      dispatch(fetchProductos());
    }
  };

  const handleReactivar = async (id: string) => {
    await dispatch(reactivarProducto(id));
    dispatch(fetchProductos());
  };

  const productosFiltrados = productos.filter(p => {
    if (filtro === 'activos') return p.estado === 'activo';
    if (filtro === 'inactivos') return p.estado === 'inactivo';
    if (filtro === 'stockBajo') return p.stock <= p.stockMinimo && p.estado === 'activo';
    return true;
  });

  const canEdit = user?.userType === 'admin' || user?.userType === 'oper_ad';

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <InventoryIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Gestión de Productos
          </Typography>
        </Box>
        {canEdit && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenForm()}
          >
            Nuevo Producto
          </Button>
        )}
      </Box>

      {/* Alertas de stock bajo */}
      {productosStockBajo.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }} icon={<TrendingDownIcon />}>
          <strong>{productosStockBajo.length} producto(s) con stock bajo:</strong>{' '}
          {productosStockBajo.map(p => p.nombre).join(', ')}
        </Alert>
      )}

      {/* Estadísticas */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Total Productos</Typography>
              <Typography variant="h4">{productos.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Productos Activos</Typography>
              <Typography variant="h4">{productos.filter(p => p.estado === 'activo').length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Stock Bajo</Typography>
              <Typography variant="h4" color="warning.main">{productosStockBajo.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Valor Inventario</Typography>
              <Typography variant="h6">
                {formatCurrency(productos.filter(p => p.estado === 'activo').reduce((sum, p) => sum + (p.stock * p.precioCompra), 0))}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Filtrar por</InputLabel>
          <Select value={filtro} onChange={(e) => setFiltro(e.target.value as any)} label="Filtrar por">
            <MenuItem value="todos">Todos</MenuItem>
            <MenuItem value="activos">Activos</MenuItem>
            <MenuItem value="inactivos">Inactivos</MenuItem>
            <MenuItem value="stockBajo">Stock Bajo</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      {/* Tabla de productos */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Código</strong></TableCell>
              <TableCell><strong>Nombre</strong></TableCell>
              <TableCell><strong>Categoría</strong></TableCell>
              <TableCell align="right"><strong>Stock</strong></TableCell>
              <TableCell align="right"><strong>Precio Compra</strong></TableCell>
              <TableCell align="right"><strong>Precio Venta</strong></TableCell>
              <TableCell align="center"><strong>Margen</strong></TableCell>
              <TableCell><strong>Estado</strong></TableCell>
              {canEdit && <TableCell align="center"><strong>Acciones</strong></TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {productosFiltrados.map((producto) => {
              const margen = producto.precioVenta > 0
                ? (((producto.precioVenta - producto.precioCompra) / producto.precioVenta) * 100).toFixed(1)
                : '0';
              const stockBajo = producto.stock <= producto.stockMinimo;

              return (
                <TableRow key={producto._id} sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                  <TableCell>{producto.codigo}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">{producto.nombre}</Typography>
                    {producto.descripcion && (
                      <Typography variant="caption" color="textSecondary">{producto.descripcion}</Typography>
                    )}
                  </TableCell>
                  <TableCell>{producto.categoria}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                      <Typography variant="body2" color={stockBajo ? 'error' : 'inherit'}>
                        {producto.stock} {producto.unidadMedida}
                      </Typography>
                      {stockBajo && <TrendingDownIcon fontSize="small" color="error" />}
                    </Box>
                  </TableCell>
                  <TableCell align="right">{formatCurrency(producto.precioCompra)}</TableCell>
                  <TableCell align="right">{formatCurrency(producto.precioVenta)}</TableCell>
                  <TableCell align="center">
                    <Chip label={`${margen}%`} size="small" color={parseFloat(margen) > 30 ? 'success' : 'default'} />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={producto.estado === 'activo' ? 'Activo' : 'Inactivo'}
                      color={producto.estado === 'activo' ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  {canEdit && (
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        {producto.estado === 'activo' && (
                          <>
                            <Tooltip title="Editar">
                              <IconButton size="small" onClick={() => handleOpenForm(producto)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Ajustar Stock">
                              <IconButton size="small" color="primary" onClick={() => handleOpenAjuste(producto)}>
                                <AddCircleIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {user?.userType === 'admin' && (
                              <Tooltip title="Desactivar">
                                <IconButton size="small" color="error" onClick={() => handleDelete(producto._id!)}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </>
                        )}
                        {producto.estado === 'inactivo' && user?.userType === 'admin' && (
                          <Tooltip title="Reactivar">
                            <IconButton size="small" color="success" onClick={() => handleReactivar(producto._id!)}>
                              <RestoreIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {productosFiltrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={canEdit ? 9 : 8} align="center">
                  <Typography variant="body2" color="textSecondary" sx={{ py: 3 }}>
                    No hay productos para mostrar
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog: Crear/Editar Producto */}
      <Dialog open={openForm} onClose={handleCloseForm} maxWidth="md" fullWidth>
        <DialogTitle>{productoEdit ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Código *"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nombre *"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descripción"
                multiline
                rows={2}
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Categoría *"
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Proveedor"
                value={formData.proveedor}
                onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Precio Compra *"
                type="number"
                value={formData.precioCompra}
                onChange={(e) => setFormData({ ...formData, precioCompra: parseFloat(e.target.value) })}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Precio Venta *"
                type="number"
                value={formData.precioVenta}
                onChange={(e) => setFormData({ ...formData, precioVenta: parseFloat(e.target.value) })}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Unidad Medida</InputLabel>
                <Select
                  value={formData.unidadMedida}
                  onChange={(e) => setFormData({ ...formData, unidadMedida: e.target.value as any })}
                  label="Unidad Medida"
                >
                  {UNIDADES_MEDIDA.map((unidad) => (
                    <MenuItem key={unidad} value={unidad}>
                      {unidad}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Stock Inicial *"
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: parseFloat(e.target.value) })}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Stock Mínimo *"
                type="number"
                value={formData.stockMinimo}
                onChange={(e) => setFormData({ ...formData, stockMinimo: parseFloat(e.target.value) })}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseForm}>Cancelar</Button>
          <Button
            onClick={handleSubmitForm}
            variant="contained"
            disabled={!formData.codigo || !formData.nombre || !formData.categoria}
          >
            {productoEdit ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Ajustar Stock */}
      <Dialog open={openAjuste} onClose={handleCloseAjuste} maxWidth="sm" fullWidth>
        <DialogTitle>Ajustar Stock - {productoAjuste?.nombre}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Stock actual: <strong>{productoAjuste?.stock} {productoAjuste?.unidadMedida}</strong>
            </Alert>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Tipo de Ajuste</InputLabel>
                  <Select
                    value={ajusteData.tipo}
                    onChange={(e) => setAjusteData({ ...ajusteData, tipo: e.target.value as 'entrada' | 'salida' })}
                    label="Tipo de Ajuste"
                  >
                    <MenuItem value="entrada">Entrada (Sumar)</MenuItem>
                    <MenuItem value="salida">Salida (Restar)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Cantidad"
                  type="number"
                  value={ajusteData.cantidad}
                  onChange={(e) => setAjusteData({ ...ajusteData, cantidad: e.target.value })}
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Motivo *"
                  multiline
                  rows={2}
                  value={ajusteData.motivo}
                  onChange={(e) => setAjusteData({ ...ajusteData, motivo: e.target.value })}
                  placeholder="Ej: Compra a proveedor, Corrección de inventario, etc."
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAjuste}>Cancelar</Button>
          <Button
            onClick={handleSubmitAjuste}
            variant="contained"
            color={ajusteData.tipo === 'entrada' ? 'success' : 'warning'}
            disabled={!ajusteData.cantidad || !ajusteData.motivo}
          >
            Ajustar Stock
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductosPage;
