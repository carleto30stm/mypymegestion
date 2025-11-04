import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Typography,
} from '@mui/material';
import {
  Close as CloseIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../redux/store';
import { autorizarFactura } from '../redux/slices/facturasSlice';
import type { Factura } from '../redux/slices/facturasSlice';

interface AutorizarFacturaDialogProps {
  open: boolean;
  factura: Factura;
  onClose: () => void;
  onSuccess: () => void;
}

const AutorizarFacturaDialog: React.FC<AutorizarFacturaDialogProps> = ({
  open,
  factura,
  onClose,
  onSuccess,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [caeData, setCAEData] = useState<{ CAE: string; CAEVencimiento: string } | null>(null);

  const handleAutorizar = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await dispatch(autorizarFactura(factura._id)).unwrap();
      
      if (result.datosAFIP?.CAE) {
        setCAEData({
          CAE: result.datosAFIP.CAE,
          CAEVencimiento: result.datosAFIP.CAEVencimiento,
        });
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || 'Error al autorizar la factura con AFIP');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (success) {
      onSuccess();
    } else {
      onClose();
    }
  };

  // Validaciones previas
  const validationErrors: string[] = [];

  if (factura.items.length === 0) {
    validationErrors.push('La factura no tiene items');
  }

  if (factura.importeTotal <= 0) {
    validationErrors.push('El total de la factura debe ser mayor a 0');
  }

  if (!factura.clienteId) {
    validationErrors.push('La factura no tiene cliente asignado');
  }

  const hasValidationErrors = validationErrors.length > 0;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Autorizar Factura con AFIP</Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {!success && !loading && (
          <>
            {/* Advertencia */}
            <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                ⚠️ Importante
              </Typography>
              <Typography variant="body2">
                Una vez autorizada la factura con AFIP, no podrá ser modificada ni eliminada.
                Solo podrá ser anulada mediante una Nota de Crédito.
              </Typography>
            </Alert>

            {/* Validaciones */}
            {hasValidationErrors && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  La factura no puede ser autorizada:
                </Typography>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {validationErrors.map((err, index) => (
                    <li key={index}>
                      <Typography variant="body2">{err}</Typography>
                    </li>
                  ))}
                </ul>
              </Alert>
            )}

            {/* Resumen de la factura */}
            {!hasValidationErrors && (
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Resumen de la Factura
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Número:
                  </Typography>
                  <Typography variant="body1">
                    {factura.datosAFIP.puntoVenta.toString().padStart(5, '0')}-
                    {factura.datosAFIP.numeroSecuencial?.toString().padStart(8, '0') || 'Pendiente'}
                  </Typography>
                </Box>

                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Tipo:
                  </Typography>
                  <Typography variant="body1">{factura.tipoComprobante}</Typography>
                </Box>

                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Fecha:
                  </Typography>
                  <Typography variant="body1">
                    {new Date(factura.fecha).toLocaleDateString('es-AR')}
                  </Typography>
                </Box>

                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Items:
                  </Typography>
                  <Typography variant="body1">{factura.items.length} producto(s)</Typography>
                </Box>

                <Divider sx={{ my: 1 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6">Total:</Typography>
                  <Typography variant="h6" color="primary">
                    ${factura.importeTotal.toFixed(2)}
                  </Typography>
                </Box>
              </Paper>
            )}

            {/* Error */}
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  Error de AFIP
                </Typography>
                <Typography variant="body2">{error}</Typography>
              </Alert>
            )}
          </>
        )}

        {/* Loading */}
        {loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
            <CircularProgress size={60} />
            <Typography variant="body1" sx={{ mt: 2 }}>
              Solicitando autorización a AFIP...
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Esto puede tomar unos segundos
            </Typography>
          </Box>
        )}

        {/* Success */}
        {success && caeData && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 80, mb: 2 }} />
            
            <Typography variant="h6" gutterBottom color="success.main">
              ¡Factura Autorizada!
            </Typography>

            <Paper sx={{ p: 2, mt: 3, bgcolor: 'success.light' }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Código de Autorización Electrónico (CAE):
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2 }}>
                {caeData.CAE}
              </Typography>

              <Typography variant="body2" color="text.secondary">
                Válido hasta:
              </Typography>
              <Typography variant="body1">
                {new Date(caeData.CAEVencimiento).toLocaleDateString('es-AR')}
              </Typography>
            </Paper>

            <Alert severity="info" sx={{ mt: 2, textAlign: 'left' }}>
              <Typography variant="body2">
                La factura ha sido autorizada exitosamente por AFIP. Ahora puede imprimirla
                o enviarla al cliente.
              </Typography>
            </Alert>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {!loading && !success && (
          <>
            <Button onClick={onClose}>Cancelar</Button>
            <Button
              variant="contained"
              onClick={handleAutorizar}
              disabled={hasValidationErrors}
              color="success"
            >
              Autorizar con AFIP
            </Button>
          </>
        )}

        {success && (
          <Button variant="contained" onClick={handleClose}>
            Aceptar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AutorizarFacturaDialog;
