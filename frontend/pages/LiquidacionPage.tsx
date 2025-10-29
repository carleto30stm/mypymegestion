import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  CalendarMonth as CalendarIcon,
  AttachMoney as MoneyIcon,
  Assignment as AssignmentIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { AppDispatch, RootState } from '../redux/store';
import {
  fetchPeriodos,
  createPeriodo,
  setPeriodoActual,
  fetchPeriodoById
} from '../redux/slices/liquidacionSlice';
import { formatCurrency, formatDateForDisplay } from '../utils/formatters';
import ResumenLiquidacion from '../components/ResumenLiquidacion';
import HorasExtraTab from '../components/HorasExtraTab';
import AdelantosTab from '../components/AdelantosTab';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`liquidacion-tabpanel-${index}`}
      aria-labelledby={`liquidacion-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const LiquidacionPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: periodos, periodoActual, loading, error } = useSelector(
    (state: RootState) => state.liquidacion
  );
  const user = useSelector((state: RootState) => state.auth.user);

  const [tabValue, setTabValue] = useState(0);
  const [openNuevoPeriodo, setOpenNuevoPeriodo] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    fechaInicio: '',
    fechaFin: '',
    tipo: 'quincenal' as 'quincenal' | 'mensual'
  });

  useEffect(() => {
    dispatch(fetchPeriodos());
  }, [dispatch]);

  // Seleccionar el primer período abierto o el más reciente
  useEffect(() => {
    if (periodos.length > 0 && !periodoActual) {
      const periodoAbierto = periodos.find(p => p.estado === 'abierto');
      const periodoSeleccionado = periodoAbierto || periodos[0];
      dispatch(setPeriodoActual(periodoSeleccionado));
    }
  }, [periodos, periodoActual, dispatch]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleChangePeriodo = (periodoId: string) => {
    const periodo = periodos.find(p => p._id === periodoId);
    if (periodo) {
      dispatch(setPeriodoActual(periodo));
    }
  };

  const handleOpenNuevoPeriodo = () => {
    // Generar nombre sugerido basado en la fecha actual
    const now = new Date();
    const mes = now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const quincena = now.getDate() <= 15 ? '1ra Quincena' : '2da Quincena';
    
    setFormData({
      nombre: `${mes} - ${quincena}`,
      fechaInicio: '',
      fechaFin: '',
      tipo: 'quincenal'
    });
    setOpenNuevoPeriodo(true);
  };

  const handleCloseNuevoPeriodo = () => {
    setOpenNuevoPeriodo(false);
  };

  const handleCreatePeriodo = async () => {
    try {
      await dispatch(createPeriodo(formData)).unwrap();
      setOpenNuevoPeriodo(false);
      dispatch(fetchPeriodos());
    } catch (error) {
      console.error('Error al crear período:', error);
    }
  };

  const handleRefresh = () => {
    dispatch(fetchPeriodos());
    if (periodoActual?._id) {
      dispatch(fetchPeriodoById(periodoActual._id));
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'abierto':
        return 'success';
      case 'en_revision':
        return 'warning';
      case 'cerrado':
        return 'default';
      default:
        return 'default';
    }
  };

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'abierto':
        return 'ABIERTO';
      case 'en_revision':
        return 'EN REVISIÓN';
      case 'cerrado':
        return 'CERRADO';
      default:
        return estado.toUpperCase();
    }
  };

  if (loading && periodos.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AssignmentIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Typography variant="h4" component="h1" fontWeight="bold">
            Liquidación de Sueldos
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Actualizar">
            <IconButton onClick={handleRefresh} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          {user?.userType === 'admin' && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenNuevoPeriodo}
            >
              Nuevo Período
            </Button>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Selector de Período y Estadísticas */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Período de Liquidación</InputLabel>
            <Select
              value={periodoActual?._id || ''}
              onChange={(e) => handleChangePeriodo(e.target.value)}
              label="Período de Liquidación"
            >
              {periodos.map((periodo) => (
                <MenuItem key={periodo._id} value={periodo._id}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <span>{periodo.nombre}</span>
                    <Chip
                      label={getEstadoLabel(periodo.estado)}
                      color={getEstadoColor(periodo.estado)}
                      size="small"
                      sx={{ ml: 2 }}
                    />
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        {periodoActual && (
          <>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CalendarIcon color="action" />
                    <Typography variant="caption" color="text.secondary">
                      Período
                    </Typography>
                  </Box>
                  <Typography variant="body2">
                    {formatDateForDisplay(periodoActual.fechaInicio)} -{' '}
                    {formatDateForDisplay(periodoActual.fechaFin)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <MoneyIcon color="action" />
                    <Typography variant="caption" color="text.secondary">
                      Total General
                    </Typography>
                  </Box>
                  <Typography variant="h6" color="primary.main" fontWeight="bold">
                    {formatCurrency(periodoActual.totalGeneral)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}
      </Grid>

      {/* Tabs */}
      {periodoActual && (
        <Paper sx={{ mb: 2 }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="liquidacion tabs">
            <Tab label="Resumen de Liquidación" />
            <Tab label="Horas Extra" />
            <Tab label="Adelantos y Conceptos" />
          </Tabs>
        </Paper>
      )}

      {/* Tab Panels */}
      {periodoActual ? (
        <>
          <TabPanel value={tabValue} index={0}>
            <ResumenLiquidacion periodo={periodoActual} />
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <HorasExtraTab periodo={periodoActual} />
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            <AdelantosTab periodo={periodoActual} />
          </TabPanel>
        </>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No hay períodos de liquidación
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Crea un nuevo período para comenzar a gestionar la liquidación de sueldos
          </Typography>
          {user?.userType === 'admin' && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenNuevoPeriodo}>
              Crear Primer Período
            </Button>
          )}
        </Paper>
      )}

      {/* Dialog Nuevo Período */}
      <Dialog open={openNuevoPeriodo} onClose={handleCloseNuevoPeriodo} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Nuevo Período de Liquidación</Typography>
            <IconButton onClick={handleCloseNuevoPeriodo}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Nombre del Período"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              fullWidth
              required
            />
            <FormControl fullWidth required>
              <InputLabel>Tipo de Período</InputLabel>
              <Select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value as 'quincenal' | 'mensual' })}
                label="Tipo de Período"
              >
                <MenuItem value="quincenal">Quincenal</MenuItem>
                <MenuItem value="mensual">Mensual</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Fecha de Inicio"
              type="date"
              value={formData.fechaInicio}
              onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Fecha de Fin"
              type="date"
              value={formData.fechaFin}
              onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
            <Alert severity="info">
              Se creará automáticamente una liquidación para cada empleado activo con su sueldo base.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseNuevoPeriodo}>Cancelar</Button>
          <Button
            onClick={handleCreatePeriodo}
            variant="contained"
            disabled={!formData.nombre || !formData.fechaInicio || !formData.fechaFin}
          >
            Crear Período
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LiquidacionPage;
