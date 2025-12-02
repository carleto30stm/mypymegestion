import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Alert,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  Stack,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Science as ScienceIcon,
  TrendingUp as TrendingUpIcon,
  RemoveCircle as RemoveIcon,
  Calculate as CalculateIcon
} from '@mui/icons-material';
import { recetasAPI, productosAPI, materiasPrimasAPI } from '../services/api';
import { categoriasAPI, CategoriaUnificada } from '../services/rrhhService';
import type { Receta, ItemReceta, ItemManoObra, Producto, MateriaPrima } from '../types';
import { formatCurrency } from '../utils/formatters';

const RecetasPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [materiasPrimas, setMateriasPrimas] = useState<MateriaPrima[]>([]);
  const [categorias, setCategorias] = useState<CategoriaUnificada[]>([]); // Categorías internas + CCT para mano de obra
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estados para filtros
  const [filtroEstado, setFiltroEstado] = useState<string>('');

  // Estados para el diálogo de receta
  const [openReceta, setOpenReceta] = useState(false);
  const [recetaEditando, setRecetaEditando] = useState<Receta | null>(null);
  const [recetaForm, setRecetaForm] = useState<Partial<Receta>>({
    productoId: '',
    materiasPrimas: [],
    manoObra: [],
    rendimiento: 1,
    tiempoPreparacion: 0,
    costoManoObra: 0,
    costoIndirecto: 0,
    precioVentaSugerido: 0,
    estado: 'borrador',
    observaciones: ''
  });

  // Estados para agregar materia prima
  const [mpSeleccionada, setMpSeleccionada] = useState('');
  const [cantidadMp, setCantidadMp] = useState(0);

  // Estados para agregar mano de obra (operario por categoría)
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
  const [cantidadOperarios, setCantidadOperarios] = useState(1);
  const [minutosPorOperario, setMinutosPorOperario] = useState(60);

  // Estados separados para los valores formateados
  const [costoIndirectoFormatted, setCostoIndirectoFormatted] = useState('');
  const [precioVentaSugeridoFormatted, setPrecioVentaSugeridoFormatted] = useState('');
  const [margenDeseado, setMargenDeseado] = useState<number>(0);

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

  // Función para manejar cambios en inputs
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'costoIndirecto') {
      const formatted = formatNumberInput(value);
      setCostoIndirectoFormatted(formatted);
      const numericValue = getNumericValue(formatted);
      setRecetaForm(prev => ({ ...prev, costoIndirecto: numericValue }));
      return;
    }

    if (name === 'precioVentaSugerido') {
      const formatted = formatNumberInput(value);
      setPrecioVentaSugeridoFormatted(formatted);
      const numericValue = getNumericValue(formatted);
      setRecetaForm(prev => ({ ...prev, precioVentaSugerido: numericValue }));
      return;
    }

    // Para otros campos, comportamiento normal
    setRecetaForm(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    cargarDatos();
  }, [filtroEstado]);

  const cargarDatos = async () => {
    setLoading(true);
    setError(null);
    try {
      const [recetasData, productosData, materiasData, categoriasData] = await Promise.all([
        recetasAPI.obtenerTodas({ estado: filtroEstado || undefined }),
        productosAPI.obtenerTodos(),
        materiasPrimasAPI.obtenerTodas(),
        categoriasAPI.obtenerTodasParaManoObra(true) // Solo categorías con valorHora > 0
      ]);
      setRecetas(recetasData);
      setProductos(productosData);
      setMateriasPrimas(materiasData);
      setCategorias(categoriasData);
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al cargar datos');
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAbrirDialogo = (receta?: Receta) => {
    if (receta) {
      setRecetaEditando(receta);
      setRecetaForm({
        ...receta,
        manoObra: receta.manoObra || []
      });
      
      if (receta.costoIndirecto && receta.costoIndirecto > 0) {
        setCostoIndirectoFormatted(formatCurrency(receta.costoIndirecto));
      } else {
        setCostoIndirectoFormatted('');
      }

      if (receta.precioVentaSugerido && receta.precioVentaSugerido > 0) {
        setPrecioVentaSugeridoFormatted(formatCurrency(receta.precioVentaSugerido));
      } else {
        setPrecioVentaSugeridoFormatted('');
      }
      setMargenDeseado(0);
    } else {
      setRecetaEditando(null);
      setRecetaForm({
        productoId: '',
        materiasPrimas: [],
        manoObra: [],
        rendimiento: 1,
        tiempoPreparacion: 0,
        costoManoObra: 0,
        costoIndirecto: 0,
        precioVentaSugerido: 0,
        estado: 'borrador',
        observaciones: ''
      });
      
      // Limpiar valores formateados
      setCostoIndirectoFormatted('');
      setPrecioVentaSugeridoFormatted('');
      setMargenDeseado(0);
    }
    // Limpiar estados de agregar mano de obra
    setCategoriaSeleccionada('');
    setCantidadOperarios(1);
    setMinutosPorOperario(60);
    setOpenReceta(true);
  };

  const handleCerrarDialogo = () => {
    setOpenReceta(false);
    setRecetaEditando(null);
    setMpSeleccionada('');
    setCantidadMp(0);
    setCategoriaSeleccionada('');
    setCantidadOperarios(1);
    setMinutosPorOperario(60);
    setMargenDeseado(0);
  };

  // Función para agregar mano de obra (operarios por categoría)
  const handleAgregarManoObra = () => {
    if (!categoriaSeleccionada || cantidadOperarios <= 0 || minutosPorOperario <= 0) {
      setError('Seleccione una categoría, cantidad de operarios y minutos válidos');
      return;
    }

    const categoria = categorias.find(c => c._id === categoriaSeleccionada);
    if (!categoria) return;

    // Verificar si ya está agregada esta categoría
    if (recetaForm.manoObra?.some(item => item.categoriaId === categoria._id)) {
      setError('Esta categoría ya está agregada. Edite la existente o elimínela primero.');
      return;
    }

    // Convertir minutos a horas para el cálculo (valorHora es por hora)
    const horasCalculadas = minutosPorOperario / 60;
    const costoTotal = cantidadOperarios * horasCalculadas * (categoria.valorHora || 0);

    const nuevaManoObra: ItemManoObra = {
      categoriaId: categoria._id!,
      nombreCategoria: categoria.nombre,
      cantidadOperarios: cantidadOperarios,
      horasPorOperario: horasCalculadas, // Guardamos en horas para compatibilidad
      valorHora: categoria.valorHora || 0,
      costoTotal: costoTotal
    };

    setRecetaForm({
      ...recetaForm,
      manoObra: [...(recetaForm.manoObra || []), nuevaManoObra]
    });
    setCategoriaSeleccionada('');
    setCantidadOperarios(1);
    setMinutosPorOperario(60);
  };

  // Función para eliminar mano de obra
  const handleEliminarManoObra = (index: number) => {
    const nuevaManoObra = [...(recetaForm.manoObra || [])];
    nuevaManoObra.splice(index, 1);
    setRecetaForm({ ...recetaForm, manoObra: nuevaManoObra });
  };

  const handleAgregarMateriaPrima = () => {
    if (!mpSeleccionada || cantidadMp <= 0) {
      setError('Seleccione una materia prima y una cantidad válida');
      return;
    }

    const mp = materiasPrimas.find(m => m._id === mpSeleccionada);
    if (!mp) return;

    // Verificar si ya está agregada
    if (recetaForm.materiasPrimas?.some(item => item.materiaPrimaId === mp._id)) {
      setError('Esta materia prima ya está en la receta');
      return;
    }

    const nuevaMP: ItemReceta = {
      materiaPrimaId: mp._id!,
      codigoMateriaPrima: mp.codigo,
      nombreMateriaPrima: mp.nombre,
      cantidad: cantidadMp,
      unidadMedida: mp.unidadMedida,
      costo: mp.precioPromedio || mp.precioUltimaCompra || 0
    };

    setRecetaForm({
      ...recetaForm,
      materiasPrimas: [...(recetaForm.materiasPrimas || []), nuevaMP]
    });
    setMpSeleccionada('');
    setCantidadMp(0);
  };

  const handleEliminarMateriaPrima = (index: number) => {
    const nuevasMaterias = [...(recetaForm.materiasPrimas || [])];
    nuevasMaterias.splice(index, 1);
    setRecetaForm({ ...recetaForm, materiasPrimas: nuevasMaterias });
  };

  const handleGuardarReceta = async () => {
    if (!recetaForm.productoId || !recetaForm.materiasPrimas || recetaForm.materiasPrimas.length === 0) {
      setError('Debe seleccionar un producto y al menos una materia prima');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const datos = {
        ...recetaForm,
        createdBy: (user as any)?.nombre || (user as any)?.name || 'Sistema'
      };

      if (recetaEditando) {
        await recetasAPI.actualizar(recetaEditando._id!, datos);
        setSuccess('Receta actualizada exitosamente');
      } else {
        await recetasAPI.crear(datos);
        setSuccess('Receta creada exitosamente');
      }

      handleCerrarDialogo();
      cargarDatos();
    } catch (err: any) {
      console.error('Error completo:', err);
      console.error('Response data:', err.response?.data);
      console.error('Response status:', err.response?.status);
      
      // Manejar específicamente errores de stock insuficiente
      const errorData = err.response?.data;
      let errorMessage = 'Error al guardar receta';
      
      if (errorData?.error && typeof errorData.error === 'string' && errorData.error.includes('Stock insuficiente')) {
        errorMessage = `No hay suficiente stock disponible: ${errorData.error}`;
      } else if (errorData?.mensaje && typeof errorData.mensaje === 'string' && errorData.mensaje.includes('Error al crear orden')) {
        // Si es un error de orden de producción, mostrar el mensaje completo
        errorMessage = errorData.mensaje + (errorData.error ? `: ${errorData.error}` : '');
      } else if (errorData?.mensaje) {
        errorMessage = errorData.mensaje;
      } else if (errorData?.error) {
        errorMessage = errorData.error;
      }
      
      console.log('Mensaje de error final:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarReceta = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar esta receta?')) return;

    setLoading(true);
    setError(null);
    try {
      await recetasAPI.eliminar(id);
      setSuccess('Receta eliminada exitosamente');
      cargarDatos();
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al eliminar receta');
      console.error('Error eliminando receta:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatearMoneda = (valor: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(valor);
  };

  const getEstadoColor = (estado: string): "success" | "error" | "warning" | "default" => {
    const colores: Record<string, "success" | "error" | "warning" | "default"> = {
      activa: 'success',
      inactiva: 'error',
      borrador: 'warning'
    };
    return colores[estado] || 'default';
  };

  const calcularCostoManoObra = () => {
    return (recetaForm.manoObra || []).reduce((sum, item) => 
      sum + (item.cantidadOperarios || 0) * (item.horasPorOperario || 0) * (item.valorHora || 0), 0
    );
  };

  const calcularCostoTotal = () => {
    const costoMP = (recetaForm.materiasPrimas || []).reduce((sum, mp) => 
      sum + (mp.costo || 0) * mp.cantidad, 0
    );
    const costoMO = calcularCostoManoObra();
    return costoMP + costoMO + (recetaForm.costoIndirecto || 0);
  };

  const calcularCostoUnitario = () => {
    const total = calcularCostoTotal();
    return (recetaForm.rendimiento || 1) > 0 ? total / (recetaForm.rendimiento || 1) : 0;
  };

  const calcularMargen = () => {
    const costoUnitario = calcularCostoUnitario();
    const precio = recetaForm.precioVentaSugerido || 0;
    if (precio > 0 && costoUnitario > 0) {
      return ((precio - costoUnitario) / precio) * 100;
    }
    return 0;
  };

  const calcularPrecioSugerido = () => {
    const costoUnitario = calcularCostoUnitario();
    if (costoUnitario > 0 && margenDeseado > 0 && margenDeseado < 100) {
      return costoUnitario / (1 - margenDeseado / 100);
    }
    return 0;
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Encabezado */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Recetas de Producción (BOM)
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleAbrirDialogo()}
          >
            Nueva Receta
          </Button>
          <IconButton onClick={cargarDatos} color="primary">
            <RefreshIcon />
          </IconButton>
        </Stack>
      </Box>

      {/* Alertas */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Estado</InputLabel>
              <Select
                value={filtroEstado}
                label="Estado"
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="activa">Activa</MenuItem>
                <MenuItem value="inactiva">Inactiva</MenuItem>
                <MenuItem value="borrador">Borrador</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Button variant="outlined" onClick={() => setFiltroEstado('')}>
              Limpiar Filtros
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabla de Recetas */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Producto</TableCell>
              <TableCell>Versión</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Rendimiento</TableCell>
              <TableCell align="right">Costo Total</TableCell>
              <TableCell align="right">Costo Unit.</TableCell>
              <TableCell align="right">Precio Venta</TableCell>
              <TableCell align="right">Margen %</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : recetas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  No hay recetas registradas
                </TableCell>
              </TableRow>
            ) : (
              recetas.map((receta) => (
                <TableRow key={receta._id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {receta.codigoProducto}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {receta.nombreProducto}
                    </Typography>
                  </TableCell>
                  <TableCell>v{receta.version}</TableCell>
                  <TableCell>
                    <Chip
                      label={receta.estado.charAt(0).toUpperCase() + receta.estado.slice(1)}
                      color={getEstadoColor(receta.estado)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">{receta.rendimiento} un.</TableCell>
                  <TableCell align="right">{formatearMoneda(receta.costoTotal)}</TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="bold">
                      {formatearMoneda(receta.costoUnitario || 0)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {receta.precioVentaSugerido ? formatearMoneda(receta.precioVentaSugerido) : '-'}
                  </TableCell>
                  <TableCell align="right">
                    {receta.margenBruto !== undefined && (
                      <Chip
                        icon={<TrendingUpIcon />}
                        label={`${receta.margenBruto.toFixed(1)}%`}
                        color={receta.margenBruto > 30 ? 'success' : receta.margenBruto > 15 ? 'warning' : 'error'}
                        size="small"
                      />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Editar">
                      <IconButton
                        size="small"
                        onClick={() => handleAbrirDialogo(receta)}
                        color="primary"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {receta.estado !== 'activa' && (
                      <Tooltip title="Eliminar">
                        <IconButton
                          size="small"
                          onClick={() => handleEliminarReceta(receta._id!)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Diálogo de Receta */}
      <Dialog open={openReceta} onClose={handleCerrarDialogo} maxWidth="md" fullWidth>
        <DialogTitle>
          {recetaEditando ? 'Editar Receta' : 'Nueva Receta'}
        </DialogTitle>
        <DialogContent>
          {/* Alerta de error dentro del diálogo */}
          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, mt: 1 }}>
              {error}
            </Alert>
          )}
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Producto */}
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Producto</InputLabel>
                <Select
                  value={recetaForm.productoId}
                  label="Producto"
                  onChange={(e) => setRecetaForm({ ...recetaForm, productoId: e.target.value })}
                  disabled={!!recetaEditando}
                >
                  {productos.map((prod) => (
                    <MenuItem key={prod._id} value={prod._id}>
                      {prod.codigo} - {prod.nombre}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Rendimiento y Tiempo */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Rendimiento (unidades)"
                type="number"
                value={recetaForm.rendimiento}
                onChange={(e) => setRecetaForm({ ...recetaForm, rendimiento: parseFloat(e.target.value) })}
                inputProps={{ min: 1, step: 1 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Tiempo Preparación (min)"
                type="number"
                value={recetaForm.tiempoPreparacion}
                onChange={(e) => setRecetaForm({ ...recetaForm, tiempoPreparacion: parseFloat(e.target.value)})}
                inputProps={{ min: 0, step: 1 }}
              />
            </Grid>

            {/* Materias Primas */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Materias Primas
              </Typography>
            </Grid>

            {/* Agregar MP */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Materia Prima</InputLabel>
                <Select
                  value={mpSeleccionada}
                  label="Materia Prima"
                  onChange={(e) => setMpSeleccionada(e.target.value)}
                >
                  {materiasPrimas.map((mp) => (
                    <MenuItem key={mp._id} value={mp._id}>
                      {mp.codigo} - {mp.nombre} (Stock: {mp.stock})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                label="Cantidad"
                type="number"
                value={cantidadMp}
                onChange={(e) => setCantidadMp(parseFloat(e.target.value))}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={handleAgregarMateriaPrima}
                startIcon={<AddIcon />}
              >
                Agregar
              </Button>
            </Grid>

            {/* Lista de MPs */}
            <Grid item xs={12}>
              <List dense>
                {recetaForm.materiasPrimas?.map((mp, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={`${mp.codigoMateriaPrima} - ${mp.nombreMateriaPrima}`}
                      secondary={`Cantidad: ${mp.cantidad} ${mp.unidadMedida} × ${formatearMoneda(mp.costo || 0)} = ${formatearMoneda((mp.costo || 0) * mp.cantidad)}`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => handleEliminarMateriaPrima(index)}
                        color="error"
                        size="small"
                      >
                        <RemoveIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Grid>

            {/* Mano de Obra */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Mano de Obra (Operarios por Categoría)
              </Typography>
              {categorias.length === 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  No hay categorías con valor hora definido. Configure el <strong>Valor Hora</strong> en las categorías internas (Empleados → Paritarias) o verifique que existan convenios CCT activos con categorías (RRHH → Convenios CCT).
                </Alert>
              )}
            </Grid>

            {/* Agregar Mano de Obra */}
            {categorias.length > 0 && (
              <>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Categoría de Operario</InputLabel>
                    <Select
                      value={categoriaSeleccionada}
                      label="Categoría de Operario"
                      onChange={(e) => setCategoriaSeleccionada(e.target.value)}
                    >
                      {categorias.map((cat) => (
                        <MenuItem key={cat._id} value={cat._id}>
                          {cat.origen === 'convenio' ? '📋 ' : '🏢 '}{cat.nombre} ({formatearMoneda(cat.valorHora)}/hora)
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Cant. Operarios"
                    type="number"
                    value={cantidadOperarios}
                    onChange={(e) => setCantidadOperarios(parseInt(e.target.value) || 1)}
                    inputProps={{ min: 1, step: 1 }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Minutos c/u"
                    type="number"
                    value={minutosPorOperario}
                    onChange={(e) => setMinutosPorOperario(parseInt(e.target.value) || 0)}
                    inputProps={{ min: 1, step: 5 }}
                    helperText="Minutos por operario"
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={handleAgregarManoObra}
                    startIcon={<AddIcon />}
                    disabled={!categoriaSeleccionada}
                  >
                    Agregar
                  </Button>
                </Grid>
              </>
            )}

            {/* Lista de Mano de Obra */}
            <Grid item xs={12}>
              <List dense>
                {recetaForm.manoObra?.map((item, index) => {
                  const costoItem = (item.cantidadOperarios || 0) * (item.horasPorOperario || 0) * (item.valorHora || 0);
                  return (
                    <ListItem key={index} sx={{ bgcolor: 'action.hover', mb: 0.5, borderRadius: 1 }}>
                      <ListItemText
                        primary={
                          <Typography variant="body2" fontWeight="bold">
                            {item.nombreCategoria}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="textSecondary">
                            {item.cantidadOperarios} operario(s) × {Math.round((item.horasPorOperario || 0) * 60)} min × {formatearMoneda(item.valorHora)}/h = <strong>{formatearMoneda(costoItem)}</strong>
                          </Typography>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={() => handleEliminarManoObra(index)}
                          color="error"
                          size="small"
                        >
                          <RemoveIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  );
                })}
              </List>
              {(recetaForm.manoObra?.length || 0) > 0 && (
                <Box sx={{ mt: 1, p: 1, bgcolor: 'primary.light', borderRadius: 1 }}>
                  <Typography variant="body2" color="primary.contrastText" fontWeight="bold">
                    Total Mano de Obra: {formatearMoneda(calcularCostoManoObra())}
                  </Typography>
                </Box>
              )}
            </Grid>

            {/* Costos Adicionales */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Otros Costos
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Costos Indirectos"
                name="costoIndirecto"
                type="text"
                value={costoIndirectoFormatted}
                onChange={handleInputChange}
                placeholder="Ej: 500,25"
                helperText="Electricidad, gas, depreciación, etc."
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Precio Venta Sugerido"
                name="precioVentaSugerido"
                type="text"
                value={precioVentaSugeridoFormatted}
                onChange={handleInputChange}
                placeholder="Ej: 3.000,00"
                helperText="Formato: 1.000,50 (usar coma para decimales)"
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>

            {/* Margen Deseado y Cálculo Automático */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Margen Deseado (%)"
                type="number"
                value={margenDeseado}
                onChange={(e) => setMargenDeseado(parseFloat(e.target.value))}
                placeholder="Ej: 35"
                helperText="Margen objetivo para calcular precio"
                inputProps={{ min: 0, max: 99, step: 0.1 }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  const precioCalculado = calcularPrecioSugerido();
                  if (precioCalculado > 0) {
                    const formatted = formatCurrency(precioCalculado);
                    setPrecioVentaSugeridoFormatted(formatted);
                    setRecetaForm(prev => ({ ...prev, precioVentaSugerido: precioCalculado }));
                  }
                }}
                startIcon={<CalculateIcon />}
                disabled={calcularCostoUnitario() <= 0 || margenDeseado <= 0}
              >
                Calcular Precio
              </Button>
            </Grid>

            {/* Resumen de Costos */}
            <Grid item xs={12}>
              <Card variant="outlined" sx={{ bgcolor: 'grey.50' }}>
                <CardContent>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Desglose de Costos
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6} md={3}>
                      <Typography variant="caption" color="textSecondary">Materias Primas:</Typography>
                      <Typography variant="body2">{formatearMoneda((recetaForm.materiasPrimas || []).reduce((sum, mp) => sum + (mp.costo || 0) * mp.cantidad, 0))}</Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="caption" color="textSecondary">Mano de Obra:</Typography>
                      <Typography variant="body2">{formatearMoneda(calcularCostoManoObra())}</Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="caption" color="textSecondary">Costos Indirectos:</Typography>
                      <Typography variant="body2">{formatearMoneda(recetaForm.costoIndirecto || 0)}</Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="caption" color="textSecondary">Costo Total:</Typography>
                      <Typography variant="h6" color="primary">{formatearMoneda(calcularCostoTotal())}</Typography>
                    </Grid>
                  </Grid>
                  <Divider sx={{ my: 1 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">Costo Unitario (/{recetaForm.rendimiento || 1} un):</Typography>
                      <Typography variant="h6">{formatearMoneda(calcularCostoUnitario())}</Typography>
                    </Grid>
                    {recetaForm.precioVentaSugerido && recetaForm.precioVentaSugerido > 0 && (
                      <Grid item xs={6}>
                        <Typography variant="body2" color="textSecondary">Margen Bruto:</Typography>
                        <Typography
                          variant="h6"
                          color={calcularMargen() > 30 ? 'success.main' : calcularMargen() > 15 ? 'warning.main' : 'error.main'}
                        >
                          {calcularMargen().toFixed(2)}%
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Estado y Observaciones */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Estado</InputLabel>
                <Select
                  value={recetaForm.estado}
                  label="Estado"
                  onChange={(e) => setRecetaForm({ ...recetaForm, estado: e.target.value as any })}
                >
                  <MenuItem value="borrador">Borrador</MenuItem>
                  <MenuItem value="activa">Activa</MenuItem>
                  <MenuItem value="inactiva">Inactiva</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Observaciones"
                value={recetaForm.observaciones}
                onChange={(e) => setRecetaForm({ ...recetaForm, observaciones: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCerrarDialogo}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleGuardarReceta}
            disabled={loading}
          >
            {recetaEditando ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RecetasPage;
