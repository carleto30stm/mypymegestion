import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  Typography,
  Alert
} from '@mui/material';
import { formatCurrency } from '../../utils/formatters';
import { HoraExtra } from '../../types';

interface PagarHoraExtraModalProps {
  open: boolean;
  horaExtra: HoraExtra | null;
  onClose: () => void;
  onConfirm: (paymentData: { medioDePago: string; banco: string; comentario: string }) => void;
}

const PagarHoraExtraModal: React.FC<PagarHoraExtraModalProps> = ({
  open,
  horaExtra,
  onClose,
  onConfirm
}) => {
  const [formData, setFormData] = useState({
    medioDePago: 'Efectivo',
    banco: 'EFECTIVO',
    comentario: ''
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    onConfirm(formData);
    onClose();
  };

  const handleCancel = () => {
    setFormData({
      medioDePago: 'Efectivo',
      banco: 'EFECTIVO',
      comentario: ''
    });
    onClose();
  };

  if (!horaExtra) return null;

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle>Registrar Pago de Horas Extra</DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Se creará automáticamente un registro de gasto en SUELDOS y aparecerá en la nómina del empleado.
          </Alert>

          {/* Información de la hora extra */}
          <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {horaExtra.empleadoApellido}, {horaExtra.empleadoNombre}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Cantidad:</strong> {horaExtra.cantidadHoras} horas
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Valor hora:</strong> {formatCurrency(horaExtra.valorHora)} (x 1.5 = {formatCurrency(horaExtra.valorHora * 1.5)})
            </Typography>
            <Typography variant="body1" color="primary" sx={{ mt: 1 }}>
              <strong>Monto total:</strong> {formatCurrency(horaExtra.montoTotal)}
            </Typography>
          </Box>

          {/* Formulario de pago */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Medio de Pago</InputLabel>
              <Select
                value={formData.medioDePago}
                label="Medio de Pago"
                onChange={(e) => handleChange('medioDePago', e.target.value)}
              >
                <MenuItem value="Efectivo">Efectivo</MenuItem>
                <MenuItem value="Transferencia">Transferencia</MenuItem>
                <MenuItem value="Cheque Propio">Cheque Propio</MenuItem>
                <MenuItem value="Tarjeta Débito">Tarjeta Débito</MenuItem>
                <MenuItem value="Tarjeta Crédito">Tarjeta Crédito</MenuItem>
                <MenuItem value="Transferencia">Transferencia</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Caja/Banco</InputLabel>
              <Select
                value={formData.banco}
                label="Caja/Banco"
                onChange={(e) => handleChange('banco', e.target.value)}
              >
                <MenuItem value="EFECTIVO">EFECTIVO</MenuItem>
                <MenuItem value="PROVINCIA">PROVINCIA</MenuItem>
                <MenuItem value="SANTANDER">SANTANDER</MenuItem>
                <MenuItem value="FCI">FCI</MenuItem>
                <MenuItem value="RESERVA">RESERVA</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Comentario adicional (opcional)"
              multiline
              rows={3}
              value={formData.comentario}
              onChange={(e) => handleChange('comentario', e.target.value)}
              placeholder="Ej: Pago quincenal, bonificación, etc."
              fullWidth
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleCancel}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Registrar Pago
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PagarHoraExtraModal;