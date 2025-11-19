import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Alert,
  Typography,
  InputAdornment,
  Grid
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { crearConfiguracion, fetchConfiguracionVigente } from '../redux/slices/interesesSlice';
import { formatCurrency, parseCurrency } from '../utils/formatters';
import { AppDispatch, RootState } from '../redux/store';

interface ConfiguracionInteresesModalProps {
  open: boolean;
  onClose: () => void;
}

const ConfiguracionInteresesModal: React.FC<ConfiguracionInteresesModalProps> = ({ open, onClose }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { configuracionVigente, loading, error } = useSelector((state: RootState) => state.intereses);
  
  const [tasaMensual, setTasaMensual] = useState<string>('');
  const [fechaVigenciaDesde, setFechaVigenciaDesde] = useState<string>('');
  const [aplicaDesde, setAplicaDesde] = useState<string>('31');
  const [fuenteReferencia, setFuenteReferencia] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      // Resetear form al abrir
      setTasaMensual('');
      setFechaVigenciaDesde('');
      setAplicaDesde('31');
      setFuenteReferencia('');
      setObservaciones('');
      setErrors({});
    }
  }, [open]);

  const handleTasaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    // Permitir coma decimal y convertir a punto
    value = value.replace(',', '.');
    // Permitir solo números con hasta 3 decimales
    if (/^\d*\.?\d{0,3}$/.test(value)) {
      setTasaMensual(value);
      setErrors({ ...errors, tasaMensual: '' });
    }
  };

  const handleAplicaDesdeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      setAplicaDesde(value);
      setErrors({ ...errors, aplicaDesde: '' });
    }
  };

  const calcularTasaDiaria = (): string => {
    if (!tasaMensual) return '0.00';
    const mensual = parseFloat(tasaMensual);
    return (mensual / 30).toFixed(4);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!tasaMensual || parseFloat(tasaMensual) <= 0) {
      newErrors.tasaMensual = 'La tasa mensual es requerida y debe ser mayor a 0';
    }

    if (!fuenteReferencia.trim()) {
      newErrors.fuenteReferencia = 'La fuente de referencia es requerida';
    }

    const dias = parseInt(aplicaDesde);
    if (isNaN(dias) || dias < 1 || dias > 365) {
      newErrors.aplicaDesde = 'Los días deben estar entre 1 y 365';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      await dispatch(crearConfiguracion({
        tasaMensualVigente: parseFloat(tasaMensual),
        fechaVigenciaDesde: fechaVigenciaDesde || undefined,
        aplicaDesde: parseInt(aplicaDesde),
        fuenteReferencia: fuenteReferencia.trim(),
        observaciones: observaciones.trim() || undefined
      })).unwrap();

      // Refrescar configuración vigente
      dispatch(fetchConfiguracionVigente());
      
      onClose();
    } catch (error: any) {
      console.error('Error al crear configuración:', error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Nueva Configuración de Tasa de Interés
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {configuracionVigente && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Configuración actual:</strong> {configuracionVigente.tasaMensualVigente?.toFixed?.(3) ?? configuracionVigente.tasaMensualVigente}% mensual 
                ({(configuracionVigente.tasaMensualVigente / 30).toFixed(6)}% diario) 
                - Desde: {new Date(configuracionVigente.fechaVigenciaDesde).toLocaleDateString()}
              </Typography>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                La nueva configuración cerrará automáticamente la vigencia actual.
              </Typography>
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2}>
            {/* Tasa Mensual */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Tasa Mensual"
                value={tasaMensual}
                onChange={handleTasaChange}
                error={!!errors.tasaMensual}
                helperText={errors.tasaMensual || 'Tasa de interés mensual (ej: 3.291) — hasta 3 decimales'}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>
                }}
              />
            </Grid>

            {/* Tasa Diaria (calculada) */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Tasa Diaria (calculada)"
                value={calcularTasaDiaria()}
                InputProps={{
                  readOnly: true,
                  endAdornment: <InputAdornment position="end">%</InputAdornment>
                }}
                helperText="Tasa mensual / 30 días"
              />
            </Grid>

            {/* Fecha Vigencia Desde */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Vigencia Desde"
                type="date"
                value={fechaVigenciaDesde}
                onChange={(e) => setFechaVigenciaDesde(e.target.value)}
                InputLabelProps={{ shrink: true }}
                helperText="Dejar vacío para que inicie hoy"
              />
            </Grid>

            {/* Aplica Desde (días de mora) */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Aplica desde día"
                value={aplicaDesde}
                onChange={handleAplicaDesdeChange}
                error={!!errors.aplicaDesde}
                helperText={errors.aplicaDesde || 'Días de mora antes de aplicar interés (ej: 31)'}
                InputProps={{
                  endAdornment: <InputAdornment position="end">días</InputAdornment>
                }}
              />
            </Grid>

            {/* Fuente de Referencia */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Fuente de Referencia"
                value={fuenteReferencia}
                onChange={(e) => {
                  setFuenteReferencia(e.target.value);
                  setErrors({ ...errors, fuenteReferencia: '' });
                }}
                error={!!errors.fuenteReferencia}
                helperText={errors.fuenteReferencia || 'Ej: Banco Nación - Resolución 2024/01'}
                placeholder="Banco Nación - Resolución XXXX/XX"
              />
            </Grid>

            {/* Observaciones */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Observaciones"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                helperText="Información adicional sobre esta configuración (opcional)"
              />
            </Grid>
          </Grid>

          <Alert severity="warning" sx={{ mt: 3 }}>
            <Typography variant="body2">
              <strong>Importante:</strong> Esta configuración se aplicará automáticamente a todos los nuevos 
              intereses calculados a partir de la fecha de vigencia. Los intereses existentes mantendrán 
              la tasa con la que fueron creados.
            </Typography>
          </Alert>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading}
        >
          {loading ? 'Guardando...' : 'Guardar Configuración'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfiguracionInteresesModal;
