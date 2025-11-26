import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
  Box,
  Alert,
  Typography,
  Checkbox,
  TextField,
  Autocomplete,
  CircularProgress,
  Chip,
  Card,
  CardContent,
  Grid,
  Divider,
  Tooltip
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import { fetchVentasSinFacturar } from '../redux/slices/ventasSlice';
import { crearFacturaDesdeVentas, clearError } from '../redux/slices/facturasSlice';
import { Venta } from '../types';
import { formatDate, formatCurrency } from '../utils/formatters';

interface CrearFacturaDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`factura-tabpanel-${index}`}
      aria-labelledby={`factura-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const CrearFacturaDialog: React.FC<CrearFacturaDialogProps> = ({ open, onClose, onSuccess }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { sinFacturar, status } = useSelector((state: RootState) => state.ventas);
  const { loading, error } = useSelector((state: RootState) => state.facturas);

  const [tabValue, setTabValue] = useState(0);
  const [selectedVentas, setSelectedVentas] = useState<string[]>([]);
  const [filtroCliente, setFiltroCliente] = useState<string | null>(null);
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');

  useEffect(() => {
    if (open && tabValue === 0) {
      dispatch(fetchVentasSinFacturar());
    }
  }, [open, tabValue, dispatch]);

  useEffect(() => {
    if (open) {
      dispatch(clearError());
      setSelectedVentas([]);
      setFiltroCliente(null);
      setFechaDesde('');
      setFechaHasta('');
    }
  }, [open, dispatch]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSelectionChange = (newSelection: string[]) => {
    setSelectedVentas(newSelection);
  };

  // Filtrar ventas según criterios
  const ventasFiltradas = sinFacturar.filter((venta) => {
    // Filtro por cliente
    if (filtroCliente) {
      const clienteId = venta.clienteId;
      if (clienteId !== filtroCliente) return false;
    }

    // Filtro por fechas
    if (fechaDesde && new Date(venta.fecha) < new Date(fechaDesde)) return false;
    if (fechaHasta && new Date(venta.fecha) > new Date(fechaHasta)) return false;

    return true;
  });

  // Validar que todas las ventas seleccionadas sean del mismo cliente
  const validarMismoCliente = (): boolean => {
    if (selectedVentas.length === 0) return true;
    const primerClienteId = sinFacturar.find((v) => v._id === selectedVentas[0])?.clienteId;
    
    return selectedVentas.every((ventaId) => {
      const venta = sinFacturar.find((v) => v._id === ventaId);
      return venta?.clienteId === primerClienteId;
    });
  };

  // Calcular totales de ventas seleccionadas
  const calcularTotales = () => {
    const ventas = sinFacturar.filter((v) => v._id && selectedVentas.includes(v._id));
    const subtotal = ventas.reduce((sum, v) => sum + v.subtotal, 0);
    const iva = ventas.reduce((sum, v) => sum + (v.iva || 0), 0);
    const total = ventas.reduce((sum, v) => sum + v.total, 0);
    const itemsCount = ventas.reduce((sum, v) => sum + v.items.length, 0);
    
    return { subtotal, iva, total, itemsCount, ventasCount: ventas.length };
  };

  const handleCrearFactura = async () => {
    if (!validarMismoCliente()) {
      alert('Todas las ventas deben pertenecer al mismo cliente');
      return;
    }

    if (selectedVentas.length === 0) {
      alert('Debe seleccionar al menos una venta');
      return;
    }

    try {
      await dispatch(crearFacturaDesdeVentas(selectedVentas)).unwrap();
      onSuccess();
    } catch (err) {
      console.error('Error al crear factura:', err);
    }
  };

  // Obtener lista única de clientes que tienen ventas sin facturar
  const clientesParaFiltro = Array.from(
    new Map(
      sinFacturar
        .filter((venta) => venta.clienteId && venta.nombreCliente)
        .map((venta) => [
          venta.clienteId,
          {
            _id: venta.clienteId,
            label: venta.nombreCliente
          }
        ])
    ).values()
  );

  // Columnas del DataGrid
  const columns: GridColDef[] = [
    {
      field: 'seleccion',
      headerName: '',
      width: 50,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params: GridRenderCellParams) => (
        <Checkbox
          checked={selectedVentas.includes(params.row._id)}
          onChange={() => {
            const index = selectedVentas.indexOf(params.row._id);
            if (index > -1) {
              setSelectedVentas(selectedVentas.filter((id) => id !== params.row._id));
            } else {
              setSelectedVentas([...selectedVentas, params.row._id]);
            }
          }}
        />
      )
    },
    {
      field: 'numeroVenta',
      headerName: 'Nº Venta',
      width: 100
    },
    {
      field: 'fecha',
      headerName: 'Fecha',
      width: 100,
      valueGetter: (value: string) => formatDate(value)
    },
    {
      field: 'cliente',
      headerName: 'Cliente',
      width: 180,
      valueGetter: (_value: any, row: Venta) => row.nombreCliente || 'Cliente desconocido'
    },
    {
      field: 'productos',
      headerName: 'Productos',
      width: 280,
      renderCell: (params: GridRenderCellParams) => {
        const venta = params.row as Venta;
        const productos = venta.items?.map(item => 
          `${item.nombreProducto} (x${item.cantidad})`
        ).join(', ') || '-';
        return (
          <Tooltip title={productos}>
            <Typography variant="body2" noWrap sx={{ maxWidth: 270 }}>
              {productos}
            </Typography>
          </Tooltip>
        );
      }
    },
    {
      field: 'items',
      headerName: 'Cant.',
      width: 60,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (_value: any, row: Venta) => row.items?.length || 0
    },
    {
      field: 'aplicaIVA',
      headerName: 'IVA',
      width: 70,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams) => {
        const venta = params.row as Venta;
        return (
          <Chip 
            label={venta.aplicaIVA ? 'Sí' : 'No'} 
            color={venta.aplicaIVA ? 'success' : 'default'} 
            size="small" 
            sx={{ fontSize: '0.7rem' }}
          />
        );
      }
    },
    {
      field: 'subtotal',
      headerName: 'Subtotal',
      width: 100,
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value: number) => formatCurrency(value || 0)
    },
    {
      field: 'ivaAmount',
      headerName: 'IVA $',
      width: 90,
      align: 'right',
      headerAlign: 'right',
      valueGetter: (_value: any, row: Venta) => row.iva || 0,
      valueFormatter: (value: number) => formatCurrency(value || 0)
    },
    {
      field: 'total',
      headerName: 'Total',
      width: 110,
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value: number) => formatCurrency(value || 0)
    }
  ];

  const totales = calcularTotales();
  const mismoClienteValido = validarMismoCliente();

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{ sx: { height: '90vh' } }}
    >
      <DialogTitle>Nueva Factura AFIP</DialogTitle>
      
      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Desde Ventas" id="factura-tab-0" />
            <Tab label="Manual" id="factura-tab-1" disabled />
          </Tabs>
        </Box>

        {/* Tab 1: Desde Ventas */}
        <TabPanel value={tabValue} index={0}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch(clearError())}>
              {error}
            </Alert>
          )}

          {!mismoClienteValido && selectedVentas.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              ⚠️ Las ventas seleccionadas deben pertenecer al mismo cliente
            </Alert>
          )}

          {/* Filtros */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Filtros
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Autocomplete
                    options={clientesParaFiltro}
                    getOptionLabel={(option) => option.label}
                    value={clientesParaFiltro.find((c) => c._id === filtroCliente) || null}
                    onChange={(_event, newValue) => {
                      setFiltroCliente(newValue?._id || null);
                    }}
                    renderInput={(params) => (
                      <TextField {...params} label="Cliente" size="small" />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Fecha Desde"
                    type="date"
                    size="small"
                    fullWidth
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Fecha Hasta"
                    type="date"
                    size="small"
                    fullWidth
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Preview de totales */}
          {selectedVentas.length > 0 && (
            <Card sx={{ mb: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="caption">Ventas Seleccionadas</Typography>
                    <Typography variant="h6">{totales.ventasCount}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="caption">Items Totales</Typography>
                    <Typography variant="h6">{totales.itemsCount}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="caption">IVA</Typography>
                    <Typography variant="h6">{formatCurrency(totales.iva)}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="caption">Total a Facturar</Typography>
                    <Typography variant="h6">{formatCurrency(totales.total)}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* DataGrid de ventas */}
          <Box sx={{ height: 400, width: '100%' }}>
            {status === 'loading' ? (
              <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                <CircularProgress />
              </Box>
            ) : (
              <DataGrid
                rows={ventasFiltradas}
                columns={columns}
                getRowId={(row) => row._id}
                checkboxSelection={false}
                disableRowSelectionOnClick
                pageSizeOptions={[10, 25, 50]}
                initialState={{
                  pagination: { paginationModel: { pageSize: 10 } },
                }}
                localeText={{
                  noRowsLabel: 'No hay ventas sin facturar',
                  footerRowSelected: (count) => `${count} ventas seleccionadas`
                }}
              />
            )}
          </Box>
        </TabPanel>

        {/* Tab 2: Manual (deshabilitado por ahora) */}
        <TabPanel value={tabValue} index={1}>
          <Alert severity="info">
            La creación manual de facturas estará disponible próximamente.
          </Alert>
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        {tabValue === 0 && (
          <Button
            onClick={handleCrearFactura}
            variant="contained"
            disabled={loading || selectedVentas.length === 0 || !mismoClienteValido}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Creando...' : 'Crear Factura'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CrearFacturaDialog;
