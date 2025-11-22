import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Grid,
  Typography,
  InputAdornment
} from '@mui/material';
import { formatNumberInput, getNumericValue } from '../utils/formatters';
import api from '../services/api';

interface PagoProveedorModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  proveedor: {
    _id: string;
    razonSocial: string;
    saldoCuenta: number;
  } | null;
}

const MEDIOS_PAGO = [
  'EFECTIVO',
  'TRANSFERENCIA',
  'CHEQUE_PROPIO',
  'CHEQUE_TERCERO',
  'TARJETA_DEBITO',
  'TARJETA_CREDITO',
  'OTRO'
];

const CAJAS = ['PROVINCIA', 'SANTANDER', 'EFECTIVO', 'FCI', 'RESERVA'];

const PagoProveedorModal: React.FC<PagoProveedorModalProps> = ({ open, onClose, onSuccess, proveedor }) => {
  const [monto, setMonto] = useState('');
  const [medioPago, setMedioPago] = useState('EFECTIVO');
  const [banco, setBanco] = useState('EFECTIVO');
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!proveedor) return;

    const montoNum = getNumericValue(monto);
    if (montoNum <= 0) {
      alert('El monto debe ser mayor a 0');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/api/proveedores/${proveedor._id}/pagar`, {
        monto: montoNum,
        medioPago,
        banco,
        rubro: 'PROOVMANO.DE.OBRA', // Default for this flow
        subRubro: 'GALVANO CADENAS', // Default valid subrubro, could be selectable
        observaciones
      });
      
      alert('Pago registrado exitosamente');
      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      console.error('Error registering payment:', error);
      alert(error.response?.data?.message || 'Error al registrar el pago');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setMonto('');
    setMedioPago('EFECTIVO');
    setBanco('EFECTIVO');
    setObservaciones('');
  };

  if (!proveedor) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Registrar Pago a {proveedor.razonSocial}</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2, mt: 1 }}>
          <Typography variant="subtitle1" color={proveedor.saldoCuenta > 0 ? 'error' : 'success'}>
            Deuda Actual: ${proveedor.saldoCuenta.toLocaleString()}
          </Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              label="Monto a Pagar"
              fullWidth
              value={monto}
              onChange={(e) => setMonto(formatNumberInput(e.target.value))}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              select
              label="Medio de Pago"
              fullWidth
              value={medioPago}
              onChange={(e) => setMedioPago(e.target.value)}
            >
              {MEDIOS_PAGO.map((mp) => (
                <MenuItem key={mp} value={mp}>{mp}</MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={6}>
            <TextField
              select
              label="Caja / Banco Salida"
              fullWidth
              value={banco}
              onChange={(e) => setBanco(e.target.value)}
            >
              {CAJAS.map((caja) => (
                <MenuItem key={caja} value={caja}>{caja}</MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Observaciones"
              fullWidth
              multiline
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={loading || !monto}
        >
          {loading ? 'Registrando...' : 'Registrar Pago'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

import { Box } from '@mui/material'; // Import missing Box

export default PagoProveedorModal;
