import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  LinearProgress
} from '@mui/material';
import {
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  Description as DescriptionIcon,
  AccountBalance as AccountBalanceIcon,
  Receipt as ReceiptIcon,
  CalendarMonth as CalendarIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Celebration as CelebrationIcon,
  WorkHistory as WorkHistoryIcon,
  Assessment as AssessmentIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { formatCurrency, formatDateForDisplay, formatNumberInput, getNumericValue } from '../utils/formatters';
import {
  conveniosAPI,
  f931API,
  antiguedadAPI,
  libroSueldosAPI,
  recibosSueldoAPI
} from '../services/rrhhService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const RRHHPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados para cada sección
  const [convenios, setConvenios] = useState<any[]>([]);
  const [paritarias, setParitarias] = useState<any>(null);
  const [alertasParitarias, setAlertasParitarias] = useState<any>(null);
  const [estadisticasAntiguedad, setEstadisticasAntiguedad] = useState<any>(null);
  const [alertasAniversarios, setAlertasAniversarios] = useState<any>(null);
  const [rankingAntiguedad, setRankingAntiguedad] = useState<any>(null);
  const [historialF931, setHistorialF931] = useState<any>(null);
  const [historialLibro, setHistorialLibro] = useState<any>(null);

  // Dialog states
  const [openParitariaDialog, setOpenParitariaDialog] = useState(false);
  const [openConvenioDialog, setOpenConvenioDialog] = useState(false);
  const [selectedConvenio, setSelectedConvenio] = useState<any>(null);
  const [editingConvenio, setEditingConvenio] = useState<any>(null);
  const [paritariaForm, setParitariaForm] = useState({
    tipoAjuste: 'paritaria',
    porcentajeAumento: '',
    montoFijo: '',
    descripcion: '',
    aplicadoA: 'todas'
  });
  
  // Form para crear/editar convenio
  const [convenioForm, setConvenioForm] = useState({
    numero: '',
    nombre: '',
    sindicato: '',
    estado: 'vigente',
    fechaVigenciaDesde: new Date().toISOString().split('T')[0],
    categorias: [] as { nombre: string; codigo: string; salarioBasico: number; orden: number }[]
  });
  const [nuevaCategoria, setNuevaCategoria] = useState({
    nombre: '',
    codigo: '',
    salarioBasico: ''
  });
  const [salarioBasicoFormatted, setSalarioBasicoFormatted] = useState('');

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Cargar datos iniciales según tab
  useEffect(() => {
    loadTabData(tabValue);
  }, [tabValue]);

  const loadTabData = async (tab: number) => {
    setLoading(true);
    setError(null);
    try {
      switch (tab) {
        case 0: // Convenios y Paritarias
          const [convData, paritData, alertasData] = await Promise.all([
            conveniosAPI.obtenerTodos(),
            conveniosAPI.getTodasParitarias(),
            conveniosAPI.getAlertasParitarias()
          ]);
          setConvenios(convData);
          setParitarias(paritData);
          setAlertasParitarias(alertasData);
          break;
        case 1: // Antigüedad
          const [estAnt, alertasAniv, ranking] = await Promise.all([
            antiguedadAPI.getEstadisticas(),
            antiguedadAPI.getAlertas(30),
            antiguedadAPI.getRanking(10)
          ]);
          setEstadisticasAntiguedad(estAnt);
          setAlertasAniversarios(alertasAniv);
          setRankingAntiguedad(ranking);
          break;
        case 2: // F931 y Libro Sueldos
          const [f931Data, libroData] = await Promise.all([
            f931API.getHistorial(),
            libroSueldosAPI.getHistorial()
          ]);
          setHistorialF931(f931Data);
          setHistorialLibro(libroData);
          break;
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadTabData(tabValue);
  };

  // Registrar Paritaria
  const handleOpenParitariaDialog = (convenio: any) => {
    setSelectedConvenio(convenio);
    setParitariaForm({
      tipoAjuste: 'paritaria',
      porcentajeAumento: '',
      montoFijo: '',
      descripcion: '',
      aplicadoA: 'todas'
    });
    setOpenParitariaDialog(true);
  };

  // Abrir dialog para nuevo convenio
  const handleOpenNuevoConvenio = () => {
    setEditingConvenio(null);
    setConvenioForm({
      numero: '',
      nombre: '',
      sindicato: '',
      estado: 'vigente',
      fechaVigenciaDesde: new Date().toISOString().split('T')[0],
      categorias: []
    });
    setNuevaCategoria({ nombre: '', codigo: '', salarioBasico: '' });
    setSalarioBasicoFormatted('');
    setOpenConvenioDialog(true);
  };

  // Abrir dialog para editar convenio
  const handleOpenEditarConvenio = (convenio: any) => {
    setEditingConvenio(convenio);
    setConvenioForm({
      numero: convenio.numero || '',
      nombre: convenio.nombre || '',
      sindicato: convenio.sindicato || '',
      estado: convenio.estado || 'vigente',
      fechaVigenciaDesde: convenio.fechaVigenciaDesde?.split('T')[0] || new Date().toISOString().split('T')[0],
      categorias: convenio.categorias?.map((c: any, idx: number) => ({
        nombre: c.nombre,
        codigo: c.codigo || '',
        salarioBasico: c.salarioBasico,
        orden: c.orden || idx
      })) || []
    });
    setNuevaCategoria({ nombre: '', codigo: '', salarioBasico: '' });
    setSalarioBasicoFormatted('');
    setOpenConvenioDialog(true);
  };

  // Agregar categoría al convenio
  const handleAgregarCategoria = () => {
    const salarioNumerico = getNumericValue(salarioBasicoFormatted);
    if (nuevaCategoria.nombre && salarioNumerico > 0) {
      setConvenioForm(prev => ({
        ...prev,
        categorias: [
          ...prev.categorias,
          {
            nombre: nuevaCategoria.nombre,
            codigo: nuevaCategoria.codigo || nuevaCategoria.nombre.substring(0, 3).toUpperCase(),
            salarioBasico: salarioNumerico,
            orden: prev.categorias.length
          }
        ]
      }));
      setNuevaCategoria({ nombre: '', codigo: '', salarioBasico: '' });
      setSalarioBasicoFormatted('');
    }
  };

  // Eliminar categoría del convenio
  const handleEliminarCategoria = (index: number) => {
    setConvenioForm(prev => ({
      ...prev,
      categorias: prev.categorias.filter((_, i) => i !== index)
    }));
  };

  // Guardar convenio (crear o actualizar)
  const handleGuardarConvenio = async () => {
    if (!convenioForm.numero || !convenioForm.nombre) {
      setError('Número y nombre son obligatorios');
      return;
    }
    
    try {
      setLoading(true);
      if (editingConvenio) {
        await conveniosAPI.actualizar(editingConvenio._id, convenioForm);
      } else {
        await conveniosAPI.crear(convenioForm);
      }
      setOpenConvenioDialog(false);
      loadTabData(0);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar convenio');
    } finally {
      setLoading(false);
    }
  };

  // Eliminar convenio
  const handleEliminarConvenio = async (convenioId: string) => {
    if (!window.confirm('¿Está seguro de eliminar este convenio? Esta acción no se puede deshacer.')) {
      return;
    }
    
    try {
      setLoading(true);
      await conveniosAPI.eliminar(convenioId);
      loadTabData(0);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al eliminar convenio');
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrarParitaria = async () => {
    if (!selectedConvenio) return;
    
    try {
      setLoading(true);
      await conveniosAPI.registrarParitaria(selectedConvenio._id, {
        tipoAjuste: paritariaForm.tipoAjuste as any,
        porcentajeAumento: parseFloat(paritariaForm.porcentajeAumento),
        montoFijo: paritariaForm.montoFijo ? parseFloat(paritariaForm.montoFijo) : undefined,
        descripcion: paritariaForm.descripcion,
        aplicadoA: paritariaForm.aplicadoA as any
      });
      setOpenParitariaDialog(false);
      loadTabData(0);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al registrar paritaria');
    } finally {
      setLoading(false);
    }
  };

  // Exportar F931
  const handleExportarF931 = async (periodoId: string) => {
    try {
      setLoading(true);
      await f931API.exportarTXT(periodoId);
    } catch (err: any) {
      setError('Error al exportar F931');
    } finally {
      setLoading(false);
    }
  };

  // Exportar Libro Sueldos
  const handleExportarLibro = async (periodoId: string, formato: 'txt' | 'excel') => {
    try {
      setLoading(true);
      if (formato === 'txt') {
        await libroSueldosAPI.exportarTXT(periodoId);
      } else {
        await libroSueldosAPI.exportarExcel(periodoId);
      }
    } catch (err: any) {
      setError('Error al exportar Libro de Sueldos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <PeopleIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" component="h1" fontWeight="bold">
              Recursos Humanos
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Convenios, Paritarias, Antigüedad y Reportes AFIP
            </Typography>
          </Box>
        </Box>
        <Tooltip title="Actualizar">
          <IconButton onClick={handleRefresh} color="primary" disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab icon={<TrendingUpIcon />} label="Convenios y Paritarias" iconPosition="start" />
          <Tab icon={<WorkHistoryIcon />} label="Antigüedad" iconPosition="start" />
          <Tab icon={<DescriptionIcon />} label="F931 y Libro Sueldos" iconPosition="start" />
        </Tabs>
      </Paper>

      {/* TAB 0: Convenios y Paritarias */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {/* Texto de ayuda */}
          <Grid item xs={12}>
            <Alert severity="info" icon={false}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                💡 ¿Cuándo usar esta sección?
              </Typography>
              <Typography variant="body2">
                • <strong>Convenios Colectivos (CCT):</strong> Registra convenios sindicales oficiales (130/75 Comercio, 40/89 Construcción, etc.)<br />
                • <strong>Paritarias legales:</strong> Aplica aumentos negociados por sindicatos con historial y fechas<br />
                • <strong>Empleados formales:</strong> Personal registrado ante AFIP bajo un convenio<br />
                • <strong>Auditorías y cumplimiento:</strong> Mantén historial de todos los ajustes para inspecciones<br />
                <Box component="span" sx={{ color: 'text.secondary', fontSize: '0.85em', display: 'block', mt: 1 }}>
                  📋 Para categorías internas de la empresa y aumentos propios, usa <strong>Empleados → Paritarias/Categorías</strong>
                </Box>
              </Typography>
            </Alert>
          </Grid>

          {/* Alertas de Paritarias */}
          {alertasParitarias?.alertas?.length > 0 && (
            <Grid item xs={12}>
              <Alert severity="warning" icon={<WarningIcon />}>
                <Typography variant="subtitle2" fontWeight="bold">
                  Alertas de Paritarias
                </Typography>
                {alertasParitarias.alertas.map((alerta: any, idx: number) => (
                  <Typography key={idx} variant="body2">
                    • {alerta.convenio}: {alerta.mensaje}
                  </Typography>
                ))}
              </Alert>
            </Grid>
          )}

          {/* Lista de Convenios */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Convenios Colectivos</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleOpenNuevoConvenio}
                >
                  Nuevo Convenio
                </Button>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Convenio</TableCell>
                      <TableCell>Sindicato</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell>Categorías</TableCell>
                      <TableCell>Último Ajuste</TableCell>
                      <TableCell align="right">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {convenios.map((conv) => (
                      <TableRow key={conv._id} hover>
                        <TableCell>
                          <Typography fontWeight="medium">{conv.numero}</Typography>
                          <Typography variant="caption" color="text.secondary">{conv.nombre}</Typography>
                        </TableCell>
                        <TableCell>{conv.sindicato}</TableCell>
                        <TableCell>
                          <Chip
                            label={conv.estado}
                            size="small"
                            color={conv.estado === 'vigente' ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell>{conv.categorias?.length || 0}</TableCell>
                        <TableCell>
                          {conv.historialAjustes?.length > 0 ? (
                            <Typography variant="body2">
                              {formatDateForDisplay(conv.historialAjustes[conv.historialAjustes.length - 1].fecha)}
                              <br />
                              <Typography component="span" color="success.main" variant="caption">
                                +{conv.historialAjustes[conv.historialAjustes.length - 1].porcentajeAumento}%
                              </Typography>
                            </Typography>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                            <Tooltip title="Registrar Paritaria">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleOpenParitariaDialog(conv)}
                              >
                                <TrendingUpIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Editar">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleOpenEditarConvenio(conv)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Eliminar">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleEliminarConvenio(conv._id)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                    {convenios.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Box sx={{ py: 3 }}>
                            <Typography color="text.secondary" gutterBottom>
                              No hay convenios registrados
                            </Typography>
                            <Button
                              variant="outlined"
                              startIcon={<AddIcon />}
                              onClick={handleOpenNuevoConvenio}
                            >
                              Agregar primer convenio
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Resumen de Paritarias */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <HistoryIcon color="primary" />
                  <Typography variant="h6">Historial de Paritarias</Typography>
                </Box>
                {paritarias?.paritarias?.length > 0 ? (
                  <List dense>
                    {paritarias.paritarias.slice(0, 5).map((p: any, idx: number) => (
                      <ListItem key={idx} divider>
                        <ListItemIcon>
                          <TrendingUpIcon color="success" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={`${p.convenio} - +${p.porcentajeAumento}%`}
                          secondary={`${formatDateForDisplay(p.fecha)} - ${p.descripcion}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography color="text.secondary" variant="body2">
                    No hay paritarias registradas este año
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* TAB 1: Antigüedad */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          {/* Alertas de Aniversarios */}
          {alertasAniversarios?.alertas?.length > 0 && (
            <Grid item xs={12}>
              <Alert severity="info" icon={<CelebrationIcon />}>
                <Typography variant="subtitle2" fontWeight="bold">
                  Aniversarios Próximos (30 días)
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {alertasAniversarios.alertas.slice(0, 5).map((alerta: any, idx: number) => (
                    <Chip
                      key={idx}
                      icon={<CalendarIcon />}
                      label={`${alerta.empleado.apellido}, ${alerta.empleado.nombre} - ${alerta.aniversario.aniosCumplira} años (${alerta.aniversario.diasRestantes} días)`}
                      size="small"
                      color="info"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Alert>
            </Grid>
          )}

          {/* Estadísticas */}
          <Grid item xs={12} md={8}>
            <Grid container spacing={2}>
              <Grid item xs={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" variant="caption">Total Empleados</Typography>
                    <Typography variant="h4" color="primary">
                      {estadisticasAntiguedad?.totalEmpleados || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" variant="caption">Promedio Antigüedad</Typography>
                    <Typography variant="h4" color="primary">
                      {estadisticasAntiguedad?.promedioAnios || 0}
                      <Typography component="span" variant="body2"> años</Typography>
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" variant="caption">Más Antiguo</Typography>
                    <Typography variant="body1" fontWeight="bold" noWrap>
                      {estadisticasAntiguedad?.empleadoMasAntiguo?.nombre || '-'}
                    </Typography>
                    <Typography variant="caption" color="success.main">
                      {estadisticasAntiguedad?.empleadoMasAntiguo?.antiguedad?.descripcion}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" variant="caption">Más de 10 años</Typography>
                    <Typography variant="h4" color="success.main">
                      {estadisticasAntiguedad?.distribucion?.masde10anios || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Distribución */}
              <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>Distribución por Antigüedad</Typography>
                  <Grid container spacing={1}>
                    {[
                      { label: '< 1 año', key: 'menosDeUnAnio', color: '#e3f2fd' },
                      { label: '1-3 años', key: 'de1a3anios', color: '#bbdefb' },
                      { label: '3-5 años', key: 'de3a5anios', color: '#90caf9' },
                      { label: '5-10 años', key: 'de5a10anios', color: '#64b5f6' },
                      { label: '10+ años', key: 'masde10anios', color: '#1976d2' }
                    ].map((item) => (
                      <Grid item xs={12} sm={2.4} key={item.key}>
                        <Box sx={{ 
                          p: 2, 
                          bgcolor: item.color, 
                          borderRadius: 1, 
                          textAlign: 'center' 
                        }}>
                          <Typography variant="h5" fontWeight="bold">
                            {estadisticasAntiguedad?.distribucion?.[item.key] || 0}
                          </Typography>
                          <Typography variant="caption">{item.label}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </Grid>
            </Grid>
          </Grid>

          {/* Ranking */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Top 10 Antigüedad
              </Typography>
              <List dense>
                {rankingAntiguedad?.ranking?.map((item: any) => (
                  <ListItem key={item.posicion} divider>
                    <ListItemIcon>
                      <Chip
                        label={`#${item.posicion}`}
                        size="small"
                        color={item.posicion <= 3 ? 'primary' : 'default'}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={`${item.empleado.apellido}, ${item.empleado.nombre}`}
                      secondary={item.antiguedad.descripcion}
                    />
                  </ListItem>
                ))}
                {(!rankingAntiguedad?.ranking || rankingAntiguedad.ranking.length === 0) && (
                  <ListItem>
                    <ListItemText primary="No hay datos" />
                  </ListItem>
                )}
              </List>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* TAB 2: F931 y Libro Sueldos */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          {/* F931 */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <AccountBalanceIcon color="primary" />
                <Typography variant="h6">Formulario 931 AFIP</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Declaración Jurada de Aportes y Contribuciones (SIPA)
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Período</TableCell>
                      <TableCell>Empleados</TableCell>
                      <TableCell align="right">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {historialF931?.periodos?.map((periodo: any) => (
                      <TableRow key={periodo.periodoId} hover>
                        <TableCell>
                          <Typography fontWeight="medium">{periodo.nombre}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDateForDisplay(periodo.fechaInicio)} - {formatDateForDisplay(periodo.fechaFin)}
                          </Typography>
                        </TableCell>
                        <TableCell>{periodo.cantidadEmpleados}</TableCell>
                        <TableCell align="right">
                          <Tooltip title="Exportar TXT SICOSS">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleExportarF931(periodo.periodoId)}
                            >
                              <DownloadIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!historialF931?.periodos || historialF931.periodos.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          No hay períodos cerrados disponibles
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Libro de Sueldos */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <DescriptionIcon color="primary" />
                <Typography variant="h6">Libro de Sueldos Digital</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                RG AFIP 4003/2017 - Registro obligatorio de remuneraciones
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Período</TableCell>
                      <TableCell>Liquidaciones</TableCell>
                      <TableCell align="right">Exportar</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {historialLibro?.periodos?.map((periodo: any) => (
                      <TableRow key={periodo.periodoId} hover>
                        <TableCell>
                          <Typography fontWeight="medium">{periodo.nombre}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDateForDisplay(periodo.fechaInicio)} - {formatDateForDisplay(periodo.fechaFin)}
                          </Typography>
                        </TableCell>
                        <TableCell>{periodo.cantidadLiquidaciones}</TableCell>
                        <TableCell align="right">
                          <Tooltip title="Exportar TXT">
                            <IconButton
                              size="small"
                              onClick={() => handleExportarLibro(periodo.periodoId, 'txt')}
                            >
                              <DownloadIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Exportar Excel">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleExportarLibro(periodo.periodoId, 'excel')}
                            >
                              <ReceiptIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!historialLibro?.periodos || historialLibro.periodos.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          No hay períodos cerrados disponibles
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Información */}
          <Grid item xs={12}>
            <Alert severity="info" icon={<InfoIcon />}>
              <Typography variant="subtitle2" fontWeight="bold">
                Información importante
              </Typography>
              <Typography variant="body2">
                • Los reportes solo están disponibles para períodos de liquidación cerrados.<br />
                • El F931 incluye únicamente empleados formales con CUIL registrado.<br />
                • El Libro de Sueldos Digital cumple con la RG AFIP 4003/2017.<br />
                • Recuerde verificar que todos los empleados tengan sus datos completos antes de generar los reportes.
              </Typography>
            </Alert>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Dialog: Registrar Paritaria */}
      <Dialog open={openParitariaDialog} onClose={() => setOpenParitariaDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Registrar Paritaria - {selectedConvenio?.nombre}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Tipo de Ajuste</InputLabel>
              <Select
                value={paritariaForm.tipoAjuste}
                onChange={(e) => setParitariaForm({ ...paritariaForm, tipoAjuste: e.target.value })}
                label="Tipo de Ajuste"
              >
                <MenuItem value="paritaria">Paritaria</MenuItem>
                <MenuItem value="decreto">Decreto</MenuItem>
                <MenuItem value="acuerdo">Acuerdo</MenuItem>
                <MenuItem value="otro">Otro</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Porcentaje de Aumento"
              type="number"
              value={paritariaForm.porcentajeAumento}
              onChange={(e) => setParitariaForm({ ...paritariaForm, porcentajeAumento: e.target.value })}
              InputProps={{ endAdornment: '%' }}
              required
            />

            <TextField
              label="Suma Fija (opcional)"
              type="number"
              value={paritariaForm.montoFijo}
              onChange={(e) => setParitariaForm({ ...paritariaForm, montoFijo: e.target.value })}
              InputProps={{ startAdornment: '$' }}
            />

            <TextField
              label="Descripción"
              value={paritariaForm.descripcion}
              onChange={(e) => setParitariaForm({ ...paritariaForm, descripcion: e.target.value })}
              multiline
              rows={2}
              placeholder="Ej: Paritaria 2024 - 2do tramo"
              required
            />

            <FormControl fullWidth>
              <InputLabel>Aplicar a</InputLabel>
              <Select
                value={paritariaForm.aplicadoA}
                onChange={(e) => setParitariaForm({ ...paritariaForm, aplicadoA: e.target.value })}
                label="Aplicar a"
              >
                <MenuItem value="todas">Todas las categorías</MenuItem>
                {selectedConvenio?.categorias?.map((cat: any) => (
                  <MenuItem key={cat.codigo} value={cat.codigo}>
                    {cat.nombre} ({cat.codigo})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Alert severity="warning" variant="outlined">
              Esta acción actualizará los sueldos básicos de las categorías seleccionadas y quedará registrada en el historial.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenParitariaDialog(false)}>Cancelar</Button>
          <Button
            onClick={handleRegistrarParitaria}
            variant="contained"
            color="primary"
            disabled={!paritariaForm.porcentajeAumento || !paritariaForm.descripcion || loading}
          >
            Registrar Paritaria
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Crear/Editar Convenio */}
      <Dialog open={openConvenioDialog} onClose={() => setOpenConvenioDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingConvenio ? 'Editar Convenio' : 'Nuevo Convenio Colectivo'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Número de Convenio"
                  value={convenioForm.numero}
                  onChange={(e) => setConvenioForm({ ...convenioForm, numero: e.target.value })}
                  fullWidth
                  required
                  placeholder="Ej: 130/75"
                  helperText="Número oficial del CCT"
                />
              </Grid>
              <Grid item xs={12} sm={8}>
                <TextField
                  label="Nombre del Convenio"
                  value={convenioForm.nombre}
                  onChange={(e) => setConvenioForm({ ...convenioForm, nombre: e.target.value })}
                  fullWidth
                  required
                  placeholder="Ej: Empleados de Comercio"
                />
              </Grid>
              <Grid item xs={12} sm={8}>
                <TextField
                  label="Sindicato"
                  value={convenioForm.sindicato}
                  onChange={(e) => setConvenioForm({ ...convenioForm, sindicato: e.target.value })}
                  fullWidth
                  placeholder="Ej: Federación Argentina de Empleados de Comercio"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Estado</InputLabel>
                  <Select
                    value={convenioForm.estado}
                    onChange={(e) => setConvenioForm({ ...convenioForm, estado: e.target.value })}
                    label="Estado"
                  >
                    <MenuItem value="vigente">Vigente</MenuItem>
                    <MenuItem value="vencido">Vencido</MenuItem>
                    <MenuItem value="en_negociacion">En Negociación</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            {/* Categorías */}
            <Typography variant="subtitle1" fontWeight="medium">
              Categorías del Convenio
            </Typography>
            
            {convenioForm.categorias.length > 0 && (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Categoría</TableCell>
                      <TableCell>Código</TableCell>
                      <TableCell align="right">Salario Básico</TableCell>
                      <TableCell align="center">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {convenioForm.categorias.map((cat, index) => (
                      <TableRow key={index}>
                        <TableCell>{cat.nombre}</TableCell>
                        <TableCell>
                          <Chip label={cat.codigo} size="small" />
                        </TableCell>
                        <TableCell align="right">{formatCurrency(cat.salarioBasico)}</TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleEliminarCategoria(index)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Agregar nueva categoría */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Agregar categoría
              </Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={3}>
                  <TextField
                    label="Nombre"
                    value={nuevaCategoria.nombre}
                    onChange={(e) => setNuevaCategoria({ ...nuevaCategoria, nombre: e.target.value })}
                    size="small"
                    fullWidth
                    placeholder="Ej: Administrativo A"
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <TextField
                    label="Código"
                    value={nuevaCategoria.codigo}
                    onChange={(e) => setNuevaCategoria({ ...nuevaCategoria, codigo: e.target.value.toUpperCase() })}
                    size="small"
                    fullWidth
                    placeholder="ADM-A"
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    label="Salario Básico"
                    type="text"
                    value={salarioBasicoFormatted}
                    onChange={(e) => {
                      const formatted = formatNumberInput(e.target.value);
                      setSalarioBasicoFormatted(formatted);
                      setNuevaCategoria({ ...nuevaCategoria, salarioBasico: formatted });
                    }}
                    size="small"
                    fullWidth
                    placeholder="Ej: 350.000,00"
                    helperText="Formato: 1.000,50 (coma para decimales)"
                    InputProps={{ startAdornment: '$' }}
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={handleAgregarCategoria}
                    disabled={!nuevaCategoria.nombre || getNumericValue(salarioBasicoFormatted) <= 0}
                    fullWidth
                  >
                    Agregar
                  </Button>
                </Grid>
              </Grid>
            </Paper>

            {convenioForm.categorias.length === 0 && (
              <Alert severity="info" variant="outlined">
                Agregue al menos una categoría con su sueldo básico para poder asignar empleados a este convenio.
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConvenioDialog(false)}>Cancelar</Button>
          <Button
            onClick={handleGuardarConvenio}
            variant="contained"
            color="primary"
            disabled={!convenioForm.numero || !convenioForm.nombre || loading}
          >
            {editingConvenio ? 'Guardar Cambios' : 'Crear Convenio'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RRHHPage;
