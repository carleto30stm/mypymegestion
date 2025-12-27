import React, { useState } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  Box, 
  Typography, 
  Grid,
  Alert
} from '@mui/material';
import { CAJAS } from '../types';
import { CajaBalance } from '../services/cajaService';
import { formatNumberInput, getNumericValue } from '../utils/formatters';

interface AperturaCajaModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (saldos: CajaBalance[], observaciones: string) => Promise<void>;
}

const AperturaCajaModal: React.FC<AperturaCajaModalProps> = ({ open, onClose, onConfirm }) => {
  const [saldos, setSaldos] = useState<Record<string, number>>(
    (CAJAS as readonly string[]).reduce((acc: Record<string, number>, current: string) => ({ ...acc, [current]: 0 }), {})
  );
  const [saldosFormateados, setSaldosFormateados] = useState<Record<string, string>>(
    (CAJAS as readonly string[]).reduce((acc: Record<string, string>, current: string) => ({ ...acc, [current]: '' }), {})
  );
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMontoChange = (caja: string, value: string) => {
    const formatted = formatNumberInput(value);
    const numeric = getNumericValue(formatted);
    setSaldosFormateados(prev => ({ ...prev, [caja]: formatted }));
    setSaldos(prev => ({ ...prev, [caja]: numeric }));
  };

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const saldosArray: CajaBalance[] = Object.entries(saldos).map(([caja, monto]) => ({
        caja,
        monto
      }));

      await onConfirm(saldosArray, observaciones);
      onClose();
    } catch (err: any) {
      console.error('Error al abrir caja:', err);
      setError(err.response?.data?.message || 'Error al abrir la caja. Verifique los datos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 'bold' }}>Apertura de Caja (Inicio de Turno)</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Ingrese el saldo físico contado para cada una de las cajas/bancos. 
          Esto creará un registro inicial de la realidad antes de operar.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        <Grid container spacing={2}>
          {CAJAS.map((caja) => (
            <Grid item xs={12} sm={6} key={caja}>
              <TextField
                label={caja}
                type="text"
                fullWidth
                value={saldosFormateados[caja] ?? ''}
                onChange={(e) => handleMontoChange(caja, e.target.value)}
                placeholder="0,00"
                autoComplete="off"
              />
            </Grid>
          ))}
          <Grid item xs={12}>
            <TextField
              label="Observaciones de Apertura"
              multiline
              rows={2}
              fullWidth
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ej: Faltó contar cambio chico, se ajustará luego..."
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button 
          onClick={handleConfirm} 
          variant="contained" 
          color="primary"
          disabled={loading}
        >
          {loading ? 'Abriendo...' : 'Confirmar Apertura'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AperturaCajaModal;
