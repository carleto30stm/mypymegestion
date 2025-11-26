import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import {
  fetchClientes,
  createCliente,
  updateCliente,
  deleteCliente,
  reactivarCliente,
  agregarNota,
  eliminarNota
} from '../redux/slices/clientesSlice';
import { Cliente } from '../types';
import NotasClienteModal from '../components/NotasClienteModal';
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
  Alert,
  Snackbar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  Restore as RestoreIcon,
  StickyNote2 as NotasIcon
} from '@mui/icons-material';
import { formatCurrency } from '../utils/formatters';

const ClientesPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: clientes, status } = useSelector((state: RootState) => state.clientes);
  const { user } = useSelector((state: RootState) => state.auth);

  const [openForm, setOpenForm] = useState(false);
  const [clienteEdit, setClienteEdit] = useState<Cliente | null>(null);
  const [filtro, setFiltro] = useState<'todos' | 'activos' | 'morosos'>('activos');
  const [busqueda, setBusqueda] = useState('');
  const [openNotas, setOpenNotas] = useState(false);
  const [clienteNotas, setClienteNotas] = useState<Cliente | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
    setFieldErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Validar número de documento
    if (!formData.numeroDocumento || formData.numeroDocumento.trim() === '') {
      errors.numeroDocumento = 'El número de documento es obligatorio';
    } else {
      const soloNumeros = formData.numeroDocumento.replace(/[^0-9]/g, '');
      if (formData.tipoDocumento === 'CUIT' || formData.tipoDocumento === 'CUIL') {
        if (soloNumeros.length !== 11) {
          errors.numeroDocumento = `${formData.tipoDocumento} debe tener exactamente 11 dígitos`;
        }
      } else if (formData.tipoDocumento === 'DNI') {
        if (soloNumeros.length < 7 || soloNumeros.length > 8) {
          errors.numeroDocumento = 'DNI debe tener entre 7 y 8 dígitos';
        }
      }
    }

    // Validar nombre
    if (!formData.nombre || formData.nombre.trim() === '') {
      errors.nombre = 'El nombre es obligatorio';
    }

    // Validaciones específicas para facturación AFIP
    if (formData.requiereFacturaAFIP) {
      if (!formData.email || formData.email.trim() === '') {
        errors.email = 'Email es obligatorio para facturación AFIP';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = 'Formato de email inválido';
      }

      if (!formData.direccion || formData.direccion.trim() === '') {
        errors.direccion = 'Dirección es obligatoria para facturación AFIP';
      }

      if (!formData.ciudad || formData.ciudad.trim() === '') {
        errors.ciudad = 'Ciudad es obligatoria para facturación AFIP';
      }

      // Código postal obligatorio para CF y Monotributista con facturación AFIP
      if (formData.condicionIVA !== 'Responsable Inscripto') {
        if (!formData.codigoPostal || formData.codigoPostal.trim() === '') {
          errors.codigoPostal = 'Código postal obligatorio para CF/Monotributista con facturación AFIP';
        }
      }

      // Validar CUIT/CUIL para facturación
      if (formData.tipoDocumento !== 'CUIT' && formData.tipoDocumento !== 'CUIL' && formData.condicionIVA !== 'Consumidor Final') {
        errors.tipoDocumento = 'Se requiere CUIT/CUIL para facturación AFIP (excepto Consumidor Final)';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitForm = async () => {
    // Validar formulario antes de enviar
    if (!validateForm()) {
      setSnackbar({ 
        open: true, 
        message: 'Por favor, corrija los errores en el formulario', 
        severity: 'error' 
      });
      return;
    }

    try {
      if (clienteEdit) {
        await dispatch(updateCliente({ ...formData, _id: clienteEdit._id } as Cliente)).unwrap();
        setSnackbar({ open: true, message: 'Cliente actualizado exitosamente', severity: 'success' });
      } else {
        await dispatch(createCliente(formData as Omit<Cliente, '_id'>)).unwrap();
        setSnackbar({ open: true, message: 'Cliente creado exitosamente', severity: 'success' });
      }
      handleCloseForm();
      dispatch(fetchClientes());
    } catch (error: any) {
      // Extraer mensaje de error específico del backend
      let errorMessage = 'Error al guardar el cliente';
      
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.details) {
        errorMessage = error.details;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      setSnackbar({ 
        open: true, 
        message: errorMessage, 
        severity: 'error' 
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Está seguro de desactivar este cliente?')) {
      try {
        await dispatch(deleteCliente(id)).unwrap();
        setSnackbar({ open: true, message: 'Cliente desactivado exitosamente', severity: 'success' });
        dispatch(fetchClientes());
      } catch (error: any) {
        setSnackbar({ open: true, message: error || 'Error al desactivar cliente', severity: 'error' });
      }
    }
  };

  const handleReactivar = async (id: string) => {
    try {
      await dispatch(reactivarCliente(id)).unwrap();
      setSnackbar({ open: true, message: 'Cliente reactivado exitosamente', severity: 'success' });
      dispatch(fetchClientes());
    } catch (error: any) {
      setSnackbar({ open: true, message: error || 'Error al reactivar cliente', severity: 'error' });
    }
  };

  const handleOpenNotas = (cliente: Cliente) => {
    setClienteNotas(cliente);
    setOpenNotas(true);
  };

  const handleCloseNotas = () => {
    setOpenNotas(false);
    setClienteNotas(null);
  };

  const handleAgregarNota = async (texto: string, tipo: 'incidente' | 'problema' | 'observacion' | 'seguimiento') => {
    if (clienteNotas?._id) {
      await dispatch(agregarNota({ clienteId: clienteNotas._id, texto, tipo, creadoPor: user?.username || 'sistema' }));
      dispatch(fetchClientes());
    }
  };

  const handleEliminarNota = async (notaId: string) => {
    if (clienteNotas?._id) {
      await dispatch(eliminarNota({ clienteId: clienteNotas._id, notaId }));
      dispatch(fetchClientes());
    }
  };

  const clientesFiltrados = clientes.filter(c => {
    // Filtrar por estado
    if (filtro === 'activos' && c.estado !== 'activo') return false;
    if (filtro === 'morosos' && c.estado !== 'moroso') return false;
    
    // Filtrar por búsqueda de nombre
    if (busqueda.trim()) {
      const terminoBusqueda = busqueda.toLowerCase().trim();
      const nombreCompleto = (c.razonSocial || `${c.apellido || ''} ${c.nombre}`.trim()).toLowerCase();
      const documento = (c.numeroDocumento || '').toLowerCase();
      return nombreCompleto.includes(terminoBusqueda) || documento.includes(terminoBusqueda);
    }
    
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
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            label="Buscar cliente"
            placeholder="Nombre, razón social o documento..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            sx={{ minWidth: 300 }}
          />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Filtrar por</InputLabel>
            <Select value={filtro} onChange={(e) => setFiltro(e.target.value as any)} label="Filtrar por">
              <MenuItem value="todos">Todos</MenuItem>
              <MenuItem value="activos">Activos</MenuItem>
              <MenuItem value="morosos">Morosos</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="body2" color="textSecondary">
            {clientesFiltrados.length} cliente(s) encontrado(s)
          </Typography>
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Documento</strong></TableCell>
              <TableCell><strong>Nombre/Razón Social</strong></TableCell>
              <TableCell><strong>Contacto</strong></TableCell>
              <TableCell><strong>Provincia</strong></TableCell>
              <TableCell><strong>Observaciones</strong></TableCell>
              <TableCell align="center"><strong>Condiciones Pago</strong></TableCell>
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
                  <Typography variant="caption" display="block">{cliente.telefonoAlt || '-'}</Typography>
                  <Typography variant="caption" display="block">{cliente.email || '-'}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" display="block">{cliente.provincia || '-'}</Typography>
                  <Typography variant="caption" display="block">{cliente.ciudad || '-'}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" display="block">{cliente.observaciones || '-'}</Typography>
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center' }}>
                    {!cliente.aceptaCheques && (
                      <Tooltip title="No acepta cheques como medio de pago">
                        <Chip label="No Cheques" color="default" size="small" sx={{ fontSize: '0.7rem' }} />
                      </Tooltip>
                    )}
                    {cliente.diasVencimientoCheques && cliente.diasVencimientoCheques !== 30 && cliente.aceptaCheques && (
                      <Tooltip title={`Cheques a ${cliente.diasVencimientoCheques} días`}>
                        <Chip label={`${cliente.diasVencimientoCheques}d`} color="info" size="small" sx={{ fontSize: '0.7rem' }} />
                      </Tooltip>
                    )}
                    {!cliente.aceptaCheques && !cliente.diasVencimientoCheques && (
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
                      <Tooltip title="Ver Notas">
                        <IconButton size="small" color="primary" onClick={() => handleOpenNotas(cliente)}>
                          <NotasIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
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
              <FormControl fullWidth error={!!fieldErrors.tipoDocumento}>
                <InputLabel>Tipo Documento</InputLabel>
                <Select
                  value={formData.tipoDocumento}
                  onChange={(e) => {
                    setFormData({ ...formData, tipoDocumento: e.target.value as any });
                    if (fieldErrors.tipoDocumento) {
                      setFieldErrors({ ...fieldErrors, tipoDocumento: '' });
                    }
                  }}
                  label="Tipo Documento"
                >
                  <MenuItem value="DNI">DNI</MenuItem>
                  <MenuItem value="CUIT">CUIT</MenuItem>
                  <MenuItem value="CUIL">CUIL</MenuItem>
                  <MenuItem value="Pasaporte">Pasaporte</MenuItem>
                </Select>
                {fieldErrors.tipoDocumento && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                    {fieldErrors.tipoDocumento}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Número Documento *"
                value={formData.numeroDocumento}
                onChange={(e) => {
                  setFormData({ ...formData, numeroDocumento: e.target.value });
                  if (fieldErrors.numeroDocumento) {
                    setFieldErrors({ ...fieldErrors, numeroDocumento: '' });
                  }
                }}
                error={!!fieldErrors.numeroDocumento}
                helperText={
                  fieldErrors.numeroDocumento ||
                  (formData.tipoDocumento === 'CUIT' || formData.tipoDocumento === 'CUIL'
                    ? 'Exactamente 11 dígitos (ej: 20-12345678-9)'
                    : formData.tipoDocumento === 'DNI'
                    ? '7 u 8 dígitos'
                    : 'Cualquier formato')
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nombre *"
                value={formData.nombre}
                onChange={(e) => {
                  setFormData({ ...formData, nombre: e.target.value });
                  if (fieldErrors.nombre) {
                    setFieldErrors({ ...fieldErrors, nombre: '' });
                  }
                }}
                error={!!fieldErrors.nombre}
                helperText={fieldErrors.nombre}
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
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (fieldErrors.email) {
                    setFieldErrors({ ...fieldErrors, email: '' });
                  }
                }}
                required={formData.requiereFacturaAFIP}
                error={!!fieldErrors.email}
                helperText={
                  fieldErrors.email ||
                  (formData.requiereFacturaAFIP && !formData.email
                    ? 'Email obligatorio para facturación electrónica AFIP'
                    : 'Formato: usuario@dominio.com')
                }
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
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Teléfono Alternativo"
                value={formData.telefonoAlt}
                onChange={(e) => setFormData({ ...formData, telefonoAlt: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Provincia"
                value={formData.provincia}
                onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Ciudad"
                value={formData.ciudad}
                onChange={(e) => {
                  setFormData({ ...formData, ciudad: e.target.value });
                  if (fieldErrors.ciudad) {
                    setFieldErrors({ ...fieldErrors, ciudad: '' });
                  }
                }}
                required={formData.requiereFacturaAFIP}
                error={!!fieldErrors.ciudad}
                helperText={
                  fieldErrors.ciudad ||
                  (formData.requiereFacturaAFIP && !formData.ciudad
                    ? 'Ciudad obligatoria para facturación AFIP'
                    : '')
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Código Postal"
                value={formData.codigoPostal || ''}
                onChange={(e) => {
                  setFormData({ ...formData, codigoPostal: e.target.value });
                  if (fieldErrors.codigoPostal) {
                    setFieldErrors({ ...fieldErrors, codigoPostal: '' });
                  }
                }}
                required={
                  formData.requiereFacturaAFIP && 
                  formData.condicionIVA !== 'Responsable Inscripto'
                }
                error={!!fieldErrors.codigoPostal}
                helperText={
                  fieldErrors.codigoPostal ||
                  (formData.requiereFacturaAFIP && formData.condicionIVA !== 'Responsable Inscripto' && !formData.codigoPostal
                    ? 'Código postal obligatorio para CF/Monotributista con facturación AFIP'
                    : formData.condicionIVA === 'Responsable Inscripto'
                    ? 'Opcional para Responsable Inscripto'
                    : '')
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Dirección"
                value={formData.direccion}
                onChange={(e) => {
                  setFormData({ ...formData, direccion: e.target.value });
                  if (fieldErrors.direccion) {
                    setFieldErrors({ ...fieldErrors, direccion: '' });
                  }
                }}
                required={formData.requiereFacturaAFIP}
                error={!!fieldErrors.direccion}
                helperText={
                  fieldErrors.direccion ||
                  (formData.requiereFacturaAFIP && !formData.direccion
                    ? 'Dirección obligatoria para facturación AFIP'
                    : '')
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Observaciones"
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
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

      <NotasClienteModal
        open={openNotas}
        onClose={handleCloseNotas}
        cliente={clienteNotas}
        onAgregarNota={handleAgregarNota}
        onEliminarNota={handleEliminarNota}
        userType={user?.userType}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ClientesPage;
