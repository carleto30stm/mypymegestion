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
  Tabs,
  Tab,
  Card,
  CardContent
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Search as SearchIcon, Comment as CommentIcon, AttachMoney as AttachMoneyIcon, ReceiptLong as ReceiptLongIcon } from '@mui/icons-material';
import NotasProveedorModal from '../components/NotasProveedorModal';
import PagoProveedorModal from '../components/PagoProveedorModal';
import CuentaCorrienteProveedorDetalle from '../components/CuentaCorrienteProveedorDetalle';
import { proveedoresAPI } from '../services/api';
import { Proveedor } from '../types';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';

const ProveedoresPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editando, setEditando] = useState(false);
  const [openNotas, setOpenNotas] = useState(false);
  const [openPago, setOpenPago] = useState(false);
  const [openCuenta, setOpenCuenta] = useState(false);
  const [selectedProveedor, setSelectedProveedor] = useState<Proveedor | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [tabValue, setTabValue] = useState(0);
  
  // Estados para deudas
  const [filtroDeudas, setFiltroDeudas] = useState<'todos' | 'morosos' | 'criticos'>('todos');
  const [ordenDeudas, setOrdenDeudas] = useState<'monto' | 'antiguedad'>('monto');
  
  const [formData, setFormData] = useState<Partial<Proveedor>>({
    tipoProveedor: 'MATERIA_PRIMA',
    tipoDocumento: 'CUIT',
    numeroDocumento: '',
    razonSocial: '',
    nombreContacto: '',
    email: '',
    telefono: '',
    telefonoAlt: '',
    direccion: '',
    ciudad: '',
    provincia: '',
    codigoPostal: '',
    condicionIVA: 'Responsable Inscripto',
    saldoCuenta: 0,
    limiteCredito: 0,
    categorias: [],
    diasPago: 30,
    estado: 'activo',
    calificacion: 5,
    observaciones: '',
    banco: '',
    cbu: '',
    alias: ''
  });

  useEffect(() => {
    cargarProveedores();
  }, []);

  const cargarProveedores = async () => {
    try {
      setLoading(true);
      const data = await proveedoresAPI.obtenerTodos();
      setProveedores(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar proveedores');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (proveedor?: Proveedor) => {
    if (proveedor) {
      setFormData(proveedor);
      setEditando(true);
    } else {
      setFormData({
        tipoProveedor: 'MATERIA_PRIMA',
        tipoDocumento: 'CUIT',
        numeroDocumento: '',
        razonSocial: '',
        condicionIVA: 'Responsable Inscripto',
        saldoCuenta: 0,
        limiteCredito: 0,
        categorias: [],
        diasPago: 30,
        estado: 'activo',
        calificacion: 5
      });
      setEditando(false);
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
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      if (editando && formData._id) {
        await proveedoresAPI.actualizar(formData._id, formData);
        setSuccess('Proveedor actualizado exitosamente');
      } else {
        await proveedoresAPI.crear(formData);
        setSuccess('Proveedor creado exitosamente');
      }
      handleCloseDialog();
      cargarProveedores();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar proveedor');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id: string) => {
    if (!window.confirm('¿Está seguro de desactivar este proveedor?')) return;
    
    try {
      setLoading(true);
      await proveedoresAPI.eliminar(id);
      setSuccess('Proveedor desactivado exitosamente');
      cargarProveedores();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al desactivar proveedor');
    } finally {
      setLoading(false);
    }
  };

  const storedUser = localStorage.getItem('user');
  const parsedUser = storedUser ? JSON.parse(storedUser) : null;
  const userType = parsedUser?.userType as 'admin' | 'oper' | 'oper_ad' | undefined;

  const handleOpenNotas = (proveedor: Proveedor) => {
    setSelectedProveedor(proveedor);
    setOpenNotas(true);
  };

  const handleCloseNotas = () => {
    setOpenNotas(false);
    setSelectedProveedor(null);
  };

  const handleAgregarNota = async (texto: string, tipo: 'incidente' | 'problema' | 'observacion' | 'seguimiento') => {
    if (!selectedProveedor || !selectedProveedor._id) return;
    try {
      setLoading(true);
      await proveedoresAPI.agregarNota(selectedProveedor._id, { texto, tipo, creadoPor: user?.username || 'Sistema' });
      // Refrescar lista y proveedor seleccionado
      await cargarProveedores();
      const actualizado = await proveedoresAPI.obtenerPorId(selectedProveedor._id);
      setSelectedProveedor(actualizado);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al agregar nota');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarNota = async (notaId: string) => {
    if (!selectedProveedor || !selectedProveedor._id) return;
    try {
      setLoading(true);
      await proveedoresAPI.eliminarNota(selectedProveedor._id, notaId);
      await cargarProveedores();
      const actualizado = await proveedoresAPI.obtenerPorId(selectedProveedor._id);
      setSelectedProveedor(actualizado);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al eliminar nota');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPago = (proveedor: Proveedor) => {
    setSelectedProveedor(proveedor);
    setOpenPago(true);
  };

  const handleClosePago = () => {
    setOpenPago(false);
    setSelectedProveedor(null);
  };



  const handlePagoSuccess = () => {
    cargarProveedores();
  };

  const handleOpenCuenta = (proveedor: Proveedor) => {
    setSelectedProveedor(proveedor);
    setOpenCuenta(true);
  };

  const handleCloseCuenta = () => {
    setOpenCuenta(false);
    setSelectedProveedor(null);
  };

  // Calcular deudas con antigüedad
  const calcularDeudas = () => {
    const deudas = proveedores
      .filter(p => p.saldoCuenta > 0)
      .map(p => {
        // Calcular días desde última compra o fecha de creación
        const fechaRef = p.ultimaCompra || p.fechaCreacion || new Date().toISOString();
        const diasDeuda = Math.floor(
          (new Date().getTime() - new Date(fechaRef).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        return {
          proveedor: p,
          diasDeuda,
          monto: p.saldoCuenta
        };
      });

    // Aplicar filtros
    let deudasFiltradas = deudas;
    if (filtroDeudas === 'morosos') {
      deudasFiltradas = deudas.filter(d => d.diasDeuda > 30);
    } else if (filtroDeudas === 'criticos') {
      deudasFiltradas = deudas.filter(d => d.diasDeuda > 60 || d.monto > d.proveedor.limiteCredito);
    }

    // Ordenar
    if (ordenDeudas === 'monto') {
      deudasFiltradas.sort((a, b) => b.monto - a.monto);
    } else {
      deudasFiltradas.sort((a, b) => b.diasDeuda - a.diasDeuda);
    }

    return deudasFiltradas;
  };

  const deudas = tabValue === 2 ? calcularDeudas() : [];

  const proveedoresFiltrados = proveedores.filter(p => {
    const matchesSearch = p.razonSocial.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.numeroDocumento.includes(busqueda) ||
    (p.nombreContacto && p.nombreContacto.toLowerCase().includes(busqueda.toLowerCase()));

    if (tabValue === 2) {
      return false; // En tab de deudas usamos la lista calculada
    }

    const tipoFilter = tabValue === 0 ? 'MATERIA_PRIMA' : 'PROOVMANO.DE.OBRA';
    // Si no tiene tipo (legacy), asumimos MATERIA_PRIMA
    const proveedorTipo = p.tipoProveedor || 'MATERIA_PRIMA';
    
    return matchesSearch && proveedorTipo === tipoFilter;
  });

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'activo': return 'success';
      case 'inactivo': return 'default';
      case 'bloqueado': return 'error';
      default: return 'default';
    }
  };

  // Funciones para clasificar deudas
  const getColorDeuda = (dias: number): 'success' | 'warning' | 'error' => {
    if (dias <= 30) return 'success';
    if (dias <= 60) return 'warning';
    return 'error';
  };

  const getEtiquetaDeuda = (dias: number): string => {
    if (dias <= 30) return 'Corriente';
    if (dias <= 60) return 'Vencida';
    return 'Morosa';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Proveedores</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Nuevo Proveedor
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      <Paper sx={{ p: 2, mb: 2 }}>
        <TextField
          fullWidth
          placeholder="Buscar por razón social, documento o contacto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
          }}
        />
      </Paper>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} indicatorColor="primary" textColor="primary">
          <Tab label="Materia Prima" />
          <Tab label="Mano de Obra" />
          <Tab label="Deudas a Pagar" />
        </Tabs>
      </Paper>

      {/* Estadísticas de Deudas - Solo en tab 2 */}
      {tabValue === 2 && (
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Total Proveedores
                </Typography>
                <Typography variant="h5">{deudas.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Deuda Total
                </Typography>
                <Typography variant="h5" color="error.main">
                  ${deudas.reduce((sum, d) => sum + d.monto, 0).toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Morosos (+30d)
                </Typography>
                <Typography variant="h5" color="warning.main">
                  {deudas.filter(d => d.diasDeuda > 30).length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Críticos (+60d)
                </Typography>
                <Typography variant="h5" color="error.main">
                  {deudas.filter(d => d.diasDeuda > 60).length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filtros de Deudas - Solo en tab 2 */}
      {tabValue === 2 && (
        <Box mb={2}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Filtrar por Estado</InputLabel>
                <Select
                  value={filtroDeudas}
                  label="Filtrar por Estado"
                  onChange={(e) => setFiltroDeudas(e.target.value as any)}
                >
                  <MenuItem value="todos">Todos los Proveedores</MenuItem>
                  <MenuItem value="morosos">Morosos (+30 días)</MenuItem>
                  <MenuItem value="criticos">Críticos (+60 días o límite excedido)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Ordenar por</InputLabel>
                <Select
                  value={ordenDeudas}
                  label="Ordenar por"
                  onChange={(e) => setOrdenDeudas(e.target.value as any)}
                >
                  <MenuItem value="monto">Mayor Deuda</MenuItem>
                  <MenuItem value="antiguedad">Mayor Antigüedad</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {tabValue === 2 ? (
                // Columnas para tab de deudas
                <>
                  <TableCell>Razón Social</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Documento</TableCell>
                  <TableCell align="right">Deuda Total</TableCell>
                  <TableCell>Desde</TableCell>
                  <TableCell align="center">Días de Deuda</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Límite Crédito</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </>
              ) : (
                // Columnas para tabs normales
                <>
                  <TableCell>Razón Social</TableCell>
                  <TableCell>Documento</TableCell>
                  <TableCell>Contacto</TableCell>
                  <TableCell>Teléfono</TableCell>
                  <TableCell>Saldo Cuenta</TableCell>
                  <TableCell>Observaciones</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {tabValue === 2 ? (
              // Tabla de deudas
              deudas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    No hay proveedores con deuda
                  </TableCell>
                </TableRow>
              ) : (
                deudas.map((deuda) => (
                  <TableRow 
                    key={deuda.proveedor._id}
                    hover
                    sx={{
                      bgcolor: deuda.diasDeuda > 60 ? 'error.50' : 
                              deuda.diasDeuda > 30 ? 'warning.50' : 'inherit'
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {deuda.proveedor.razonSocial}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={deuda.proveedor.tipoProveedor === 'PROOVMANO.DE.OBRA' ? 'Mano de Obra' : 'Materia Prima'} 
                        size="small" 
                        color={deuda.proveedor.tipoProveedor === 'PROOVMANO.DE.OBRA' ? 'secondary' : 'primary'} 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {deuda.proveedor.numeroDocumento}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold" color="error.main">
                        ${deuda.monto.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(deuda.proveedor.ultimaCompra || deuda.proveedor.fechaCreacion || '').toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${deuda.diasDeuda} días`}
                        size="small"
                        color={getColorDeuda(deuda.diasDeuda)}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getEtiquetaDeuda(deuda.diasDeuda)}
                        size="small"
                        color={getColorDeuda(deuda.diasDeuda)}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="text.secondary">
                        ${deuda.proveedor.limiteCredito.toFixed(2)}
                      </Typography>
                      {deuda.monto > deuda.proveedor.limiteCredito && (
                        <Typography variant="caption" color="error.main" display="block">
                          ¡Límite Excedido!
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Registrar Pago">
                        <IconButton onClick={() => handleOpenPago(deuda.proveedor)} size="small" color="success">
                          <AttachMoneyIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Ver Cuenta Corriente">
                        <IconButton onClick={() => handleOpenCuenta(deuda.proveedor)} size="small" color="primary">
                          <ReceiptLongIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )
            ) : (
              // Tabla normal de proveedores
              proveedoresFiltrados.map((proveedor) => (
                <TableRow key={proveedor._id}>
                  <TableCell>{proveedor.razonSocial}</TableCell>
                  <TableCell>{proveedor.numeroDocumento}</TableCell>
                  <TableCell>{proveedor.nombreContacto || '-'}</TableCell>
                  <TableCell>
                    <Typography variant="caption" display="block">
                    {proveedor.telefono || '-'}
                    </Typography>
                    <Typography variant="caption" display="block">
                      {proveedor.telefonoAlt || '-'}
                    </Typography>
                    </TableCell>
                  <TableCell>
                    <Typography color={proveedor.saldoCuenta > 0 ? 'error' : 'success'}>
                      ${proveedor.saldoCuenta.toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {proveedor.observaciones || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={proveedor.estado}
                      color={getEstadoColor(proveedor.estado)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Editar">
                      <IconButton onClick={() => handleOpenDialog(proveedor)} size="small">
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Registrar Pago">
                      <IconButton onClick={() => handleOpenPago(proveedor)} size="small" color="success">
                        <AttachMoneyIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Ver Cuenta Corriente">
                      <IconButton onClick={() => handleOpenCuenta(proveedor)} size="small" color="primary">
                        <ReceiptLongIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Notas">
                      <IconButton onClick={() => handleOpenNotas(proveedor)} size="small">
                        <CommentIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Desactivar">
                      <IconButton onClick={() => proveedor._id && handleEliminar(proveedor._id)} size="small">
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog de Crear/Editar */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editando ? 'Editar Proveedor' : 'Nuevo Proveedor'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo Proveedor</InputLabel>
                <Select
                  value={formData.tipoProveedor || 'MATERIA_PRIMA'}
                  label="Tipo Proveedor"
                  onChange={(e) => handleSelectChange('tipoProveedor', e.target.value)}
                >
                  <MenuItem value="MATERIA_PRIMA">Materia Prima</MenuItem>
                  <MenuItem value="PROOVMANO.DE.OBRA">Mano de Obra</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo Documento</InputLabel>
                <Select
                  value={formData.tipoDocumento || 'CUIT'}
                  label="Tipo Documento"
                  onChange={(e) => handleSelectChange('tipoDocumento', e.target.value)}
                >
                  <MenuItem value="DNI">DNI</MenuItem>
                  <MenuItem value="CUIT">CUIT</MenuItem>
                  <MenuItem value="CUIL">CUIL</MenuItem>
                  <MenuItem value="Pasaporte">Pasaporte</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Número Documento"
                name="numeroDocumento"
                value={formData.numeroDocumento || ''}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Razón Social"
                name="razonSocial"
                value={formData.razonSocial || ''}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nombre Contacto"
                name="nombreContacto"
                value={formData.nombreContacto || ''}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email || ''}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Teléfono"
                name="telefono"
                value={formData.telefono || ''}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Teléfono Alternativo"
                name="telefonoAlt"
                value={formData.telefonoAlt || ''}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Condición IVA</InputLabel>
                <Select
                  value={formData.condicionIVA || 'Responsable Inscripto'}
                  label="Condición IVA"
                  onChange={(e) => handleSelectChange('condicionIVA', e.target.value)}
                >
                  <MenuItem value="Responsable Inscripto">Responsable Inscripto</MenuItem>
                  <MenuItem value="Monotributista">Monotributista</MenuItem>
                  <MenuItem value="Exento">Exento</MenuItem>
                  <MenuItem value="Consumidor Final">Consumidor Final</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Días de Pago"
                name="diasPago"
                type="number"
                value={formData.diasPago || 30}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Límite Crédito"
                name="limiteCredito"
                type="number"
                value={formData.limiteCredito || 0}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Observaciones"
                name="observaciones"
                multiline
                rows={3}
                value={formData.observaciones || ''}
                onChange={handleInputChange}
              />
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
      <NotasProveedorModal
        open={openNotas}
        onClose={handleCloseNotas}
        proveedor={selectedProveedor}
        onAgregarNota={handleAgregarNota}
        onEliminarNota={handleEliminarNota}
        userType={userType}
      />
      <PagoProveedorModal
        open={openPago}
        onClose={handleClosePago}
        onSuccess={handlePagoSuccess}
        proveedor={selectedProveedor as any}
      />
      <Dialog open={openCuenta} onClose={handleCloseCuenta} maxWidth="md" fullWidth>
        <DialogTitle>Cuenta Corriente: {selectedProveedor?.razonSocial}</DialogTitle>
        <DialogContent>
          {selectedProveedor && <CuentaCorrienteProveedorDetalle proveedorId={selectedProveedor._id!} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCuenta}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProveedoresPage;
