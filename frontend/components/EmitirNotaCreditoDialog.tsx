import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  AlertTitle,
  Chip,
  Divider,
  CircularProgress,
  Fade,
  Paper,
  useTheme,
  alpha,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  InputAdornment,
  Slider,
  Collapse,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CreditCard as CreditCardIcon,
  Receipt as ReceiptIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  AttachMoney as MoneyIcon,
  Calculate as CalculateIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../redux/store';
import { emitirNotaCredito } from '../redux/slices/facturasSlice';
import type { Factura } from '../redux/slices/facturasSlice';
import { formatCurrency } from '../utils/formatters';

interface EmitirNotaCreditoDialogProps {
  open: boolean;
  factura: Factura;
  onClose: () => void;
  onSuccess: (notaCredito: any) => void;
}

const EmitirNotaCreditoDialog: React.FC<EmitirNotaCreditoDialogProps> = ({
  open,
  factura,
  onClose,
  onSuccess,
}) => {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { loading } = useSelector((state: RootState) => state.facturas);

  const [tipoNC, setTipoNC] = useState<'total' | 'parcial'>('total');
  const [motivo, setMotivo] = useState('');
  const [importeParcial, setImporteParcial] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [notaCreditoEmitida, setNotaCreditoEmitida] = useState<any>(null);
  const [showDetalles, setShowDetalles] = useState(false);

  const importeTotal = factura.importeTotal || factura.total || 0;

  const handleClose = () => {
    if (!loading) {
      setTipoNC('total');
      setMotivo('');
      setImporteParcial(0);
      setError(null);
      setSuccess(false);
      setNotaCreditoEmitida(null);
      setShowDetalles(false);
      onClose();
    }
  };

  const handleEmitir = async () => {
    if (!motivo.trim()) {
      setError('El motivo es obligatorio');
      return;
    }

    if (motivo.trim().length < 5) {
      setError('El motivo debe tener al menos 5 caracteres');
      return;
    }

    if (tipoNC === 'parcial') {
      if (importeParcial <= 0) {
        setError('El importe parcial debe ser mayor a 0');
        return;
      }
      if (importeParcial >= importeTotal) {
        setError('El importe parcial debe ser menor al total de la factura');
        return;
      }
    }

    setError(null);

    try {
      const result = await dispatch(emitirNotaCredito({
        facturaId: factura._id,
        motivo: motivo.trim(),
        importeParcial: tipoNC === 'parcial' ? importeParcial : undefined,
      })).unwrap();

      setSuccess(true);
      setNotaCreditoEmitida(result.notaCredito);

      setTimeout(() => {
        onSuccess(result.notaCredito);
      }, 2500);
    } catch (err: any) {
      setError(err || 'Error al emitir la Nota de Crédito');
    }
  };

  const getNumeroComprobante = () => {
    const pv = factura.datosAFIP?.puntoVenta?.toString().padStart(5, '0') || '00001';
    const num = (factura.datosAFIP?.numeroSecuencial || 0).toString().padStart(8, '0');
    return `${pv}-${num}`;
  };

  const getTipoNCLabel = () => {
    const tipo = factura.tipoComprobante;
    if (tipo.includes('_A')) return 'Nota de Crédito A';
    if (tipo.includes('_B')) return 'Nota de Crédito B';
    if (tipo.includes('_C')) return 'Nota de Crédito C';
    return 'Nota de Crédito';
  };

  const getImporteNC = () => {
    return tipoNC === 'total' ? importeTotal : importeParcial;
  };

  const porcentajeSlider = (importeParcial / importeTotal) * 100;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
        },
      }}
    >
      {/* Header con gradiente */}
      <Box
        sx={{
          background: success
            ? `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`
            : `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.primary.main} 100%)`,
          color: 'white',
          p: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {success ? (
            <CheckCircleIcon sx={{ fontSize: 40 }} />
          ) : (
            <CreditCardIcon sx={{ fontSize: 40 }} />
          )}
          <Box>
            <Typography variant="h5" fontWeight="bold">
              {success ? '¡Nota de Crédito Emitida!' : 'Emitir Nota de Crédito'}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {success
                ? 'La NC fue autorizada por AFIP exitosamente'
                : getTipoNCLabel()
              }
            </Typography>
          </Box>
        </Box>
      </Box>

      <DialogContent sx={{ p: 3 }}>
        {/* Factura de referencia */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            bgcolor: alpha(theme.palette.primary.main, 0.05),
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          }}
        >
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
            onClick={() => setShowDetalles(!showDetalles)}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ReceiptIcon color="primary" fontSize="small" />
              <Typography variant="subtitle2" fontWeight="600">
                Factura de Referencia: {getNumeroComprobante()}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip 
                label={formatCurrency(importeTotal)} 
                color="primary" 
                size="small"
                sx={{ fontWeight: 600 }}
              />
              <IconButton size="small">
                {showDetalles ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
          </Box>

          <Collapse in={showDetalles}>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Cliente
                </Typography>
                <Typography variant="body2" fontWeight="500" noWrap>
                  {typeof factura.clienteId === 'object'
                    ? factura.clienteId.razonSocial || `${factura.clienteId.nombre} ${factura.clienteId.apellido || ''}`
                    : 'N/A'
                  }
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  CAE Original
                </Typography>
                <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
                  {factura.datosAFIP?.cae || '-'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Fecha
                </Typography>
                <Typography variant="body2">
                  {new Date(factura.fecha).toLocaleDateString('es-AR')}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Vto. CAE
                </Typography>
                <Typography variant="body2">
                  {factura.datosAFIP?.fechaVencimientoCAE 
                    ? new Date(factura.datosAFIP.fechaVencimientoCAE).toLocaleDateString('es-AR')
                    : '-'
                  }
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  IVA
                </Typography>
                <Typography variant="body2">
                  {formatCurrency(factura.importeIVA || 0)}
                </Typography>
              </Box>
            </Box>
          </Collapse>
        </Paper>

        {/* Resultado exitoso */}
        {success ? (
          <Fade in={success}>
            <Box>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  bgcolor: alpha(theme.palette.success.main, 0.08),
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                  textAlign: 'center',
                }}
              >
                <CheckCircleIcon 
                  sx={{ fontSize: 60, color: 'success.main', mb: 2 }} 
                />
                
                <Typography variant="h6" fontWeight="600" color="success.dark" gutterBottom>
                  Nota de Crédito Autorizada
                </Typography>

                {notaCreditoEmitida && (
                  <Box sx={{ mt: 2, textAlign: 'left' }}>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Número NC
                        </Typography>
                        <Typography variant="body1" fontWeight="600">
                          {notaCreditoEmitida.numeroComprobante}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Importe
                        </Typography>
                        <Typography variant="body1" fontWeight="600" color="success.main">
                          {formatCurrency(notaCreditoEmitida.importe || getImporteNC())}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          CAE Nota de Crédito
                        </Typography>
                        <Typography variant="body2" fontFamily="monospace">
                          {notaCreditoEmitida.cae}
                        </Typography>
                      </Box>
                      {notaCreditoEmitida.fechaVencimientoCAE && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Vencimiento CAE
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {new Date(notaCreditoEmitida.fechaVencimientoCAE).toLocaleDateString('es-AR')}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                )}
              </Paper>
            </Box>
          </Fade>
        ) : (
          <>
            {/* Tipo de NC */}
            <Typography variant="subtitle2" fontWeight="600" gutterBottom>
              Tipo de Nota de Crédito
            </Typography>
            
            <FormControl component="fieldset" sx={{ width: '100%', mb: 3 }}>
              <RadioGroup
                value={tipoNC}
                onChange={(e) => setTipoNC(e.target.value as 'total' | 'parcial')}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    mb: 1.5,
                    borderRadius: 2,
                    border: tipoNC === 'total' 
                      ? `2px solid ${theme.palette.primary.main}` 
                      : `1px solid ${theme.palette.divider}`,
                    bgcolor: tipoNC === 'total' 
                      ? alpha(theme.palette.primary.main, 0.05) 
                      : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.05),
                    },
                  }}
                  onClick={() => setTipoNC('total')}
                >
                  <FormControlLabel
                    value="total"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="body1" fontWeight="500">
                          Anulación Total
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          NC por el 100% del importe: <strong>{formatCurrency(importeTotal)}</strong>
                        </Typography>
                      </Box>
                    }
                    sx={{ m: 0, width: '100%' }}
                  />
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: tipoNC === 'parcial' 
                      ? `2px solid ${theme.palette.primary.main}` 
                      : `1px solid ${theme.palette.divider}`,
                    bgcolor: tipoNC === 'parcial' 
                      ? alpha(theme.palette.primary.main, 0.05) 
                      : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.05),
                    },
                  }}
                  onClick={() => setTipoNC('parcial')}
                >
                  <FormControlLabel
                    value="parcial"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="body1" fontWeight="500">
                          Devolución Parcial
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          NC por un importe menor a {formatCurrency(importeTotal)}
                        </Typography>
                      </Box>
                    }
                    sx={{ m: 0, width: '100%' }}
                  />
                </Paper>
              </RadioGroup>
            </FormControl>

            {/* Importe parcial */}
            <Collapse in={tipoNC === 'parcial'}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight="600" gutterBottom>
                  Importe de la Nota de Crédito
                </Typography>
                
                <Box sx={{ px: 1, mb: 2 }}>
                  <Slider
                    value={importeParcial}
                    onChange={(_, value) => setImporteParcial(value as number)}
                    min={0}
                    max={importeTotal * 0.99}
                    step={0.01}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => formatCurrency(value)}
                    sx={{
                      '& .MuiSlider-valueLabel': {
                        fontSize: '0.75rem',
                      },
                    }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">
                      $0
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatCurrency(importeTotal)}
                    </Typography>
                  </Box>
                </Box>

                <TextField
                  fullWidth
                  type="number"
                  label="Importe"
                  value={importeParcial || ''}
                  onChange={(e) => setImporteParcial(parseFloat(e.target.value) || 0)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <MoneyIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: importeParcial > 0 && (
                      <InputAdornment position="end">
                        <Chip 
                          label={`${porcentajeSlider.toFixed(1)}%`} 
                          size="small" 
                          color="primary"
                          variant="outlined"
                        />
                      </InputAdornment>
                    ),
                  }}
                  helperText={
                    importeParcial > 0 
                      ? `Importe restante: ${formatCurrency(importeTotal - importeParcial)}`
                      : 'Ingrese el importe a devolver'
                  }
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    },
                  }}
                />
              </Box>
            </Collapse>

            {/* Motivo */}
            <Typography variant="subtitle2" fontWeight="600" gutterBottom>
              Motivo
            </Typography>
            <TextField
              fullWidth
              placeholder="Ej: Descuento por pronto pago, Devolución de mercadería, Error en facturación..."
              multiline
              rows={2}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              disabled={loading}
              error={!!error && motivo.length < 5}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />

            {/* Resumen */}
            {(motivo.length >= 5 && (tipoNC === 'total' || importeParcial > 0)) && (
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  mt: 3,
                  bgcolor: alpha(theme.palette.info.main, 0.08),
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CalculateIcon color="info" fontSize="small" />
                  <Typography variant="subtitle2" fontWeight="600">
                    Resumen de la Operación
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Se emitirá {getTipoNCLabel()} por:
                  </Typography>
                  <Typography variant="h6" fontWeight="700" color="info.main">
                    {formatCurrency(getImporteNC())}
                  </Typography>
                </Box>
              </Paper>
            )}

            {/* Error */}
            {error && (
              <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                {error}
              </Alert>
            )}
          </>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        {!success ? (
          <>
            <Button
              onClick={handleClose}
              disabled={loading}
              variant="outlined"
              sx={{ borderRadius: 2, px: 3 }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEmitir}
              disabled={
                loading || 
                motivo.trim().length < 5 || 
                (tipoNC === 'parcial' && (importeParcial <= 0 || importeParcial >= importeTotal))
              }
              variant="contained"
              color="primary"
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CreditCardIcon />}
              sx={{
                borderRadius: 2,
                px: 3,
                boxShadow: 'none',
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                },
              }}
            >
              {loading ? 'Emitiendo...' : 'Emitir Nota de Crédito'}
            </Button>
          </>
        ) : (
          <Button
            onClick={handleClose}
            variant="contained"
            color="success"
            sx={{ borderRadius: 2, px: 4 }}
          >
            Cerrar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default EmitirNotaCreditoDialog;
