import React from 'react';
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
  Divider
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { formatDate, formatCurrencyWithSymbol } from '../utils/formatters';

interface PendingChecksProps {
  filterType: 'today' | 'month' | 'quarter' | 'semester' | 'year' | 'total';
  selectedMonth: string;
  selectedQuarter: string;
  selectedSemester: string;
  selectedYear: string;
  availableMonths: Array<{ value: string; label: string }>;
}

const PendingChecks: React.FC<PendingChecksProps> = ({ 
  filterType, 
  selectedMonth,
  selectedQuarter,
  selectedSemester,
  selectedYear
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: gastos } = useSelector((state: RootState) => state.gastos);
  
  // Función helper para determinar si una fecha coincide con el filtro
  const matchesFilter = (fecha: Date): boolean => {
    const fechaStr = fecha.toISOString();
    const today = new Date().toISOString().split('T')[0];
    
    switch (filterType) {
      case 'today':
        return fechaStr.split('T')[0] === today;
      case 'month':
        return fechaStr.slice(0, 7) === selectedMonth;
      case 'quarter': {
        const [year, quarter] = selectedQuarter.split('-Q');
        const fechaYear = fecha.getFullYear();
        const fechaQuarter = Math.floor(fecha.getMonth() / 3) + 1;
        return fechaYear === parseInt(year) && fechaQuarter === parseInt(quarter);
      }
      case 'semester': {
        const [year, semester] = selectedSemester.split('-S');
        const fechaYear = fecha.getFullYear();
        const fechaSemester = fecha.getMonth() < 6 ? 1 : 2;
        return fechaYear === parseInt(year) && fechaSemester === parseInt(semester);
      }
      case 'year':
        return fecha.getFullYear() === parseInt(selectedYear);
      case 'total':
      default:
        return true;
    }
  };

  // Función para filtrar cheques pendientes según el tipo de filtro
  const getFilteredCheques = () => {
    // Primero filtrar solo cheques pendientes
    let chequesPendientes = gastos.filter(gasto => 
      gasto.medioDePago?.toUpperCase().includes('CHEQUE') && !gasto.confirmado
    );

    // Luego aplicar filtro de fecha según el tipo
    if (filterType === 'total') {
      return chequesPendientes;
    } else {
      return chequesPendientes.filter(gasto => matchesFilter(new Date(gasto.fecha)));
    }
  };
  
  // Filtrar solo cheques pendientes de confirmación
  const chequesPendientes = getFilteredCheques();

  const handleConfirmarCheque = (id: string) => {
    dispatch(confirmarCheque(id));
  };

  if (chequesPendientes.length === 0) {
    const filtroTexto = filterType === 'total' 
      ? 'en total' 
      : `para ${availableMonths?.find(m => m.value === selectedMonth)?.label || selectedMonth}`;
      
    return (
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          📝 Cheques Pendientes
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No hay cheques pendientes de confirmación {filtroTexto}.
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
        {filterType === 'month' && (
          <><br />Filtro aplicado: {availableMonths?.find(m => m.value === selectedMonth)?.label || selectedMonth}</>
        )}
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
                      <strong> Banco:</strong> {cheque.banco}
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
                  onClick={() => handleConfirmarCheque(cheque._id as string)}
                >
                  Confirmar
                </Button>
              </ListItemSecondaryAction>
            </ListItem>
            {index < chequesPendientes.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
    </Paper>
  );
};

export default PendingChecks;