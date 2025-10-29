import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import { 
  fetchHorasExtra, 
  fetchHorasExtraByEmployee,
  marcarComoPagada,
  cancelarHoraExtra,
  deleteHoraExtra
} from '../redux/slices/horasExtraSlice';
import { fetchEmployees } from '../redux/slices/employeesSlice';
import { formatCurrency, formatDate } from '../utils/formatters';
import { HoraExtra } from '../types';
import PagarHoraExtraModal from './PagarHoraExtraModal';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  TextField,
  Button,
  Tooltip,
  Alert
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Payment as PaymentIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';

interface HorasExtraTableProps {
  onEditHoraExtra: (horaExtra: HoraExtra) => void;
}

const HorasExtraTable: React.FC<HorasExtraTableProps> = ({ onEditHoraExtra }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: horasExtra, status } = useSelector((state: RootState) => state.horasExtra);
  const { items: employees } = useSelector((state: RootState) => state.employees);
  const { user } = useSelector((state: RootState) => state.auth);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedHora, setSelectedHora] = useState<HoraExtra | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [horaParaPagar, setHoraParaPagar] = useState<HoraExtra | null>(null);
  const [filters, setFilters] = useState({
    empleadoId: '',
    estado: '',
    fechaDesde: '',
    fechaHasta: ''
  });

  // Cargar datos al montar el componente
  useEffect(() => {
    dispatch(fetchHorasExtra());
    if (employees.length === 0) {
      dispatch(fetchEmployees());
    }
  }, [dispatch, employees.length]);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, horaExtra: HoraExtra) => {
    setAnchorEl(event.currentTarget);
    setSelectedHora(horaExtra);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedHora(null);
  };

  const handleMarcarComoPagada = (horaExtra: HoraExtra) => {
    setHoraParaPagar(horaExtra);
    setShowPaymentModal(true);
    handleMenuClose();
  };

  const handleConfirmPayment = async (paymentData: { medioDePago: string; banco: string; comentario: string }) => {
    if (!horaParaPagar) return;
    
    try {
      await dispatch(marcarComoPagada({ 
        id: horaParaPagar._id!, 
        paymentData
      })).unwrap();
      
      setHoraParaPagar(null);
      
      // Opcional: mostrar mensaje de éxito
      alert('Hora extra marcada como pagada y registrada en nómina exitosamente');
    } catch (error) {
      console.error('Error al marcar como pagada:', error);
      alert('Error al marcar como pagada');
    }
  };

  const handleCancelar = async (horaExtra: HoraExtra) => {
    if (window.confirm('¿Estás seguro de que quieres cancelar esta hora extra?')) {
      try {
        await dispatch(cancelarHoraExtra(horaExtra._id!));
        handleMenuClose();
      } catch (error) {
        console.error('Error al cancelar:', error);
        alert('Error al cancelar la hora extra');
      }
    }
  };

  const handleEliminar = async (horaExtra: HoraExtra) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta hora extra? Esta acción no se puede deshacer.')) {
      try {
        await dispatch(deleteHoraExtra(horaExtra._id!));
        handleMenuClose();
      } catch (error) {
        console.error('Error al eliminar:', error);
        alert('Error al eliminar la hora extra');
      }
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      empleadoId: '',
      estado: '',
      fechaDesde: '',
      fechaHasta: ''
    });
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'registrada':
        return 'warning';
      case 'pagada':
        return 'success';
      case 'cancelada':
        return 'error';
      default:
        return 'default';
    }
  };

  // Filtrar horas extra
  const filteredHoras = horasExtra.filter(hora => {
    if (filters.empleadoId && hora.empleadoId !== filters.empleadoId) return false;
    if (filters.estado && hora.estado !== filters.estado) return false;
    if (filters.fechaDesde && hora.fecha < filters.fechaDesde) return false;
    if (filters.fechaHasta && hora.fecha > filters.fechaHasta) return false;
    return true;
  });

  // Calcular totales
  const totales = filteredHoras.reduce((acc, hora) => {
    acc.totalHoras += hora.cantidadHoras;
    acc.totalMonto += hora.montoTotal;
    if (hora.estado === 'registrada') {
      acc.pendientePago += hora.montoTotal;
    }
    return acc;
  }, { totalHoras: 0, totalMonto: 0, pendientePago: 0 });

  if (status === 'loading') {
    return <Typography>Cargando horas extra...</Typography>;
  }

  return (
    <Box>
      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <FilterIcon sx={{ mr: 1 }} />
          Filtros
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Empleado</InputLabel>
            <Select
              value={filters.empleadoId}
              label="Empleado"
              onChange={(e) => handleFilterChange('empleadoId', e.target.value)}
            >
              <MenuItem value="">Todos</MenuItem>
              {employees
                .filter(emp => emp.estado === 'activo')
                .map((employee) => (
                  <MenuItem key={employee._id} value={employee._id}>
                    {employee.apellido}, {employee.nombre}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Estado</InputLabel>
            <Select
              value={filters.estado}
              label="Estado"
              onChange={(e) => handleFilterChange('estado', e.target.value)}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="registrada">Registrada</MenuItem>
              <MenuItem value="pagada">Pagada</MenuItem>
              <MenuItem value="cancelada">Cancelada</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Fecha Desde"
            type="date"
            value={filters.fechaDesde}
            onChange={(e) => handleFilterChange('fechaDesde', e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            label="Fecha Hasta"
            type="date"
            value={filters.fechaHasta}
            onChange={(e) => handleFilterChange('fechaHasta', e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          <Button onClick={clearFilters} variant="outlined">
            Limpiar Filtros
          </Button>
        </Box>
      </Paper>

      {/* Resumen */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Resumen
        </Typography>
        <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <Typography variant="body2">
            <strong>Total Horas:</strong> {totales.totalHoras.toFixed(2)}
          </Typography>
          <Typography variant="body2">
            <strong>Monto Total:</strong> {formatCurrency(totales.totalMonto)}
          </Typography>
          <Typography variant="body2" color="warning.main">
            <strong>Pendiente de Pago:</strong> {formatCurrency(totales.pendientePago)}
          </Typography>
        </Box>
      </Paper>

      {/* Tabla */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Fecha</strong></TableCell>
              <TableCell><strong>Empleado</strong></TableCell>
              <TableCell><strong>Horas</strong></TableCell>
              <TableCell><strong>Valor Hora</strong></TableCell>
              <TableCell><strong>Monto Total</strong></TableCell>
              <TableCell><strong>Estado</strong></TableCell>
              <TableCell><strong>Descripción</strong></TableCell>
              <TableCell><strong>Acciones</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredHoras.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No hay horas extra registradas
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredHoras.map((horaExtra) => (
                <TableRow key={horaExtra._id}>
                  <TableCell>{formatDate(horaExtra.fecha)}</TableCell>
                  <TableCell>
                    {horaExtra.empleadoApellido}, {horaExtra.empleadoNombre}
                  </TableCell>
                  <TableCell>{horaExtra.cantidadHoras}</TableCell>
                  <TableCell>{formatCurrency(horaExtra.valorHora)}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {formatCurrency(horaExtra.montoTotal)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={horaExtra.estado.toUpperCase()} 
                      color={getEstadoColor(horaExtra.estado) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap>
                      {horaExtra.descripcion || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      onClick={(e) => handleMenuClick(e, horaExtra)}
                      size="small"
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Menú de acciones */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedHora && selectedHora.estado === 'registrada' && (
          [
            <MenuItem key="edit" onClick={() => {
              onEditHoraExtra(selectedHora);
              handleMenuClose();
            }}>
              <EditIcon sx={{ mr: 1 }} fontSize="small" />
              Editar
            </MenuItem>,
            <MenuItem key="pay" onClick={() => handleMarcarComoPagada(selectedHora)}>
              <PaymentIcon sx={{ mr: 1 }} fontSize="small" />
              Marcar como Pagada
            </MenuItem>,
            <MenuItem key="cancel" onClick={() => handleCancelar(selectedHora)}>
              <CancelIcon sx={{ mr: 1 }} fontSize="small" />
              Cancelar
            </MenuItem>
          ]
        )}
        
        {user?.userType === 'admin' && (
          <MenuItem onClick={() => handleEliminar(selectedHora!)} sx={{ color: 'error.main' }}>
            <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
            Eliminar
          </MenuItem>
        )}
      </Menu>

      {/* Modal para confirmar pago */}
      <PagarHoraExtraModal
        open={showPaymentModal}
        horaExtra={horaParaPagar}
        onClose={() => {
          setShowPaymentModal(false);
          setHoraParaPagar(null);
        }}
        onConfirm={handleConfirmPayment}
      />
    </Box>
  );
};

export default HorasExtraTable;