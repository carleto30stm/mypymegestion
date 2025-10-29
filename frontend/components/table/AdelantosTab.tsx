import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { AppDispatch, RootState } from '../../redux/store';
import { LiquidacionPeriodo } from '../../types';
import { registrarAdelanto, fetchPeriodoById } from '../../redux/slices/liquidacionSlice';
import { fetchGastos } from '../../redux/slices/gastosSlice';
import { formatCurrency } from '../../utils/formatters';

interface AdelantosTabProps {
  periodo: LiquidacionPeriodo;
}

const AdelantosTab: React.FC<AdelantosTabProps> = ({ periodo }) => {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  
  const [openAdelanto, setOpenAdelanto] = useState(false);
  const [selectedEmpleadoId, setSelectedEmpleadoId] = useState('');
  const [monto, setMonto] = useState('');
  const [observaciones, setObservaciones] = useState('');
  
  const isEditable = periodo.estado === 'abierto' && user?.userType === 'admin';

  const handleOpenAdelanto = () => {
    setSelectedEmpleadoId('');
    setMonto('');
    setObservaciones('');
    setOpenAdelanto(true);
  };

  const handleCloseAdelanto = () => {
    setOpenAdelanto(false);
  };

  const handleRegistrarAdelanto = async () => {
    if (!selectedEmpleadoId || !monto || !periodo._id) return;

    try {
      await dispatch(registrarAdelanto({
        periodoId: periodo._id,
        empleadoId: selectedEmpleadoId,
        monto: parseFloat(monto),
        observaciones
      })).unwrap();
      
      // Refrescar período y gastos
      await dispatch(fetchPeriodoById(periodo._id));
      await dispatch(fetchGastos());
      
      handleCloseAdelanto();
    } catch (error) {
      console.error('Error al registrar adelanto:', error);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Adelantos y Conceptos Adicionales</Typography>
        {isEditable && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenAdelanto}
          >
            Registrar Adelanto
          </Button>
        )}
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Los adelantos y otros conceptos se descuentan automáticamente del total a pagar en la liquidación.
      </Alert>

      {/* Resumen por empleado */}
      <Grid container spacing={2}>
        {periodo.liquidaciones.map((liquidacion) => (
          <Grid item xs={12} md={6} lg={4} key={liquidacion.empleadoId}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  {liquidacion.empleadoApellido}, {liquidacion.empleadoNombre}
                </Typography>
                
                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Sueldo Base:</Typography>
                    <Typography variant="body2">{formatCurrency(liquidacion.sueldoBase)}</Typography>
                  </Box>
                  
                  {liquidacion.totalHorasExtra > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="info.main">Horas Extra:</Typography>
                      <Typography variant="body2" color="info.main">
                        +{formatCurrency(liquidacion.totalHorasExtra)}
                      </Typography>
                    </Box>
                  )}
                  
                  {liquidacion.adelantos > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="warning.main">Adelantos:</Typography>
                      <Typography variant="body2" color="warning.main">
                        -{formatCurrency(liquidacion.adelantos)}
                      </Typography>
                    </Box>
                  )}
                  
                  {liquidacion.aguinaldos > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="secondary.main">Aguinaldos:</Typography>
                      <Typography variant="body2" color="secondary.main">
                        +{formatCurrency(liquidacion.aguinaldos)}
                      </Typography>
                    </Box>
                  )}
                  
                  {liquidacion.bonus > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="secondary.main">Bonus:</Typography>
                      <Typography variant="body2" color="secondary.main">
                        +{formatCurrency(liquidacion.bonus)}
                      </Typography>
                    </Box>
                  )}
                  
                  {liquidacion.descuentos > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="error.main">Descuentos:</Typography>
                      <Typography variant="body2" color="error.main">
                        -{formatCurrency(liquidacion.descuentos)}
                      </Typography>
                    </Box>
                  )}
                  
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      pt: 1,
                      mt: 1,
                      borderTop: 1,
                      borderColor: 'divider'
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight="bold">Total a Pagar:</Typography>
                    <Typography variant="subtitle2" fontWeight="bold" color="primary.main">
                      {formatCurrency(liquidacion.totalAPagar)}
                    </Typography>
                  </Box>
                </Box>
                
                {liquidacion.observaciones && (
                  <Box sx={{ mt: 2, p: 1, backgroundColor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Observaciones:
                    </Typography>
                    <Typography variant="caption" display="block">
                      {liquidacion.observaciones}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Dialog Registrar Adelanto */}
      <Dialog open={openAdelanto} onClose={handleCloseAdelanto} maxWidth="sm" fullWidth>
        <DialogTitle>Registrar Adelanto</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <FormControl fullWidth required>
              <InputLabel>Empleado</InputLabel>
              <Select
                value={selectedEmpleadoId}
                onChange={(e) => setSelectedEmpleadoId(e.target.value)}
                label="Empleado"
              >
                {periodo.liquidaciones
                  .filter(liq => liq.estado === 'pendiente')
                  .map((liq) => (
                    <MenuItem key={liq.empleadoId} value={liq.empleadoId}>
                      {liq.empleadoApellido}, {liq.empleadoNombre}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            <TextField
              label="Monto del Adelanto"
              type="number"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              fullWidth
              required
              inputProps={{ min: 0, step: 0.01 }}
            />

            <TextField
              label="Observaciones"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              fullWidth
              multiline
              rows={3}
              placeholder="Motivo del adelanto, fecha, etc."
            />

            <Alert severity="warning">
              El adelanto se descontará automáticamente del total a pagar en la liquidación del empleado.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAdelanto}>Cancelar</Button>
          <Button
            onClick={handleRegistrarAdelanto}
            variant="contained"
            disabled={!selectedEmpleadoId || !monto || parseFloat(monto) <= 0}
          >
            Registrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdelantosTab;
