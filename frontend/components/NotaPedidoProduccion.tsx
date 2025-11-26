import React, { forwardRef } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Grid,
  Paper
} from '@mui/material';

// Interface para el resumen por producto
interface ResumenProducto {
  productoId: string;
  codigoProducto: string;
  nombreProducto: string;
  cantidadTotal: number;
  ventas: Array<{
    ventaId: string;
    numeroVenta: string;
    cantidad: number;
    cliente: string;
    fecha: string;
  }>;
}

// Interface para item de venta
interface ItemVenta {
  productoId: string;
  codigoProducto: string;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
}

// Interface para venta
interface VentaProduccion {
  _id: string;
  numeroVenta: string;
  fecha: string;
  nombreCliente: string;
  clienteId?: {
    nombre?: string;
    apellido?: string;
    razonSocial?: string;
    telefono?: string;
    direccion?: string;
  };
  itemsParaProducir: ItemVenta[];
  totalItemsProducir: number;
  observaciones?: string;
}

interface NotaPedidoProduccionProps {
  tipo: 'agrupado' | 'individual';
  // Para tipo agrupado
  resumenProductos?: ResumenProducto[];
  // Para tipo individual
  venta?: VentaProduccion;
  // Común
  fechaEmision?: string;
  responsable?: string;
}

