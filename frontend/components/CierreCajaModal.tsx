import React, { useState, useEffect } from 'react';
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
  Alert,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip
} from '@mui/material';
import { CAJAS } from '../types';
import { CajaBalance } from '../services/cajaService';
import { formatCurrencyWithSymbol, formatNumberInput, getNumericValue } from '../utils/formatters';

interface CierreCajaModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (declarados: CajaBalance[], sistemas: CajaBalance[], observaciones: string) => Promise<void>;
  saldosSistema: Record<string, number>; // Pasados desde el Dashboard usando BankSummary logic
}

const CierreCajaModal: React.FC<CierreCajaModalProps> = ({ open, onClose, onConfirm, saldosSistema }) => {
  const [declarados, setDeclarados] = useState<Record<string, number>>(
    (CAJAS as readonly string[]).reduce((acc: Record<string, number>, current: string) => ({ ...acc, [current]: 0 }), {})
  );
  const [declaradosFormateados, setDeclaradosFormateados] = useState<Record<string, string>>(
    (CAJAS as readonly string[]).reduce((acc: Record<string, string>, current: string) => ({ ...acc, [current]: '' }), {})
  );
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMontoChange = (caja: string, value: string) => {
    const formatted = formatNumberInput(value);
    const numeric = getNumericValue(formatted);
    setDeclaradosFormateados(prev => ({ ...prev, [caja]: formatted }));
    setDeclarados(prev => ({ ...prev, [caja]: numeric }));
  };

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const declaradosArray: CajaBalance[] = Object.entries(declarados).map(([caja, monto]) => ({
        caja,
        monto
      }));

      const sistemasArray: CajaBalance[] = Object.entries(saldosSistema).map(([caja, monto]) => ({
        caja,
        monto
      }));

      await onConfirm(declaradosArray, sistemasArray, observaciones);
      onClose();
    } catch (err: any) {
      console.error('Error al cerrar caja:', err);
      setError(err.response?.data?.message || 'Error al cerrar la caja. Verifique los datos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 'bold' }}>Arqueo de Caja (Cierre de Turno)</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Contabilice el dinero físico y compárelo con el teórico del sistema. 
          Cualquier discrepancia quedará registrada para auditoría.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        <Table size="small" sx={{ mb: 3 }}>
          <TableHead>
            <TableRow>
              <TableCell>Cuenta</TableCell>
              <TableCell align="right">Saldo Sistema</TableCell>
              <TableCell align="right">Saldo Físico</TableCell>
              <TableCell align="right">Diferencia</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
                  {CAJAS.map((caja) => {
                    const teorico = saldosSistema[caja] || 0;
                    const fisico = declarados[caja] || 0;

                    // Usar los valores redondeados que se muestran en pantalla
                    const mostrableTeorico = Math.round(teorico);
                    const mostrableFisico = Math.round(fisico);
                    const difMostrada = mostrableFisico - mostrableTeorico;

                    return (
                      <TableRow key={caja}>
                        <TableCell sx={{ fontWeight: 'medium' }}>{caja}</TableCell>
                        <TableCell align="right">{formatCurrencyWithSymbol(teorico)}</TableCell>
                        <TableCell align="right">
                            <TextField
                              variant="standard"
                              type="text"
                              size="small"
                              value={declaradosFormateados[caja] ?? ''}
                              onChange={(e) => handleMontoChange(caja, e.target.value)}
                              sx={{ width: 120, input: { textAlign: 'right' } }}
                              placeholder="0,00"
                            />
                        </TableCell>
                        <TableCell align="right">
                          {difMostrada === 0 ? (
                            <Chip label="OK" size="small" color="success" variant="outlined" />
                          ) : (
                            <Typography color={difMostrada > 0 ? 'info.main' : 'error.main'} variant="body2" fontWeight="bold">
                              {difMostrada > 0 ? '+' : ''}{formatCurrencyWithSymbol(difMostrada)}
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
          </TableBody>
        </Table>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              label="Observaciones de Cierre"
              multiline
              rows={2}
              fullWidth
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ej: Faltó registrar un gasto de $X, se compensará mañana..."
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button 
          onClick={handleConfirm} 
          variant="contained" 
          color="error"
          disabled={loading}
        >
          {loading ? 'Cerrando...' : 'Finalizar Turno y Cerrar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CierreCajaModal;
