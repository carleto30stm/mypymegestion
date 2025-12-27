import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Grid, 
  Card, 
  CardContent, 
  Divider,
  Alert,
  CircularProgress,
  Snackbar,
  Chip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import HistoryIcon from '@mui/icons-material/History';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import { getEstadoCaja, abrirCaja, cerrarCaja, CajaEstadoResponse, CajaBalance } from '../services/cajaService';
import { formatCurrencyWithSymbol } from '../utils/formatters';
import { CAJAS } from '../types';
import AperturaCajaModal from '../components/AperturaCajaModal';
import CierreCajaModal from '../components/CierreCajaModal';

const CajaPage: React.FC = () => {
  const navigate = useNavigate();
  const { items: gastos } = useSelector((state: RootState) => state.gastos);
  const [estadoCaja, setEstadoCaja] = useState<CajaEstadoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals
  const [openApertura, setOpenApertura] = useState(false);
  const [openCierre, setOpenCierre] = useState(false);

  useEffect(() => {
    cargarEstadoCaja();
  }, []);

  const cargarEstadoCaja = async () => {
    try {
      setLoading(true);
      const data = await getEstadoCaja();
      setEstadoCaja(data);
    } catch (err) {
      console.error('Error cargando estado de caja:', err);
      setError('No se pudo cargar el estado de la caja');
    } finally {
      setLoading(false);
    }
  };

  // Lógica REUTILIZADA de BankSummary.tsx para calcular saldo histórico
  const calcularSaldosSistema = (): Record<string, number> => {
    const saldos: Record<string, number> = {};
    
    // Inicializar
    CAJAS.forEach((c: string) => saldos[c] = 0);

    // Filtrar gastos activos (no cancelados y confirmados si son cheques)
    const today = new Date().toISOString().split('T')[0];
    const gastosActivos = gastos.filter(gasto => {
      if (gasto.estado === 'cancelado') return false;
      
      if (gasto.medioDePago?.toUpperCase().includes('CHEQUE')) {
        return gasto.confirmado === true;
      }
      
      if (gasto.fechaStandBy) {
        const fStandBy = new Date(gasto.fechaStandBy).toISOString().split('T')[0];
        return fStandBy <= today;
      }
      return true;
    });

    // Calcular
    gastosActivos.forEach(g => {
      if (g.tipoOperacion === 'transferencia') {
        const monto = Number(g.montoTransferencia) || 0;
        if (g.cuentaOrigen && saldos[g.cuentaOrigen] !== undefined) saldos[g.cuentaOrigen] -= monto;
        if (g.cuentaDestino && saldos[g.cuentaDestino] !== undefined) saldos[g.cuentaDestino] += monto;
      } else if (g.banco && saldos[g.banco] !== undefined && (g.medioDePago as any) !== 'CHEQUE TERCERO') {
        saldos[g.banco] += (Number(g.entrada) || 0) - (Number(g.salida) || 0);
      }
    });

    return saldos;
  };

  const handleAbrirConfirm = async (saldos: CajaBalance[], observaciones: string) => {
    await abrirCaja({ saldosIniciales: saldos, observacionesApertura: observaciones });
    setSuccessMsg('Caja abierta correctamente');
    await cargarEstadoCaja();
  };

  const handleCerrarConfirm = async (declarados: CajaBalance[], sistemas: CajaBalance[], observaciones: string) => {
    await cerrarCaja({ 
      saldosFinalesDeclarados: declarados, 
      saldosFinalesSistema: sistemas, 
      observacionesCierre: observaciones 
    });
    setSuccessMsg('Caja cerrada correctamente');
    await cargarEstadoCaja();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 4 }}>
        Control de Caja
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Grid container spacing={3}>
        {/* Estado Actual */}
        <Grid item xs={12} md={8}>
          <Card elevation={3} sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PointOfSaleIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Estado de la Sesión</Typography>
                <Box sx={{ ml: 'auto' }}>
                  {estadoCaja?.estado === 'abierta' ? (
                    <Chip label="ABIERTA" color="success" size="small" sx={{ fontWeight: 'bold' }} />
                  ) : (
                    <Chip label="CERRADA" color="error" size="small" sx={{ fontWeight: 'bold' }} />
                  )}
                </Box>
              </Box>
              
              <Divider sx={{ mb: 3 }} />

              {estadoCaja?.estado === 'abierta' ? (
                <Box>
                  <Typography variant="body1" gutterBottom>
                    La caja fue abierta por <strong>{estadoCaja.sesion?.usuarioApertura}</strong> el día {new Date(estadoCaja.sesion?.fechaApertura || '').toLocaleString()}.
                  </Typography>

                  <Typography variant="subtitle2" sx={{ mt: 3, mb: 1, color: 'text.secondary' }}>
                    Saldos Declarados al Abrir:
                  </Typography>
                  <Grid container spacing={1}>
                    {estadoCaja.sesion?.saldosIniciales?.map(s => (
                      <Grid item xs={6} sm={4} key={s.caja}>
                        <Paper variant="outlined" sx={{ p: 1, textAlign: 'center' }}>
                          <Typography variant="caption" color="text.secondary">{s.caja}</Typography>
                          <Typography variant="body2" fontWeight="bold">{formatCurrencyWithSymbol(s.monto)}</Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>

                  <Box sx={{ mt: 5, display: 'flex', gap: 2 }}>
                    <Button 
                      variant="contained" 
                      color="error" 
                      size="large" 
                      onClick={() => setOpenCierre(true)}
                      startIcon={<AccountBalanceIcon />}
                    >
                      Realizar Arqueo y Cerrar Caja
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Typography variant="h5" gutterBottom color="error.main" fontWeight="medium">
                    Sin Sesión Activa
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 450, mx: 'auto' }}>
                    Las operaciones comerciales están bloqueadas temporalmente. 
                    Debe iniciar turno realizando el conteo físico de caja.
                  </Typography>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    size="large" 
                    onClick={() => setOpenApertura(true)}
                    startIcon={<PointOfSaleIcon />}
                    sx={{ px: 4, py: 1.5, borderRadius: 2 }}
                  >
                    Iniciar Apertura de Caja
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Acciones Rápidas */}
        <Grid item xs={12} md={4}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Paper 
                sx={{ p: 2, display: 'flex', alignItems: 'center', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                onClick={() => navigate('/caja/historial')}
              >
                <HistoryIcon color="info" sx={{ mr: 2 }} />
                <Typography variant="subtitle1">Historial de Snapshots</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                <AccountBalanceIcon color="warning" sx={{ mr: 2 }} />
                <Typography variant="subtitle1">Consultar Movimientos hoy</Typography>
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Modals */}
      <AperturaCajaModal 
        open={openApertura} 
        onClose={() => setOpenApertura(false)} 
        onConfirm={handleAbrirConfirm}
      />

      <CierreCajaModal 
        open={openCierre} 
        onClose={() => setOpenCierre(false)} 
        saldosSistema={calcularSaldosSistema()}
        onConfirm={handleCerrarConfirm}
      />

      {/* Notificaciones */}
      <Snackbar 
        open={!!successMsg} 
        autoHideDuration={6000} 
        onClose={() => setSuccessMsg(null)}
        message={successMsg}
      />
    </Box>
  );
};

export default CajaPage;
