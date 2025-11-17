import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import {
  fetchRemitos,
  fetchRemitoById,
  generarRemitoDesdeVenta,
  actualizarEstadoRemito,
  actualizarRemito,
  eliminarRemito,
  fetchEstadisticasRemitos,
  clearError
} from '../redux/slices/remitosSlice';
import { fetchVentas } from '../redux/slices/ventasSlice';
import { ESTADOS_REMITO, Remito } from '../types';
import { generarPDFRemito, generarPDFCaratulaEnvio } from '../utils/pdfGenerator';
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
  Chip,
  Grid,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Tooltip,
  Divider
} from '@mui/material';
import {
  LocalShipping as ShippingIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Print as PrintIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { formatCurrency } from '../utils/formatters';

const RemitosPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: remitos, estadisticas, loading, error } = useSelector((state: RootState) => state.remitos);
  const { items: ventas } = useSelector((state: RootState) => state.ventas);
  const { user } = useSelector((state: RootState) => state.auth);

  const [showGenerarDialog, setShowGenerarDialog] = useState(false);
  const [showEstadoDialog, setShowEstadoDialog] = useState(false);
  const [showDetalleDialog, setShowDetalleDialog] = useState(false);
  const [showEditarDialog, setShowEditarDialog] = useState(false);
  const [remitoSeleccionado, setRemitoSeleccionado] = useState<Remito | null>(null);

  // Estados para generar remito
  const [ventaId, setVentaId] = useState('');
  const [direccionEntrega, setDireccionEntrega] = useState('');
  const [repartidor, setRepartidor] = useState('');
  const [numeroBultos, setNumeroBultos] = useState('');
  const [vehiculo, setVehiculo] = useState('');
  const [observacionesGenerar, setObservacionesGenerar] = useState('');

  // Estados para cambiar estado
  const [nuevoEstado, setNuevoEstado] = useState('');
  const [nombreReceptor, setNombreReceptor] = useState('');
  const [dniReceptor, setDniReceptor] = useState('');
  const [motivoCancelacion, setMotivoCancelacion] = useState('');

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroRepartidor, setFiltroRepartidor] = useState('');
  const [showFiltros, setShowFiltros] = useState(false);

  useEffect(() => {
    dispatch(fetchRemitos());
    dispatch(fetchVentas());
    dispatch(fetchEstadisticasRemitos());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  // Filtrar ventas disponibles (confirmadas y sin remito)
  const ventasDisponibles = ventas.filter(
    v => v.estado === 'confirmada' && v.estadoEntrega === 'sin_remito'
  );

  const handleOpenGenerarDialog = () => {
    setVentaId('');
    setDireccionEntrega('');
    setRepartidor('');
    setVehiculo('');
    setObservacionesGenerar('');
    setShowGenerarDialog(true);
  };

  const handleActualizarRemito = async () => {
    if (!remitoSeleccionado || !user?.id) return;

    try {
      await dispatch(actualizarRemito({
        id: remitoSeleccionado._id!,
        direccionEntrega,
        repartidor: repartidor || undefined,
        numeroBultos: numeroBultos || undefined,
        vehiculo: vehiculo || undefined,
        observaciones: observacionesGenerar || undefined,
        modificadoPor: user.id
      })).unwrap();

      alert('Remito actualizado correctamente.');
      setShowEditarDialog(false);
      dispatch(fetchRemitos());
      dispatch(fetchEstadisticasRemitos());
    } catch (err) {
      console.error('Error al actualizar remito:', err);
    }
  };

  const handleGenerarRemito = async () => {
    if (!ventaId || !user?.id) return;

    try {
      await dispatch(generarRemitoDesdeVenta({
        ventaId,
        direccionEntrega,
        repartidor: repartidor || undefined,
        numeroBultos: numeroBultos || undefined,
        vehiculo: vehiculo || undefined,
        observaciones: observacionesGenerar || undefined,
        creadoPor: user.id
      })).unwrap();

      setShowGenerarDialog(false);
      dispatch(fetchRemitos());
      dispatch(fetchVentas()); // Actualizar lista de ventas para reflejar cambios
      dispatch(fetchEstadisticasRemitos());
    } catch (err) {
      console.error('Error al generar remito:', err);
    }
  };

  const handleOpenEstadoDialog = (remito: Remito) => {
    setRemitoSeleccionado(remito);
    setNuevoEstado('');
    setNombreReceptor('');
    setDniReceptor('');
    setMotivoCancelacion('');
    setShowEstadoDialog(true);
  };

  const handleCambiarEstado = async () => {
    if (!remitoSeleccionado || !nuevoEstado || !user?.id) return;

    // Validaciones según estado
    if (nuevoEstado === 'entregado' && !nombreReceptor) {
      alert('El nombre del receptor es obligatorio para confirmar la entrega');
      return;
    }

    if (nuevoEstado === 'cancelado' && !motivoCancelacion) {
      alert('El motivo de cancelación es obligatorio');
      return;
    }

    try {
      await dispatch(actualizarEstadoRemito({
        id: remitoSeleccionado._id!,
        estado: nuevoEstado,
        nombreReceptor: nombreReceptor || undefined,
        dniReceptor: dniReceptor || undefined,
        motivoCancelacion: motivoCancelacion || undefined,
        modificadoPor: user.id
      })).unwrap();

      setShowEstadoDialog(false);
      dispatch(fetchVentas()); // Actualizar lista de ventas
      dispatch(fetchEstadisticasRemitos());
    } catch (err) {
      console.error('Error al cambiar estado:', err);
    }
  };

  const handleEliminarRemito = async (id: string) => {
    if (!window.confirm('¿Está seguro de eliminar este remito?')) return;

    try {
      await dispatch(eliminarRemito(id)).unwrap();
      dispatch(fetchVentas());
      dispatch(fetchEstadisticasRemitos());
    } catch (err) {
      console.error('Error al eliminar remito:', err);
    }
  };

  const handleVerDetalle = (remito: Remito) => {
    setRemitoSeleccionado(remito);
    setShowDetalleDialog(true);
  };

  const handleEditarRemito = (remito: Remito) => {
    setRemitoSeleccionado(remito);
    // Cargar datos del remito en el formulario
    setVentaId(remito.ventaId || '');
    setDireccionEntrega(remito.direccionEntrega);
    setRepartidor(remito.repartidor || '');
    setNumeroBultos(remito.numeroBultos || '');
    setVehiculo(remito.vehiculo || '');
    setObservacionesGenerar(remito.observaciones || '');
    setShowEditarDialog(true);
  };

  const handleImprimirRemito = (remito: Remito) => {
    try {
      generarPDFRemito(remito);
    } catch (err) {
      console.error('Error al generar PDF del remito:', err);
      alert('Error al generar el PDF del remito');
    }
  };

  const handleGenerarCaratulas = async (remito: Remito) => {
    try {
      // Obtener el remito completo con cliente populado usando Redux
      const resultAction = await dispatch(fetchRemitoById(remito._id!));
      
      if (fetchRemitoById.rejected.match(resultAction)) {
        throw new Error('Error al obtener datos del remito');
      }
      
      const remitoCompleto = resultAction.payload as Remito;
      const totalBultos = parseInt(remito.numeroBultos || '1');
      
      // Generar una carátula para cada bulto
      for (let i = 1; i <= totalBultos; i++) {
        generarPDFCaratulaEnvio(remitoCompleto, i, totalBultos);
        // Pequeña pausa entre descargas para evitar problemas
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (err) {
      console.error('Error al generar carátulas de envío:', err);
      alert('Error al generar las carátulas de envío');
    }
  };

  const handleAplicarFiltros = () => {
    dispatch(fetchRemitos({
      estado: filtroEstado || undefined,
      repartidor: filtroRepartidor || undefined
    }));
  };

  const handleLimpiarFiltros = () => {
    setFiltroEstado('');
    setFiltroRepartidor('');
    dispatch(fetchRemitos());
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'default';
      case 'en_transito': return 'info';
      case 'entregado': return 'success';
      case 'devuelto': return 'warning';
      case 'cancelado': return 'error';
      default: return 'default';
    }
  };

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'Pendiente';
      case 'en_transito': return 'En Tránsito';
      case 'entregado': return 'Entregado';
      case 'devuelto': return 'Devuelto';
      case 'cancelado': return 'Cancelado';
      default: return estado;
    }
  };

  const getEstadosPermitidos = (estadoActual: string): string[] => {
    switch (estadoActual) {
      case 'pendiente': return ['en_transito', 'cancelado'];
      case 'en_transito': return ['entregado', 'devuelto', 'cancelado'];
      case 'devuelto': return ['pendiente'];
      default: return [];
    }
  };

  const canEdit = user?.userType === 'admin' || user?.userType === 'oper_ad' || user?.userType === 'oper';

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <ShippingIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4">Remitos de Entrega</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={() => setShowFiltros(!showFiltros)}
          >
            Filtros
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenGenerarDialog}
          >
            Generar Remito
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch(clearError())}>
          {error}
        </Alert>
      )}

      {/* Estadísticas */}
      {estadisticas && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Pendientes
                </Typography>
                <Typography variant="h4">{estadisticas.pendiente}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  En Tránsito
                </Typography>
                <Typography variant="h4" color="info.main">{estadisticas.en_transito}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Entregados
                </Typography>
                <Typography variant="h4" color="success.main">{estadisticas.entregado}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Devueltos
                </Typography>
                <Typography variant="h4" color="warning.main">{estadisticas.devueltos}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Cancelados
                </Typography>
                <Typography variant="h4" color="error.main">{estadisticas.cancelados}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Panel de Filtros */}
      {showFiltros && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Filtros</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Estado</InputLabel>
                <Select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  label="Estado"
                >
                  <MenuItem value="">Todos</MenuItem>
                  {ESTADOS_REMITO.map(estado => (
                    <MenuItem key={estado} value={estado}>
                      {getEstadoLabel(estado)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Repartidor"
                value={filtroRepartidor}
                onChange={(e) => setFiltroRepartidor(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button variant="contained" onClick={handleAplicarFiltros} fullWidth>
                Aplicar
              </Button>
              <Button variant="outlined" onClick={handleLimpiarFiltros} fullWidth>
                Limpiar
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Tabla de Remitos */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>N° Remito</strong></TableCell>
              <TableCell><strong>Fecha</strong></TableCell>
              <TableCell><strong>Cliente</strong></TableCell>
              <TableCell><strong>Dirección</strong></TableCell>
              <TableCell><strong>Repartidor</strong></TableCell>
              <TableCell><strong>Estado</strong></TableCell>
              <TableCell align="center"><strong>Acciones</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {remitos.map((remito) => (
              <TableRow key={remito._id}>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {remito.numeroRemito}
                  </Typography>
                </TableCell>
                <TableCell>
                  {new Date(remito.fecha).toLocaleDateString('es-AR')}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{remito.nombreCliente}</Typography>
                  <Typography variant="caption" color="textSecondary">
                    {remito.documentoCliente}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" sx={{ display: 'block', maxWidth: 200 }}>
                    {remito.direccionEntrega}
                  </Typography>
                </TableCell>
                <TableCell>
                  {remito.repartidor || '-'}
                </TableCell>
                <TableCell>
                  <Chip
                    label={getEstadoLabel(remito.estado)}
                    color={getEstadoColor(remito.estado) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                    <Tooltip title="Ver detalle">
                      <IconButton size="small" onClick={() => handleVerDetalle(remito)}>
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {remito.estado !== 'entregado' && remito.estado !== 'cancelado' && canEdit && (
                      <Tooltip title="Cambiar estado">
                        <IconButton 
                          size="small" 
                          color="primary" 
                          onClick={() => handleOpenEstadoDialog(remito)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Imprimir">
                      <IconButton size="small" color="info" onClick={() => handleImprimirRemito(remito)}>
                        <PrintIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Generar Carátulas de Envío">
                      <IconButton size="small" color="secondary" onClick={() => handleGenerarCaratulas(remito)}>
                        <ShippingIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {user?.userType === 'admin' && remito.estado !== 'entregado' && (
                      <Tooltip title="Eliminar">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleEliminarRemito(remito._id!)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {remitos.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="textSecondary">
                    No hay remitos registrados
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog: Generar/Editar Remito */}
      <Dialog open={showGenerarDialog || showEditarDialog} onClose={() => {
        setShowGenerarDialog(false);
        setShowEditarDialog(false);
      }} maxWidth="sm" fullWidth>
        <DialogTitle>
          {showEditarDialog ? 'Editar Remito' : 'Generar Remito desde Venta'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }} disabled={showEditarDialog}>
              <InputLabel>Venta *</InputLabel>
              <Select
                value={ventaId}
                onChange={(e) => {
                  setVentaId(e.target.value);
                  const venta = ventas.find(v => v._id === e.target.value);
                  if (venta && venta.direccionEntrega) {
                    setDireccionEntrega(venta.direccionEntrega);
                  }
                }}
                label="Venta *"
                disabled={showEditarDialog}
              >
                {ventasDisponibles.map((venta) => (
                  <MenuItem key={venta._id} value={venta._id}>
                    {venta.numeroVenta || venta._id} - {venta.nombreCliente} - {formatCurrency(venta.total)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Dirección de Entrega *"
              value={direccionEntrega}
              onChange={(e) => setDireccionEntrega(e.target.value)}
              multiline
              rows={2}
              helperText="Si no se especifica, se usará la de la venta o del cliente"
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Repartidor</InputLabel>
              <Select
                value={repartidor}
                onChange={(e) => setRepartidor(e.target.value)}
                label="Repartidor"
              >
                <MenuItem value="correo">Correo</MenuItem>
                <MenuItem value="kurt">Kurt</MenuItem>
              </Select>
            </FormControl>
            {/* si es correo agregar otro campo para ingresar numero de bultos */}
            {repartidor === 'correo' && (
              <TextField
                fullWidth
                label="Número de Bultos"
                value={numeroBultos}
                onChange={(e) => setNumeroBultos(e.target.value)}
                sx={{ mb: 2 }}
              />
            )}

            <TextField
              fullWidth
              label="Vehículo"
              value={vehiculo}
              onChange={(e) => setVehiculo(e.target.value)}
              placeholder="Ej: Furgón - Patente ABC123"
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Observaciones"
              value={observacionesGenerar}
              onChange={(e) => setObservacionesGenerar(e.target.value)}
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setShowGenerarDialog(false);
            setShowEditarDialog(false);
          }}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={showEditarDialog ? handleActualizarRemito : handleGenerarRemito}
            disabled={(!ventaId && !showEditarDialog) || loading}
          >
            {showEditarDialog ? 'Actualizar Remito' : 'Generar Remito'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Cambiar Estado */}
      <Dialog open={showEstadoDialog} onClose={() => setShowEstadoDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cambiar Estado del Remito</DialogTitle>
        <DialogContent>
          {remitoSeleccionado && (
            <Box sx={{ pt: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Remito:</strong> {remitoSeleccionado.numeroRemito}<br />
                  <strong>Estado actual:</strong> {getEstadoLabel(remitoSeleccionado.estado)}
                </Typography>
              </Alert>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Nuevo Estado *</InputLabel>
                <Select
                  value={nuevoEstado}
                  onChange={(e) => setNuevoEstado(e.target.value)}
                  label="Nuevo Estado *"
                >
                  {getEstadosPermitidos(remitoSeleccionado.estado).map(estado => (
                    <MenuItem key={estado} value={estado}>
                      {getEstadoLabel(estado)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {nuevoEstado === 'entregado' && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    Datos de Entrega
                  </Typography>
                  <TextField
                    fullWidth
                    label="Nombre del Receptor *"
                    value={nombreReceptor}
                    onChange={(e) => setNombreReceptor(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="DNI del Receptor"
                    value={dniReceptor}
                    onChange={(e) => setDniReceptor(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                </>
              )}

              {nuevoEstado === 'cancelado' && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <TextField
                    fullWidth
                    label="Motivo de Cancelación *"
                    value={motivoCancelacion}
                    onChange={(e) => setMotivoCancelacion(e.target.value)}
                    multiline
                    rows={3}
                    helperText="Requerido para cancelar el remito"
                  />
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEstadoDialog(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleCambiarEstado}
            disabled={!nuevoEstado || loading}
            color={nuevoEstado === 'cancelado' ? 'error' : 'primary'}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Ver Detalle */}
      <Dialog open={showDetalleDialog} onClose={() => setShowDetalleDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Detalle del Remito</Typography>
            <IconButton onClick={() => remitoSeleccionado && handleImprimirRemito(remitoSeleccionado)}>
              <PrintIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {remitoSeleccionado && (
            <Box>
              {/* Información General */}
              <Paper sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">Número de Remito</Typography>
                    <Typography variant="body1" fontWeight="bold">{remitoSeleccionado.numeroRemito}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">Fecha</Typography>
                    <Typography variant="body1">
                      {new Date(remitoSeleccionado.fecha).toLocaleDateString('es-AR')}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">Cliente</Typography>
                    <Typography variant="body1">{remitoSeleccionado.nombreCliente}</Typography>
                    <Typography variant="caption">{remitoSeleccionado.documentoCliente}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">Estado</Typography>
                    <Box>
                      <Chip
                        label={getEstadoLabel(remitoSeleccionado.estado)}
                        color={getEstadoColor(remitoSeleccionado.estado) as any}
                        size="small"
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="textSecondary">Dirección de Entrega</Typography>
                    <Typography variant="body1">{remitoSeleccionado.direccionEntrega}</Typography>
                  </Grid>
                  {remitoSeleccionado.repartidor && (
                    <Grid item xs={6}>
                      <Typography variant="caption" color="textSecondary">Repartidor</Typography>
                      <Typography variant="body1">{remitoSeleccionado.repartidor}</Typography>
                    </Grid>
                  )}
                  {remitoSeleccionado.numeroBultos && (
                    <Grid item xs={6}>
                      <Typography variant="caption" color="textSecondary">Número de Bultos</Typography>
                      <Typography variant="body1">{remitoSeleccionado.numeroBultos}</Typography>
                    </Grid>
                  )}
                  {remitoSeleccionado.vehiculo && (
                    <Grid item xs={6}>
                      <Typography variant="caption" color="textSecondary">Vehículo</Typography>
                      <Typography variant="body1">{remitoSeleccionado.vehiculo}</Typography>
                    </Grid>
                  )}
                </Grid>
              </Paper>

              {/* Items */}
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Items del Remito
              </Typography>
              <TableContainer component={Paper} sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Código</strong></TableCell>
                      <TableCell><strong>Producto</strong></TableCell>
                      <TableCell align="center"><strong>Solicitado</strong></TableCell>
                      <TableCell align="center"><strong>Entregado</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {remitoSeleccionado.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.codigoProducto}</TableCell>
                        <TableCell>{item.nombreProducto}</TableCell>
                        <TableCell align="center">{item.cantidadSolicitada}</TableCell>
                        <TableCell align="center">
                          <Typography
                            color={item.cantidadEntregada < item.cantidadSolicitada ? 'error' : 'inherit'}
                          >
                            {item.cantidadEntregada}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Información de Entrega */}
              {remitoSeleccionado.estado === 'entregado' && (
                <Paper sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                    Información de Entrega
                  </Typography>
                  <Grid container spacing={2}>
                    {remitoSeleccionado.horaEntrega && (
                      <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary">Fecha/Hora de Entrega</Typography>
                        <Typography variant="body2">
                          {new Date(remitoSeleccionado.horaEntrega).toLocaleString('es-AR')}
                        </Typography>
                      </Grid>
                    )}
                    {remitoSeleccionado.nombreReceptor && (
                      <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary">Receptor</Typography>
                        <Typography variant="body2">{remitoSeleccionado.nombreReceptor}</Typography>
                        {remitoSeleccionado.dniReceptor && (
                          <Typography variant="caption">DNI: {remitoSeleccionado.dniReceptor}</Typography>
                        )}
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              )}

              {/* Información de Cancelación */}
              {remitoSeleccionado.estado === 'cancelado' && remitoSeleccionado.motivoCancelacion && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Motivo de Cancelación:</strong> {remitoSeleccionado.motivoCancelacion}
                  </Typography>
                </Alert>
              )}

              {/* Observaciones */}
              {remitoSeleccionado.observaciones && (
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                    Observaciones
                  </Typography>
                  <Typography variant="body2">{remitoSeleccionado.observaciones}</Typography>
                </Paper>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {canEdit && remitoSeleccionado?.estado !== 'entregado' && remitoSeleccionado?.estado !== 'cancelado' && (
            <Button
              variant="outlined"
              color="primary"
              onClick={() => {
                setShowDetalleDialog(false);
                if (remitoSeleccionado) {
                  handleEditarRemito(remitoSeleccionado);
                }
              }}
              sx={{ mr: 1 }}
            >
              Editar
            </Button>
          )}
          <Button onClick={() => setShowDetalleDialog(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RemitosPage;
