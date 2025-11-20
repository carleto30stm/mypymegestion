import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { formatCurrency } from '../utils/formatters';
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
} from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Check as CheckIcon,
  Print as PrintIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../redux/store';
import { fetchFacturas, clearError } from '../redux/slices/facturasSlice';
import type { Factura, TipoComprobante, EstadoFactura } from '../redux/slices/facturasSlice';
import { fetchClientes } from '../redux/slices/clientesSlice';
import { FacturaDetailDialog, AutorizarFacturaDialog, FacturaPDF } from '../components';
import CrearFacturaDialog from '../components/CrearFacturaDialog';

const tiposComprobante: { value: TipoComprobante; label: string }[] = [
  { value: 'FACTURA_A', label: 'Factura A' },
  { value: 'FACTURA_B', label: 'Factura B' },
  { value: 'FACTURA_C', label: 'Factura C' },
  { value: 'NOTA_CREDITO_A', label: 'Nota de Crédito A' },
  { value: 'NOTA_CREDITO_B', label: 'Nota de Crédito B' },
  { value: 'NOTA_CREDITO_C', label: 'Nota de Crédito C' },
  { value: 'NOTA_DEBITO_A', label: 'Nota de Débito A' },
  { value: 'NOTA_DEBITO_B', label: 'Nota de Débito B' },
  { value: 'NOTA_DEBITO_C', label: 'Nota de Débito C' },
];

const estadosFactura: { value: EstadoFactura | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'autorizada', label: 'Autorizada' },
  { value: 'rechazada', label: 'Rechazada' },
  { value: 'anulada', label: 'Anulada' },
  { value: 'error', label: 'Error' },
];

const FacturasPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items, loading, error, total, page, pages } = useSelector(
    (state: RootState) => state.facturas
  );
  const { items: clientes } = useSelector((state: RootState) => state.clientes);

  // Filtros
  const [estado, setEstado] = useState<EstadoFactura | ''>('');
  const [tipoComprobante, setTipoComprobante] = useState<TipoComprobante | ''>('');
  const [clienteId, setClienteId] = useState<string>('');
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');

  // Dialogs
  const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showAutorizarDialog, setShowAutorizarDialog] = useState(false);
  const [showCrearFacturaDialog, setShowCrearFacturaDialog] = useState(false);
  const [showPDFDialog, setShowPDFDialog] = useState(false);
  const [facturaPDF, setFacturaPDF] = useState<Factura | null>(null);

  // Cargar facturas al montar
  useEffect(() => {
    dispatch(fetchClientes());
    handleSearch();
  }, []);

  // Limpiar error al desmontar
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleSearch = () => {
    const filtros: any = {};
    if (estado) filtros.estado = estado;
    if (tipoComprobante) filtros.tipoComprobante = tipoComprobante;
    if (clienteId) filtros.clienteId = clienteId;
    if (fechaDesde) filtros.fechaDesde = fechaDesde;
    if (fechaHasta) filtros.fechaHasta = fechaHasta;

    dispatch(fetchFacturas(filtros));
  };

  const handleClearFilters = () => {
    setEstado('');
    setTipoComprobante('');
    setClienteId('');
    setFechaDesde('');
    setFechaHasta('');
    dispatch(fetchFacturas({}));
  };

  const handleVerDetalle = (factura: Factura) => {
    setSelectedFactura(factura);
    setShowDetailDialog(true);
  };

  const handleAutorizar = (factura: Factura) => {
    setSelectedFactura(factura);
    setShowAutorizarDialog(true);
  };

  const handlePrint = (factura: Factura) => {
    setFacturaPDF(factura);
    setShowPDFDialog(true);
  };

  const getEstadoChip = (estado: EstadoFactura) => {
    const config: Record<EstadoFactura, { label: string; color: 'default' | 'success' | 'error' | 'warning' }> = {
      borrador: { label: 'Borrador', color: 'default' },
      autorizada: { label: 'Autorizada', color: 'success' },
      rechazada: { label: 'Rechazada', color: 'error' },
      anulada: { label: 'Anulada', color: 'warning' },
      error: { label: 'Error', color: 'error' },
    };

    const { label, color } = config[estado];
    return <Chip label={label} color={color} size="small" />;
  };

  const getTipoComprobanteLabel = (tipo: TipoComprobante): string => {
    const found = tiposComprobante.find((t) => t.value === tipo);
    return found ? found.label : tipo;
  };

  const columns: GridColDef[] = [
    {
      field: 'numero',
      headerName: 'Número',
      width: 150,
      renderCell: (params: GridRenderCellParams) => {
        const factura = params.row as Factura;
        return `${factura.datosAFIP.puntoVenta.toString().padStart(5, '0')}-${(factura.datosAFIP.numeroSecuencial || 0).toString().padStart(8, '0')}`;
      },
    },
    {
      field: 'fecha',
      headerName: 'Fecha',
      width: 110,
      renderCell: (params: GridRenderCellParams) => {
        return new Date(params.value).toLocaleDateString('es-AR');
      },
    },
    {
      field: 'clienteId',
      headerName: 'Cliente',
      width: 200,
      renderCell: (params: GridRenderCellParams) => {
        const factura = params.row as Factura;
        // clienteId ya viene populated desde el backend
        if (typeof factura.clienteId === 'object' && factura.clienteId) {
          return factura.clienteId.razonSocial || 
                 `${factura.clienteId.nombre || ''} ${factura.clienteId.apellido || ''}`.trim() || 
                 'N/A';
        }
        return 'N/A';
      },
    },
    {
      field: 'tipoComprobante',
      headerName: 'Tipo',
      width: 150,
      renderCell: (params: GridRenderCellParams) => {
        return getTipoComprobanteLabel(params.value);
      },
    },
    {
      field: 'estado',
      headerName: 'Estado',
      width: 120,
      renderCell: (params: GridRenderCellParams) => {
        return getEstadoChip(params.value);
      },
    },
    {
      field: 'total',
      headerName: 'Total',
      width: 120,
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value: number) => formatCurrency(value || 0),
    },
    {
      field: 'datosAFIP',
      headerName: 'CAE',
      width: 160,
      renderCell: (params: GridRenderCellParams) => {
        const factura = params.row as Factura;
        return factura.datosAFIP?.CAE || '-';
      },
    },
    {
      field: 'acciones',
      headerName: 'Acciones',
      width: 200,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => {
        const factura = params.row as Factura;
        return (
          <Box>
            <Tooltip title="Ver detalle">
              <IconButton
                size="small"
                onClick={() => handleVerDetalle(factura)}
                color="primary"
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            {factura.estado === 'borrador' && (
              <Tooltip title="Autorizar con AFIP">
                <IconButton
                  size="small"
                  onClick={() => handleAutorizar(factura)}
                  color="success"
                >
                  <CheckIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {factura.estado === 'autorizada' && (
              <Tooltip title="Imprimir">
                <IconButton
                  size="small"
                  onClick={() => handlePrint(factura)}
                  color="primary"
                >
                  <PrintIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        );
      },
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Facturación Electrónica
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowCrearFacturaDialog(true)}
          color="primary"
        >
          Nueva Factura
        </Button>
      </Box>

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Estado</InputLabel>
                <Select
                  value={estado}
                  label="Estado"
                  onChange={(e) => setEstado(e.target.value as EstadoFactura | '')}
                >
                  {estadosFactura.map((est) => (
                    <MenuItem key={est.value || 'todos'} value={est.value}>
                      {est.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={tipoComprobante}
                  label="Tipo"
                  onChange={(e) => setTipoComprobante(e.target.value as TipoComprobante | '')}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {tiposComprobante.map((tipo) => (
                    <MenuItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Cliente</InputLabel>
                <Select
                  value={clienteId}
                  label="Cliente"
                  onChange={(e) => setClienteId(e.target.value)}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {clientes.map((cliente) => (
                    <MenuItem key={cliente._id} value={cliente._id}>
                      {cliente.nombre}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Desde"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Hasta"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleSearch}
                  startIcon={<RefreshIcon />}
                >
                  Buscar
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleClearFilters}
                  startIcon={<CloseIcon />}
                >
                  Limpiar
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card sx={{ mb: 3, bgcolor: 'error.light' }}>
          <CardContent>
            <Typography color="error.contrastText">
              Error: {error}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* DataGrid */}
      <Card>
        <CardContent>
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={items}
              columns={columns}
              loading={loading}
              getRowId={(row) => row._id}
              pageSizeOptions={[10, 25, 50]}
              disableRowSelectionOnClick
              sx={{
                '& .MuiDataGrid-cell': {
                  padding: '8px',
                },
              }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Dialogs */}
      {selectedFactura && (
        <>
          <FacturaDetailDialog
            open={showDetailDialog}
            factura={selectedFactura}
            onClose={() => {
              setShowDetailDialog(false);
              setSelectedFactura(null);
            }}
            onRefresh={handleSearch}
          />

          <AutorizarFacturaDialog
            open={showAutorizarDialog}
            factura={selectedFactura}
            onClose={() => {
              setShowAutorizarDialog(false);
              setSelectedFactura(null);
            }}
            onSuccess={() => {
              setShowAutorizarDialog(false);
              setSelectedFactura(null);
              handleSearch();
            }}
          />
        </>
      )}

      {/* Dialog de creación de factura */}
      <CrearFacturaDialog
        open={showCrearFacturaDialog}
        onClose={() => setShowCrearFacturaDialog(false)}
        onSuccess={() => {
          setShowCrearFacturaDialog(false);
          handleSearch();
        }}
      />

      {/* Dialog de PDF */}
      {facturaPDF && (
        <FacturaPDF
          open={showPDFDialog}
          onClose={() => {
            setShowPDFDialog(false);
            setFacturaPDF(null);
          }}
          factura={facturaPDF}
        />
      )}
    </Box>
  );
};

export default FacturasPage;
