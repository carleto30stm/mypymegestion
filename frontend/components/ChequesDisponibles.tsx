import React, { useState, useEffect } from 'react';
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
import api, { gastosAPI, proveedoresAPI } from '../services/api';
import { Proveedor } from '../types';

interface ChequesDisponiblesProps {
  filterType: 'today' | 'month' | 'quarter' | 'semester' | 'year' | 'total';
  selectedMonth: string;
  selectedQuarter: string;
  selectedSemester: string;
  selectedYear: string;
  availableMonths: Array<{ value: string; label: string }>;
}

const ChequesDisponibles: React.FC<ChequesDisponiblesProps> = ({ 
  filterType, 
  selectedMonth,
  selectedQuarter,
  selectedSemester,
  selectedYear
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: gastos, lastUpdated } = useSelector((state: RootState) => state.gastos);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [chequeSeleccionado, setChequeSeleccionado] = useState<any>(null);
  const [todosLosCheques, setTodosLosCheques] = useState<any[]>([]);
  const [tipoDisposicion, setTipoDisposicion] = useState<'depositar' | 'pagar_proveedor'>('depositar');
  const [bancoDestino, setBancoDestino] = useState('');
  const [detalleOperacion, setDetalleOperacion] = useState('');
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState('');
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(false);

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

  // Efecto para cargar proveedores activos
  useEffect(() => {
    const cargarProveedores = async () => {
      try {
        const data = await proveedoresAPI.obtenerTodos({ estado: 'activo' });
        setProveedores(data);
      } catch (error) {
        console.error('Error al cargar proveedores:', error);
      }
    };
    
    cargarProveedores();
  }, []);

  // Función para filtrar cheques disponibles para disposición
  // IMPORTANTE: Usa todosLosCheques para que se vean sin importar el filtro de fecha
  const getChequesDisponibles = () => {
    // Filtrar cheques de tercero confirmados y en estado 'recibido'
    let chequesDisponibles = todosLosCheques.filter(gasto => 
      gasto.medioDePago === 'CHEQUE TERCERO' && 
      gasto.confirmado === true &&
      (!gasto.estadoCheque || gasto.estadoCheque === 'recibido')
    );

    return chequesDisponibles;
  };

  const chequesDisponibles = getChequesDisponibles();

  const handleAbrirDialog = (cheque: any, tipo: 'depositar' | 'pagar_proveedor') => {
    setChequeSeleccionado(cheque);
    setTipoDisposicion(tipo);
    setBancoDestino('');
    setDetalleOperacion('');
    setProveedorSeleccionado('');
    setDialogOpen(true);
  };

  const handleCerrarDialog = () => {
    setDialogOpen(false);
    setChequeSeleccionado(null);
    setBancoDestino('');
    setDetalleOperacion('');
    setProveedorSeleccionado('');
  };

  const handleConfirmarDisposicion = async () => {
    // Validaciones
    if (!chequeSeleccionado) return;
    
    if (tipoDisposicion === 'depositar') {
      if (!bancoDestino) {
        alert('Selecciona el banco destino');
        return;
      }
      if (!detalleOperacion) {
        alert('Ingresa el detalle del depósito');
        return;
      }
    } else {
      // pagar_proveedor
      if (!proveedorSeleccionado) {
        alert('Selecciona un proveedor');
        return;
      }
    }

    setLoading(true);
    try {
      // Para pago a proveedor, el detalle será el nombre del proveedor seleccionado
      const detalleFinal = tipoDisposicion === 'pagar_proveedor' 
        ? proveedores.find(p => p._id === proveedorSeleccionado)?.razonSocial || proveedorSeleccionado
        : detalleOperacion;

      await gastosAPI.disponerCheque(
        chequeSeleccionado._id,
        tipoDisposicion,
        bancoDestino,
        detalleFinal
      );
      
      // No necesitamos recargar manualmente, el useEffect se encargará cuando cambie lastUpdated
      // También actualizar Redux con el filtro actual
      dispatch(fetchGastos({}));
      
      handleCerrarDialog();
      alert(`Cheque ${tipoDisposicion === 'depositar' ? 'depositado' : 'utilizado para pago'} exitosamente`);
    } catch (error: any) {
      console.error('Error al disponer cheque:', error);
      
      // Manejo específico de errores
      let mensajeError = 'Error al procesar la operación';
      
      if (error.response?.data?.message) {
        mensajeError = error.response.data.message;
      } else if (error.message) {
        mensajeError = error.message;
      }
      
      // Mensajes específicos para errores comunes
      if (mensajeError.includes('cheque ya fue depositado') || mensajeError.includes('ya depositado')) {
        mensajeError = 'Este cheque ya fue depositado anteriormente';
      } else if (mensajeError.includes('cheque no encontrado') || mensajeError.includes('no encontrado')) {
        mensajeError = 'El cheque seleccionado ya no está disponible';
      } else if (mensajeError.includes('banco destino') || mensajeError.includes('destino')) {
        mensajeError = 'Error en la selección del banco destino';
      } else if (mensajeError.includes('proveedor') || mensajeError.includes('proveedor')) {
        mensajeError = 'Error en la selección del proveedor';
      } else if (mensajeError.includes('saldo insuficiente') || mensajeError.includes('insuficiente')) {
        mensajeError = 'Saldo insuficiente para realizar la operación';
      } else if (tipoDisposicion === 'depositar' && mensajeError.includes('depósito')) {
        mensajeError = 'Error al depositar el cheque. Verifique los datos e intente nuevamente';
      } else if (tipoDisposicion === 'pagar_proveedor' && mensajeError.includes('pago')) {
        mensajeError = 'Error al procesar el pago al proveedor. Verifique los datos e intente nuevamente';
      }
      
      alert(`❌ Error: ${mensajeError}`);
    } finally {
      setLoading(false);
    }
  };

  if (chequesDisponibles.length === 0) {
    return (
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          📝 Cheques Terceros para Disposición
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
          📝 Cheques Terceros para Disposición
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
              
              {tipoDisposicion === 'depositar' ? (
                <>
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
                  
                  <TextField
                    fullWidth
                    label="Detalle del depósito"
                    value={detalleOperacion}
                    onChange={(e) => setDetalleOperacion(e.target.value)}
                    sx={{ mt: 2 }}
                    placeholder="Ej: Depósito en sucursal Centro"
                  />
                </>
              ) : (
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel>Proveedor</InputLabel>
                  <Select
                    value={proveedorSeleccionado}
                    label="Proveedor"
                    onChange={(e) => setProveedorSeleccionado(e.target.value)}
                  >
                    {proveedores.length === 0 ? (
                      <MenuItem value="" disabled>
                        No hay proveedores activos
                      </MenuItem>
                    ) : (
                      proveedores.map((proveedor) => (
                        <MenuItem key={proveedor._id} value={proveedor._id}>
                          {proveedor.razonSocial} - {proveedor.numeroDocumento}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCerrarDialog}>Cancelar</Button>
          <Button 
            onClick={handleConfirmarDisposicion}
            variant="contained"
            disabled={
              loading || 
              (tipoDisposicion === 'depositar' && (!bancoDestino || !detalleOperacion)) ||
              (tipoDisposicion === 'pagar_proveedor' && !proveedorSeleccionado)
            }
          >
            {loading ? 'Procesando...' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default ChequesDisponibles;