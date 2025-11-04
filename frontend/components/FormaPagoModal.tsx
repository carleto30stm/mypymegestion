import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  IconButton,
  Divider,
  Alert,
  Grid,
  Paper,
  Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PaymentIcon from '@mui/icons-material/Payment';
import { MEDIOS_PAGO, BANCOS, Cliente, FormaPago } from '../types';
import { formatCurrency, parseCurrency } from '../utils/formatters';

interface FormaPagoModalProps {
  open: boolean;
  onClose: () => void;
  montoTotal: number;
  cliente?: Cliente;
  onConfirm: (formasPago: FormaPago[]) => void;
}

const FormaPagoModal: React.FC<FormaPagoModalProps> = ({
  open,
  onClose,
  montoTotal,
  cliente,
  onConfirm
}) => {
  const [formasPago, setFormasPago] = useState<FormaPago[]>([
    {
      medioPago: 'EFECTIVO',
      monto: montoTotal
    }
  ]);

  const [errores, setErrores] = useState<string[]>([]);

  // Resetear al abrir el modal
  useEffect(() => {
    if (open) {
      setFormasPago([
        {
          medioPago: 'EFECTIVO',
          monto: montoTotal
        }
      ]);
      setErrores([]);
    }
  }, [open, montoTotal]);

  // Calcular totales
  const totalPagado = formasPago.reduce((sum, fp) => sum + (fp.monto || 0), 0);
  const saldoPendiente = montoTotal - totalPagado;
  const vuelto = totalPagado > montoTotal ? totalPagado - montoTotal : 0;

  // Agregar nueva forma de pago
  const handleAgregarFormaPago = () => {
    const saldoRestante = montoTotal - totalPagado;
    setFormasPago([
      ...formasPago,
      {
        medioPago: 'EFECTIVO',
        monto: saldoRestante > 0 ? saldoRestante : 0
      }
    ]);
  };

  // Eliminar forma de pago
  const handleEliminarFormaPago = (index: number) => {
    if (formasPago.length > 1) {
      setFormasPago(formasPago.filter((_, i) => i !== index));
    }
  };

  // Actualizar medio de pago
  const handleChangeMedioPago = (index: number, medioPago: typeof MEDIOS_PAGO[number]) => {
    const nuevasFormas = [...formasPago];
    nuevasFormas[index] = {
      ...nuevasFormas[index],
      medioPago,
      // Limpiar datos específicos al cambiar medio
      datosCheque: undefined,
      datosTransferencia: undefined,
      datosTarjeta: undefined
    };

    // Si es cheque y hay cliente con días de vencimiento, auto-calcular fecha
    if (medioPago === 'CHEQUE' && cliente?.diasVencimientoCheques) {
      const fechaEmision = new Date();
      const fechaVencimiento = new Date(fechaEmision);
      fechaVencimiento.setDate(fechaVencimiento.getDate() + cliente.diasVencimientoCheques);

      nuevasFormas[index].datosCheque = {
        numeroCheque: '',
        bancoEmisor: '',
        fechaEmision: fechaEmision.toISOString().split('T')[0],
        fechaVencimiento: fechaVencimiento.toISOString().split('T')[0],
        titularCheque: cliente.nombre + (cliente.apellido ? ' ' + cliente.apellido : ''),
        cuitTitular: cliente.numeroDocumento,
        estadoCheque: 'pendiente'
      };
    }

    setFormasPago(nuevasFormas);
  };

  // Actualizar monto
  const handleChangeMonto = (index: number, value: string) => {
    const monto = parseCurrency(value);
    const nuevasFormas = [...formasPago];
    nuevasFormas[index].monto = monto;
    setFormasPago(nuevasFormas);
  };

  // Actualizar datos de cheque
  const handleChangeDatosCheque = (index: number, campo: string, valor: any) => {
    const nuevasFormas = [...formasPago];
    if (!nuevasFormas[index].datosCheque) {
      nuevasFormas[index].datosCheque = {
        numeroCheque: '',
        bancoEmisor: '',
        fechaEmision: new Date().toISOString().split('T')[0],
        fechaVencimiento: new Date().toISOString().split('T')[0],
        titularCheque: '',
        estadoCheque: 'pendiente'
      };
    }
    nuevasFormas[index].datosCheque = {
      ...nuevasFormas[index].datosCheque!,
      [campo]: valor
    };
    setFormasPago(nuevasFormas);
  };

  // Actualizar datos de transferencia
  const handleChangeDatosTransferencia = (index: number, campo: string, valor: any) => {
    const nuevasFormas = [...formasPago];
    if (!nuevasFormas[index].datosTransferencia) {
      nuevasFormas[index].datosTransferencia = {
        numeroOperacion: '',
        banco: '',
        fechaTransferencia: new Date().toISOString().split('T')[0]
      };
    }
    nuevasFormas[index].datosTransferencia = {
      ...nuevasFormas[index].datosTransferencia!,
      [campo]: valor
    };
    setFormasPago(nuevasFormas);
  };

  // Actualizar datos de tarjeta
  const handleChangeDatosTarjeta = (index: number, campo: string, valor: any) => {
    const nuevasFormas = [...formasPago];
    if (!nuevasFormas[index].datosTarjeta) {
      nuevasFormas[index].datosTarjeta = {
        tipoTarjeta: 'debito',
        cuotas: 1
      };
    }
    nuevasFormas[index].datosTarjeta = {
      ...nuevasFormas[index].datosTarjeta!,
      [campo]: valor
    };
    setFormasPago(nuevasFormas);
  };

  // Validar y confirmar
  const handleConfirmar = () => {
    const nuevosErrores: string[] = [];

    // Validar que haya al menos una forma de pago
    if (formasPago.length === 0) {
      nuevosErrores.push('Debe agregar al menos una forma de pago');
    }

    // Validar que el total pagado sea suficiente
    if (totalPagado < montoTotal) {
      nuevosErrores.push(`El total pagado (${formatCurrency(totalPagado)}) es menor al monto a cobrar (${formatCurrency(montoTotal)})`);
    }

    // Validar cada forma de pago
    formasPago.forEach((fp, index) => {
      if (!fp.monto || fp.monto <= 0) {
        nuevosErrores.push(`Forma de pago ${index + 1}: El monto debe ser mayor a cero`);
      }

      // Validar datos de cheque
      if (fp.medioPago === 'CHEQUE') {
        if (!fp.datosCheque) {
          nuevosErrores.push(`Forma de pago ${index + 1}: Debe completar los datos del cheque`);
        } else {
          if (!fp.datosCheque.numeroCheque) {
            nuevosErrores.push(`Forma de pago ${index + 1}: El número de cheque es obligatorio`);
          }
          if (!fp.datosCheque.bancoEmisor) {
            nuevosErrores.push(`Forma de pago ${index + 1}: El banco emisor es obligatorio`);
          }
          if (!fp.datosCheque.titularCheque) {
            nuevosErrores.push(`Forma de pago ${index + 1}: El titular del cheque es obligatorio`);
          }
          if (!fp.datosCheque.fechaVencimiento) {
            nuevosErrores.push(`Forma de pago ${index + 1}: La fecha de vencimiento es obligatoria`);
          }
        }
      }

      // Validar datos de transferencia
      if (fp.medioPago === 'TRANSFERENCIA') {
        if (!fp.datosTransferencia) {
          nuevosErrores.push(`Forma de pago ${index + 1}: Debe completar los datos de la transferencia`);
        } else {
          if (!fp.datosTransferencia.numeroOperacion) {
            nuevosErrores.push(`Forma de pago ${index + 1}: El número de operación es obligatorio`);
          }
          if (!fp.datosTransferencia.banco) {
            nuevosErrores.push(`Forma de pago ${index + 1}: El banco es obligatorio`);
          }
        }
      }

      // Validar datos de tarjeta
      if (fp.medioPago === 'TARJETA_DEBITO' || fp.medioPago === 'TARJETA_CREDITO') {
        if (!fp.datosTarjeta) {
          nuevosErrores.push(`Forma de pago ${index + 1}: Debe completar los datos de la tarjeta`);
        }
      }
    });

    if (nuevosErrores.length > 0) {
      setErrores(nuevosErrores);
      return;
    }

    // Todo OK, confirmar
    onConfirm(formasPago);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <PaymentIcon />
          <Typography variant="h6">Registrar Formas de Pago</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Información del monto */}
        <Paper elevation={2} sx={{ p: 2, mb: 3, bgcolor: 'primary.50' }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Typography variant="body2" color="text.secondary">
                Monto a Cobrar
              </Typography>
              <Typography variant="h6" color="primary">
                {formatCurrency(montoTotal)}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="body2" color="text.secondary">
                Total Pagado
              </Typography>
              <Typography 
                variant="h6" 
                color={totalPagado >= montoTotal ? 'success.main' : 'warning.main'}
              >
                {formatCurrency(totalPagado)}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="body2" color="text.secondary">
                {saldoPendiente > 0 ? 'Saldo Pendiente' : 'Vuelto'}
              </Typography>
              <Typography 
                variant="h6" 
                color={saldoPendiente > 0 ? 'error.main' : 'info.main'}
              >
                {saldoPendiente > 0 
                  ? formatCurrency(saldoPendiente) 
                  : formatCurrency(vuelto)}
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        {/* Alertas de cliente */}
        {cliente && !cliente.aceptaCheques && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Este cliente NO acepta cheques
          </Alert>
        )}

        {cliente?.diasVencimientoCheques && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Plazo de cheques para este cliente: {cliente.diasVencimientoCheques} días
          </Alert>
        )}

        {/* Errores de validación */}
        {errores.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Errores de validación:
            </Typography>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {errores.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </Alert>
        )}

        {/* Formas de pago */}
        {formasPago.map((fp, index) => (
          <Paper key={index} elevation={1} sx={{ p: 2, mb: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Chip 
                label={`Pago ${index + 1}`} 
                color="primary" 
                size="small"
              />
              {formasPago.length > 1 && (
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleEliminarFormaPago(index)}
                >
                  <DeleteIcon />
                </IconButton>
              )}
            </Box>

            <Grid container spacing={2}>
              {/* Medio de pago */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Medio de Pago *</InputLabel>
                  <Select
                    value={fp.medioPago}
                    label="Medio de Pago *"
                    onChange={(e) => handleChangeMedioPago(index, e.target.value as any)}
                  >
                    {MEDIOS_PAGO.map((medio) => (
                      <MenuItem 
                        key={medio} 
                        value={medio}
                        disabled={medio === 'CHEQUE' && cliente && !cliente.aceptaCheques}
                      >
                        {medio.replace(/_/g, ' ')}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Monto */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Monto *"
                  value={formatCurrency(fp.monto || 0)}
                  onChange={(e) => handleChangeMonto(index, e.target.value)}
                  placeholder="$0.00"
                />
              </Grid>

              {/* Banco (para todos excepto efectivo) */}
              {fp.medioPago !== 'EFECTIVO' && (
                <Grid item xs={12}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Banco</InputLabel>
                    <Select
                      value={fp.banco || ''}
                      label="Banco"
                      onChange={(e) => {
                        const nuevasFormas = [...formasPago];
                        nuevasFormas[index].banco = e.target.value as any;
                        setFormasPago(nuevasFormas);
                      }}
                    >
                      {BANCOS.map((banco) => (
                        <MenuItem key={banco} value={banco}>
                          {banco}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {/* Campos específicos de CHEQUE */}
              {fp.medioPago === 'CHEQUE' && (
                <>
                  <Grid item xs={12}>
                    <Divider>
                      <Chip label="Datos del Cheque" size="small" />
                    </Divider>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Número de Cheque *"
                      value={fp.datosCheque?.numeroCheque || ''}
                      onChange={(e) => handleChangeDatosCheque(index, 'numeroCheque', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Banco Emisor *"
                      value={fp.datosCheque?.bancoEmisor || ''}
                      onChange={(e) => handleChangeDatosCheque(index, 'bancoEmisor', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Titular del Cheque *"
                      value={fp.datosCheque?.titularCheque || ''}
                      onChange={(e) => handleChangeDatosCheque(index, 'titularCheque', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="CUIT Titular"
                      value={fp.datosCheque?.cuitTitular || ''}
                      onChange={(e) => handleChangeDatosCheque(index, 'cuitTitular', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      type="date"
                      label="Fecha Emisión *"
                      value={fp.datosCheque?.fechaEmision || ''}
                      onChange={(e) => handleChangeDatosCheque(index, 'fechaEmision', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      type="date"
                      label="Fecha Vencimiento *"
                      value={fp.datosCheque?.fechaVencimiento || ''}
                      onChange={(e) => handleChangeDatosCheque(index, 'fechaVencimiento', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      rows={2}
                      label="Observaciones"
                      value={fp.datosCheque?.observaciones || ''}
                      onChange={(e) => handleChangeDatosCheque(index, 'observaciones', e.target.value)}
                    />
                  </Grid>
                </>
              )}

              {/* Campos específicos de TRANSFERENCIA */}
              {fp.medioPago === 'TRANSFERENCIA' && (
                <>
                  <Grid item xs={12}>
                    <Divider>
                      <Chip label="Datos de Transferencia" size="small" />
                    </Divider>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Número de Operación *"
                      value={fp.datosTransferencia?.numeroOperacion || ''}
                      onChange={(e) => handleChangeDatosTransferencia(index, 'numeroOperacion', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      type="date"
                      label="Fecha Transferencia *"
                      value={fp.datosTransferencia?.fechaTransferencia || ''}
                      onChange={(e) => handleChangeDatosTransferencia(index, 'fechaTransferencia', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      rows={2}
                      label="Observaciones"
                      value={fp.datosTransferencia?.observaciones || ''}
                      onChange={(e) => handleChangeDatosTransferencia(index, 'observaciones', e.target.value)}
                    />
                  </Grid>
                </>
              )}

              {/* Campos específicos de TARJETA */}
              {(fp.medioPago === 'TARJETA_DEBITO' || fp.medioPago === 'TARJETA_CREDITO') && (
                <>
                  <Grid item xs={12}>
                    <Divider>
                      <Chip label="Datos de Tarjeta" size="small" />
                    </Divider>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Tipo de Tarjeta</InputLabel>
                      <Select
                        value={fp.datosTarjeta?.tipoTarjeta || 'debito'}
                        label="Tipo de Tarjeta"
                        onChange={(e) => handleChangeDatosTarjeta(index, 'tipoTarjeta', e.target.value)}
                      >
                        <MenuItem value="debito">Débito</MenuItem>
                        <MenuItem value="credito">Crédito</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Marca</InputLabel>
                      <Select
                        value={fp.datosTarjeta?.marca || ''}
                        label="Marca"
                        onChange={(e) => handleChangeDatosTarjeta(index, 'marca', e.target.value)}
                      >
                        <MenuItem value="VISA">VISA</MenuItem>
                        <MenuItem value="MASTERCARD">MASTERCARD</MenuItem>
                        <MenuItem value="AMEX">AMEX</MenuItem>
                        <MenuItem value="CABAL">CABAL</MenuItem>
                        <MenuItem value="NARANJA">NARANJA</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Últimos 4 Dígitos"
                      value={fp.datosTarjeta?.ultimos4Digitos || ''}
                      onChange={(e) => handleChangeDatosTarjeta(index, 'ultimos4Digitos', e.target.value)}
                      inputProps={{ maxLength: 4 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="Cuotas"
                      value={fp.datosTarjeta?.cuotas || 1}
                      onChange={(e) => handleChangeDatosTarjeta(index, 'cuotas', parseInt(e.target.value))}
                      inputProps={{ min: 1, max: 24 }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Número de Autorización"
                      value={fp.datosTarjeta?.numeroAutorizacion || ''}
                      onChange={(e) => handleChangeDatosTarjeta(index, 'numeroAutorizacion', e.target.value)}
                    />
                  </Grid>
                </>
              )}

              {/* Observaciones generales */}
              {fp.medioPago !== 'CHEQUE' && fp.medioPago !== 'TRANSFERENCIA' && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    multiline
                    rows={2}
                    label="Observaciones"
                    value={fp.observaciones || ''}
                    onChange={(e) => {
                      const nuevasFormas = [...formasPago];
                      nuevasFormas[index].observaciones = e.target.value;
                      setFormasPago(nuevasFormas);
                    }}
                  />
                </Grid>
              )}
            </Grid>
          </Paper>
        ))}

        {/* Botón agregar forma de pago */}
        <Button
          fullWidth
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleAgregarFormaPago}
          sx={{ mt: 2 }}
        >
          Agregar Otra Forma de Pago
        </Button>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleConfirmar}
          disabled={totalPagado < montoTotal}
        >
          Confirmar ({formatCurrency(totalPagado)})
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FormaPagoModal;
