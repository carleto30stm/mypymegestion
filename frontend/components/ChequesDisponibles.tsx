import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../redux/store';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField
} from '@mui/material';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import PaymentIcon from '@mui/icons-material/Payment';
import { formatDate, formatCurrencyWithSymbol } from '../utils/formatters';
import { fetchGastos } from '../redux/slices/gastosSlice';
import { gastosAPI } from '../services/api';

interface ChequesDisponiblesProps {
  filterType: 'total' | 'month';
  selectedMonth: string;
  availableMonths: Array<{ value: string; label: string }>;
}

const ChequesDisponibles: React.FC<ChequesDisponiblesProps> = ({ 
  filterType, 
  selectedMonth, 
  availableMonths 
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: gastos } = useSelector((state: RootState) => state.gastos);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [chequeSeleccionado, setChequeSeleccionado] = useState<any>(null);
  const [tipoDisposicion, setTipoDisposicion] = useState<'depositar' | 'pagar_proveedor'>('depositar');
  const [bancoDestino, setBancoDestino] = useState('');
  const [detalleOperacion, setDetalleOperacion] = useState('');
  const [loading, setLoading] = useState(false);

  // Función para filtrar cheques disponibles para disposición
  const getChequesDisponibles = () => {
    // Filtrar cheques de tercero confirmados y en estado 'recibido'
    let chequesDisponibles = gastos.filter(gasto => 
      gasto.medioDePago === 'Cheque Tercero' && 
      gasto.confirmado === true &&
      (!gasto.estadoCheque || gasto.estadoCheque === 'recibido')
    );

    // Aplicar filtro de fecha
    if (filterType === 'month') {
      chequesDisponibles = chequesDisponibles.filter(gasto => {
        const fechaGasto = new Date(gasto.fecha).toISOString().slice(0, 7);
        return fechaGasto === selectedMonth;
      });
    }

    return chequesDisponibles;
  };

  const chequesDisponibles = getChequesDisponibles();

  const handleAbrirDialog = (cheque: any, tipo: 'depositar' | 'pagar_proveedor') => {
    setChequeSeleccionado(cheque);
    setTipoDisposicion(tipo);
    setBancoDestino('');
    setDetalleOperacion('');
    setDialogOpen(true);
  };

  const handleCerrarDialog = () => {
    setDialogOpen(false);
    setChequeSeleccionado(null);
    setBancoDestino('');
    setDetalleOperacion('');
  };

  const handleConfirmarDisposicion = async () => {
    if (!chequeSeleccionado || !detalleOperacion) return;
    
    if (tipoDisposicion === 'depositar' && !bancoDestino) {
      alert('Selecciona el banco destino');
      return;
    }

    setLoading(true);
    try {
      await gastosAPI.disponerCheque(
        chequeSeleccionado._id,
        tipoDisposicion,
        bancoDestino,
        detalleOperacion
      );
      
      // Recargar los gastos para actualizar la lista
      dispatch(fetchGastos());
      
      handleCerrarDialog();
      alert(`Cheque ${tipoDisposicion === 'depositar' ? 'depositado' : 'utilizado para pago'} exitosamente`);
    } catch (error) {
      console.error('Error al disponer cheque:', error);
      alert('Error al procesar la operación');
    } finally {
      setLoading(false);
    }
  };

  if (chequesDisponibles.length === 0) {
    return (
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          📝 Cheques Disponibles para Disposición
        </Typography>
        <Typography color="text.secondary">
          No hay cheques de terceros disponibles para depositar o utilizar.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          📝 Cheques Disponibles para Disposición
        </Typography>
        <Chip 
            label={chequesDisponibles.length} 
            color="warning" 
            size="small" 
            sx={{ ml: 2 }}
        />
      </Box> 
      <List>
        {chequesDisponibles.map((cheque, index) => (
          <React.Fragment key={cheque._id}>
            <ListItem>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1" fontWeight="medium">
                      {cheque.clientes || 'Cliente no especificado'}
                    </Typography>
                    <Chip 
                      label={formatCurrencyWithSymbol(cheque.entrada || 0)}
                      color="success"
                      size="small"
                    />
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {cheque.detalleGastos}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Recibido: {formatDate(cheque.fecha)} • Banco: {cheque.banco}
                    </Typography>
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="contained"
                    color="primary"
                    startIcon={<MonetizationOnIcon />}
                    onClick={() => handleAbrirDialog(cheque, 'depositar')}
                  >
                    Depositar
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="secondary"
                    startIcon={<PaymentIcon />}
                    onClick={() => handleAbrirDialog(cheque, 'pagar_proveedor')}
                  >
                    Pagar Proveedor
                  </Button>
                </Box>
              </ListItemSecondaryAction>
            </ListItem>
            {index < chequesDisponibles.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>

      {/* Dialog para disposición */}
      <Dialog open={dialogOpen} onClose={handleCerrarDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {tipoDisposicion === 'depositar' ? 'Depositar Cheque' : 'Pagar con Cheque'}
        </DialogTitle>
        <DialogContent>
          {chequeSeleccionado && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>
                <strong>Cheque:</strong> {formatCurrencyWithSymbol(chequeSeleccionado.entrada || 0)} de {chequeSeleccionado.clientes}
              </Typography>
              
              {tipoDisposicion === 'depositar' && (
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel>Banco Destino</InputLabel>
                  <Select
                    value={bancoDestino}
                    label="Banco Destino"
                    onChange={(e) => setBancoDestino(e.target.value)}
                  >
                    <MenuItem value="PROVINCIA">PROVINCIA</MenuItem>
                    <MenuItem value="SANTANDER">SANTANDER</MenuItem>
                    <MenuItem value="EFECTIVO">EFECTIVO</MenuItem>
                    <MenuItem value="FCI">FCI</MenuItem>
                    <MenuItem value="RESERVA">RESERVA</MenuItem>
                  </Select>
                </FormControl>
              )}
              
              <TextField
                fullWidth
                label={tipoDisposicion === 'depositar' ? 'Detalle del depósito' : 'Proveedor/Detalle del pago'}
                value={detalleOperacion}
                onChange={(e) => setDetalleOperacion(e.target.value)}
                sx={{ mt: 2 }}
                placeholder={tipoDisposicion === 'depositar' ? 'Ej: Depósito en sucursal Centro' : 'Ej: Pago a Proveedor XYZ'}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCerrarDialog}>Cancelar</Button>
          <Button 
            onClick={handleConfirmarDisposicion}
            variant="contained"
            disabled={loading || !detalleOperacion || (tipoDisposicion === 'depositar' && !bancoDestino)}
          >
            {loading ? 'Procesando...' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default ChequesDisponibles;