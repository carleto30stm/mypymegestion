import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Tooltip,
  Badge
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { materiasPrimasAPI, proveedoresAPI } from '../services/api';
import { MateriaPrima, Proveedor, UNIDADES_MEDIDA } from '../types';
import { formatCurrency } from '../utils/formatters';

const MateriasPrimasPage: React.FC = () => {
  const [materiasPrimas, setMateriasPrimas] = useState<MateriaPrima[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editando, setEditando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroStock, setFiltroStock] = useState<'todos' | 'bajo' | 'critico'>('todos');
  
  const [formData, setFormData] = useState<Partial<MateriaPrima>>({
    codigo: '',
    nombre: '',
    descripcion: '',
    categoria: '',
    precioUltimaCompra: 0,
    precioPromedio: 0,
    stock: 0,
    stockMinimo: 0,
    stockMaximo: 0,
    unidadMedida: 'KG',
    estado: 'activo'
  });

  // Estados separados para los valores formateados
  const [precioUltimaCompraFormatted, setPrecioUltimaCompraFormatted] = useState('');
  const [precioPromedioFormatted, setPrecioPromedioFormatted] = useState('');

  // Función para formatear el número mientras se escribe (con decimales)
  const formatNumberInput = (value: string): string => {
    // Si el valor está vacío, retornar vacío
    if (!value) return '';
    
    // Permitir solo números y una coma
    const cleanValue = value.replace(/[^\d,]/g, '');
    
    // Si solo hay una coma al final, permitirla
    if (cleanValue === ',') return '';
    
    // Dividir por la coma (separador decimal argentino)
    const parts = cleanValue.split(',');
    
    // Solo permitir una coma
    if (parts.length > 2) {
      // Si hay más de una coma, tomar solo las primeras dos partes
      parts.splice(2);
    }
    
    // Parte entera
    let integerPart = parts[0] || '';
    
    // Formatear la parte entera con puntos cada tres dígitos (solo si tiene valor)
    if (integerPart.length > 0) {
      const num = parseInt(integerPart, 10);
      if (!isNaN(num) && num > 0) {
        integerPart = num.toLocaleString('es-AR');
      } else if (integerPart === '0') {
        integerPart = '0';
      }
    }
    
    // Parte decimal (máximo 2 dígitos)
    let decimalPart = parts[1];
    if (decimalPart !== undefined) {
      if (decimalPart.length > 2) {
        decimalPart = decimalPart.substring(0, 2);
      }
      // Si hay parte decimal (incluso vacía), agregar la coma
      return `${integerPart},${decimalPart}`;
    }
    
    // Si termina con coma en el input original, mantenerla
    if (value.endsWith(',') && parts.length === 2) {
      return `${integerPart},`;
    }
    
    return integerPart;
  };

  // Función para obtener el valor numérico desde el formato visual (con decimales)
  const getNumericValue = (formattedValue: string): number => {
    if (!formattedValue) return 0;
    
    // Convertir formato argentino a número: 1.000,50 -> 1000.50
    const cleanValue = formattedValue
      .replace(/\./g, '') // Remover puntos (separadores de miles)
      .replace(',', '.'); // Cambiar coma por punto (decimales)
    
    const parsed = parseFloat(cleanValue);
    return isNaN(parsed) ? 0 : parsed;
  };

  useEffect(() => {
    cargarMateriasPrimas();
    cargarProveedores();
  }, []);

  const cargarMateriasPrimas = async () => {
    try {
      setLoading(true);
      const data = await materiasPrimasAPI.obtenerTodas();
      setMateriasPrimas(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar materias primas');
    } finally {
      setLoading(false);
    }
  };

  const cargarProveedores = async () => {
    try {
      const data = await proveedoresAPI.obtenerTodos({ estado: 'activo' });
      setProveedores(data);
    } catch (err) {
      console.error('Error al cargar proveedores:', err);
    }
  };

  const handleOpenDialog = (materiaPrima?: MateriaPrima) => {
    if (materiaPrima) {
      setFormData(materiaPrima);
      setEditando(true);
      
      // Formatear los valores existentes con decimales
      if (materiaPrima.precioUltimaCompra && materiaPrima.precioUltimaCompra > 0) {
        setPrecioUltimaCompraFormatted(formatCurrency(materiaPrima.precioUltimaCompra));
      } else {
        setPrecioUltimaCompraFormatted('');
      }
      
      if (materiaPrima.precioPromedio && materiaPrima.precioPromedio > 0) {
        setPrecioPromedioFormatted(formatCurrency(materiaPrima.precioPromedio));
      } else {
        setPrecioPromedioFormatted('');
      }
    } else {
      setFormData({
        codigo: '',
        nombre: '',
        descripcion: '',
        categoria: '',
        precioUltimaCompra: 0,
        precioPromedio: 0,
        stock: 0,
        stockMinimo: 0,
        stockMaximo: 0,
        unidadMedida: 'KG',
        estado: 'activo'
      });
      setEditando(false);
      
      // Limpiar valores formateados
      setPrecioUltimaCompraFormatted('');
      setPrecioPromedioFormatted('');
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData({});
    setError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Manejar campos de precio con formato especial
    if (name === 'precioUltimaCompra') {
      const formatted = formatNumberInput(value);
      setPrecioUltimaCompraFormatted(formatted);
      const numericValue = getNumericValue(formatted);
      setFormData(prev => ({ ...prev, precioUltimaCompra: numericValue }));
      return;
    }
    
    if (name === 'precioPromedio') {
      const formatted = formatNumberInput(value);
      setPrecioPromedioFormatted(formatted);
      const numericValue = getNumericValue(formatted);
      setFormData(prev => ({ ...prev, precioPromedio: numericValue }));
      return;
    }

    // Para otros campos, comportamiento normal
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      if (editando && formData._id) {
        await materiasPrimasAPI.actualizar(formData._id, formData);
        setSuccess('Materia prima actualizada exitosamente');
      } else {
        await materiasPrimasAPI.crear(formData);
        setSuccess('Materia prima creada exitosamente');
      }
      handleCloseDialog();
      cargarMateriasPrimas();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar materia prima');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id: string) => {
    if (!window.confirm('¿Está seguro de desactivar esta materia prima?')) return;
    
    try {
      setLoading(true);
      await materiasPrimasAPI.eliminar(id);
      setSuccess('Materia prima desactivada exitosamente');
      cargarMateriasPrimas();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al desactivar materia prima');
    } finally {
      setLoading(false);
    }
  };

  const materiasPrimasFiltradas = materiasPrimas.filter(mp => {
    const matchBusqueda = mp.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      mp.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
      (mp.descripcion && mp.descripcion.toLowerCase().includes(busqueda.toLowerCase()));
    
    if (filtroStock === 'bajo') {
      return matchBusqueda && mp.stock <= mp.stockMinimo;
    } else if (filtroStock === 'critico') {
      return matchBusqueda && mp.stock <= (mp.stockMinimo * 0.5);
    }
    return matchBusqueda;
  });

  const getStockStatus = (mp: MateriaPrima) => {
    if (mp.stock <= mp.stockMinimo * 0.5) return { label: 'Crítico', color: 'error' };
    if (mp.stock <= mp.stockMinimo) return { label: 'Bajo', color: 'warning' };
    return { label: 'Normal', color: 'success' };
  };

  const materiasConStockBajo = materiasPrimas.filter(mp => mp.stock <= mp.stockMinimo).length;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Materias Primas
          {materiasConStockBajo > 0 && (
            <Badge badgeContent={materiasConStockBajo} color="error" sx={{ ml: 2 }}>
              <WarningIcon color="error" />
            </Badge>
          )}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Nueva Materia Prima
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              placeholder="Buscar por nombre, código o descripción..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Filtrar por Stock</InputLabel>
              <Select
                value={filtroStock}
                label="Filtrar por Stock"
                onChange={(e) => setFiltroStock(e.target.value as any)}
              >
                <MenuItem value="todos">Todos</MenuItem>
                <MenuItem value="bajo">Stock Bajo</MenuItem>
                <MenuItem value="critico">Stock Crítico</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Código</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell>Categoría</TableCell>
              <TableCell>Stock</TableCell>
              <TableCell>Stock Mín</TableCell>
              <TableCell>Unidad</TableCell>
              <TableCell>Precio Prom.</TableCell>
              <TableCell>Estado Stock</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {materiasPrimasFiltradas.map((mp) => {
              const stockStatus = getStockStatus(mp);
              return (
                <TableRow key={mp._id}>
                  <TableCell>{mp.codigo}</TableCell>
                  <TableCell>{mp.nombre}</TableCell>
                  <TableCell>
                    <Typography variant='caption'>
                    {mp.descripcion}
                    </Typography>
                    </TableCell>
                  <TableCell>{mp.categoria}</TableCell>
                  <TableCell>
                    <Typography color={stockStatus.color}>
                      {mp.stock} {mp.unidadMedida}
                    </Typography>
                  </TableCell>
                  <TableCell>{mp.stockMinimo} {mp.unidadMedida}</TableCell>
                  <TableCell>{mp.unidadMedida}</TableCell>
                  <TableCell>{formatCurrency(mp.precioPromedio)}</TableCell>
                  <TableCell>
                    <Chip
                      label={stockStatus.label}
                      color={stockStatus.color as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Editar">
                      <IconButton onClick={() => handleOpenDialog(mp)} size="small">
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Desactivar">
                      <IconButton onClick={() => mp._id && handleEliminar(mp._id)} size="small">
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog de Crear/Editar */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editando ? 'Editar Materia Prima' : 'Nueva Materia Prima'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Código"
                name="codigo"
                value={formData.codigo || ''}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nombre"
                name="nombre"
                value={formData.nombre || ''}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descripción"
                name="descripcion"
                multiline
                rows={2}
                value={formData.descripcion || ''}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Categoría"
                name="categoria"
                value={formData.categoria || ''}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Unidad de Medida</InputLabel>
                <Select
                  value={formData.unidadMedida || 'KG'}
                  label="Unidad de Medida"
                  onChange={(e) => handleSelectChange('unidadMedida', e.target.value)}
                >
                  {UNIDADES_MEDIDA.map(unidad => (
                    <MenuItem key={unidad} value={unidad}>{unidad}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Stock Actual"
                name="stock"
                type="text"
                value={formData.stock }
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Stock Mínimo"
                name="stockMinimo"
                type="text"
                value={formData.stockMinimo}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Precio Última Compra"
                name="precioUltimaCompra"
                type="text"
                value={precioUltimaCompraFormatted}
                onChange={handleInputChange}
                placeholder="Ej: 1.500,50"
                helperText="Formato: 1.000,50 (usar coma para decimales)"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Precio Promedio"
                name="precioPromedio"
                type="text"
                value={precioPromedioFormatted}
                onChange={handleInputChange}
                placeholder="Ej: 1.250,75"
                helperText="Formato: 1.000,50 (usar coma para decimales)"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Proveedor Principal</InputLabel>
                <Select
                  value={formData.proveedorPrincipal || ''}
                  label="Proveedor Principal"
                  onChange={(e) => handleSelectChange('proveedorPrincipal', e.target.value)}
                >
                  <MenuItem value="">Ninguno</MenuItem>
                  {proveedores.map(prov => (
                    <MenuItem key={prov._id} value={prov._id}>
                      {prov.razonSocial}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={loading}>
            {editando ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MateriasPrimasPage;
