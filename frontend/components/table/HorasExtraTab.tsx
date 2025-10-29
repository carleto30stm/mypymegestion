import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  TextField
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { AppDispatch, RootState } from '../../redux/store';
import { LiquidacionPeriodo } from '../../types';
import { fetchHorasExtra } from '../../redux/slices/horasExtraSlice';
import { agregarHorasExtra, fetchPeriodoById } from '../../redux/slices/liquidacionSlice';
import { fetchGastos } from '../../redux/slices/gastosSlice';
import { formatCurrency } from '../../utils/formatters';
import HoraExtraForm from '../form/HoraExtraForm';

interface HorasExtraTabProps {
  periodo: LiquidacionPeriodo;
}

const HorasExtraTab: React.FC<HorasExtraTabProps> = ({ periodo }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: horasExtra } = useSelector((state: RootState) => state.horasExtra);
  const user = useSelector((state: RootState) => state.auth.user);
  
  const [openAgregar, setOpenAgregar] = useState(false);
  const [openNuevo, setOpenNuevo] = useState(false);
  const [selectedEmpleadoId, setSelectedEmpleadoId] = useState('');
  const [selectedHoraExtraId, setSelectedHoraExtraId] = useState('');
  
  const isEditable = periodo.estado === 'abierto' && user?.userType === 'admin';

  useEffect(() => {
    dispatch(fetchHorasExtra());
  }, [dispatch]);

  // Filtrar horas extra del período que aún no están asignadas
  const horasExtraDisponibles = horasExtra.filter(he => {
    const fecha = new Date(he.fecha);
    const fechaInicio = new Date(periodo.fechaInicio);
    const fechaFin = new Date(periodo.fechaFin);
    
    // Debe estar en el rango del período
    const enPeriodo = fecha >= fechaInicio && fecha <= fechaFin;
    
    // No debe estar ya asignada en alguna liquidación
    const yaAsignada = periodo.liquidaciones.some(liq =>
      liq.horasExtra.some(her => her.horaExtraId === he._id)
    );
    
    return enPeriodo && !yaAsignada && he.estado === 'registrada';
  });

  const handleOpenAgregar = () => {
    setSelectedEmpleadoId('');
    setSelectedHoraExtraId('');
    setOpenAgregar(true);
  };

  const handleCloseAgregar = () => {
    setOpenAgregar(false);
  };

  const handleAgregarHoraExtra = async () => {
    if (!selectedEmpleadoId || !selectedHoraExtraId || !periodo._id) return;

    try {
      await dispatch(agregarHorasExtra({
        periodoId: periodo._id,
        empleadoId: selectedEmpleadoId,
        horaExtraId: selectedHoraExtraId
      })).unwrap();
      
      // Refrescar período, horas extra y gastos
      await dispatch(fetchPeriodoById(periodo._id));
      await dispatch(fetchHorasExtra());
      await dispatch(fetchGastos());
      
      handleCloseAgregar();
    } catch (error) {
      console.error('Error al agregar hora extra:', error);
    }
  };

  const handleOpenNuevo = () => {
    setOpenNuevo(true);
  };

  const handleCloseNuevo = () => {
    setOpenNuevo(false);
    dispatch(fetchHorasExtra());
  };

  // Obtener todas las horas extra asignadas en el período
  const horasExtraAsignadas = periodo.liquidaciones.flatMap(liq =>
    liq.horasExtra.map(he => ({
      ...he,
      empleadoNombre: liq.empleadoNombre,
      empleadoApellido: liq.empleadoApellido
    }))
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Horas Extra del Período</Typography>
        {isEditable && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleOpenNuevo}
            >
              Registrar Nueva
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenAgregar}
              disabled={horasExtraDisponibles.length === 0}
            >
              Agregar Existente
            </Button>
          </Box>
        )}
      </Box>

      {horasExtraDisponibles.length > 0 && isEditable && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Hay {horasExtraDisponibles.length} horas extra registradas en este período que aún no han sido asignadas.
        </Alert>
      )}

      {/* Tabla de horas extra disponibles (no asignadas) */}
      {horasExtraDisponibles.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
            Horas Extra Disponibles para Asignar
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: 'warning.lighter' }}>
                  <TableCell><strong>Empleado</strong></TableCell>
                  <TableCell><strong>Fecha</strong></TableCell>
                  <TableCell align="right"><strong>Cantidad Horas</strong></TableCell>
                  <TableCell align="right"><strong>Valor/Hora</strong></TableCell>
                  <TableCell align="right"><strong>Monto Total</strong></TableCell>
                  <TableCell><strong>Descripción</strong></TableCell>
                  {isEditable && <TableCell align="center"><strong>Acción</strong></TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {horasExtraDisponibles.map((he) => (
                  <TableRow key={he._id} hover>
                    <TableCell>
                      <Typography variant="body2">
                        {he.empleadoApellido}, {he.empleadoNombre}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {new Date(he.fecha).toLocaleDateString('es-ES')}
                    </TableCell>
                    <TableCell align="right">
                      <Chip label={`${he.cantidadHoras} hs`} size="small" color="warning" />
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(he.valorHora)}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold">
                        {formatCurrency(he.montoTotal)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {he.descripcion || '-'}
                      </Typography>
                    </TableCell>
                    {isEditable && (
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            setSelectedEmpleadoId(he.empleadoId);
                            setSelectedHoraExtraId(he._id ?? '');
                            setOpenAgregar(true);
                          }}
                        >
                          Asignar
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Tabla de horas extra asignadas */}
      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
        Horas Extra Asignadas al Período
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Empleado</strong></TableCell>
              <TableCell><strong>Fecha</strong></TableCell>
              <TableCell align="right"><strong>Cantidad Horas</strong></TableCell>
              <TableCell align="right"><strong>Valor/Hora</strong></TableCell>
              <TableCell align="right"><strong>Monto Total</strong></TableCell>
              <TableCell><strong>Descripción</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {horasExtraAsignadas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    No hay horas extra asignadas en este período
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              horasExtraAsignadas.map((he, index) => (
                <TableRow key={index} hover>
                  <TableCell>
                    <Typography variant="body2">
                      {he.empleadoApellido}, {he.empleadoNombre}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {new Date(he.fecha).toLocaleDateString('es-ES')}
                  </TableCell>
                  <TableCell align="right">
                    <Chip label={`${he.cantidadHoras} hs`} size="small" color="info" />
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(he.valorHora)}
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="bold" color="primary.main">
                      {formatCurrency(he.montoTotal)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {he.descripcion || '-'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            )}
            
            {/* Fila de totales */}
            {horasExtraAsignadas.length > 0 && (
              <TableRow sx={{ backgroundColor: 'grey.50' }}>
                <TableCell colSpan={2}>
                  <Typography variant="subtitle2" fontWeight="bold">TOTAL</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="subtitle2" fontWeight="bold">
                    {horasExtraAsignadas.reduce((sum, he) => sum + he.cantidadHoras, 0)} hs
                  </Typography>
                </TableCell>
                <TableCell></TableCell>
                <TableCell align="right">
                  <Typography variant="subtitle2" fontWeight="bold" color="primary.main">
                    {formatCurrency(horasExtraAsignadas.reduce((sum, he) => sum + he.montoTotal, 0))}
                  </Typography>
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog Agregar Hora Extra Existente */}
      <Dialog open={openAgregar} onClose={handleCloseAgregar} maxWidth="sm" fullWidth>
        <DialogTitle>Agregar Hora Extra al Período</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <FormControl fullWidth required>
              <InputLabel>Empleado</InputLabel>
              <Select
                value={selectedEmpleadoId}
                onChange={(e) => setSelectedEmpleadoId(e.target.value)}
                label="Empleado"
              >
                {periodo.liquidaciones.map((liq) => (
                  <MenuItem key={liq.empleadoId} value={liq.empleadoId}>
                    {liq.empleadoApellido}, {liq.empleadoNombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>Hora Extra</InputLabel>
              <Select
                value={selectedHoraExtraId}
                onChange={(e) => setSelectedHoraExtraId(String((e.target as any).value))}
                label="Hora Extra"
              >
                {horasExtraDisponibles.map((he) => (
                  <MenuItem key={he._id} value={he._id}>
                    {he.empleadoApellido}, {he.empleadoNombre} - {new Date(he.fecha).toLocaleDateString('es-ES')} - {he.cantidadHoras}hs - {formatCurrency(he.montoTotal)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Alert severity="info">
              Solo se muestran horas extra registradas dentro del período que aún no han sido asignadas.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAgregar}>Cancelar</Button>
          <Button
            onClick={handleAgregarHoraExtra}
            variant="contained"
            disabled={!selectedEmpleadoId || !selectedHoraExtraId}
          >
            Agregar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Registrar Nueva Hora Extra */}
      <Dialog open={openNuevo} onClose={handleCloseNuevo} maxWidth="sm" fullWidth>
        <DialogTitle>Registrar Nueva Hora Extra</DialogTitle>
        <DialogContent>
          <HoraExtraForm 
            onSuccess={handleCloseNuevo}
            onCancel={handleCloseNuevo}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default HorasExtraTab;
