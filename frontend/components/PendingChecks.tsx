import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../redux/store';
import { confirmarCheque } from '../redux/slices/gastosSlice';
import { 
  Paper, 
  Typography, 
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Button,
  Box,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import { formatDate, formatCurrencyWithSymbol } from '../utils/formatters';
import api from '../services/api';

const PendingChecks: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [todosLosCheques, setTodosLosCheques] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [chequeSeleccionado, setChequeSeleccionado] = useState<any>(null);
   const {lastUpdated } = useSelector((state: RootState) => state.gastos);

  // Efecto para cargar TODOS los cheques sin filtro de fecha
  useEffect(() => {
    const cargarTodosCheques = async () => {
      try {
        const response = await api.get('/api/gastos'); // Sin filtros de fecha
        setTodosLosCheques(response.data);
      } catch (error) {
        console.error('Error al cargar todos los cheques:', error);
      }
    };
    
    cargarTodosCheques();
  }, [lastUpdated]);
  
  // Filtrar solo cheques pendientes de confirmación (sin filtro de fecha - siempre visibles)
  const chequesPendientes = todosLosCheques.filter(gasto => 
    gasto.medioDePago?.toUpperCase().includes('CHEQUE') && !gasto.confirmado
  );

  const handleAbrirModal = (cheque: any) => {
    setChequeSeleccionado(cheque);
    setModalOpen(true);
  };

  const handleCerrarModal = () => {
    setModalOpen(false);
    setChequeSeleccionado(null);
  };

  const handleConfirmarCheque = async () => {
    if (!chequeSeleccionado) return;

    await dispatch(confirmarCheque(chequeSeleccionado._id));
    // Recargar todos los cheques después de confirmar
    try {
      const response = await api.get('/api/gastos');
      setTodosLosCheques(response.data);
    } catch (error) {
      console.error('Error al recargar cheques:', error);
    }
    
    handleCerrarModal();
  };

  if (chequesPendientes.length === 0) {
    return (
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          📝 Cheques Pendientes
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No hay cheques pendientes de confirmación.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          📝 Cheques Pendientes de Confirmación
        </Typography>
        <Chip 
          label={chequesPendientes.length} 
          color="warning" 
          size="small" 
          sx={{ ml: 2 }}
        />
      </Box>
      
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Estos cheques no se incluyen en los cálculos hasta que sean confirmados manualmente.
        Los cheques pendientes se muestran siempre, sin importar el filtro de fecha seleccionado.
      </Typography>

      <List>
        {chequesPendientes.map((cheque, index) => (
          <React.Fragment key={cheque._id}>
            <ListItem>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1" fontWeight="medium">
                      {cheque.detalleGastos}
                    </Typography>
                    <Chip 
                      label={cheque.medioDePago} 
                      size="small" 
                      variant="outlined"
                      color="info"
                    />
                  </Box>
                }
                secondary={
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Fecha:</strong> {formatDate(cheque.fecha)} | 
                      <strong> Cliente:</strong> {cheque.clientes} | 
                      <strong> Banco:</strong> {cheque.banco} |
                      <strong> Nro. Cheque:</strong> {cheque.numeroCheque}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Rubro:</strong> {cheque.rubro} - {cheque.subRubro}
                    </Typography>
                    {cheque.fechaStandBy && (
                      <Typography variant="body2" color="text.secondary">
                        <strong>Fecha StandBy:</strong> {formatDate(cheque.fechaStandBy)}
                      </Typography>
                    )}
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        color: cheque.tipoOperacion === 'entrada' ? 'success.main' : 'error.main',
                        mt: 0.5 
                      }}
                    >
                      {cheque.tipoOperacion === 'entrada' 
                        ? `+${formatCurrencyWithSymbol(cheque.entrada || 0)}`
                        : `-${formatCurrencyWithSymbol(cheque.salida || 0)}`
                      }
                    </Typography>
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                <Button
                  variant="contained"
                  color="success"
                  size="small"
                  startIcon={<CheckCircleIcon />}
                  onClick={() => handleAbrirModal(cheque)}
                >
                  Confirmar
                </Button>
              </ListItemSecondaryAction>
            </ListItem>
            {index < chequesPendientes.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>

      {/* Modal de confirmación */}
      <Dialog
        open={modalOpen}
        onClose={handleCerrarModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          Confirmar Cheque
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            ¿Estás seguro de que deseas confirmar este cheque? Esta acción hará que el cheque se incluya en los cálculos de caja.
          </DialogContentText>
          
          {chequeSeleccionado && (
            <Box sx={{ 
              bgcolor: 'background.default', 
              p: 2, 
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider'
            }}>
              <Typography variant="body2" gutterBottom>
                <strong>Detalle:</strong> {chequeSeleccionado.detalleGastos}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Medio de Pago:</strong> {chequeSeleccionado.medioDePago}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Cliente:</strong> {chequeSeleccionado.clientes}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Fecha:</strong> {formatDate(chequeSeleccionado.fecha)}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Banco:</strong> {chequeSeleccionado.banco}
              </Typography>
              <Typography 
                variant="h6" 
                sx={{ 
                  color: chequeSeleccionado.tipoOperacion === 'entrada' ? 'success.main' : 'error.main',
                  mt: 1
                }}
              >
                {chequeSeleccionado.tipoOperacion === 'entrada' 
                  ? `+${formatCurrencyWithSymbol(chequeSeleccionado.entrada || 0)}`
                  : `-${formatCurrencyWithSymbol(chequeSeleccionado.salida || 0)}`
                }
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={handleCerrarModal}
            variant="outlined"
            color="inherit"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmarCheque}
            variant="contained"
            color="success"
            startIcon={<CheckCircleIcon />}
            autoFocus
          >
            Confirmar Cheque
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default PendingChecks;