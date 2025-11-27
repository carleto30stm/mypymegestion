import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  TextField,
  Typography,
  MenuItem,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  TableContainer,
  Snackbar,
  Alert
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { crearOrden, actualizarOrden, enviarOrden, getOrdenById } from '../services/ordenProcesamientoService';
import api from '../services/api'; // Direct use for other entities if specific service doesn't exist
import { formatNumberInput, getNumericValue } from '../utils/formatters';

interface MaterialSelection {
  materiaPrimaId: string;
  codigo: string;
  nombre: string;
  cantidad: string; // Input as string for formatting
  stockDisponible: number;
  unidadMedida: string;
}

interface OrdenProcesamientoFormProps {
  orderId?: string | null;
  onClose?: () => void;
  onSuccess?: () => void;
}

const OrdenProcesamientoForm: React.FC<OrdenProcesamientoFormProps> = ({ orderId, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const { id: paramId } = useParams<{ id: string }>();
  const activeId = orderId || paramId;
  
  const [loading, setLoading] = useState(false);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [materiasPrimas, setMateriasPrimas] = useState<any[]>([]);
  
  const [proveedorId, setProveedorId] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [items, setItems] = useState<MaterialSelection[]>([]);
  const [estado, setEstado] = useState<string>('borrador');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // Selection state
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [cantidadInput, setCantidadInput] = useState('');

  const isEditable = !activeId || estado === 'borrador';

  useEffect(() => {
    fetchData();
  }, [activeId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [provRes, mpRes] = await Promise.all([
        api.get('/api/proveedores?tipoProveedor=PROOVMANO.DE.OBRA'),
        api.get('/api/materias-primas')
      ]);
      setProveedores(provRes.data);
      setMateriasPrimas(mpRes.data);

      if (activeId) {
        const orden = await getOrdenById(activeId);
        setProveedorId(orden.proveedorId._id);
        setObservaciones(orden.observaciones || '');
        setEstado(orden.estado);
        setItems(orden.itemsSalida.map((item: any) => ({
          materiaPrimaId: item.materiaPrimaId,
          codigo: item.codigoMateriaPrima,
          nombre: item.nombreMateriaPrima,
          cantidad: formatNumberInput(item.cantidad.toString()),
          stockDisponible: 0, // No needed for view
          unidadMedida: item.unidadMedida
        })));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    if (!selectedMaterialId || !cantidadInput) return;

    const material = materiasPrimas.find(m => m._id === selectedMaterialId);
    if (!material) return;

    const cantidad = getNumericValue(cantidadInput);
    if (cantidad <= 0) return;

    if (cantidad > material.stock) {
      alert(`Stock insuficiente. Disponible: ${material.stock}`);
      return;
    }

    const newItem: MaterialSelection = {
      materiaPrimaId: material._id,
      codigo: material.codigo,
      nombre: material.nombre,
      cantidad: cantidadInput,
      stockDisponible: material.stock,
      unidadMedida: material.unidadMedida
    };

    setItems([...items, newItem]);
    setSelectedMaterialId('');
    setCantidadInput('');
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleSubmit = async (enviarAhora: boolean = false) => {
    if (!proveedorId || items.length === 0) {
      alert('Complete los campos requeridos');
      return;
    }

    try {
      const ordenData = {
        proveedorId: proveedorId as any, // Cast to any to avoid type mismatch with service interface
        observaciones,
        tipoProcesamiento: 'externo' as 'externo',
        itemsSalida: items.map(item => ({
          materiaPrimaId: item.materiaPrimaId,
          codigoMateriaPrima: item.codigo,
          nombreMateriaPrima: item.nombre,
          cantidad: getNumericValue(item.cantidad),
          unidadMedida: item.unidadMedida
        }))
      };

      let ordenId: string;
      
      // Si estamos editando una orden existente, actualizar; si no, crear nueva
      if (activeId) {
        const ordenActualizada = await actualizarOrden(activeId, ordenData);
        ordenId = ordenActualizada._id;
      } else {
        const nuevaOrden = await crearOrden(ordenData);
        ordenId = nuevaOrden._id;
      }

      // Si se seleccionó "Guardar y Enviar", enviar la orden
      if (enviarAhora) {
        try {
          await enviarOrden(ordenId);
          setSnackbar({ 
            open: true, 
            message: 'Orden enviada a procesamiento correctamente. Stock actualizado.', 
            severity: 'success' 
          });
        } catch (enviarError: any) {
          setSnackbar({ 
            open: true, 
            message: enviarError.response?.data?.message || 'Error al enviar la orden a procesamiento', 
            severity: 'error' 
          });
          return; // No cerrar el formulario si hubo error al enviar
        }
      }

      if (onSuccess) onSuccess();
      if (onClose) onClose();
      else navigate('/ordenes-procesamiento');
    } catch (error: any) {
      console.error('Error saving order:', error);
      setSnackbar({ 
        open: true, 
        message: error.response?.data?.message || 'Error al guardar la orden', 
        severity: 'error' 
      });
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>

      <Button 
        startIcon={<ArrowBackIcon />} 
        onClick={() => onClose ? onClose() : navigate('/ordenes-procesamiento')}
        sx={{ mb: 2 }}
      >
        Volver
      </Button>

      <Card sx={{ boxShadow: onClose ? 0 : 1 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            {activeId ? `Orden ${activeId.slice(-6)}` : 'Nueva Orden de Procesamiento'}
            {activeId && !isEditable && <Typography variant="caption" sx={{ ml: 2 }}>(Solo Lectura)</Typography>}
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                select
                label="Proveedor"
                fullWidth
                value={proveedorId}
                onChange={(e) => setProveedorId(e.target.value)}
                disabled={!isEditable}
              >
                {proveedores.map((prov) => (
                  <MenuItem key={prov._id} value={prov._id}>
                    {prov.razonSocial}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {isEditable && (
              <>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Agregar Materias Primas
              </Typography>
              <Box display="flex" gap={2} alignItems="flex-start">
                <TextField
                  select
                  label="Materia Prima"
                  sx={{ flexGrow: 1 }}
                  value={selectedMaterialId}
                  onChange={(e) => setSelectedMaterialId(e.target.value)}
                >
                  {materiasPrimas.map((mp) => (
                    <MenuItem key={mp._id} value={mp._id}>
                      {mp.codigo} - {mp.nombre} (Stock: {mp.stock} {mp.unidadMedida})
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Cantidad"
                  value={cantidadInput}
                  onChange={(e) => setCantidadInput(formatNumberInput(e.target.value))}
                  sx={{ width: 150 }}
                />
                <Button
                  variant="contained"
                  onClick={handleAddItem}
                  sx={{ mt: 1 }}
                  startIcon={<AddIcon />}
                >
                  Agregar
                </Button>
              </Box>
            </Grid>
            </>
            )}

            <Grid item xs={12}>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Código</TableCell>
                      <TableCell>Nombre</TableCell>
                      <TableCell align="right">Cantidad</TableCell>
                      <TableCell>Unidad</TableCell>
                      <TableCell align="center">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.codigo}</TableCell>
                        <TableCell>{item.nombre}</TableCell>
                        <TableCell align="right">{item.cantidad}</TableCell>
                        <TableCell>{item.unidadMedida}</TableCell>
                        <TableCell align="center">
                          {isEditable && (
                          <IconButton size="small" onClick={() => handleRemoveItem(index)}>
                            <DeleteIcon />
                          </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {items.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          No hay items agregados
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Observaciones"
                multiline
                rows={3}
                fullWidth
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                disabled={!isEditable}
              />
            </Grid>

            <Grid item xs={12} sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              {isEditable && (
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={() => handleSubmit(false)}
                  disabled={items.length === 0 || !proveedorId}
                >
                  Guardar
                </Button>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default OrdenProcesamientoForm;
