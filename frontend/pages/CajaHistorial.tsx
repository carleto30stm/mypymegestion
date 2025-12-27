import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Table, 
  TableHead, 
  TableRow, 
  TableCell, 
  TableBody, 
  Chip, 
  IconButton, 
  Tooltip,
  CircularProgress,
  Alert,
  Pagination,
  Collapse,
  Divider,
  Grid
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { getHistorialCaja, CajaSesion } from '../services/cajaService';
import { formatCurrencyWithSymbol } from '../utils/formatters';

const Row = ({ sesion }: { sesion: CajaSesion }) => {
  const [open, setOpen] = useState(false);
  // Calcular la diferencia total usando los valores redondeados que se muestran en UI
  const totalDiferencia = (sesion.saldosFinalesSistema || [])
    .map(s => {
      const teorico = s.monto || 0;
      const fisico = sesion.saldosFinalesDeclarados?.find(d => d.caja === s.caja)?.monto || 0;
      return Math.round(fisico) - Math.round(teorico);
    })
    .reduce((acc, curr) => acc + curr, 0) || 0;

  return (
    <>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>{new Date(sesion.fechaApertura).toLocaleDateString()}</TableCell>
        <TableCell>{new Date(sesion.fechaApertura).toLocaleTimeString()}</TableCell>
        <TableCell>{sesion.usuarioApertura}</TableCell>
        <TableCell>
          {sesion.fechaCierre ? new Date(sesion.fechaCierre).toLocaleTimeString() : '-'}
        </TableCell>
        <TableCell>
          <Chip 
            label={sesion.estado.toUpperCase()} 
            color={sesion.estado === 'abierta' ? 'success' : 'default'} 
            size="small" 
          />
        </TableCell>
        <TableCell align="right">
          {sesion.estado === 'cerrada' ? (
            totalDiferencia === 0 ? (
              <Chip label="OK" color="success" size="small" variant="outlined" />
            ) : (
              <Chip 
                label={totalDiferencia > 0 ? `SOBRANTE ${formatCurrencyWithSymbol(totalDiferencia)}` : `FALTANTE ${formatCurrencyWithSymbol(Math.abs(totalDiferencia))}`} 
                color={totalDiferencia > 0 ? 'info' : 'error'} 
                size="small" 
              />
            )
          ) : '-'}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              <Typography variant="h6" gutterBottom component="div">
                Detalle de Arqueo
              </Typography>
              <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">Diferencias por Caja:</Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Caja</TableCell>
                        <TableCell align="right">Teórico</TableCell>
                        <TableCell align="right">Físico</TableCell>
                        <TableCell align="right">Diferencia</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sesion.saldosFinalesSistema?.map((s, idx) => {
                        const teorico = s.monto || 0;
                        const fisico = sesion.saldosFinalesDeclarados?.find(d => d.caja === s.caja)?.monto || 0;
                        const difMostrada = Math.round(fisico) - Math.round(teorico);
                        return (
                          <TableRow key={s.caja}>
                            <TableCell>{s.caja}</TableCell>
                            <TableCell align="right">{formatCurrencyWithSymbol(teorico)}</TableCell>
                            <TableCell align="right">{formatCurrencyWithSymbol(fisico)}</TableCell>
                            <TableCell align="right">
                              <Typography color={difMostrada === 0 ? 'success.main' : (difMostrada > 0 ? 'info.main' : 'error.main')} variant="body2">
                                {difMostrada > 0 ? '+' : ''}{formatCurrencyWithSymbol(difMostrada)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">Observaciones Apertura:</Typography>
                    <Typography variant="body2">{sesion.observacionesApertura || 'Sin observaciones'}</Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Observaciones Cierre:</Typography>
                    <Typography variant="body2">{sesion.observacionesCierre || 'Sin observaciones'}</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};


const CajaHistorial: React.FC = () => {
  const [sesiones, setSesiones] = useState<CajaSesion[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargarHistorial();
  }, [pagina]);

  const cargarHistorial = async () => {
    try {
      setLoading(true);
      const response = await getHistorialCaja(pagina, 10);
      setSesiones(response.data || []);
      setTotal(response.pagination?.total || 0);
    } catch (err) {
      console.error('Error cargando historial:', err);
      setError('No se pudo cargar el historial de caja');
    } finally {
      setLoading(false);
    }
  };

  if (loading && sesiones.length === 0) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        Historial de Cierres de Caja
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper elevation={2}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>Fecha</TableCell>
              <TableCell>Apertura</TableCell>
              <TableCell>Usuario</TableCell>
              <TableCell>Cierre</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Resultado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sesiones?.map((sesion) => (
              <Row key={sesion._id} sesion={sesion} />
            ))}
            {(!sesiones || sesiones.length === 0) && !loading && (
              <TableRow>
                <TableCell colSpan={7} align="center">No hay registros de caja disponibles</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
          <Pagination 
            count={Math.ceil(total / 10)} 
            page={pagina} 
            onChange={(_, v) => setPagina(v)} 
            color="primary" 
          />
        </Box>
      </Paper>
    </Box>
  );
};

export default CajaHistorial;
