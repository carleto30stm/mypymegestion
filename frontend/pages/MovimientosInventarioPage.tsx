import React, { useState, useEffect } from 'react';
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
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  FilterList as FilterListIcon,
  AssessmentOutlined as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  SwapHoriz as SwapHorizIcon,
  Build as BuildIcon,
  AssignmentReturn as ReturnIcon,
  Report as ReportIcon
} from '@mui/icons-material';
import { movimientosInventarioAPI, materiasPrimasAPI } from '../services/api';
import type { MovimientoInventario, MateriaPrima } from '../types';

const MovimientosInventarioPage: React.FC = () => {
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [materiasPrimas, setMateriasPrimas] = useState<MateriaPrima[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estados para filtros
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [filtroMateriaPrima, setFiltroMateriaPrima] = useState<string>('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState<string>('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState<string>('');

  // Estados para el diálogo de ajuste
  const [openAjuste, setOpenAjuste] = useState(false);
  const [ajusteForm, setAjusteForm] = useState({
    materiaPrimaId: '',
    cantidad: 0,
    tipo: 'entrada' as 'entrada' | 'salida',
    observaciones: ''
  });

  // Estados para estadísticas
  const [estadisticas, setEstadisticas] = useState<{
    totalMovimientos: number;
    porTipo?: Array<{
      _id: string;
      cantidad: number;
      totalCantidad: number;
    }>;
  } | null>(null);

  useEffect(() => {
    cargarDatos();
  }, [filtroTipo, filtroMateriaPrima, filtroFechaDesde, filtroFechaHasta]);

  const cargarDatos = async () => {
    setLoading(true);
    setError(null);
    try {
      const [movimientosData, materiasData] = await Promise.all([
        movimientosInventarioAPI.obtenerTodos({
          tipo: filtroTipo || undefined,
          materiaPrimaId: filtroMateriaPrima || undefined,
          fechaDesde: filtroFechaDesde || undefined,
          fechaHasta: filtroFechaHasta || undefined,
          limit: 100
        }),
        materiasPrimasAPI.obtenerTodas()
      ]);
      setMovimientos(movimientosData);
      setMateriasPrimas(materiasData);

      // Cargar estadísticas
      const statsData = await movimientosInventarioAPI.obtenerEstadisticas({
        fechaDesde: filtroFechaDesde || undefined,
        fechaHasta: filtroFechaHasta || undefined
      });
      setEstadisticas(statsData);
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al cargar movimientos');
      console.error('Error cargando movimientos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCrearAjuste = async () => {
    if (!ajusteForm.materiaPrimaId || ajusteForm.cantidad <= 0 || !ajusteForm.observaciones.trim()) {
      setError('Todos los campos son obligatorios y la cantidad debe ser mayor a 0');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await movimientosInventarioAPI.crearAjuste(ajusteForm);
      setSuccess('Ajuste de inventario creado exitosamente');
      setOpenAjuste(false);
      setAjusteForm({
        materiaPrimaId: '',
        cantidad: 0,
        tipo: 'entrada',
        observaciones: ''
      });
      cargarDatos();
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al crear ajuste');
      console.error('Error creando ajuste:', err);
    } finally {
      setLoading(false);
    }
  };

  const limpiarFiltros = () => {
    setFiltroTipo('');
    setFiltroMateriaPrima('');
    setFiltroFechaDesde('');
    setFiltroFechaHasta('');
  };

  const getTipoColor = (tipo: string) => {
    const colores: Record<string, "success" | "error" | "warning" | "info" | "default"> = {
      entrada: 'success',
      salida: 'error',
      ajuste: 'warning',
      produccion: 'info',
      devolucion: 'default',
      merma: 'error'
    };
    return colores[tipo] || 'default';
  };

  const getTipoIcon = (tipo: string) => {
    const iconos: Record<string, React.ReactElement> = {
      entrada: <TrendingUpIcon fontSize="small" />,
      salida: <TrendingDownIcon fontSize="small" />,
      ajuste: <SwapHorizIcon fontSize="small" />,
      produccion: <BuildIcon fontSize="small" />,
      devolucion: <ReturnIcon fontSize="small" />,
      merma: <ReportIcon fontSize="small" />
    };
    return iconos[tipo] || null;
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatearMoneda = (valor: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(valor);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Encabezado */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Movimientos de Inventario
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setOpenAjuste(true)}
          >
            Ajuste Manual
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

      {/* Estadísticas */}
      {estadisticas && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Movimientos
                </Typography>
                <Typography variant="h4">
                  {estadisticas.totalMovimientos || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          {estadisticas.porTipo && Array.isArray(estadisticas.porTipo) && estadisticas.porTipo.map((stat: any) => (
            <Grid item xs={12} md={4} key={stat._id}>
              <Card>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {getTipoIcon(stat._id)}
                    <Typography color="textSecondary" gutterBottom>
                      {stat._id.charAt(0).toUpperCase() + stat._id.slice(1)}
                    </Typography>
                  </Stack>
                  <Typography variant="h5">
                    {stat.cantidad} mov.
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total: {stat.totalCantidad ? stat.totalCantidad.toFixed(2) : '0.00'} unidades
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <FilterListIcon sx={{ mr: 1 }} />
          <Typography variant="h6">Filtros</Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo</InputLabel>
              <Select
                value={filtroTipo}
                label="Tipo"
                onChange={(e) => setFiltroTipo(e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="entrada">Entrada</MenuItem>
                <MenuItem value="salida">Salida</MenuItem>
                <MenuItem value="ajuste">Ajuste</MenuItem>
                <MenuItem value="produccion">Producción</MenuItem>
                <MenuItem value="devolucion">Devolución</MenuItem>
                <MenuItem value="merma">Merma</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Materia Prima</InputLabel>
              <Select
                value={filtroMateriaPrima}
                label="Materia Prima"
                onChange={(e) => setFiltroMateriaPrima(e.target.value)}
              >
                <MenuItem value="">Todas</MenuItem>
                {materiasPrimas.map((mp) => (
                  <MenuItem key={mp._id} value={mp._id}>
                    {mp.codigo} - {mp.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              size="small"
              label="Fecha Desde"
              type="date"
              value={filtroFechaDesde}
              onChange={(e) => setFiltroFechaDesde(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              size="small"
              label="Fecha Hasta"
              type="date"
              value={filtroFechaHasta}
              onChange={(e) => setFiltroFechaHasta(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="outlined"
              onClick={limpiarFiltros}
            >
              Limpiar
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabla de Movimientos */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Materia Prima</TableCell>
              <TableCell align="right">Cantidad</TableCell>
              <TableCell align="right">Stock Anterior</TableCell>
              <TableCell align="right">Stock Nuevo</TableCell>
              <TableCell align="right">Valor</TableCell>
              <TableCell>Documento</TableCell>
              <TableCell>Observaciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : movimientos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  No hay movimientos registrados
                </TableCell>
              </TableRow>
            ) : (
              movimientos.map((mov) => (
                <TableRow key={mov._id} hover>
                  <TableCell>{formatearFecha(mov.fecha)}</TableCell>
                  <TableCell>
                    <Chip
                      icon={getTipoIcon(mov.tipo)}
                      label={mov.tipo.charAt(0).toUpperCase() + mov.tipo.slice(1)}
                      color={getTipoColor(mov.tipo)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {mov.codigoMateriaPrima}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {mov.nombreMateriaPrima}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      color={mov.tipo === 'entrada' || mov.tipo === 'devolucion' ? 'success.main' : 'error.main'}
                    >
                      {mov.tipo === 'entrada' || mov.tipo === 'devolucion' ? '+' : '-'}
                      {mov.cantidad.toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{mov.stockAnterior.toFixed(2)}</TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="bold">
                      {mov.stockNuevo.toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {mov.valor ? formatearMoneda(mov.valor) : '-'}
                  </TableCell>
                  <TableCell>
                    {mov.documentoOrigen && (
                      <Chip
                        label={`${mov.documentoOrigen} ${mov.numeroDocumento || ''}`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {mov.observaciones || '-'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Diálogo de Ajuste Manual */}
      <Dialog open={openAjuste} onClose={() => setOpenAjuste(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ajuste Manual de Inventario</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2, mt: 1 }}>
            Los ajustes manuales deben justificarse adecuadamente. Indique el motivo en las observaciones.
          </Alert>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Materia Prima</InputLabel>
                <Select
                  value={ajusteForm.materiaPrimaId}
                  label="Materia Prima"
                  onChange={(e) => setAjusteForm({ ...ajusteForm, materiaPrimaId: e.target.value })}
                >
                  {materiasPrimas.map((mp) => (
                    <MenuItem key={mp._id} value={mp._id}>
                      {mp.codigo} - {mp.nombre} (Stock actual: {mp.stock})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Tipo de Ajuste</InputLabel>
                <Select
                  value={ajusteForm.tipo}
                  label="Tipo de Ajuste"
                  onChange={(e) => setAjusteForm({ ...ajusteForm, tipo: e.target.value as 'entrada' | 'salida' })}
                >
                  <MenuItem value="entrada">Entrada (Incrementar)</MenuItem>
                  <MenuItem value="salida">Salida (Reducir)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Cantidad"
                type="number"
                value={ajusteForm.cantidad}
                onChange={(e) => setAjusteForm({ ...ajusteForm, cantidad: parseFloat(e.target.value) || 0 })}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                multiline
                rows={3}
                label="Observaciones / Motivo del Ajuste"
                value={ajusteForm.observaciones}
                onChange={(e) => setAjusteForm({ ...ajusteForm, observaciones: e.target.value })}
                placeholder="Ej: Diferencia por inventario físico, merma por vencimiento, etc."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAjuste(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleCrearAjuste}
            disabled={loading}
          >
            Crear Ajuste
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MovimientosInventarioPage;