const formatearFecha = (fecha: string) => {
  return new Date(fecha).toLocaleDateString('es-AR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

const formatearFechaHora = (fecha: string) => {
  return new Date(fecha).toLocaleString('es-AR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Estilos para impresión
const printStyles = {
  container: {
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
    '@media print': {
      padding: '10px',
    }
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '20px',
    borderBottom: '2px solid #000',
    paddingBottom: '10px'
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '5px'
  },
  subtitle: {
    fontSize: '14px',
    color: '#666'
  },
  section: {
    marginBottom: '15px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    marginTop: '10px'
  },
  th: {
    border: '1px solid #000',
    padding: '8px',
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
    textAlign: 'left' as const
  },
  td: {
    border: '1px solid #000',
    padding: '8px'
  },
  footer: {
    marginTop: '30px',
    borderTop: '1px solid #ccc',
    paddingTop: '15px'
  },
  firma: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '50px'
  },
  firmaBox: {
    textAlign: 'center' as const,
    width: '200px'
  },
  firmaLinea: {
    borderTop: '1px solid #000',
    marginBottom: '5px'
  }
};

const NotaPedidoProduccion = forwardRef<HTMLDivElement, NotaPedidoProduccionProps>(
  ({ tipo, resumenProductos, venta, fechaEmision, responsable }, ref) => {
    const fechaActual = fechaEmision || new Date().toISOString();

    // Nota de Pedido Agrupada por Producto (para producción en lote)
    if (tipo === 'agrupado' && resumenProductos) {
      return (
        <Box ref={ref} sx={printStyles.container}>
          {/* Encabezado */}
          <Box sx={printStyles.header}>
            <Typography sx={printStyles.title}>
              NOTA DE PEDIDO - PRODUCCIÓN
            </Typography>
            <Typography sx={printStyles.subtitle}>
              Resumen agrupado por producto
            </Typography>
          </Box>

          {/* Info de emisión */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6}>
              <Typography variant="body2">
                <strong>Fecha de Emisión:</strong> {formatearFechaHora(fechaActual)}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2">
                <strong>Emitido por:</strong> {responsable || 'Sistema'}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2">
                <strong>Total de Productos a Producir:</strong> {resumenProductos.length}
              </Typography>
            </Grid>
          </Grid>

          <Divider sx={{ mb: 2 }} />

          {/* Tabla principal de productos */}
          <Typography variant="h6" gutterBottom>
            Productos a Producir
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>Código</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Producto</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Cantidad Total</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Nº Pedidos</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', width: '80px' }}>✓</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resumenProductos.map((producto, index) => (
                  <TableRow key={producto.productoId} sx={{ '&:nth-of-type(odd)': { backgroundColor: '#fafafa' } }}>
                    <TableCell>{producto.codigoProducto}</TableCell>
                    <TableCell>{producto.nombreProducto}</TableCell>
                    <TableCell align="center">
                      <Typography variant="body1" fontWeight="bold">
                        {producto.cantidadTotal}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">{producto.ventas.length}</TableCell>
                    <TableCell align="center">
                      <Box sx={{ border: '1px solid #ccc', width: 30, height: 30, margin: '0 auto' }} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Detalle por producto */}
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Detalle de Pedidos por Producto
            </Typography>
            {resumenProductos.map((producto) => (
              <Box key={producto.productoId} sx={{ mb: 3, pl: 2, borderLeft: '3px solid #1976d2' }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {producto.codigoProducto} - {producto.nombreProducto}
                </Typography>
                <Table size="small" sx={{ ml: 2, maxWidth: '90%' }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '12px' }}>Venta</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '12px' }}>Cliente</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '12px' }}>Fecha</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '12px' }}>Cant.</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {producto.ventas.map((venta) => (
                      <TableRow key={venta.ventaId}>
                        <TableCell sx={{ fontSize: '12px' }}>{venta.numeroVenta}</TableCell>
                        <TableCell sx={{ fontSize: '12px' }}>{venta.cliente}</TableCell>
                        <TableCell sx={{ fontSize: '12px' }}>{formatearFecha(venta.fecha)}</TableCell>
                        <TableCell align="center" sx={{ fontSize: '12px' }}>{venta.cantidad}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            ))}
          </Box>

          {/* Footer con firmas */}
          <Box sx={printStyles.footer}>
            <Grid container spacing={4} sx={{ mt: 4 }}>
              <Grid item xs={4}>
                <Box sx={printStyles.firmaBox}>
                  <Box sx={printStyles.firmaLinea} />
                  <Typography variant="caption">Emitido por</Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={printStyles.firmaBox}>
                  <Box sx={printStyles.firmaLinea} />
                  <Typography variant="caption">Recibido por Producción</Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={printStyles.firmaBox}>
                  <Box sx={printStyles.firmaLinea} />
                  <Typography variant="caption">Fecha/Hora</Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Box>
      );
    }

    // Nota de Pedido Individual (para una venta específica)
    if (tipo === 'individual' && venta) {
      const cliente = venta.clienteId;
      const nombreCliente = cliente?.razonSocial || 
        (cliente?.nombre && cliente?.apellido ? `${cliente.nombre} ${cliente.apellido}` : venta.nombreCliente);

      return (
        <Box ref={ref} sx={printStyles.container}>
          {/* Encabezado */}
          <Box sx={printStyles.header}>
            <Typography sx={printStyles.title}>
              NOTA DE PEDIDO
            </Typography>
            <Typography sx={printStyles.subtitle}>
              Venta Nº {venta.numeroVenta}
            </Typography>
          </Box>

          {/* Info de la venta */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6}>
              <Typography variant="body2">
                <strong>Cliente:</strong> {nombreCliente}
              </Typography>
              {cliente?.telefono && (
                <Typography variant="body2">
                  <strong>Teléfono:</strong> {cliente.telefono}
                </Typography>
              )}
              {cliente?.direccion && (
                <Typography variant="body2">
                  <strong>Dirección:</strong> {cliente.direccion}
                </Typography>
              )}
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2">
                <strong>Fecha Venta:</strong> {formatearFecha(venta.fecha)}
              </Typography>
              <Typography variant="body2">
                <strong>Fecha Emisión:</strong> {formatearFechaHora(fechaActual)}
              </Typography>
              <Typography variant="body2">
                <strong>Emitido por:</strong> {responsable || 'Sistema'}
              </Typography>
            </Grid>
          </Grid>

          <Divider sx={{ mb: 2 }} />

          {/* Productos a producir */}
          <Typography variant="h6" gutterBottom>
            Productos a Producir
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>Código</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Producto</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Cantidad</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', width: '80px' }}>✓</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {venta.itemsParaProducir.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.codigoProducto}</TableCell>
                    <TableCell>{item.nombreProducto}</TableCell>
                    <TableCell align="center">
                      <Typography variant="body1" fontWeight="bold">
                        {item.cantidad}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ border: '1px solid #ccc', width: 30, height: 30, margin: '0 auto' }} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Observaciones */}
          {venta.observaciones && (
            <Box sx={{ mt: 2, p: 2, backgroundColor: '#fff9c4', borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Observaciones:</strong> {venta.observaciones}
              </Typography>
            </Box>
          )}

          {/* Footer con firmas */}
          <Box sx={printStyles.footer}>
            <Grid container spacing={4} sx={{ mt: 4 }}>
              <Grid item xs={4}>
                <Box sx={printStyles.firmaBox}>
                  <Box sx={printStyles.firmaLinea} />
                  <Typography variant="caption">Emitido por</Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={printStyles.firmaBox}>
                  <Box sx={printStyles.firmaLinea} />
                  <Typography variant="caption">Recibido por Producción</Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={printStyles.firmaBox}>
                  <Box sx={printStyles.firmaLinea} />
                  <Typography variant="caption">Completado</Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Box>
      );
    }

    return null;
  }
);

NotaPedidoProduccion.displayName = 'NotaPedidoProduccion';

export default NotaPedidoProduccion;
