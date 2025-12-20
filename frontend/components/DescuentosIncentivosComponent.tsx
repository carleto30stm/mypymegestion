import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import {
  fetchDescuentos,
  addDescuento,
  updateDescuento,
  changeDescuentoEstado,
  deleteDescuento
} from '../redux/slices/descuentosEmpleadoSlice';
import {
  fetchIncentivos,
  addIncentivo,
  updateIncentivo,
  changeIncentivoEstado,
  deleteIncentivo
} from '../redux/slices/incentivosEmpleadoSlice';
import { fetchEmployees } from '../redux/slices/employeesSlice';
import { fetchPeriodos } from '../redux/slices/liquidacionSlice';
import {
  DescuentoEmpleado,
  IncentivoEmpleado,
  TIPOS_DESCUENTO,
  TIPOS_INCENTIVO,
  TipoDescuento,
  TipoIncentivo
} from '../types';
import { formatCurrency, formatNumberInput, getNumericValue } from '../utils/formatters';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Alert,
  Tooltip,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Tabs,
  Tab,
  InputAdornment,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  TrendingDown as DescuentoIcon,
  TrendingUp as IncentivoIcon,
  Warning as WarningIcon,
  Star as StarIcon
} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index} role="tabpanel">
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

const DescuentosIncentivosComponent: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: descuentos } = useSelector((state: RootState) => state.descuentosEmpleado);
  const { items: incentivos } = useSelector((state: RootState) => state.incentivosEmpleado);
  const { items: employees } = useSelector((state: RootState) => state.employees);

  const [tabValue, setTabValue] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<DescuentoEmpleado | IncentivoEmpleado | null>(null);
  const [dialogType, setDialogType] = useState<'descuento' | 'incentivo'>('descuento');

  // Filtros
  const [filterPeriodo, setFilterPeriodo] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Períodos de liquidación (para seleccionar período activo al crear registros)
  const { items: periodos } = useSelector((state: RootState) => state.liquidacion);
  const [filterEmpleado, setFilterEmpleado] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    empleadoId: '',
    tipo: '',
    motivo: '',
    monto: '',
    esPorcentaje: false,
    fecha: new Date().toISOString().split('T')[0],
    // Ahora se almacena el periodoId (LiquidacionPeriodo) seleccionado y se deriva periodoAplicacion
    periodoId: '',
    periodoAplicacion: '',
    observaciones: ''
  });

  useEffect(() => {
    // Solo cargar empleados si no hay ninguno cargado
    if (employees.length === 0) {
      dispatch(fetchEmployees());
    }

    // Cargar períodos para la selección de período activo
    if (periodos.length === 0) {
      dispatch(fetchPeriodos());
    }
  }, [dispatch, employees.length, periodos.length]);

  useEffect(() => {
    dispatch(fetchDescuentos({ periodoAplicacion: filterPeriodo }));
    dispatch(fetchIncentivos({ periodoAplicacion: filterPeriodo }));
  }, [dispatch, filterPeriodo]);

  // Computar períodos activos abiertos
  const periodosActivos = periodos.filter(p => p.estado === 'abierto');

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleOpenDialog = (type: 'descuento' | 'incentivo', item?: DescuentoEmpleado | IncentivoEmpleado) => {
    setDialogType(type);
    if (item) {
      setEditingItem(item);
      const empleadoId = typeof item.empleadoId === 'string' ? item.empleadoId : item.empleadoId._id;

      // Si viene periodoId usarlo, sino intentar buscar periodo por periodoAplicacion
      const periodoIdFromItem = (item as any).periodoId ? (typeof (item as any).periodoId === 'string' ? (item as any).periodoId : ((item as any).periodoId as any)._id) : '';

      setFormData({
        empleadoId,
        tipo: item.tipo,
        motivo: item.motivo,
        monto: item.monto.toString(),
        esPorcentaje: item.esPorcentaje,
        fecha: new Date(item.fecha).toISOString().split('T')[0],
        periodoId: periodoIdFromItem || '',
        periodoAplicacion: item.periodoAplicacion || '',
        observaciones: item.observaciones || ''
      });
    } else {
      setEditingItem(null);
      setFormData({
        empleadoId: '',
        tipo: '',
        motivo: '',
        monto: '',
        esPorcentaje: false,
        fecha: new Date().toISOString().split('T')[0],
        periodoId: periodosActivos.length > 0 ? (periodosActivos[0]._id || '') : '',
        periodoAplicacion: periodosActivos.length > 0 ? (periodosActivos[0].fechaInicio ? new Date(periodosActivos[0].fechaInicio).toISOString().slice(0,7) : '') : filterPeriodo,
        observaciones: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingItem(null);
  };

  const handleSave = async () => {
    try {
      if (dialogType === 'descuento') {
        const descuentoPayload = {
          empleadoId: formData.empleadoId,
          tipo: formData.tipo as TipoDescuento,
          motivo: formData.motivo,
          monto: getNumericValue(formData.monto),
          esPorcentaje: formData.esPorcentaje,
          fecha: formData.fecha,
          periodoAplicacion: formData.periodoAplicacion,
          observaciones: formData.observaciones
        };
        
        if (editingItem) {
          await dispatch(updateDescuento({ id: editingItem._id!, descuento: { ...descuentoPayload, periodoId: formData.periodoId } }));
        } else {
          await dispatch(addDescuento({ ...descuentoPayload, periodoId: formData.periodoId } as any));
        }
        // Refrescar por el período donde se creó (si lo conocemos)
        if (formData.periodoAplicacion) {
          dispatch(fetchDescuentos({ periodoAplicacion: formData.periodoAplicacion }));
        } else {
          dispatch(fetchDescuentos({ periodoAplicacion: filterPeriodo }));
        }
      } else {
        const incentivoPayload = {
          empleadoId: formData.empleadoId,
          tipo: formData.tipo as TipoIncentivo,
          motivo: formData.motivo,
          monto: getNumericValue(formData.monto),
          esPorcentaje: formData.esPorcentaje,
          fecha: formData.fecha,
          periodoAplicacion: formData.periodoAplicacion,
          observaciones: formData.observaciones
        };
        
        if (editingItem) {
          await dispatch(updateIncentivo({ id: editingItem._id!, incentivo: { ...incentivoPayload, periodoId: formData.periodoId } }));
        } else {
          await dispatch(addIncentivo({ ...incentivoPayload, periodoId: formData.periodoId } as any));
        }
        // Refrescar por el período donde se creó (si lo conocemos)
        if (formData.periodoAplicacion) {
          dispatch(fetchIncentivos({ periodoAplicacion: formData.periodoAplicacion }));
        } else {
          dispatch(fetchIncentivos({ periodoAplicacion: filterPeriodo }));
        }
      }
      handleCloseDialog();
    } catch (error) {
      console.error('Error al guardar:', error);
    }
  };

  const handleDelete = async (id: string, type: 'descuento' | 'incentivo') => {
    if (window.confirm(`¿Está seguro de eliminar este ${type}?`)) {
      if (type === 'descuento') {
        await dispatch(deleteDescuento(id));
      } else {
        await dispatch(deleteIncentivo(id));
      }
    }
  };

  const handleChangeEstado = async (id: string, type: 'descuento' | 'incentivo', nuevoEstado: string) => {
    if (type === 'descuento') {
      await dispatch(changeDescuentoEstado({ id, estado: nuevoEstado as any }));
    } else {
      await dispatch(changeIncentivoEstado({ id, estado: nuevoEstado as any }));
    }
  };

  const getEmpleadoNombre = (empleadoId: string | { _id: string; nombre: string; apellido: string }) => {
    if (typeof empleadoId === 'object') {
      return `${empleadoId.apellido}, ${empleadoId.nombre}`;
    }
    const emp = employees.find(e => e._id === empleadoId);
    return emp ? `${emp.apellido}, ${emp.nombre}` : 'Desconocido';
  };

  const getEstadoChip = (estado: string, type: 'descuento' | 'incentivo') => {
    const colors: Record<string, 'warning' | 'success' | 'error'> = {
      pendiente: 'warning',
      aplicado: 'success',
      pagado: 'success',
      anulado: 'error'
    };
    return <Chip label={estado.toUpperCase()} color={colors[estado] || 'default'} size="small" />;
  };

  // Calcular totales
  const totalDescuentos = descuentos
    .filter(d => d.estado !== 'anulado')
    .reduce((sum, d) => sum + (d.montoCalculado || d.monto), 0);
  
  const totalIncentivos = incentivos
    .filter(i => i.estado !== 'anulado')
    .reduce((sum, i) => sum + (i.montoCalculado || i.monto), 0);

  // Generar opciones de períodos
  const generatePeriodoOptions = () => {
    const periods = [];
    const now = new Date();
    for (let i = -1; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
      periods.push({ value, label });
    }
    return periods;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Descuentos e Incentivos
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Período</InputLabel>
            <Select
              value={filterPeriodo}
              label="Período"
              onChange={(e) => setFilterPeriodo(e.target.value)}
            >
              {generatePeriodoOptions().map((p) => (
                <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Cards de resumen */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: 'error.light', color: 'error.contrastText' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DescuentoIcon />
                <Typography variant="h6">Total Descuentos</Typography>
              </Box>
              <Typography variant="h4" sx={{ mt: 1 }}>{formatCurrency(totalDescuentos)}</Typography>
              <Typography variant="body2">{descuentos.filter(d => d.estado !== 'anulado').length} registros</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IncentivoIcon />
                <Typography variant="h6">Total Incentivos</Typography>
              </Box>
              <Typography variant="h4" sx={{ mt: 1 }}>{formatCurrency(totalIncentivos)}</Typography>
              <Typography variant="body2">{incentivos.filter(i => i.estado !== 'anulado').length} registros</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: totalIncentivos >= totalDescuentos ? 'primary.light' : 'warning.light' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StarIcon />
                <Typography variant="h6">Balance Neto</Typography>
              </Box>
              <Typography variant="h4" sx={{ mt: 1 }}>
                {formatCurrency(totalIncentivos - totalDescuentos)}
              </Typography>
              <Typography variant="body2">
                {totalIncentivos >= totalDescuentos ? 'A favor del empleado' : 'A favor empresa'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab
            icon={<DescuentoIcon />}
            label={`Descuentos (${descuentos.length})`}
            iconPosition="start"
          />
          <Tab
            icon={<IncentivoIcon />}
            label={`Incentivos (${incentivos.length})`}
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* Panel Descuentos */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button
            variant="contained"
            color="error"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog('descuento')}
          >
            Nuevo Descuento
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Empleado</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Motivo</TableCell>
                <TableCell align="right">Monto</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {descuentos.map((descuento) => (
                <TableRow key={descuento._id} hover>
                  <TableCell>{getEmpleadoNombre(descuento.empleadoId)}</TableCell>
                  <TableCell>
                    <Chip
                      icon={<WarningIcon />}
                      label={TIPOS_DESCUENTO[descuento.tipo as TipoDescuento]}
                      size="small"
                      color="error"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 200 }}>
                    <Tooltip title={descuento.motivo}>
                      <Typography variant="body2" noWrap>{descuento.motivo}</Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">
                    <Typography color="error.main" fontWeight="bold">
                      -{formatCurrency(descuento.montoCalculado || descuento.monto)}
                    </Typography>
                    {descuento.esPorcentaje && (
                      <Typography variant="caption" display="block">
                        ({descuento.monto}% del sueldo)
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{new Date(descuento.fecha).toLocaleDateString('es-AR')}</TableCell>
                  <TableCell>{getEstadoChip(descuento.estado, 'descuento')}</TableCell>
                  <TableCell align="right">
                    {descuento.estado === 'pendiente' && (
                      <>
                        <Tooltip title="Marcar como Aplicado">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleChangeEstado(descuento._id!, 'descuento', 'aplicado')}
                          >
                            <CheckIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Editar">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpenDialog('descuento', descuento)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                    {descuento.estado !== 'aplicado' && (
                      <Tooltip title="Eliminar">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(descuento._id!, 'descuento')}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    {descuento.estado === 'aplicado' && (
                      <Tooltip title="Anular">
                        <IconButton
                          size="small"
                          color="warning"
                          onClick={() => handleChangeEstado(descuento._id!, 'descuento', 'anulado')}
                        >
                          <CloseIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {descuentos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary" sx={{ py: 3 }}>
                      No hay descuentos registrados para este período
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Panel Incentivos */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button
            variant="contained"
            color="success"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog('incentivo')}
          >
            Nuevo Incentivo
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Empleado</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Motivo</TableCell>
                <TableCell align="right">Monto</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {incentivos.map((incentivo) => (
                <TableRow key={incentivo._id} hover>
                  <TableCell>{getEmpleadoNombre(incentivo.empleadoId)}</TableCell>
                  <TableCell>
                    <Chip
                      icon={<StarIcon />}
                      label={TIPOS_INCENTIVO[incentivo.tipo as TipoIncentivo]}
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 200 }}>
                    <Tooltip title={incentivo.motivo}>
                      <Typography variant="body2" noWrap>{incentivo.motivo}</Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">
                    <Typography color="success.main" fontWeight="bold">
                      +{formatCurrency(incentivo.montoCalculado || incentivo.monto)}
                    </Typography>
                    {incentivo.esPorcentaje && (
                      <Typography variant="caption" display="block">
                        ({incentivo.monto}% del sueldo)
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{new Date(incentivo.fecha).toLocaleDateString('es-AR')}</TableCell>
                  <TableCell>{getEstadoChip(incentivo.estado, 'incentivo')}</TableCell>
                  <TableCell align="right">
                    {incentivo.estado === 'pendiente' && (
                      <>
                        <Tooltip title="Marcar como Pagado">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleChangeEstado(incentivo._id!, 'incentivo', 'pagado')}
                          >
                            <CheckIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Editar">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpenDialog('incentivo', incentivo)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                    {incentivo.estado !== 'pagado' && (
                      <Tooltip title="Eliminar">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(incentivo._id!, 'incentivo')}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    {incentivo.estado === 'pagado' && (
                      <Tooltip title="Anular">
                        <IconButton
                          size="small"
                          color="warning"
                          onClick={() => handleChangeEstado(incentivo._id!, 'incentivo', 'anulado')}
                        >
                          <CloseIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {incentivos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary" sx={{ py: 3 }}>
                      No hay incentivos registrados para este período
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Dialog para crear/editar */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingItem ? 'Editar' : 'Nuevo'} {dialogType === 'descuento' ? 'Descuento' : 'Incentivo'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>Empleado</InputLabel>
              <Select
                value={formData.empleadoId}
                label="Empleado"
                onChange={(e) => setFormData({ ...formData, empleadoId: e.target.value })}
              >
                {employees
                  .filter(emp => emp.estado === 'activo')
                  .map((emp) => (
                    <MenuItem key={emp._id} value={emp._id}>
                      {emp.apellido}, {emp.nombre} - DNI: {emp.documento}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>Tipo</InputLabel>
              <Select
                value={formData.tipo}
                label="Tipo"
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
              >
                {dialogType === 'descuento'
                  ? Object.entries(TIPOS_DESCUENTO).map(([key, label]) => (
                      <MenuItem key={key} value={key}>{label}</MenuItem>
                    ))
                  : Object.entries(TIPOS_INCENTIVO).map(([key, label]) => (
                      <MenuItem key={key} value={key}>{label}</MenuItem>
                    ))}
              </Select>
            </FormControl>

            <TextField
              label="Motivo / Descripción"
              value={formData.motivo}
              onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
              fullWidth
              required
              multiline
              rows={2}
            />

            <Grid container spacing={2}>
              <Grid item xs={8}>
                <TextField
                  label={formData.esPorcentaje ? 'Porcentaje (%)' : 'Monto ($)'}
                  value={formData.monto}
                  onChange={(e) => setFormData({ ...formData, monto: formatNumberInput(e.target.value) })}
                  fullWidth
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        {formData.esPorcentaje ? '%' : '$'}
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              <Grid item xs={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.esPorcentaje}
                      onChange={(e) => setFormData({ ...formData, esPorcentaje: e.target.checked })}
                    />
                  }
                  label="Es %"
                  sx={{ mt: 1 }}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Fecha del Hecho"
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth required>
                  <InputLabel>Período Activo</InputLabel>
                  <Select
                    value={formData.periodoId}
                    label="Período Activo"
                    onChange={(e) => {
                      const selectedId = e.target.value as string;
                      const selectedPeriodo = periodos.find(p => p._id === selectedId);
                      const derivedPeriodoAplicacion = selectedPeriodo && selectedPeriodo.fechaInicio ? new Date(selectedPeriodo.fechaInicio).toISOString().slice(0,7) : '';
                      setFormData({ ...formData, periodoId: selectedId, periodoAplicacion: derivedPeriodoAplicacion });
                    }}
                  >
                    {periodosActivos.length === 0 && (
                      <MenuItem value="">-- No hay períodos activos --</MenuItem>
                    )}
                    {periodosActivos.map((p) => {
                      const label = `${p.nombre} (${p.tipo}) - ${new Date(p.fechaInicio).toLocaleDateString('es-ES')}`;
                      return <MenuItem key={p._id} value={p._id}>{label}</MenuItem>;
                    })}
                  </Select>
                </FormControl>
                {periodosActivos.length === 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Alert severity="warning">No hay períodos activos. Crea o abre un período antes de agregar descuentos/incentivos vinculados a un período.</Alert>
                  </Box>
                )}
              </Grid>
            </Grid>

            <TextField
              label="Observaciones (Opcional)"
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            color={dialogType === 'descuento' ? 'error' : 'success'}
            disabled={!formData.empleadoId || !formData.tipo || !formData.motivo || !formData.monto || !formData.periodoId || periodosActivos.length === 0}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DescuentosIncentivosComponent;
