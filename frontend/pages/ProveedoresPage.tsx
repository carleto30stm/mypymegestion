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
  Tooltip
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Search as SearchIcon } from '@mui/icons-material';
import { proveedoresAPI } from '../services/api';
import { Proveedor } from '../types';

const ProveedoresPage: React.FC = () => {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editando, setEditando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  
  const [formData, setFormData] = useState<Partial<Proveedor>>({
    tipoDocumento: 'CUIT',
    numeroDocumento: '',
    razonSocial: '',
    nombreContacto: '',
    email: '',
    telefono: '',
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

  const proveedoresFiltrados = proveedores.filter(p =>
    p.razonSocial.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.numeroDocumento.includes(busqueda) ||
    (p.nombreContacto && p.nombreContacto.toLowerCase().includes(busqueda.toLowerCase()))
  );

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'activo': return 'success';
      case 'inactivo': return 'default';
      case 'bloqueado': return 'error';
      default: return 'default';
    }
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

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Razón Social</TableCell>
              <TableCell>Documento</TableCell>
              <TableCell>Contacto</TableCell>
              <TableCell>Teléfono</TableCell>
              <TableCell>Saldo Cuenta</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {proveedoresFiltrados.map((proveedor) => (
              <TableRow key={proveedor._id}>
                <TableCell>{proveedor.razonSocial}</TableCell>
                <TableCell>{proveedor.numeroDocumento}</TableCell>
                <TableCell>{proveedor.nombreContacto || '-'}</TableCell>
                <TableCell>{proveedor.telefono || '-'}</TableCell>
                <TableCell>
                  <Typography color={proveedor.saldoCuenta > 0 ? 'error' : 'success'}>
                    ${proveedor.saldoCuenta.toFixed(2)}
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
                  <Tooltip title="Desactivar">
                    <IconButton onClick={() => proveedor._id && handleEliminar(proveedor._id)} size="small">
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
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
    </Box>
  );
};

export default ProveedoresPage;
