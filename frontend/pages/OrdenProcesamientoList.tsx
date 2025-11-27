import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Tooltip,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Snackbar,
  Alert
} from '@mui/material';
import { Add as AddIcon, Visibility as VisibilityIcon, LocalShipping as ShippingIcon, Edit as EditIcon, Send as SendIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getOrdenes, enviarOrden, OrdenProcesamiento } from '../services/ordenProcesamientoService';
import OrdenProcesamientoForm from './OrdenProcesamientoForm';
import { formatDate } from '../utils/formatters';

const OrdenProcesamientoList: React.FC = () => {
  const navigate = useNavigate();
  const [ordenes, setOrdenes] = useState<OrdenProcesamiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    fetchOrdenes();
  }, []);

  const fetchOrdenes = async () => {
    try {
      const data = await getOrdenes();
      setOrdenes(data);
    } catch (error) {
      console.error('Error fetching ordenes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (id: string | null) => {
    setSelectedOrderId(id);
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedOrderId(null);
  };

  const handleSuccess = () => {
    handleCloseModal();
    fetchOrdenes();
  };

  const handleEnviarOrden = async (ordenId: string) => {
    if (!confirm('¿Está seguro de enviar esta orden a procesamiento? Se descontará el stock.')) {
      return;
    }

    try {
      await enviarOrden(ordenId);
      setSnackbar({ 
        open: true, 
        message: 'Orden enviada a procesamiento correctamente. Stock actualizado.', 
        severity: 'success' 
      });
      fetchOrdenes();
    } catch (error: any) {
      setSnackbar({ 
        open: true, 
        message: error.response?.data?.message || 'Error al enviar la orden', 
        severity: 'error' 
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'borrador': return 'default';
      case 'pendiente': return 'warning';
      case 'en_proceso': return 'info';
      case 'completada': return 'success';
      case 'cancelada': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'borrador': return 'Borrador';
      case 'pendiente': return 'Pendiente';
      case 'en_proceso': return 'En Proceso';
      case 'completada': return 'Completada';
      case 'cancelada': return 'Cancelada';
      default: return status;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          Órdenes de Procesamiento
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenModal(null)}
        >
          Nueva Orden
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Número</TableCell>
              <TableCell>Proveedor</TableCell>
              <TableCell>Fecha Envío</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Items Salida</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ordenes.map((orden) => (
              <TableRow key={orden._id}>
                <TableCell>{orden.numeroOrden}</TableCell>
                <TableCell>{orden.proveedorId?.razonSocial || 'N/A'}</TableCell>
                <TableCell>{formatDate(orden.fechaEnvio)}</TableCell>
                <TableCell>
                  <Chip 
                    label={getStatusLabel(orden.estado)} 
                    color={getStatusColor(orden.estado) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {orden.itemsSalida.length} items
                  <Typography variant="caption" display="block" color="textSecondary">
                    {orden.itemsSalida.map(i => i.nombreMateriaPrima).join(', ').slice(0, 30)}...
                  </Typography>
                </TableCell>
                <TableCell>
                  <Tooltip title="Ver Detalle">
                    <IconButton onClick={() => handleOpenModal(orden._id)}>
                      <VisibilityIcon />
                    </IconButton>
                  </Tooltip>
                  {['borrador', 'pendiente'].includes(orden.estado) && (
                    <>
                      <Tooltip title="Editar Items">
                        <IconButton 
                          color="primary"
                          onClick={() => handleOpenModal(orden._id)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Enviar a Procesar">
                        <IconButton 
                          color="warning"
                          onClick={() => handleEnviarOrden(orden._id)}
                        >
                          <SendIcon />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                  {orden.estado === 'en_proceso' && (
                    <Tooltip title="Recibir">
                      <IconButton 
                        color="success"
                        onClick={() => navigate(`/ordenes-procesamiento/${orden._id}/recibir`)}
                      >
                        <ShippingIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {ordenes.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No hay órdenes registradas
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog 
        open={openModal} 
        onClose={handleCloseModal}
        maxWidth="lg"
        fullWidth
      >
        <DialogContent>
          <OrdenProcesamientoForm 
            orderId={selectedOrderId}
            onClose={handleCloseModal}
            onSuccess={handleSuccess}
          />
        </DialogContent>
      </Dialog>

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

export default OrdenProcesamientoList;
