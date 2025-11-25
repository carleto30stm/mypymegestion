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
} from '@mui/material';
import {
  Warning as WarningIcon,
  Cancel as CancelIcon,
  Receipt as ReceiptIcon,
  CreditCard as CreditCardIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../redux/store';
import { anularFactura } from '../redux/slices/facturasSlice';
import type { Factura } from '../redux/slices/facturasSlice';
import { formatCurrency } from '../utils/formatters';

interface AnularFacturaDialogProps {
  open: boolean;
  factura: Factura;
  onClose: () => void;
  onSuccess: (notaCredito?: any) => void;
}

const AnularFacturaDialog: React.FC<AnularFacturaDialogProps> = ({
  open,
  factura,
  onClose,
  onSuccess,
}) => {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { loading } = useSelector((state: RootState) => state.facturas);

  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [notaCreditoEmitida, setNotaCreditoEmitida] = useState<any>(null);

  // Verificar si la factura tiene CAE (autorizada en AFIP)
  const tieneCAE = factura.estado === 'autorizada' && factura.datosAFIP?.cae;

  const handleClose = () => {
    if (!loading) {
      setMotivo('');
      setError(null);
      setSuccess(false);
      setNotaCreditoEmitida(null);
      onClose();
    }
  };

  const handleAnular = async () => {
    if (!motivo.trim()) {
      setError('El motivo de anulación es obligatorio');
      return;
    }

    if (motivo.trim().length < 10) {
      setError('El motivo debe tener al menos 10 caracteres');
      return;
    }

    setError(null);

    try {
      const result = await dispatch(anularFactura({ 
        facturaId: factura._id, 
        motivo: motivo.trim() 
      })).unwrap();

      setSuccess(true);
      
      if (result.notaCredito) {
        setNotaCreditoEmitida(result.notaCredito);
      }

      // Esperar un momento para mostrar el éxito
      setTimeout(() => {
        onSuccess(result.notaCredito);
      }, 2000);
    } catch (err: any) {
      setError(err || 'Error al anular la factura');
    }
  };

  const getNumeroComprobante = () => {
    const pv = factura.datosAFIP?.puntoVenta?.toString().padStart(5, '0') || '00001';
    const num = (factura.datosAFIP?.numeroSecuencial || 0).toString().padStart(8, '0');
    return `${pv}-${num}`;
  };

  const getTipoComprobanteLabel = (tipo: string): string => {
    const labels: Record<string, string> = {
      'FACTURA_A': 'Factura A',
      'FACTURA_B': 'Factura B',
      'FACTURA_C': 'Factura C',
      'NOTA_CREDITO_A': 'NC A',
      'NOTA_CREDITO_B': 'NC B',
      'NOTA_CREDITO_C': 'NC C',
    };
    return labels[tipo] || tipo;
  };

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
            : `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
          color: 'white',
          p: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {success ? (
            <CheckCircleIcon sx={{ fontSize: 40 }} />
          ) : (
            <WarningIcon sx={{ fontSize: 40 }} />
          )}
          <Box>
            <Typography variant="h5" fontWeight="bold">
              {success ? '¡Factura Anulada!' : 'Anular Factura'}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {success 
                ? 'La operación se completó exitosamente'
                : tieneCAE 
                  ? 'Se emitirá una Nota de Crédito en AFIP'
                  : 'Esta acción no se puede deshacer'
              }
            </Typography>
          </Box>
        </Box>
      </Box>

      <DialogContent sx={{ p: 3 }}>
        {/* Resumen de la factura */}
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <ReceiptIcon color="primary" />
            <Typography variant="subtitle1" fontWeight="600">
              Comprobante a Anular
            </Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Tipo
              </Typography>
              <Typography variant="body2" fontWeight="500">
                {getTipoComprobanteLabel(factura.tipoComprobante)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Número
              </Typography>
              <Typography variant="body2" fontWeight="500">
                {getNumeroComprobante()}
              </Typography>
            </Box>
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
                Importe Total
              </Typography>
              <Typography variant="body2" fontWeight="700" color="primary.main">
                {formatCurrency(factura.importeTotal || factura.total || 0)}
              </Typography>
            </Box>
          </Box>

          {tieneCAE && (
            <Box sx={{ mt: 2, pt: 2, borderTop: `1px dashed ${alpha(theme.palette.divider, 0.5)}` }}>
              <Typography variant="caption" color="text.secondary">
                CAE
              </Typography>
              <Typography variant="body2" fontFamily="monospace">
                {factura.datosAFIP.cae}
              </Typography>
            </Box>
          )}
        </Paper>

        {/* Alerta informativa sobre NC */}
        {tieneCAE && !success && (
          <Alert 
            severity="info" 
            icon={<CreditCardIcon />}
            sx={{ 
              mb: 3,
              borderRadius: 2,
              '& .MuiAlert-icon': {
                alignItems: 'center',
              }
            }}
          >
            <AlertTitle sx={{ fontWeight: 600 }}>
              Emisión Automática de Nota de Crédito
            </AlertTitle>
            <Typography variant="body2">
              Al anular esta factura autorizada, se emitirá automáticamente una 
              <strong> Nota de Crédito </strong> en AFIP por el importe total 
              de <strong>{formatCurrency(factura.importeTotal || factura.total || 0)}</strong>.
            </Typography>
          </Alert>
        )}

        {/* Resultado exitoso */}
        {success ? (
          <Fade in={success}>
            <Box>
              {notaCreditoEmitida && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    bgcolor: alpha(theme.palette.success.main, 0.08),
                    borderRadius: 2,
                    border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <CreditCardIcon color="success" />
                    <Typography variant="subtitle1" fontWeight="600" color="success.dark">
                      Nota de Crédito Emitida
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Número NC
                      </Typography>
                      <Typography variant="body2" fontWeight="500">
                        {notaCreditoEmitida.numeroComprobante}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        CAE NC
                      </Typography>
                      <Typography variant="body2" fontFamily="monospace">
                        {notaCreditoEmitida.cae}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              )}

              <Alert severity="success" sx={{ mt: 2, borderRadius: 2 }}>
                <AlertTitle>Operación Completada</AlertTitle>
                La factura ha sido anulada correctamente.
                {notaCreditoEmitida && ' La Nota de Crédito fue autorizada por AFIP.'}
              </Alert>
            </Box>
          </Fade>
        ) : (
          <>
            {/* Campo de motivo */}
            <TextField
              fullWidth
              label="Motivo de Anulación"
              placeholder="Ingrese el motivo por el cual se anula esta factura (mínimo 10 caracteres)"
              multiline
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              disabled={loading}
              error={!!error && motivo.length < 10}
              helperText={
                error && motivo.length < 10 
                  ? error 
                  : `${motivo.length}/10 caracteres mínimos`
              }
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />

            {/* Mensaje de error general */}
            {error && motivo.length >= 10 && (
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
              onClick={handleAnular}
              disabled={loading || motivo.trim().length < 10}
              variant="contained"
              color="error"
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CancelIcon />}
              sx={{ 
                borderRadius: 2, 
                px: 3,
                boxShadow: 'none',
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(244, 67, 54, 0.3)',
                },
              }}
            >
              {loading ? 'Procesando...' : 'Anular Factura'}
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

export default AnularFacturaDialog;
