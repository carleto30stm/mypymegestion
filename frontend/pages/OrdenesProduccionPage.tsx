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
  LinearProgress,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import {
  Add as AddIcon,
  PlayArrow as PlayIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { ordenesProduccionAPI, recetasAPI, productosAPI } from '../services/api';
import type { OrdenProduccion, Receta, Producto } from '../types';

const OrdenesProduccionPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [ordenes, setOrdenes] = useState<OrdenProduccion[]>([]);
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estados para filtros
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>('');

  // Estados para diálogo de nueva orden
  const [openNuevaOrden, setOpenNuevaOrden] = useState(false);
  const [ordenForm, setOrdenForm] = useState({
    recetaId: '',
    cantidadAProducir: 1,
    fecha: new Date().toISOString().split('T')[0],
    prioridad: 'media' as 'baja' | 'media' | 'alta' | 'urgente',
    responsable: '',
    observaciones: ''
  });

  // Estados para diálogo de detalles
  const [openDetalles, setOpenDetalles] = useState(false);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState<OrdenProduccion | null>(null);

  // Estados para completar orden
  const [openCompletar, setOpenCompletar] = useState(false);
  const [unidadesProducidas, setUnidadesProducidas] = useState(0);

  // Estados para cancelar orden
  const [openCancelar, setOpenCancelar] = useState(false);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');

  useEffect(() => {
    cargarDatos();
  }, [filtroEstado, filtroPrioridad]);

  const cargarDatos = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ordenesData, recetasData, productosData] = await Promise.all([
        ordenesProduccionAPI.obtenerTodas({
          estado: filtroEstado || undefined,
          prioridad: filtroPrioridad || undefined
        }),
        recetasAPI.obtenerTodas({ estado: 'activa' }),
        productosAPI.obtenerTodos()
      ]);
      setOrdenes(ordenesData);
      setRecetas(recetasData);
      setProductos(productosData);
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al cargar datos');
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCrearOrden = async () => {
    if (!ordenForm.recetaId || ordenForm.cantidadAProducir <= 0 || !ordenForm.responsable) {
      setError('Complete todos los campos obligatorios');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await ordenesProduccionAPI.crear({
        ...ordenForm,
        createdBy: (user as any)?.nombre || (user as any)?.name || 'Sistema'
      });
      setSuccess('Orden de producción creada exitosamente');
      setOpenNuevaOrden(false);
      setOrdenForm({
        recetaId: '',
        cantidadAProducir: 1,
        fecha: new Date().toISOString().split('T')[0],
        prioridad: 'media',
        responsable: '',
        observaciones: ''
      });
      cargarDatos();
    } catch (err: any) {
      console.error('Error completo:', err);
      console.error('Response data:', err.response?.data);
      
      // Manejar específicamente errores de stock insuficiente
      const errorData = err.response?.data;
      let errorMessage = 'Error al crear orden';
      
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

  const handleIniciarOrden = async (id: string) => {
    if (!confirm('¿Está seguro de iniciar esta orden de producción?')) return;

    setLoading(true);
    setError(null);
    try {
      await ordenesProduccionAPI.iniciar(id);
      setSuccess('Orden iniciada exitosamente. Materias primas reservadas.');
      cargarDatos();
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al iniciar orden');
      console.error('Error iniciando orden:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAbrirCompletar = (orden: OrdenProduccion) => {
    setOrdenSeleccionada(orden);
    setUnidadesProducidas(orden.cantidadAProducir * (orden.progreso?.porcentajeReserva === 100 ? 1 : 0));
    setOpenCompletar(true);
  };

  const handleCompletarOrden = async () => {
    if (!ordenSeleccionada || unidadesProducidas <= 0) {
      setError('Ingrese la cantidad de unidades producidas');
      return;
    }

    if (!user?.id) {
      setError('Usuario no autenticado');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await ordenesProduccionAPI.completar(ordenSeleccionada._id!, {
        unidadesProducidas,
        completadoPor: user.id
      });
      setSuccess('Orden completada. Stock actualizado y materias primas consumidas.');
      setOpenCompletar(false);
      setOrdenSeleccionada(null);
      cargarDatos();
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.mensaje || 'Error al completar orden');
      console.error('Error completando orden:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAbrirCancelar = (orden: OrdenProduccion) => {
    setOrdenSeleccionada(orden);
    setMotivoCancelacion('');
    setOpenCancelar(true);
  };

  const handleCancelarOrden = async () => {
    if (!ordenSeleccionada || !motivoCancelacion.trim()) {
      setError('Debe indicar el motivo de cancelación');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await ordenesProduccionAPI.cancelar(ordenSeleccionada._id!, motivoCancelacion);
      setSuccess('Orden cancelada exitosamente');
      setOpenCancelar(false);
      setOrdenSeleccionada(null);
      cargarDatos();
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al cancelar orden');
      console.error('Error cancelando orden:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalles = (orden: OrdenProduccion) => {
    setOrdenSeleccionada(orden);
    setOpenDetalles(true);
  };

  const formatearMoneda = (valor: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(valor);
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const getEstadoColor = (estado: string): "success" | "error" | "warning" | "info" => {
    const colores: Record<string, "success" | "error" | "warning" | "info"> = {
      planificada: 'info',
      en_proceso: 'warning',
      completada: 'success',
      cancelada: 'error'
    };
    return colores[estado] || 'info';
  };

  const getPrioridadColor = (prioridad: string): "success" | "error" | "warning" | "default" => {
    const colores: Record<string, "success" | "error" | "warning" | "default"> = {
      baja: 'default',
      media: 'info' as any,
      alta: 'warning',
      urgente: 'error'
    };
    return colores[prioridad] || 'default';
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Encabezado */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Órdenes de Producción
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setOpenNuevaOrden(true)}
          >
            Nueva Orden
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
                <MenuItem value="planificada">Planificada</MenuItem>
                <MenuItem value="en_proceso">En Proceso</MenuItem>
                <MenuItem value="completada">Completada</MenuItem>
                <MenuItem value="cancelada">Cancelada</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Prioridad</InputLabel>
              <Select
                value={filtroPrioridad}
                label="Prioridad"
                onChange={(e) => setFiltroPrioridad(e.target.value)}
              >
                <MenuItem value="">Todas</MenuItem>
                <MenuItem value="baja">Baja</MenuItem>
                <MenuItem value="media">Media</MenuItem>
                <MenuItem value="alta">Alta</MenuItem>
                <MenuItem value="urgente">Urgente</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              variant="outlined"
              onClick={() => {
                setFiltroEstado('');
                setFiltroPrioridad('');
              }}
            >
              Limpiar Filtros
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabla de Órdenes */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>N° Orden</TableCell>
              <TableCell>Producto</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell align="right">Cantidad</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Prioridad</TableCell>
              <TableCell>Responsable</TableCell>
              <TableCell align="right">Costo Total</TableCell>
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
            ) : ordenes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  No hay órdenes de producción
                </TableCell>
              </TableRow>
            ) : (
              ordenes.map((orden) => (
                <TableRow key={orden._id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {orden.numeroOrden}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{orden.codigoProducto}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {orden.nombreProducto}
                    </Typography>
                  </TableCell>
                  <TableCell>{formatearFecha(orden.fecha)}</TableCell>
                  <TableCell align="right">
                    {orden.unidadesProducidas > 0 ? (
                      <Typography variant="body2">
                        {orden.unidadesProducidas} / {orden.cantidadAProducir}
                      </Typography>
                    ) : (
                      orden.cantidadAProducir
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={orden.estado.replace('_', ' ').toUpperCase()}
                      color={getEstadoColor(orden.estado)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={orden.prioridad.toUpperCase()}
                      color={getPrioridadColor(orden.prioridad)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{orden.responsable}</TableCell>
                  <TableCell align="right">{formatearMoneda(orden.costoTotal)}</TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      <Tooltip title="Ver detalles">
                        <IconButton
                          size="small"
                          onClick={() => handleVerDetalles(orden)}
                          color="info"
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {orden.estado === 'planificada' && (
                        <>
                          <Tooltip title="Iniciar producción">
                            <IconButton
                              size="small"
                              onClick={() => handleIniciarOrden(orden._id!)}
                              color="primary"
                            >
                              <PlayIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Cancelar">
                            <IconButton
                              size="small"
                              onClick={() => handleAbrirCancelar(orden)}
                              color="error"
                            >
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      {orden.estado === 'en_proceso' && (
                        <>
                          <Tooltip title="Completar producción">
                            <IconButton
                              size="small"
                              onClick={() => handleAbrirCompletar(orden)}
                              color="success"
                            >
                              <CheckIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Cancelar">
                            <IconButton
                              size="small"
                              onClick={() => handleAbrirCancelar(orden)}
                              color="error"
                            >
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Diálogo Nueva Orden */}
      <Dialog open={openNuevaOrden} onClose={() => setOpenNuevaOrden(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nueva Orden de Producción</DialogTitle>
        <DialogContent>
          {/* Alerta de error dentro del diálogo */}
          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, mt: 1 }}>
              {error}
            </Alert>
          )}
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Receta</InputLabel>
                <Select
                  value={ordenForm.recetaId}
                  label="Receta"
                  onChange={(e) => setOrdenForm({ ...ordenForm, recetaId: e.target.value })}
                >
                  {recetas.map((receta) => (
                    <MenuItem key={receta._id} value={receta._id}>
                      {receta.nombreProducto} (v{receta.version}) - Rend: {receta.rendimiento}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Cantidad a Producir"
                type="number"
                value={ordenForm.cantidadAProducir}
                onChange={(e) => setOrdenForm({ ...ordenForm, cantidadAProducir: parseInt(e.target.value) })}
                inputProps={{ min: 1, step: 1 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Fecha"
                type="date"
                value={ordenForm.fecha}
                onChange={(e) => setOrdenForm({ ...ordenForm, fecha: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Prioridad</InputLabel>
                <Select
                  value={ordenForm.prioridad}
                  label="Prioridad"
                  onChange={(e) => setOrdenForm({ ...ordenForm, prioridad: e.target.value as any })}
                >
                  <MenuItem value="baja">Baja</MenuItem>
                  <MenuItem value="media">Media</MenuItem>
                  <MenuItem value="alta">Alta</MenuItem>
                  <MenuItem value="urgente">Urgente</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Responsable"
                value={ordenForm.responsable}
                onChange={(e) => setOrdenForm({ ...ordenForm, responsable: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Observaciones"
                value={ordenForm.observaciones}
                onChange={(e) => setOrdenForm({ ...ordenForm, observaciones: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNuevaOrden(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCrearOrden} disabled={loading}>
            Crear Orden
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo Detalles */}
      <Dialog open={openDetalles} onClose={() => setOpenDetalles(false)} maxWidth="md" fullWidth>
        <DialogTitle>Detalles de Orden - {ordenSeleccionada?.numeroOrden}</DialogTitle>
        <DialogContent>
          {ordenSeleccionada && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Información General</Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="textSecondary">Producto:</Typography>
                        <Typography variant="body1">{ordenSeleccionada.nombreProducto}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="textSecondary">Estado:</Typography>
                        <Chip
                          label={ordenSeleccionada.estado.replace('_', ' ').toUpperCase()}
                          color={getEstadoColor(ordenSeleccionada.estado)}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="textSecondary">Responsable:</Typography>
                        <Typography variant="body1">{ordenSeleccionada.responsable}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="textSecondary">Prioridad:</Typography>
                        <Chip
                          label={ordenSeleccionada.prioridad.toUpperCase()}
                          color={getPrioridadColor(ordenSeleccionada.prioridad)}
                          size="small"
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Materias Primas</Typography>
                <List dense>
                  {ordenSeleccionada.materiasPrimas.map((mp, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={`${mp.codigoMateriaPrima} - ${mp.nombreMateriaPrima}`}
                        secondary={
                          <>
                            <Typography variant="body2" component="span">
                              Necesaria: {mp.cantidadNecesaria} | 
                              Reservada: {mp.cantidadReservada} | 
                              Consumida: {mp.cantidadConsumida}
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={(mp.cantidadConsumida / mp.cantidadNecesaria) * 100}
                              sx={{ mt: 0.5 }}
                            />
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Grid>

              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Costos</Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={4}>
                        <Typography variant="body2" color="textSecondary">Materias Primas:</Typography>
                        <Typography variant="body1">{formatearMoneda(ordenSeleccionada.costoMateriasPrimas)}</Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="body2" color="textSecondary">Mano de Obra:</Typography>
                        <Typography variant="body1">{formatearMoneda(ordenSeleccionada.costoManoObra)}</Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="body2" color="textSecondary">Indirectos:</Typography>
                        <Typography variant="body1">{formatearMoneda(ordenSeleccionada.costoIndirecto)}</Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="h6" color="primary">
                          Total: {formatearMoneda(ordenSeleccionada.costoTotal)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetalles(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo Completar */}
      <Dialog open={openCompletar} onClose={() => setOpenCompletar(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Completar Producción</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
            Se consumirán las materias primas y se incrementará el stock del producto.
          </Alert>
          <TextField
            fullWidth
            required
            label="Unidades Producidas"
            type="number"
            value={unidadesProducidas}
            onChange={(e) => setUnidadesProducidas(parseInt(e.target.value) || 0)}
            inputProps={{ min: 1, step: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCompletar(false)}>Cancelar</Button>
          <Button variant="contained" color="success" onClick={handleCompletarOrden} disabled={loading}>
            Completar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo Cancelar */}
      <Dialog open={openCancelar} onClose={() => setOpenCancelar(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Cancelar Orden</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2, mt: 1 }}>
            La orden será cancelada y no se podrá revertir esta acción.
          </Alert>
          <TextField
            fullWidth
            required
            multiline
            rows={3}
            label="Motivo de Cancelación"
            value={motivoCancelacion}
            onChange={(e) => setMotivoCancelacion(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCancelar(false)}>Volver</Button>
          <Button variant="contained" color="error" onClick={handleCancelarOrden} disabled={loading}>
            Cancelar Orden
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrdenesProduccionPage;
