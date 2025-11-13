import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import { fetchEstadisticasProductos, limpiarEstadisticas } from '../redux/slices/metricasProductosSlice';
import { MetricaProducto } from '../types';
import { formatCurrency } from '../utils/formatters';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Grid,
  TextField,
  MenuItem,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Tooltip,
  TableSortLabel
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Inventory as InventoryIcon,
  AttachMoney as MoneyIcon,
  ShowChart as ChartIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Star as StarIcon,
  WarningAmber as WarningIcon
} from '@mui/icons-material';
import * as XLSX from 'xlsx';

const MetricasProductos: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { estadisticas, status, error } = useSelector((state: RootState) => state.metricasProductos);
  const { items: productos } = useSelector((state: RootState) => state.productos);

  // Estados para filtros
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('');
  const [limitProductos, setLimitProductos] = useState<number>(50);
  
  // Estados para ordenamiento
  const [orderBy, setOrderBy] = useState<keyof MetricaProducto>('totalVendido');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  // Obtener categorías únicas de productos
  const categorias = Array.from(new Set(productos.map(p => p.categoria))).sort();

  const handleBuscar = () => {
    dispatch(fetchEstadisticasProductos({
      fechaInicio: fechaInicio || undefined,
      fechaFin: fechaFin || undefined,
      categoria: categoriaSeleccionada || undefined,
      limit: limitProductos
    }));
  };

  useEffect(() => {
    // Cargar métricas al montar con fecha del último mes por defecto
    const hoy = new Date();
    const haceUnMes = new Date();
    haceUnMes.setMonth(hoy.getMonth() - 1);
    
    setFechaInicio(haceUnMes.toISOString().split('T')[0]);
    setFechaFin(hoy.toISOString().split('T')[0]);
    
    handleBuscar();
    
    return () => {
      dispatch(limpiarEstadisticas());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSort = (property: keyof MetricaProducto) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const getSortedProducts = (): MetricaProducto[] => {
    if (!estadisticas?.productos) return [];
    
    return [...estadisticas.productos].sort((a, b) => {
      const aValue = a[orderBy];
      const bValue = b[orderBy];
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return order === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return order === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }
      
      return 0;
    });
  };

  const getColorMargen = (porcentaje: number): string => {
    if (porcentaje >= 40) return 'success.main';
    if (porcentaje >= 25) return 'warning.main';
    return 'error.main';
  };

  const getChipColorClasificacion = (clasificacion: 'A' | 'B' | 'C'): 'error' | 'warning' | 'default' => {
    if (clasificacion === 'A') return 'error';
    if (clasificacion === 'B') return 'warning';
    return 'default';
  };

  const exportarExcel = () => {
    if (!estadisticas?.productos) return;

    const datosExportar = estadisticas.productos.map(p => ({
      'Ranking': p.ranking,
      'Código': p.codigoProducto,
      'Producto': p.nombreProducto,
      'Categoría': p.categoria,
      'Clasificación ABC': p.clasificacionABC,
      'Unidades Vendidas': p.unidadesVendidas,
      'Nº Ventas': p.numeroVentas,
      'Total Vendido': p.totalVendido,
      'Total Neto (sin IVA)': p.totalNetoSinIVA,
      'Participación %': p.participacionVentas,
      'Precio Promedio': p.precioPromedioVenta,
      'Precio Actual': p.precioVentaActual,
      'Costo Actual': p.precioCompraActual,
      'Margen Bruto %': p.porcentajeMargenBruto,
      'Utilidad Neta Estimada': p.utilidadNetaEstimada,
      'Margen Neto %': p.porcentajeUtilidadNeta,
      'Stock Actual': p.stockActual,
      'Ticket Promedio': p.ticketPromedio
    }));

    const ws = XLSX.utils.json_to_sheet(datosExportar);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Métricas Productos');
    
    // Ajustar ancho de columnas
    const colWidths = [
      { wch: 8 }, { wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 12 },
      { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }
    ];
    ws['!cols'] = colWidths;

    const nombreArchivo = `metricas_productos_${fechaInicio}_${fechaFin}.xlsx`;
    XLSX.writeFile(wb, nombreArchivo);
  };

  if (status === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Encabezado */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <ChartIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4">Métricas de Productos</Typography>
        </Box>
        {estadisticas && (
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={exportarExcel}
            color="primary"
          >
            Exportar Excel
          </Button>
        )}
      </Box>

      {/* Filtros */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <FilterIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">Filtros</Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Fecha Inicio"
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Fecha Fin"
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              select
              label="Categoría"
              value={categoriaSeleccionada}
              onChange={(e) => setCategoriaSeleccionada(e.target.value)}
            >
              <MenuItem value="">Todas las categorías</MenuItem>
              {categorias.map(cat => (
                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              select
              label="Top N Productos"
              value={limitProductos}
              onChange={(e) => setLimitProductos(Number(e.target.value))}
            >
              <MenuItem value={10}>Top 10</MenuItem>
              <MenuItem value={20}>Top 20</MenuItem>
              <MenuItem value={50}>Top 50</MenuItem>
              <MenuItem value={100}>Top 100</MenuItem>
              <MenuItem value={0}>Todos</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={1}>
            <Button
              fullWidth
              variant="contained"
              onClick={handleBuscar}
              sx={{ height: '56px' }}
            >
              Buscar
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {estadisticas && (
        <>
          {/* Cards de Resumen */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="textSecondary" variant="body2" gutterBottom>
                        Total Productos
                      </Typography>
                      <Typography variant="h4">
                        {estadisticas.totales.totalProductos}
                      </Typography>
                    </Box>
                    <InventoryIcon sx={{ fontSize: 48, color: 'primary.main', opacity: 0.3 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="textSecondary" variant="body2" gutterBottom>
                        Unidades Vendidas
                      </Typography>
                      <Typography variant="h4">
                        {estadisticas.totales.totalUnidadesVendidas.toLocaleString()}
                      </Typography>
                    </Box>
                    <TrendingUpIcon sx={{ fontSize: 48, color: 'success.main', opacity: 0.3 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="textSecondary" variant="body2" gutterBottom>
                        Total Vendido
                      </Typography>
                      <Typography variant="h4">
                        {formatCurrency(estadisticas.totales.totalMontoVendido)}
                      </Typography>
                    </Box>
                    <MoneyIcon sx={{ fontSize: 48, color: 'info.main', opacity: 0.3 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="textSecondary" variant="body2" gutterBottom>
                        Utilidad Estimada
                      </Typography>
                      <Typography variant="h4" color="success.main">
                        {formatCurrency(estadisticas.totales.totalUtilidadEstimada)}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Margen: {estadisticas.totales.margenPromedioGeneral.toFixed(1)}%
                      </Typography>
                    </Box>
                    <ChartIcon sx={{ fontSize: 48, color: 'success.main', opacity: 0.3 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Tabla de Productos */}
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: 'primary.main' }}>
                  <TableCell sx={{ color: 'white' }}>
                    <TableSortLabel
                      active={orderBy === 'ranking'}
                      direction={orderBy === 'ranking' ? order : 'asc'}
                      onClick={() => handleSort('ranking')}
                      sx={{ color: 'white !important' }}
                    >
                      #
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ color: 'white' }}>ABC</TableCell>
                  <TableCell sx={{ color: 'white' }}>
                    <TableSortLabel
                      active={orderBy === 'nombreProducto'}
                      direction={orderBy === 'nombreProducto' ? order : 'asc'}
                      onClick={() => handleSort('nombreProducto')}
                      sx={{ color: 'white !important' }}
                    >
                      Producto
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ color: 'white' }}>
                    <TableSortLabel
                      active={orderBy === 'categoria'}
                      direction={orderBy === 'categoria' ? order : 'asc'}
                      onClick={() => handleSort('categoria')}
                      sx={{ color: 'white !important' }}
                    >
                      Categoría
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'white' }}>
                    <TableSortLabel
                      active={orderBy === 'unidadesVendidas'}
                      direction={orderBy === 'unidadesVendidas' ? order : 'asc'}
                      onClick={() => handleSort('unidadesVendidas')}
                      sx={{ color: 'white !important' }}
                    >
                      Unidades
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'white' }}>
                    <TableSortLabel
                      active={orderBy === 'totalVendido'}
                      direction={orderBy === 'totalVendido' ? order : 'asc'}
                      onClick={() => handleSort('totalVendido')}
                      sx={{ color: 'white !important' }}
                    >
                      Total Vendido
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'white' }}>
                    <TableSortLabel
                      active={orderBy === 'participacionVentas'}
                      direction={orderBy === 'participacionVentas' ? order : 'asc'}
                      onClick={() => handleSort('participacionVentas')}
                      sx={{ color: 'white !important' }}
                    >
                      Participación
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'white' }}>
                    <TableSortLabel
                      active={orderBy === 'porcentajeMargenBruto'}
                      direction={orderBy === 'porcentajeMargenBruto' ? order : 'asc'}
                      onClick={() => handleSort('porcentajeMargenBruto')}
                      sx={{ color: 'white !important' }}
                    >
                      Margen Bruto
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'white' }}>
                    <TableSortLabel
                      active={orderBy === 'utilidadNetaEstimada'}
                      direction={orderBy === 'utilidadNetaEstimada' ? order : 'asc'}
                      onClick={() => handleSort('utilidadNetaEstimada')}
                      sx={{ color: 'white !important' }}
                    >
                      Utilidad Neta
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'white' }}>
                    <TableSortLabel
                      active={orderBy === 'stockActual'}
                      direction={orderBy === 'stockActual' ? order : 'asc'}
                      onClick={() => handleSort('stockActual')}
                      sx={{ color: 'white !important' }}
                    >
                      Stock
                    </TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getSortedProducts().map((producto) => {
                  const margenBajo = producto.porcentajeMargenBruto < 25;
                  const stockBajo = producto.stockActual <= 10; // Ajustar según criterio
                  
                  return (
                    <TableRow 
                      key={producto._id}
                      sx={{ 
                        '&:hover': { backgroundColor: 'action.hover' },
                        backgroundColor: producto.clasificacionABC === 'A' ? 'error.lighter' : 'inherit'
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {producto.ranking <= 3 && (
                            <StarIcon 
                              sx={{ 
                                fontSize: 16, 
                                mr: 0.5,
                                color: producto.ranking === 1 ? 'gold' : producto.ranking === 2 ? 'silver' : '#CD7F32'
                              }} 
                            />
                          )}
                          <Typography variant="body2" fontWeight="bold">
                            {producto.ranking}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={producto.clasificacionABC} 
                          size="small" 
                          color={getChipColorClasificacion(producto.clasificacionABC)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {producto.nombreProducto}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {producto.codigoProducto}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={producto.categoria} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {producto.unidadesVendidas.toLocaleString()}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {producto.numeroVentas} ventas
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold">
                          {formatCurrency(producto.totalVendido)}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Neto: {formatCurrency(producto.totalNetoSinIVA)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold">
                          {producto.participacionVentas.toFixed(1)}%
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title={`Margen unitario: ${formatCurrency(producto.margenBrutoUnitario)}`}>
                          <Box>
                            <Typography 
                              variant="body2" 
                              fontWeight="bold"
                              color={getColorMargen(producto.porcentajeMargenBruto)}
                              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}
                            >
                              {producto.porcentajeMargenBruto.toFixed(1)}%
                              {margenBajo && (
                                <WarningIcon sx={{ fontSize: 16, ml: 0.5, color: 'warning.main' }} />
                              )}
                            </Typography>
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right">
                        <Typography 
                          variant="body2" 
                          fontWeight="bold"
                          color={producto.utilidadNetaEstimada > 0 ? 'success.main' : 'error.main'}
                        >
                          {formatCurrency(producto.utilidadNetaEstimada)}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {producto.porcentajeUtilidadNeta.toFixed(1)}%
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography 
                          variant="body2"
                          color={stockBajo ? 'error.main' : 'inherit'}
                          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}
                        >
                          {producto.stockActual}
                          {stockBajo && (
                            <WarningIcon sx={{ fontSize: 16, ml: 0.5 }} />
                          )}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Información adicional */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="textSecondary">
              <strong>Clasificación ABC:</strong> A = Top 20% (mayor impacto), B = 20-50%, C = 50-100%
            </Typography>
            <br />
            <Typography variant="caption" color="textSecondary">
              <strong>Nota:</strong> Los márgenes se calculan sobre precios y costos actuales. La utilidad neta es estimada (no incluye gastos operacionales).
            </Typography>
          </Box>
        </>
      )}
    </Box>
  );
};

export default MetricasProductos;
