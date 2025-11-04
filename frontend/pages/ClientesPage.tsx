import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import {
  fetchClientes,
  createCliente,
  updateCliente,
  deleteCliente,
  reactivarCliente
} from '../redux/slices/clientesSlice';
import { Cliente } from '../types';
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
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Tooltip,
  FormControlLabel,
  Switch,
  Divider,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  Restore as RestoreIcon
} from '@mui/icons-material';
import { formatCurrency } from '../utils/formatters';

const ClientesPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: clientes, status } = useSelector((state: RootState) => state.clientes);
  const { user } = useSelector((state: RootState) => state.auth);

  const [openForm, setOpenForm] = useState(false);
  const [clienteEdit, setClienteEdit] = useState<Cliente | null>(null);
  const [filtro, setFiltro] = useState<'todos' | 'activos' | 'morosos'>('activos');

  const [formData, setFormData] = useState<Partial<Cliente>>({
    tipoDocumento: 'DNI',
    numeroDocumento: '',
    nombre: '',
    apellido: '',
    razonSocial: '',
    email: '',
    telefono: '',
    direccion: '',
    ciudad: '',
    provincia: '',
    condicionIVA: 'Consumidor Final',
    saldoCuenta: 0,
    limiteCredito: 0,
    estado: 'activo'
  });

  useEffect(() => {
    dispatch(fetchClientes());
  }, [dispatch]);

  const handleOpenForm = (cliente?: Cliente) => {
    if (cliente) {
      setClienteEdit(cliente);
      setFormData(cliente);
    } else {
      setClienteEdit(null);
      setFormData({
        tipoDocumento: 'DNI',
        numeroDocumento: '',
        nombre: '',
        apellido: '',
        razonSocial: '',
        email: '',
        telefono: '',
        direccion: '',
        ciudad: '',
        provincia: '',
        condicionIVA: 'Consumidor Final',
        saldoCuenta: 0,
        limiteCredito: 0,
        estado: 'activo',
        // Campos fiscales
        requiereFacturaAFIP: false,
        aplicaIVA: true,
        // Campos de entrega
        direccionEntrega: '',
        // Campos de pago
        aceptaCheques: true,
        diasVencimientoCheques: 30
      });
    }
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setClienteEdit(null);
  };

  const handleSubmitForm = async () => {
    if (clienteEdit) {
      await dispatch(updateCliente({ ...formData, _id: clienteEdit._id } as Cliente));
    } else {
      await dispatch(createCliente(formData as Omit<Cliente, '_id'>));
    }
    handleCloseForm();
    dispatch(fetchClientes());
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Está seguro de desactivar este cliente?')) {
      await dispatch(deleteCliente(id));
      dispatch(fetchClientes());
    }
  };

  const handleReactivar = async (id: string) => {
    await dispatch(reactivarCliente(id));
    dispatch(fetchClientes());
  };

  const clientesFiltrados = clientes.filter(c => {
    if (filtro === 'activos') return c.estado === 'activo';
    if (filtro === 'morosos') return c.estado === 'moroso';
    return true;
  });

  const canEdit = user?.userType === 'admin' || user?.userType === 'oper_ad';

  const getNombreCompleto = (cliente: Cliente) => {
    return cliente.razonSocial || `${cliente.apellido || ''} ${cliente.nombre}`.trim();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <PeopleIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4">Gestión de Clientes</Typography>
        </Box>
        {canEdit && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenForm()}>
            Nuevo Cliente
          </Button>
        )}
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Filtrar por</InputLabel>
          <Select value={filtro} onChange={(e) => setFiltro(e.target.value as any)} label="Filtrar por">
            <MenuItem value="todos">Todos</MenuItem>
            <MenuItem value="activos">Activos</MenuItem>
            <MenuItem value="morosos">Morosos</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Documento</strong></TableCell>
              <TableCell><strong>Nombre/Razón Social</strong></TableCell>
              <TableCell><strong>Contacto</strong></TableCell>
              <TableCell align="center"><strong>Fiscal</strong></TableCell>
              <TableCell align="right"><strong>Saldo Cuenta</strong></TableCell>
              <TableCell align="right"><strong>Límite Crédito</strong></TableCell>
              <TableCell><strong>Estado</strong></TableCell>
              {canEdit && <TableCell align="center"><strong>Acciones</strong></TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {clientesFiltrados.map((cliente) => (
              <TableRow key={cliente._id}>
                <TableCell>
                  <Typography variant="body2">{cliente.tipoDocumento}</Typography>
                  <Typography variant="caption">{cliente.numeroDocumento}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">{getNombreCompleto(cliente)}</Typography>
                  <Typography variant="caption" color="textSecondary">{cliente.condicionIVA}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" display="block">{cliente.telefono || '-'}</Typography>
                  <Typography variant="caption" display="block">{cliente.email || '-'}</Typography>
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center' }}>
                    {cliente.requiereFacturaAFIP && (
                      <Tooltip title="Requiere factura electrónica AFIP">
                        <Chip label="AFIP" color="info" size="small" sx={{ fontSize: '0.7rem' }} />
                      </Tooltip>
                    )}
                    {!cliente.aplicaIVA && (
                      <Tooltip title="Cliente exento de IVA">
                        <Chip label="Sin IVA" color="warning" size="small" sx={{ fontSize: '0.7rem' }} />
                      </Tooltip>
                    )}
                    {!cliente.aceptaCheques && (
                      <Tooltip title="No acepta cheques como medio de pago">
                        <Chip label="No ✓" color="default" size="small" sx={{ fontSize: '0.7rem' }} />
                      </Tooltip>
                    )}
                    {cliente.requiereFacturaAFIP === false && cliente.aplicaIVA && cliente.aceptaCheques && (
                      <Typography variant="caption" color="textSecondary">-</Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Typography color={cliente.saldoCuenta > 0 ? 'error' : 'success.main'}>
                    {formatCurrency(cliente.saldoCuenta)}
                  </Typography>
                </TableCell>
                <TableCell align="right">{formatCurrency(cliente.limiteCredito)}</TableCell>
                <TableCell>
                  <Chip
                    label={cliente.estado.toUpperCase()}
                    color={cliente.estado === 'activo' ? 'success' : cliente.estado === 'moroso' ? 'error' : 'default'}
                    size="small"
                  />
                </TableCell>
                {canEdit && (
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      {(cliente.estado === 'activo' || cliente.estado === 'moroso') && (
                        <>
                          <Tooltip title="Editar">
                            <IconButton size="small" onClick={() => handleOpenForm(cliente)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {user?.userType === 'admin' && (
                            <Tooltip title="Desactivar">
                              <IconButton size="small" color="error" onClick={() => handleDelete(cliente._id!)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </>
                      )}
                      {cliente.estado === 'inactivo' && user?.userType === 'admin' && (
                        <Tooltip title="Reactivar">
                          <IconButton size="small" color="success" onClick={() => handleReactivar(cliente._id!)}>
                            <RestoreIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openForm} onClose={handleCloseForm} maxWidth="md" fullWidth>
        <DialogTitle>{clienteEdit ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo Documento</InputLabel>
                <Select
                  value={formData.tipoDocumento}
                  onChange={(e) => setFormData({ ...formData, tipoDocumento: e.target.value as any })}
                  label="Tipo Documento"
                >
                  <MenuItem value="DNI">DNI</MenuItem>
                  <MenuItem value="CUIT">CUIT</MenuItem>
                  <MenuItem value="CUIL">CUIL</MenuItem>
                  <MenuItem value="Pasaporte">Pasaporte</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Número Documento *"
                value={formData.numeroDocumento}
                onChange={(e) => setFormData({ ...formData, numeroDocumento: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nombre *"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Apellido"
                value={formData.apellido}
                onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Razón Social (opcional para empresas)"
                value={formData.razonSocial}
                onChange={(e) => setFormData({ ...formData, razonSocial: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Teléfono"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Dirección"
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Condición IVA</InputLabel>
                <Select
                  value={formData.condicionIVA}
                  onChange={(e) => setFormData({ ...formData, condicionIVA: e.target.value as any })}
                  label="Condición IVA"
                >
                  <MenuItem value="Consumidor Final">Consumidor Final</MenuItem>
                  <MenuItem value="Responsable Inscripto">Responsable Inscripto</MenuItem>
                  <MenuItem value="Monotributista">Monotributista</MenuItem>
                  <MenuItem value="Exento">Exento</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Límite de Crédito"
                type="number"
                value={formData.limiteCredito}
                onChange={(e) => setFormData({ ...formData, limiteCredito: parseFloat(e.target.value) })}
                inputProps={{ min: 0, step: 100 }}
              />
            </Grid>

            {/* Sección Facturación y Fiscal */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom color="primary">
                📋 Configuración Fiscal
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.requiereFacturaAFIP || false}
                    onChange={(e) => setFormData({ ...formData, requiereFacturaAFIP: e.target.checked })}
                  />
                }
                label="Requiere Factura Electrónica AFIP"
              />
              {formData.requiereFacturaAFIP && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  Este cliente debe tener factura electrónica en cada venta
                </Alert>
              )}
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.aplicaIVA !== false}
                    onChange={(e) => setFormData({ ...formData, aplicaIVA: e.target.checked })}
                  />
                }
                label="Aplica IVA 21%"
              />
              {!formData.aplicaIVA && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  Cliente exento de IVA
                </Alert>
              )}
            </Grid>

            {/* Sección Entrega */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom color="primary">
                🚚 Datos de Entrega
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Dirección de Entrega"
                value={formData.direccionEntrega || ''}
                onChange={(e) => setFormData({ ...formData, direccionEntrega: e.target.value })}
                placeholder="Si es diferente a la dirección principal"
                helperText="Dejar vacío para usar la dirección principal"
              />
            </Grid>

            {/* Sección Pagos */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom color="primary">
                💰 Configuración de Pagos
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.aceptaCheques !== false}
                    onChange={(e) => setFormData({ ...formData, aceptaCheques: e.target.checked })}
                  />
                }
                label="Acepta Cheques"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Días de Vencimiento Cheques"
                type="number"
                value={formData.diasVencimientoCheques || 30}
                onChange={(e) => setFormData({ ...formData, diasVencimientoCheques: parseInt(e.target.value) })}
                inputProps={{ min: 0, max: 365, step: 1 }}
                helperText="Días estándar para vencimiento de cheques (30, 60, 90)"
                disabled={!formData.aceptaCheques}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseForm}>Cancelar</Button>
          <Button
            onClick={handleSubmitForm}
            variant="contained"
            disabled={!formData.numeroDocumento || !formData.nombre}
          >
            {clienteEdit ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClientesPage;
