import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import api from '../services/api';
import { formatDate, formatCurrency } from '../utils/formatters';

interface Movimiento {
  _id: string;
  fecha: string;
  tipo: string;
  documentoTipo: string;
  documentoNumero?: string;
  concepto: string;
  debe: number;
  haber: number;
  saldo: number;
  anulado?: boolean;
}

interface Props {
  proveedorId: string;
}

const CuentaCorrienteProveedorDetalle: React.FC<Props> = ({ proveedorId }) => {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (proveedorId) {
      fetchMovimientos();
    }
  }, [proveedorId]);

  const fetchMovimientos = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/proveedores/${proveedorId}/movimientos`);
      setMovimientos(response.data);
    } catch (err: any) {
      console.error('Error fetching movements:', err);
      setError('Error al cargar movimientos');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Movimientos de Cuenta Corriente
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Documento</TableCell>
              <TableCell>Concepto</TableCell>
              <TableCell align="right">Debe (Pagos)</TableCell>
              <TableCell align="right">Haber (Deuda)</TableCell>
              <TableCell align="right">Saldo</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {movimientos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No hay movimientos registrados
                </TableCell>
              </TableRow>
            ) : (
              movimientos.map((mov) => (
                <TableRow key={mov._id} sx={{ opacity: mov.anulado ? 0.5 : 1 }}>
                  <TableCell>{formatDate(mov.fecha)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={mov.tipo.replace(/_/g, ' ').toUpperCase()} 
                      size="small"
                      color={mov.tipo === 'pago' ? 'success' : 'warning'}
                    />
                  </TableCell>
                  <TableCell>
                    {mov.documentoTipo} {mov.documentoNumero || ''}
                  </TableCell>
                  <TableCell>{mov.concepto}</TableCell>
                  <TableCell align="right">
                    {mov.debe > 0 && (
                      <Typography color="success.main">
                        {formatCurrency(mov.debe)}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {mov.haber > 0 && (
                      <Typography color="error.main">
                        {formatCurrency(mov.haber)}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Typography fontWeight="bold">
                      {formatCurrency(mov.saldo)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default CuentaCorrienteProveedorDetalle;
