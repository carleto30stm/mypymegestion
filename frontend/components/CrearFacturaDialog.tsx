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
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import { fetchVentasSinFacturar } from '../redux/slices/ventasSlice';
import { crearFacturaDesdeVentas, crearFacturaManual, clearError } from '../redux/slices/facturasSlice';
import { Venta, Cliente } from '../types';
import { formatDate, formatCurrency, formatNumberInput, getNumericValue } from '../utils/formatters';

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
  const [filtroCobranza, setFiltroCobranza] = useState<string>('');
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');

  // Estados para facturación manual
  const [clienteManual, setClienteManual] = useState<Cliente | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [concepto, setConcepto] = useState<number>(1); // 1=Productos, 2=Servicios, 3=Mixto
  const [observacionesManual, setObservacionesManual] = useState('');
  const [items, setItems] = useState<Array<{
    codigo: string;
    descripcion: string;
    cantidad: number;
    precioUnitario: string; // Formato argentino (1.000,50)
    alicuotaIVA: number;
  }>>([{
    codigo: '',
    descripcion: '',
    cantidad: 1,
    precioUnitario: '',
    alicuotaIVA: 21
  }]);

  // Cargar clientes al abrir el modal
  useEffect(() => {
    const cargarClientes = async () => {
      if (open && clientes.length === 0 && !loadingClientes) {
        setLoadingClientes(true);
        try {
          const api = (await import('../services/api')).default;
          const response = await api.get('/api/clientes');
          console.log('✅ Clientes cargados:', response.data.length);
          console.log('Primeros 3 clientes:', response.data.slice(0, 3));
          setClientes(response.data || []);
        } catch (error: any) {
          console.error('❌ Error al cargar clientes:', error);
          console.error('Detalle del error:', error.response?.data || error.message);
          setClientes([]);
        } finally {
          setLoadingClientes(false);
        }
      }
    };
    cargarClientes();
  }, [open, clientes.length, loadingClientes]);

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
      setFiltroCobranza('');
      setFechaDesde('');
      setFechaHasta('');
      // Resetear estado de facturación manual
      setClienteManual(null);
      setConcepto(1);
      setObservacionesManual('');
      setItems([{
        codigo: '',
        descripcion: '',
        cantidad: 1,
        precioUnitario: '',
        alicuotaIVA: 21
      }]);
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

    // Filtro por estado de cobranza
    if (filtroCobranza) {
      const estadoCobranza = venta.estadoCobranza || 'pendiente';
      if (estadoCobranza !== filtroCobranza) return false;
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

  // ========== FUNCIONES PARA FACTURACIÓN MANUAL ==========

  const agregarItem = () => {
    setItems([...items, {
      codigo: '',
      descripcion: '',
      cantidad: 1,
      precioUnitario: '',
      alicuotaIVA: 21
    }]);
  };

  const eliminarItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const actualizarItem = (index: number, campo: string, valor: any) => {
    const nuevosItems = [...items];
    (nuevosItems[index] as any)[campo] = valor;
    setItems(nuevosItems);
  };

  const calcularTotalesManual = () => {
    let subtotal = 0;
    let totalIVA = 0;

    items.forEach(item => {
      const precioUnitario = getNumericValue(item.precioUnitario);
      const importeBruto = precioUnitario * item.cantidad;
      const importeNeto = importeBruto; // Sin descuentos en versión inicial
      const importeIVA = importeNeto * (item.alicuotaIVA / 100);
      
      subtotal += importeNeto;
      totalIVA += importeIVA;
    });

    return {
      subtotal,
      iva: totalIVA,
      total: subtotal + totalIVA
    };
  };

  const validarFormularioManual = (): boolean => {
    if (!clienteManual) {
      alert('Debe seleccionar un cliente');
      return false;
    }

    if (items.length === 0) {
      alert('Debe agregar al menos un item');
      return false;
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.descripcion.trim()) {
        alert(`El item ${i + 1} debe tener una descripción`);
        return false;
      }
      if (item.cantidad <= 0) {
        alert(`El item ${i + 1} debe tener una cantidad mayor a 0`);
        return false;
      }
      if (getNumericValue(item.precioUnitario) <= 0) {
        alert(`El item ${i + 1} debe tener un precio unitario mayor a 0`);
        return false;
      }
    }

    return true;
  };

  const handleCrearFacturaManual = async () => {
    if (!validarFormularioManual()) {
      return;
    }

    // Convertir items a formato backend
    const itemsFormateados = items.map(item => {
      const precioUnitario = getNumericValue(item.precioUnitario);
      const importeBruto = precioUnitario * item.cantidad;
      const importeNeto = importeBruto;
      const importeIVA = importeNeto * (item.alicuotaIVA / 100);

      return {
        codigo: item.codigo || 'MANUAL',
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        unidadMedida: '7', // Unidades
        precioUnitario,
        importeBruto,
        importeDescuento: 0,
        importeNeto,
        alicuotaIVA: item.alicuotaIVA,
        importeIVA,
        importeTotal: importeNeto + importeIVA
      };
    });

    try {
      await dispatch(crearFacturaManual({
        clienteId: clienteManual!._id!,
        tipoComprobante: '', // El backend lo determina consultando AFIP
        puntoVenta: 1, // Punto de venta por defecto
        items: itemsFormateados,
        concepto,
        observaciones: observacionesManual || undefined
      })).unwrap();
      
      onSuccess();
    } catch (err) {
      console.error('Error al crear factura manual:', err);
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
      field: 'estadoCobranza',
      headerName: 'Cobranza',
      width: 110,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams) => {
        const venta = params.row as Venta;
        const estadoCobranza = venta.estadoCobranza || 'pendiente';
        const colorMap: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
          cobrado: 'success',
          parcial: 'warning',
          pendiente: 'error',
        };
        const labelMap: Record<string, string> = {
          cobrado: 'Cobrado',
          parcial: 'Parcial',
          pendiente: 'Pendiente',
        };
        return (
          <Chip
            label={labelMap[estadoCobranza] || estadoCobranza}
            color={colorMap[estadoCobranza] || 'default'}
            size="small"
            sx={{ fontSize: '0.7rem' }}
          />
        );
      }
    },
    {
      field: 'productos',
      headerName: 'Productos',
      width: 220,
      renderCell: (params: GridRenderCellParams) => {
        const venta = params.row as Venta;
        const productos = venta.items?.map(item => 
          `${item.nombreProducto} (x${item.cantidad})`
        ).join(', ') || '-';
        return (
          <Tooltip title={productos}>
            <Typography variant="body2" noWrap sx={{ maxWidth: 210 }}>
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
            <Tab label="Manual" id="factura-tab-1" />
          </Tabs>
        </Box>

        {/* Tab 1: Desde Ventas */}
        <TabPanel value={tabValue} index={0}>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Nuevo flujo:</strong> Puede facturar ventas <strong>antes o después</strong> de cobrarlas. 
              Las ventas pendientes de cobro se muestran con estado "Pendiente" en la columna Cobranza.
            </Typography>
          </Alert>

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
                <Grid item xs={12} md={4}>
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
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Cobranza</InputLabel>
                    <Select
                      value={filtroCobranza}
                      label="Cobranza"
                      onChange={(e) => setFiltroCobranza(e.target.value)}
                    >
                      <MenuItem value="">Todas</MenuItem>
                      <MenuItem value="cobrado">✅ Cobradas</MenuItem>
                      <MenuItem value="parcial">⏳ Parcial</MenuItem>
                      <MenuItem value="pendiente">❌ Pendientes</MenuItem>
                    </Select>
                  </FormControl>
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

        {/* Tab 2: Manual */}
        <TabPanel value={tabValue} index={1}>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Facturación manual:</strong> Crear factura sin venta previa. El sistema consultará AFIP automáticamente para determinar el tipo de factura (A, B o C) según el CUIT/DNI del cliente.
            </Typography>
          </Alert>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch(clearError())}>
              {error}
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Selector de cliente */}
            <Grid item xs={12}>
              <Autocomplete
                options={clientes}
                getOptionLabel={(option) => {
                  const nombre = option.razonSocial || `${option.nombre} ${option.apellido || ''}`.trim();
                  const estado = option.estado === 'activo' ? '' : ` [${option.estado.toUpperCase()}]`;
                  return `${nombre} - ${option.numeroDocumento}${estado}`;
                }}
                value={clienteManual}
                onChange={(_event, newValue) => {
                  console.log('✅ Cliente seleccionado:', newValue);
                  setClienteManual(newValue);
                }}
                loading={loadingClientes}
                noOptionsText={
                  loadingClientes 
                    ? 'Cargando clientes...' 
                    : clientes.length === 0 
                      ? 'No hay clientes registrados en el sistema'
                      : 'No se encontraron coincidencias'
                }
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="Cliente *" 
                    placeholder="Buscar por nombre, razón social o documento"
                    helperText={
                      loadingClientes 
                        ? 'Cargando lista de clientes...'
                        : clientes.length > 0
                          ? `${clientes.length} clientes disponibles. Puede facturar a cualquier cliente sin necesidad de ventas previas.`
                          : 'No hay clientes registrados. Primero debe crear clientes en el sistema.'
                    }
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingClientes ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            {/* Concepto */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Concepto</InputLabel>
                <Select
                  value={concepto}
                  label="Concepto"
                  onChange={(e) => setConcepto(Number(e.target.value))}
                >
                  <MenuItem value={1}>Productos</MenuItem>
                  <MenuItem value={2}>Servicios</MenuItem>
                  <MenuItem value={3}>Productos y Servicios</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Observaciones */}
            <Grid item xs={12} md={6}>
              <TextField
                label="Observaciones"
                value={observacionesManual}
                onChange={(e) => setObservacionesManual(e.target.value)}
                fullWidth
                multiline
                rows={1}
                placeholder="Notas adicionales (opcional)"
              />
            </Grid>

            {/* Tabla de items */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">Items de Factura</Typography>
                    <Button
                      startIcon={<AddIcon />}
                      onClick={agregarItem}
                      variant="outlined"
                      size="small"
                    >
                      Agregar Item
                    </Button>
                  </Box>

                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Código</TableCell>
                          <TableCell>Descripción *</TableCell>
                          <TableCell align="center">Cantidad *</TableCell>
                          <TableCell align="right">Precio Unit. *</TableCell>
                          <TableCell align="center">IVA %</TableCell>
                          <TableCell align="right">Subtotal</TableCell>
                          <TableCell align="right">IVA $</TableCell>
                          <TableCell align="right">Total</TableCell>
                          <TableCell align="center">Acción</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {items.map((item, index) => {
                          const precioUnitario = getNumericValue(item.precioUnitario);
                          const importeBruto = precioUnitario * item.cantidad;
                          const importeNeto = importeBruto;
                          const importeIVA = importeNeto * (item.alicuotaIVA / 100);
                          const total = importeNeto + importeIVA;

                          return (
                            <TableRow key={index}>
                              <TableCell>
                                <TextField
                                  value={item.codigo}
                                  onChange={(e) => actualizarItem(index, 'codigo', e.target.value)}
                                  placeholder="Código"
                                  size="small"
                                  sx={{ width: 100 }}
                                />
                              </TableCell>
                              <TableCell>
                                <TextField
                                  value={item.descripcion}
                                  onChange={(e) => actualizarItem(index, 'descripcion', e.target.value)}
                                  placeholder="Descripción del producto/servicio"
                                  size="small"
                                  fullWidth
                                  required
                                  error={!item.descripcion.trim()}
                                />
                              </TableCell>
                              <TableCell align="center">
                                <TextField
                                  type="number"
                                  value={item.cantidad}
                                  onChange={(e) => actualizarItem(index, 'cantidad', Math.max(1, Number(e.target.value)))}
                                  size="small"
                                  sx={{ width: 80 }}
                                  inputProps={{ min: 1 }}
                                />
                              </TableCell>
                              <TableCell align="right">
                                <TextField
                                  type="text"
                                  value={item.precioUnitario}
                                  onChange={(e) => {
                                    const formatted = formatNumberInput(e.target.value);
                                    actualizarItem(index, 'precioUnitario', formatted);
                                  }}
                                  size="small"
                                  placeholder="1.000,50"
                                  helperText="Ej: 1.000,50"
                                  sx={{ width: 120 }}
                                  InputProps={{ startAdornment: '$' }}
                                  error={getNumericValue(item.precioUnitario) <= 0 && item.precioUnitario !== ''}
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Select
                                  value={item.alicuotaIVA}
                                  onChange={(e) => actualizarItem(index, 'alicuotaIVA', Number(e.target.value))}
                                  size="small"
                                  sx={{ width: 80 }}
                                >
                                  <MenuItem value={0}>0%</MenuItem>
                                  <MenuItem value={10.5}>10,5%</MenuItem>
                                  <MenuItem value={21}>21%</MenuItem>
                                  <MenuItem value={27}>27%</MenuItem>
                                </Select>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2">
                                  {formatCurrency(importeNeto)}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" color="text.secondary">
                                  {formatCurrency(importeIVA)}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" fontWeight="bold">
                                  {formatCurrency(total)}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <IconButton
                                  onClick={() => eliminarItem(index)}
                                  size="small"
                                  disabled={items.length === 1}
                                  color="error"
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Totales */}
            {items.length > 0 && (
              <Grid item xs={12}>
                <Card sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="caption">Subtotal (sin IVA)</Typography>
                        <Typography variant="h6">{formatCurrency(calcularTotalesManual().subtotal)}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="caption">IVA Total</Typography>
                        <Typography variant="h6">{formatCurrency(calcularTotalesManual().iva)}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="caption">Total Factura</Typography>
                        <Typography variant="h6" fontWeight="bold">{formatCurrency(calcularTotalesManual().total)}</Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
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
        {tabValue === 1 && (
          <Button
            onClick={handleCrearFacturaManual}
            variant="contained"
            disabled={loading || !clienteManual || items.length === 0}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Creando...' : 'Crear Factura Manual'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CrearFacturaDialog;
