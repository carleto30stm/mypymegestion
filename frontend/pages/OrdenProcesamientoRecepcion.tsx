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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  MenuItem,
  Alert,
  TableContainer
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Save as SaveIcon } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { getOrdenById, recibirOrden, OrdenProcesamiento } from '../services/ordenProcesamientoService';
import api from '../services/api';
import { formatNumberInput, getNumericValue, formatCurrency } from '../utils/formatters';

const OrdenProcesamientoRecepcion: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [orden, setOrden] = useState<OrdenProcesamiento | null>(null);
  const [materiasPrimas, setMateriasPrimas] = useState<any[]>([]);
  const [costoServicio, setCostoServicio] = useState('');
  
  // State for received items (initially copies of sent items)
  const [itemsRecibidos, setItemsRecibidos] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      const [ordenData, mpRes] = await Promise.all([
        getOrdenById(id!),
        api.get('/api/materias-primas')
      ]);
      
      setOrden(ordenData);
      setMateriasPrimas(mpRes.data);

      // Initialize received items with sent items (assuming 1:1 transformation usually)
      // User can change the material if it was transformed
      const initialItems = ordenData.itemsSalida.map((item: any) => ({
        materiaPrimaId: item.materiaPrimaId, // Default to same material
        codigoMateriaPrima: item.codigoMateriaPrima,
        nombreMateriaPrima: item.nombreMateriaPrima,
        cantidad: formatNumberInput(item.cantidad.toString()), // Default to same quantity
        unidadMedida: item.unidadMedida,
        originalCantidad: item.cantidad
      }));
      setItemsRecibidos(initialItems);

    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error al cargar la orden');
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...itemsRecibidos];
    
    if (field === 'materiaPrimaId') {
      const material = materiasPrimas.find(m => m._id === value);
      if (material) {
        newItems[index] = {
          ...newItems[index],
          materiaPrimaId: material._id,
          codigoMateriaPrima: material.codigo,
          nombreMateriaPrima: material.nombre,
          unidadMedida: material.unidadMedida
        };
      }
    } else if (field === 'cantidad') {
      newItems[index].cantidad = formatNumberInput(value);
    }

    setItemsRecibidos(newItems);
  };

  const handleSubmit = async () => {
    if (!orden) return;

    const costo = getNumericValue(costoServicio);
    if (costo < 0) {
      alert('El costo del servicio no puede ser negativo');
      return;
    }

    try {
      const data = {
        itemsEntrada: itemsRecibidos.map(item => ({
          materiaPrimaId: item.materiaPrimaId,
          codigoMateriaPrima: item.codigoMateriaPrima,
          nombreMateriaPrima: item.nombreMateriaPrima,
          cantidad: getNumericValue(item.cantidad),
          unidadMedida: item.unidadMedida
        })),
        costoServicio: costo,
        fechaRecepcion: new Date()
      };

      await recibirOrden(orden._id, data);
      alert('Orden recibida correctamente. Se ha generado la deuda con el proveedor.');
      navigate('/ordenes-procesamiento');
    } catch (error: any) {
      console.error('Error receiving order:', error);
      alert(error.response?.data?.message || 'Error al recibir la orden');
    }
  };

  if (!orden) return <Typography>Cargando...</Typography>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Button 
        startIcon={<ArrowBackIcon />} 
        onClick={() => navigate('/ordenes-procesamiento')}
        sx={{ mb: 2 }}
      >
        Volver
      </Button>

      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5">
              Recepción de Orden: {orden.numeroOrden}
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              Proveedor: {orden.proveedorId.razonSocial}
            </Typography>
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            Ingrese la cantidad real recibida. La diferencia con la cantidad enviada se considerará merma automáticamente.
            Si el material fue transformado (ej: Crudo a Bañado), cambie la Materia Prima seleccionada.
          </Alert>

          <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Enviado (Original)</TableCell>
                  <TableCell>Cant. Enviada</TableCell>
                  <TableCell>Recibido (Transformado)</TableCell>
                  <TableCell>Cant. Recibida</TableCell>
                  <TableCell>Merma Estimada</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {itemsRecibidos.map((item, index) => {
                  const cantRecibida = getNumericValue(item.cantidad);
                  const merma = item.originalCantidad - cantRecibida;
                  const porcentajeMerma = (merma / item.originalCantidad) * 100;

                  return (
                    <TableRow key={index}>
                      <TableCell>
                        {orden.itemsSalida[index].nombreMateriaPrima}
                      </TableCell>
                      <TableCell>
                        {orden.itemsSalida[index].cantidad} {orden.itemsSalida[index].unidadMedida}
                      </TableCell>
                      <TableCell sx={{ width: '30%' }}>
                        <TextField
                          select
                          fullWidth
                          size="small"
                          value={item.materiaPrimaId}
                          onChange={(e) => handleItemChange(index, 'materiaPrimaId', e.target.value)}
                        >
                          {materiasPrimas.map((mp) => (
                            <MenuItem key={mp._id} value={mp._id}>
                              {mp.codigo} - {mp.nombre}
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell sx={{ width: '15%' }}>
                        <TextField
                          fullWidth
                          size="small"
                          value={item.cantidad}
                          onChange={(e) => handleItemChange(index, 'cantidad', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        {merma > 0 ? (
                          <Typography color="error" variant="body2">
                            {merma.toFixed(2)} ({porcentajeMerma.toFixed(1)}%)
                          </Typography>
                        ) : (
                          <Typography color="success.main" variant="body2">
                            Sin merma
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <TextField
                label="Costo del Servicio (Mano de Obra)"
                fullWidth
                value={costoServicio}
                onChange={(e) => setCostoServicio(formatNumberInput(e.target.value))}
                helperText="Este monto se cargará a la cuenta corriente del proveedor"
              />
            </Grid>
            <Grid item xs={12} md={8} display="flex" alignItems="center">
              <Typography variant="body2" color="textSecondary">
                * Al guardar, se actualizará el stock de los productos recibidos y se generará la deuda correspondiente.
              </Typography>
            </Grid>
          </Grid>

          <Box mt={3} display="flex" justifyContent="flex-end">
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<SaveIcon />}
              onClick={handleSubmit}
            >
              Confirmar Recepción
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default OrdenProcesamientoRecepcion;
