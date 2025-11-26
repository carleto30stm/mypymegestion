import React, { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  Close as CloseIcon,
  ContentCopy as ContentCopyIcon,
  Print as PrintIcon,
} from '@mui/icons-material';
import type { Factura } from '../redux/slices/facturasSlice';
import { useSelector } from 'react-redux';
import type { RootState } from '../redux/store';
import FacturaPDF from './FacturaPDF';

interface FacturaDetailDialogProps {
  open: boolean;
  factura: Factura;
  onClose: () => void;
  onRefresh: () => void;
}

const FacturaDetailDialog: React.FC<FacturaDetailDialogProps> = ({
  open,
  factura,
  onClose,
  onRefresh,
}) => {
  const { items: clientes } = useSelector((state: RootState) => state.clientes);
  const [showPDF, setShowPDF] = useState(false);

  const cliente = clientes.find((c) => c._id === factura.clienteId._id);

  const handleCopyCAE = () => {
    if (factura.datosAFIP?.cae) {
      navigator.clipboard.writeText(factura.datosAFIP.cae);
      alert('CAE copiado al portapapeles');
    }
  };

  const handlePrint = () => {
    setShowPDF(true);
  };

  const getEstadoColor = (estado: string) => {
    const colors: Record<string, 'default' | 'success' | 'error' | 'warning'> = {
      borrador: 'default',
      autorizada: 'success',
      rechazada: 'error',
      anulada: 'warning',
      error: 'error',
    };
    return colors[estado] || 'default';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Detalle de Factura #{factura.datosAFIP.puntoVenta.toString().padStart(5, '0')}-
            {(factura.datosAFIP.numeroSecuencial || 0).toString().padStart(8, '0')}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Información General */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom color="primary">
            INFORMACIÓN GENERAL
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Tipo de Comprobante:
              </Typography>
              <Typography variant="body1">{factura.tipoComprobante}</Typography>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Estado:
              </Typography>
              <Chip
                label={factura.estado.toUpperCase()}
                color={getEstadoColor(factura.estado)}
                size="small"
              />
            </Grid>

            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Fecha de Emisión:
              </Typography>
              <Typography variant="body1">
                {new Date(factura.fecha).toLocaleDateString('es-AR')}
              </Typography>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Punto de Venta:
              </Typography>
              <Typography variant="body1">
                {factura.datosAFIP.puntoVenta.toString().padStart(5, '0')}
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        {/* Datos del Cliente */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom color="primary">
            DATOS DEL CLIENTE
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                Razón Social / Nombre:
              </Typography>
              <Typography variant="body1">{cliente?.nombre || 'N/A'}</Typography>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                CUIT / CUIL:
              </Typography>
              <Typography variant="body1">{cliente?.numeroDocumento || factura.clienteId.numeroDocumento || 'N/A'}</Typography>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Condición IVA:
              </Typography>
              <Typography variant="body1">
                {cliente?.condicionIVA || factura.clienteId.condicionIVA || 'N/A'}
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        {/* Items */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom color="primary">
            DETALLE DE ITEMS
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Descripción</TableCell>
                  <TableCell align="right">Cantidad</TableCell>
                  <TableCell align="right">P. Unitario</TableCell>
                  <TableCell align="right">IVA %</TableCell>
                  <TableCell align="right">Subtotal</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {factura.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.descripcion}</TableCell>
                    <TableCell align="right">{item.cantidad || 0}</TableCell>
                    <TableCell align="right">${(item.precioUnitario || 0).toFixed(2)}</TableCell>
                    <TableCell align="right">{item.alicuotaIVA || 0}%</TableCell>
                    <TableCell align="right">
                      ${((item.cantidad || 0) * (item.precioUnitario || 0)).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Totales */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom color="primary">
            TOTALES
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Grid container spacing={1}>
            <Grid item xs={6}>
              <Typography variant="body2" align="right">
                Subtotal (Neto):
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body1" align="right">
                ${(factura.subtotal || 0).toFixed(2)}
              </Typography>
            </Grid>

            {factura.detalleIVA?.map((detalle, index) => (
              <React.Fragment key={index}>
                <Grid item xs={6}>
                  <Typography variant="body2" align="right">
                    IVA {detalle.alicuota}%:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body1" align="right">
                    ${(detalle.importe || 0).toFixed(2)}
                  </Typography>
                </Grid>
              </React.Fragment>
            ))}

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
            </Grid>

            <Grid item xs={6}>
              <Typography variant="h6" align="right">
                TOTAL:
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="h6" align="right" color="primary">
                ${(factura.total || 0).toFixed(2)}
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        {/* Datos AFIP (si está autorizada) */}
        {factura.estado === 'autorizada' && factura.datosAFIP && (
          <Paper sx={{ p: 2, bgcolor: 'success.light' }}>
            <Typography variant="subtitle2" gutterBottom color="success.dark">
              DATOS DE AUTORIZACIÓN AFIP
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    CAE:
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                    {factura.datosAFIP.cae}
                  </Typography>
                  <IconButton size="small" onClick={handleCopyCAE}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Grid>

              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Fecha Vto. CAE:
                </Typography>
                <Typography variant="body1">
                  {factura.datosAFIP.fechaVencimientoCAE ? new Date(factura.datosAFIP.fechaVencimientoCAE).toLocaleDateString('es-AR') : 'N/A'}
                </Typography>
              </Grid>

              {factura.datosAFIP.codigoBarras && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Código de Barras:
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: 'monospace',
                      bgcolor: 'white',
                      p: 1,
                      borderRadius: 1,
                    }}
                  >
                    {factura.datosAFIP.codigoBarras}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Paper>
        )}

        {/* Observaciones */}
        {factura.observaciones && (
          <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom color="primary">
              OBSERVACIONES
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body2">{factura.observaciones}</Typography>
          </Paper>
        )}
      </DialogContent>

      <DialogActions>
        {factura.estado === 'autorizada' && (
          <Button
            startIcon={<PrintIcon />}
            variant="contained"
            onClick={handlePrint}
          >
            Imprimir
          </Button>
        )}
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>

      {/* Dialog de PDF */}
      {showPDF && (
        <FacturaPDF
          open={showPDF}
          onClose={() => setShowPDF(false)}
          factura={factura}
        />
      )}
    </Dialog>
  );
};

export default FacturaDetailDialog;
