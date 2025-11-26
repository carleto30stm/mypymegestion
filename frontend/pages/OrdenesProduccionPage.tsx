import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Chip,
  Tooltip,
  Card,
  CardContent,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  Checkbox,
  Collapse,
  RadioGroup,
  Radio,
  FormControlLabel,
  FormLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  CheckCircle as CheckIcon,
  Print as PrintIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Assignment as AssignmentIcon,
  FactCheck as FactCheckIcon,
  ShoppingCart as ShoppingCartIcon,
  Build as BuildIcon,
} from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';
import { ordenesProduccionAPI, recetasAPI, ventasAPI } from '../services/api';
import NotaPedidoProduccion from '../components/NotaPedidoProduccion';

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
      id={`produccion-tabpanel-${index}`}
      aria-labelledby={`produccion-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

interface Receta {
  _id: string;
  nombre: string;
  codigoProducto?: string;
  nombreProducto?: string;
  productoId?: {
    _id: string;
    codigo?: string;
    nombre: string;
    unidadMedida?: string;
  };
  productoTerminado?: {
    _id: string;
    nombre: string;
    unidadMedida?: string;
  };
  materiasPrimas: Array<{
    producto: {
      _id: string;
      nombre: string;
      unidadMedida?: string;
      stock?: number;
    };
    cantidad: number;
  }>;
  tiempoEstimado?: number;
  instrucciones?: string;
  estado?: string;
}

interface OrdenProduccion {
  _id: string;
  numeroOrden: string;
  recetaId?: {
    _id: string;
    version?: number;
    rendimiento?: number;
  };
  productoId?: {
    _id: string;
    codigo?: string;
    nombre: string;
  };
  codigoProducto: string;
  nombreProducto: string;
  cantidadAProducir: number;
  unidadesProducidas: number;
  estado: 'planificada' | 'pendiente' | 'en_proceso' | 'completada' | 'cancelada';
  prioridad?: 'baja' | 'media' | 'alta' | 'urgente';
  fecha: string;
  fechaInicio?: string;
  fechaFinalizacion?: string;
  responsable: string;
  observaciones?: string;
  fechaCreacion: string;
  // Para compatibilidad con el código existente
  receta?: Receta;
  numero?: number;
  cantidadPlanificada?: number;
  cantidadProducida?: number;
}

interface VentaPendiente {
  _id: string;
  numeroVenta: string;
  nombreCliente: string;
  clienteId?: {
    _id: string;
    nombre?: string;
    apellido?: string;
    razonSocial?: string;
    direccion?: string;
    telefono?: string;
  };
  items: Array<{
    productoId: string;
    codigoProducto: string;
    nombreProducto: string;
    cantidad: number;
    precioUnitario: number;
  }>;
  itemsParaProducir: Array<{
    productoId: string;
    codigoProducto: string;
    nombreProducto: string;
    cantidad: number;
    precioUnitario: number;
  }>;
  totalItemsProducir: number;
  total: number;
  fecha: string;
  estado: string;
  estadoGranular?: string;
}

const OrdenesProduccionPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [tabValue, setTabValue] = useState(0);
  
  const [ordenes, setOrdenes] = useState<OrdenProduccion[]>([]);
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingOrden, setEditingOrden] = useState<OrdenProduccion | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  // Estado para el dialog de completar orden
  const [openCompletarDialog, setOpenCompletarDialog] = useState(false);
  const [ordenACompletar, setOrdenACompletar] = useState<OrdenProduccion | null>(null);
  const [cantidadProducida, setCantidadProducida] = useState(0);
  
  const [ventasPendientes, setVentasPendientes] = useState<VentaPendiente[]>([]);
  const [loadingVentas, setLoadingVentas] = useState(false);
  const [selectedVentas, setSelectedVentas] = useState<string[]>([]);
  const [expandedVentas, setExpandedVentas] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    receta: '',
    cantidadPlanificada: 1,
    responsable: '',
    observaciones: '',
  });

  // Estado para el modo de creación de orden
  const [modoCreacion, setModoCreacion] = useState<'manual' | 'pedido'>('manual');
  const [ventasParaOrden, setVentasParaOrden] = useState<string[]>([]);
  const [ventasDialogList, setVentasDialogList] = useState<VentaPendiente[]>([]);
  const [loadingVentasDialog, setLoadingVentasDialog] = useState(false);
  
  // Estado para validación de producción
  const [validacionProduccion, setValidacionProduccion] = useState<{
    validando: boolean;
    resultado: Array<{
      productoId: string;
      nombreProducto: string;
      cantidad: number;
      tieneReceta: boolean;
      recetaId?: string;
      factible: boolean;
      materiasInsuficientes: Array<{ nombre: string; necesaria: number; disponible: number }>;
    }>;
    productsSinReceta: string[];
  }>({
    validando: false,
    resultado: [],
    productsSinReceta: []
  });

  // Estado para errores de stock insuficiente (alerta persistente)
  const [errorStock, setErrorStock] = useState<string | null>(null);

  const notaPedidoRef = useRef<HTMLDivElement>(null);
  const [resumenParaImprimir, setResumenParaImprimir] = useState<Array<{
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
  }>>([]);

  const handlePrint = useReactToPrint({
    contentRef: notaPedidoRef,
    documentTitle: 'Nota de Pedido para Produccion',
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    if (tabValue === 1) {
      cargarVentasPendientes();
    }
  }, [tabValue]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [ordenesRes, recetasRes] = await Promise.all([
        ordenesProduccionAPI.obtenerTodas(),
        recetasAPI.obtenerTodas(),
      ]);
      setOrdenes(ordenesRes);
      setRecetas(recetasRes);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      showSnackbar('Error al cargar datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const cargarVentasPendientes = async () => {
    try {
      setLoadingVentas(true);
      const response = await ventasAPI.getPendientesProduccion();
      // El backend devuelve { ventas, resumenPorProducto, totalVentas, totalProductosProducir }
      setVentasPendientes(response.ventas || []);
    } catch (error) {
      console.error('Error al cargar ventas pendientes:', error);
      showSnackbar('Error al cargar ventas pendientes', 'error');
    } finally {
      setLoadingVentas(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleOpenDialog = async (orden?: OrdenProduccion) => {
    // Limpiar error de stock al abrir el dialog
    setErrorStock(null);
    
    if (orden) {
      setEditingOrden(orden);
      setFormData({
        receta: orden.recetaId?._id || orden.receta?._id || '',
        cantidadPlanificada: orden.cantidadAProducir ?? orden.cantidadPlanificada ?? 1,
        responsable: orden.responsable || '',
        observaciones: orden.observaciones || '',
      });
      setModoCreacion('manual');
    } else {
      setEditingOrden(null);
      setFormData({
        receta: '',
        cantidadPlanificada: 1,
        responsable: '',
        observaciones: '',
      });
      setModoCreacion('manual');
      setVentasParaOrden([]);
      // Cargar ventas pendientes para el diálogo
      await cargarVentasParaDialog();
    }
    setOpenDialog(true);
  };

  const cargarVentasParaDialog = async () => {
    try {
      setLoadingVentasDialog(true);
      const response = await ventasAPI.getPendientesProduccion();
      setVentasDialogList(response.ventas || []);
    } catch (error) {
      console.error('Error al cargar ventas para dialog:', error);
    } finally {
      setLoadingVentasDialog(false);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingOrden(null);
    setModoCreacion('manual');
    setVentasParaOrden([]);
  };

  const handleSubmit = async () => {
    try {
      if (editingOrden) {
        showSnackbar('Edicion no soportada, cree una nueva orden', 'error');
        return;
      }
      
      if (modoCreacion === 'manual') {
        // Crear orden manualmente con receta seleccionada
        if (!formData.receta) {
          showSnackbar('Seleccione una receta', 'error');
          return;
        }
        if (!formData.responsable.trim()) {
          showSnackbar('Ingrese el nombre del responsable', 'error');
          return;
        }
        try {
          // Limpiar error de stock previo
          setErrorStock(null);
          // Mapear campos del frontend a los que espera el backend
          await ordenesProduccionAPI.crear({
            recetaId: formData.receta,
            cantidadAProducir: formData.cantidadPlanificada,
            responsable: formData.responsable,
            createdBy: user?.username || 'sistema',
            observaciones: formData.observaciones
          });
          showSnackbar('Orden creada correctamente', 'success');
        } catch (err: any) {
          const errorData = err.response?.data;
          // Si es error de stock insuficiente, mostrar alerta persistente
          if (errorData?.error && errorData.error.includes('Stock insuficiente')) {
            setErrorStock(errorData.error);
          }
          const mensaje = errorData?.mensaje || errorData?.message || errorData?.error || 'Error al crear orden';
          showSnackbar(mensaje, 'error');
          return;
        }
      } else {
        // Crear órdenes desde pedidos seleccionados
        if (ventasParaOrden.length === 0) {
          showSnackbar('Seleccione al menos un pedido', 'error');
          return;
        }
        
        // Verificar si hay productos sin receta
        if (validacionProduccion.productsSinReceta.length > 0) {
          showSnackbar(`No se puede crear: ${validacionProduccion.productsSinReceta.length} producto(s) sin receta`, 'error');
          return;
        }
        
        // Agrupar productos de las ventas seleccionadas
        const ventasSeleccionadas = ventasDialogList.filter(v => ventasParaOrden.includes(v._id));
        const productosAgrupados = new Map<string, { recetaId: string; cantidad: number; ventas: string[] }>();
        
        // Buscar la receta correspondiente a cada producto
        ventasSeleccionadas.forEach(venta => {
          venta.itemsParaProducir.forEach(item => {
            const receta = recetas.find(r => 
              r.productoId?._id === item.productoId ||
              r.productoTerminado?._id === item.productoId || 
              r.nombreProducto === item.nombreProducto ||
              r.nombre === item.nombreProducto
            );
            if (receta) {
              const existing = productosAgrupados.get(receta._id);
              if (existing) {
                existing.cantidad += item.cantidad;
                if (!existing.ventas.includes(venta._id)) {
                  existing.ventas.push(venta._id);
                }
              } else {
                productosAgrupados.set(receta._id, {
                  recetaId: receta._id,
                  cantidad: item.cantidad,
                  ventas: [venta._id]
                });
              }
            }
          });
        });
        
        // Verificar si hay productos sin receta que no fueron agrupados
        const productosConReceta = new Set<string>();
        productosAgrupados.forEach((_, recetaId) => {
          const receta = recetas.find(r => r._id === recetaId);
          if (receta?.productoId?._id) {
            productosConReceta.add(receta.productoId._id);
          }
        });
        
        // Crear una orden por cada producto/receta
        let ordenesCreadas = 0;
        const errores: string[] = [];
        for (const [recetaId, data] of productosAgrupados) {
          try {
            await ordenesProduccionAPI.crear({
              recetaId: recetaId,
              cantidadAProducir: data.cantidad,
              responsable: formData.responsable || 'Sin asignar',
              createdBy: user?.username || 'sistema',
              observaciones: `Creada desde pedidos: ${data.ventas.length} venta(s). ${formData.observaciones}`.trim(),
            });
            ordenesCreadas++;
          } catch (err: any) {
            const errorData = err.response?.data;
            const mensaje = errorData?.mensaje || errorData?.message || errorData?.error || 'Error desconocido';
            errores.push(mensaje);
            // Si es error de stock insuficiente, mostrar alerta persistente
            if (errorData?.error && errorData.error.includes('Stock insuficiente')) {
              setErrorStock(errorData.error);
            }
            console.error('Error creando orden para receta:', recetaId, err);
          }
        }
        
        if (ordenesCreadas > 0) {
          showSnackbar(`${ordenesCreadas} orden(es) creada(s) correctamente`, 'success');
          handleCloseDialog();
          cargarDatos();
        } else {
          // Si hay error de stock, ya se muestra en el alert persistente
          if (!errorStock) {
            showSnackbar(errores[0] || 'No se pudieron crear órdenes. Verifique que los productos tengan recetas.', 'error');
          }
          return;
        }
      }
      
      if (modoCreacion === 'manual') {
        handleCloseDialog();
        cargarDatos();
      }
    } catch (error: any) {
      showSnackbar(error.response?.data?.message || 'Error al guardar orden', 'error');
    }
  };

  // Función para validar producción desde pedidos
  const validarProduccionDesdePedidos = async () => {
    if (ventasParaOrden.length === 0) return;
    
    setValidacionProduccion(prev => ({ ...prev, validando: true }));
    
    try {
      const ventasSeleccionadas = ventasDialogList.filter(v => ventasParaOrden.includes(v._id));
      
      // Agrupar productos por ID
      const productosAgrupados = new Map<string, { 
        productoId: string;
        nombreProducto: string; 
        cantidad: number;
        receta?: Receta;
      }>();
      
      ventasSeleccionadas.forEach(venta => {
        venta.itemsParaProducir.forEach(item => {
          const existing = productosAgrupados.get(item.productoId);
          if (existing) {
            existing.cantidad += item.cantidad;
          } else {
            // Buscar receta
            const receta = recetas.find(r => 
              r.productoId?._id === item.productoId ||
              r.productoTerminado?._id === item.productoId || 
              r.nombreProducto === item.nombreProducto ||
              r.nombre === item.nombreProducto
            );
            productosAgrupados.set(item.productoId, {
              productoId: item.productoId,
              nombreProducto: item.nombreProducto,
              cantidad: item.cantidad,
              receta
            });
          }
        });
      });
      
      const resultado: typeof validacionProduccion.resultado = [];
      const productsSinReceta: string[] = [];
      
      // Validar cada producto
      for (const [productoId, data] of productosAgrupados) {
        if (!data.receta) {
          productsSinReceta.push(data.nombreProducto);
          resultado.push({
            productoId,
            nombreProducto: data.nombreProducto,
            cantidad: data.cantidad,
            tieneReceta: false,
            factible: false,
            materiasInsuficientes: []
          });
        } else {
          // Simular producción para verificar materias primas
          try {
            const simulacion = await recetasAPI.simularProduccion({
              recetaId: data.receta._id,
              cantidadAProducir: data.cantidad
            });
            
            const materiasInsuficientes = simulacion.materiasPrimas
              ?.filter((m: any) => !m.disponible)
              .map((m: any) => ({
                nombre: m.nombre,
                necesaria: m.cantidadNecesaria,
                disponible: m.stockDisponible
              })) || [];
            
            resultado.push({
              productoId,
              nombreProducto: data.nombreProducto,
              cantidad: data.cantidad,
              tieneReceta: true,
              recetaId: data.receta._id,
              factible: simulacion.factible,
              materiasInsuficientes
            });
          } catch (err) {
            console.error('Error simulando producción:', err);
            resultado.push({
              productoId,
              nombreProducto: data.nombreProducto,
              cantidad: data.cantidad,
              tieneReceta: true,
              recetaId: data.receta._id,
              factible: false,
              materiasInsuficientes: [{ nombre: 'Error al verificar', necesaria: 0, disponible: 0 }]
            });
          }
        }
      }
      
      setValidacionProduccion({
        validando: false,
        resultado,
        productsSinReceta
      });
    } catch (error) {
      console.error('Error en validación:', error);
      setValidacionProduccion(prev => ({ ...prev, validando: false }));
    }
  };

  // Ejecutar validación cuando cambian las ventas seleccionadas
  useEffect(() => {
    if (modoCreacion === 'pedido' && ventasParaOrden.length > 0) {
      const timeoutId = setTimeout(() => {
        validarProduccionDesdePedidos();
      }, 500); // Debounce de 500ms
      return () => clearTimeout(timeoutId);
    } else {
      setValidacionProduccion({ validando: false, resultado: [], productsSinReceta: [] });
    }
  }, [ventasParaOrden, modoCreacion]);

  const handleToggleVentaParaOrden = (ventaId: string) => {
    setVentasParaOrden(prev => 
      prev.includes(ventaId) 
        ? prev.filter(id => id !== ventaId) 
        : [...prev, ventaId]
    );
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Esta seguro de eliminar esta orden?')) {
      try {
        await ordenesProduccionAPI.cancelar(id, 'Cancelada por el usuario');
        showSnackbar('Orden cancelada correctamente', 'success');
        cargarDatos();
      } catch (error: any) {
        showSnackbar(error.response?.data?.message || 'Error al cancelar orden', 'error');
      }
    }
  };

  const handleCambiarEstado = async (id: string, nuevoEstado: string) => {
    try {
      if (nuevoEstado === 'en_proceso') {
        await ordenesProduccionAPI.iniciar(id);
        showSnackbar('Orden iniciada correctamente', 'success');
        cargarDatos();
      } else if (nuevoEstado === 'cancelada') {
        await ordenesProduccionAPI.cancelar(id, 'Cancelada por el usuario');
        showSnackbar('Orden cancelada correctamente', 'success');
        cargarDatos();
      }
      // Para 'completada' se maneja con el dialog
    } catch (error: any) {
      showSnackbar(error.response?.data?.mensaje || error.response?.data?.message || 'Error al cambiar estado', 'error');
    }
  };

  // Abrir dialog para completar orden
  const handleOpenCompletarDialog = (orden: OrdenProduccion) => {
    setOrdenACompletar(orden);
    setCantidadProducida(orden.cantidadAProducir ?? orden.cantidadPlanificada ?? 0);
    setOpenCompletarDialog(true);
  };

  // Cerrar dialog de completar
  const handleCloseCompletarDialog = () => {
    setOpenCompletarDialog(false);
    setOrdenACompletar(null);
    setCantidadProducida(0);
  };

  // Confirmar completar orden
  const handleConfirmarCompletar = async () => {
    if (!ordenACompletar) return;
    
    try {
      await ordenesProduccionAPI.completar(ordenACompletar._id, { 
        unidadesProducidas: cantidadProducida, 
        completadoPor: user?.username || 'usuario' 
      });
      showSnackbar('Orden completada correctamente', 'success');
      handleCloseCompletarDialog();
      cargarDatos();
    } catch (error: any) {
      showSnackbar(error.response?.data?.mensaje || error.response?.data?.message || 'Error al completar orden', 'error');
    }
  };

  const getEstadoChip = (estado: string) => {
    const config: Record<string, { color: 'default' | 'primary' | 'success' | 'error' | 'warning'; label: string }> = {
      pendiente: { color: 'warning', label: 'Pendiente' },
      planificada: { color: 'warning', label: 'Planificada' },
      en_proceso: { color: 'primary', label: 'En Proceso' },
      completada: { color: 'success', label: 'Completada' },
      cancelada: { color: 'error', label: 'Cancelada' },
    };
    const cfg = config[estado] || { color: 'default', label: estado };
    return <Chip size="small" color={cfg.color} label={cfg.label} />;
  };

  const handleSelectVenta = (ventaId: string) => {
    setSelectedVentas((prev) =>
      prev.includes(ventaId) ? prev.filter((id) => id !== ventaId) : [...prev, ventaId]
    );
  };

  const handleSelectAllVentas = () => {
    if (selectedVentas.length === ventasPendientes.length) {
      setSelectedVentas([]);
    } else {
      setSelectedVentas(ventasPendientes.map((v) => v._id));
    }
  };

  const handleToggleExpand = (ventaId: string) => {
    setExpandedVentas((prev) =>
      prev.includes(ventaId) ? prev.filter((id) => id !== ventaId) : [...prev, ventaId]
    );
  };

  const handleImprimirNotaPedido = () => {
    const ventas = ventasPendientes.filter((v) => selectedVentas.includes(v._id));
    if (ventas.length === 0) {
      showSnackbar('Seleccione al menos una venta para imprimir', 'error');
      return;
    }
    
    // Transformar datos para el componente NotaPedidoProduccion
    const productosMap = new Map<string, {
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
    }>();

    ventas.forEach((venta) => {
      venta.itemsParaProducir.forEach((item) => {
        const key = item.productoId;
        const existing = productosMap.get(key);
        if (existing) {
          existing.cantidadTotal += item.cantidad;
          existing.ventas.push({
            ventaId: venta._id,
            numeroVenta: venta.numeroVenta,
            cantidad: item.cantidad,
            cliente: venta.nombreCliente || 'Sin cliente',
            fecha: venta.fecha,
          });
        } else {
          productosMap.set(key, {
            productoId: item.productoId,
            codigoProducto: item.codigoProducto || item.productoId.slice(-6),
            nombreProducto: item.nombreProducto,
            cantidadTotal: item.cantidad,
            ventas: [{
              ventaId: venta._id,
              numeroVenta: venta.numeroVenta,
              cantidad: item.cantidad,
              cliente: venta.nombreCliente || 'Sin cliente',
              fecha: venta.fecha,
            }],
          });
        }
      });
    });

    setResumenParaImprimir(Array.from(productosMap.values()));
    setTimeout(() => {
      handlePrint();
    }, 100);
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatearMoneda = (valor: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(valor);
  };

  const getResumenProductos = () => {
    const ventasSeleccionadas = ventasPendientes.filter((v) => selectedVentas.includes(v._id));
    const productosMap = new Map<string, { nombre: string; cantidad: number }>();

    ventasSeleccionadas.forEach((venta) => {
      venta.itemsParaProducir.forEach((item) => {
        const key = item.productoId;
        const existing = productosMap.get(key);
        if (existing) {
          existing.cantidad += item.cantidad;
        } else {
          productosMap.set(key, {
            nombre: item.nombreProducto,
            cantidad: item.cantidad,
          });
        }
      });
    });

    return Array.from(productosMap.values());
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AssignmentIcon fontSize="large" />
        Produccion
      </Typography>

      <Paper sx={{ mt: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="tabs produccion">
          <Tab
            icon={<AssignmentIcon />}
            iconPosition="start"
            label="Ordenes de Produccion"
            id="produccion-tab-0"
            aria-controls="produccion-tabpanel-0"
          />
          <Tab
            icon={<FactCheckIcon />}
            iconPosition="start"
            label="Pedidos para Produccion"
            id="produccion-tab-1"
            aria-controls="produccion-tabpanel-1"
          />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ px: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
                Nueva Orden
              </Button>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>N° Orden</TableCell>
                    <TableCell>Producto</TableCell>
                    <TableCell align="center">Cantidad Plan.</TableCell>
                    <TableCell align="center">Producidas</TableCell>
                    <TableCell align="center">Estado</TableCell>
                    <TableCell>Responsable</TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell align="center">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ordenes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        No hay ordenes de produccion
                      </TableCell>
                    </TableRow>
                  ) : (
                    ordenes.map((orden) => (
                      <TableRow key={orden._id}>
                        <TableCell>{orden.numeroOrden || orden.numero || '-'}</TableCell>
                        <TableCell>{orden.nombreProducto || orden.productoId?.nombre || orden.receta?.productoId?.nombre || orden.receta?.nombreProducto || 'N/A'}</TableCell>
                        <TableCell align="center">{orden.cantidadAProducir ?? orden.cantidadPlanificada ?? 0}</TableCell>
                        <TableCell align="center">{orden.unidadesProducidas ?? orden.cantidadProducida ?? 0}</TableCell>
                        <TableCell align="center">{getEstadoChip(orden.estado)}</TableCell>
                        <TableCell>{orden.responsable || '-'}</TableCell>
                        <TableCell>{formatearFecha(orden.fechaCreacion || orden.fecha)}</TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                            {(orden.estado === 'pendiente' || orden.estado === 'planificada') && (
                              <>
                                <Tooltip title="Iniciar">
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => handleCambiarEstado(orden._id, 'en_proceso')}
                                  >
                                    <PlayIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Editar">
                                  <IconButton size="small" onClick={() => handleOpenDialog(orden)}>
                                    <EditIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Cancelar">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleDelete(orden._id)}
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                            {orden.estado === 'en_proceso' && (
                              <>
                                <Tooltip title="Completar">
                                  <IconButton
                                    size="small"
                                    color="success"
                                    onClick={() => handleOpenCompletarDialog(orden)}
                                  >
                                    <CheckIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Cancelar">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleCambiarEstado(orden._id, 'cancelada')}
                                  >
                                    <StopIcon />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ px: 2 }}>
            {loadingVentas ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1">
                    Ventas confirmadas con productos para producir: {ventasPendientes.length}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      startIcon={<PrintIcon />}
                      onClick={handleImprimirNotaPedido}
                      disabled={selectedVentas.length === 0}
                    >
                      Imprimir Nota de Pedido ({selectedVentas.length})
                    </Button>
                  </Box>
                </Box>

                {selectedVentas.length > 0 && (
                  <Card sx={{ mb: 2, bgcolor: 'primary.50' }}>
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        Resumen de productos a producir:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {getResumenProductos().map((prod, idx) => (
                          <Chip
                            key={idx}
                            label={`${prod.nombre}: ${prod.cantidad}`}
                            color="primary"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                )}

                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox">
                          <Checkbox
                            indeterminate={
                              selectedVentas.length > 0 && selectedVentas.length < ventasPendientes.length
                            }
                            checked={
                              ventasPendientes.length > 0 && selectedVentas.length === ventasPendientes.length
                            }
                            onChange={handleSelectAllVentas}
                          />
                        </TableCell>
                        <TableCell>No Venta</TableCell>
                        <TableCell>Cliente</TableCell>
                        <TableCell>Fecha</TableCell>
                        <TableCell align="right">Total</TableCell>
                        <TableCell>Productos</TableCell>
                        <TableCell align="center">Detalle</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {ventasPendientes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center">
                            No hay ventas confirmadas pendientes de produccion
                          </TableCell>
                        </TableRow>
                      ) : (
                        ventasPendientes.map((venta) => (
                          <React.Fragment key={venta._id}>
                            <TableRow hover>
                              <TableCell padding="checkbox">
                                <Checkbox
                                  checked={selectedVentas.includes(venta._id)}
                                  onChange={() => handleSelectVenta(venta._id)}
                                />
                              </TableCell>
                              <TableCell>{venta.numeroVenta}</TableCell>
                              <TableCell>{venta.nombreCliente || 'Sin cliente'}</TableCell>
                              <TableCell>{formatearFecha(venta.fecha)}</TableCell>
                              <TableCell align="right">{formatearMoneda(venta.total)}</TableCell>
                              <TableCell>
                                {venta.itemsParaProducir
                                  .map((item) => item.nombreProducto)
                                  .join(', ')}
                              </TableCell>
                              <TableCell align="center">
                                <IconButton
                                  size="small"
                                  onClick={() => handleToggleExpand(venta._id)}
                                >
                                  {expandedVentas.includes(venta._id) ? (
                                    <ExpandLessIcon />
                                  ) : (
                                    <ExpandMoreIcon />
                                  )}
                                </IconButton>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
                                <Collapse in={expandedVentas.includes(venta._id)} timeout="auto" unmountOnExit>
                                  <Box sx={{ margin: 2 }}>
                                    <Typography variant="subtitle2" gutterBottom>
                                      Detalle de productos a producir:
                                    </Typography>
                                    <Table size="small">
                                      <TableHead>
                                        <TableRow>
                                          <TableCell>Codigo</TableCell>
                                          <TableCell>Producto</TableCell>
                                          <TableCell align="right">Cantidad</TableCell>
                                          <TableCell align="right">Precio Unit.</TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {venta.itemsParaProducir.map((item, idx) => (
                                          <TableRow key={idx}>
                                            <TableCell>{item.codigoProducto}</TableCell>
                                            <TableCell>{item.nombreProducto}</TableCell>
                                            <TableCell align="right">{item.cantidad}</TableCell>
                                            <TableCell align="right">
                                              {formatearMoneda(item.precioUnitario)}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </Box>
                                </Collapse>
                              </TableCell>
                            </TableRow>
                          </React.Fragment>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </Box>
        </TabPanel>
      </Paper>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingOrden ? 'Editar Orden de Produccion' : 'Nueva Orden de Produccion'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {!editingOrden && (
              <>
                <FormControl component="fieldset">
                  <FormLabel component="legend">Modo de creacion</FormLabel>
                  <RadioGroup
                    row
                    value={modoCreacion}
                    onChange={(e) => setModoCreacion(e.target.value as 'manual' | 'pedido')}
                  >
                    <FormControlLabel 
                      value="manual" 
                      control={<Radio />} 
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <BuildIcon fontSize="small" />
                          Manual (seleccionar receta)
                        </Box>
                      }
                    />
                    <FormControlLabel 
                      value="pedido" 
                      control={<Radio />} 
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <ShoppingCartIcon fontSize="small" />
                          Desde pedidos de venta
                        </Box>
                      }
                    />
                  </RadioGroup>
                </FormControl>
                <Divider />
              </>
            )}

            {modoCreacion === 'manual' ? (
              <>
                <FormControl fullWidth>
                  <InputLabel>Receta / Producto</InputLabel>
                  <Select
                    value={formData.receta}
                    label="Receta / Producto"
                    onChange={(e) => setFormData({ ...formData, receta: e.target.value })}
                  >
                    {recetas.map((receta) => (
                      <MenuItem key={receta._id} value={receta._id}>
                        {receta.productoId?.nombre || receta.nombreProducto || receta.productoTerminado?.nombre || receta.nombre}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Cantidad a Producir"
                  type="number"
                  value={formData.cantidadPlanificada}
                  onChange={(e) =>
                    setFormData({ ...formData, cantidadPlanificada: parseInt(e.target.value) || 1 })
                  }
                  inputProps={{ min: 1 }}
                  fullWidth
                />

                <TextField
                  label="Responsable"
                  value={formData.responsable}
                  onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                  fullWidth
                  required
                  placeholder="Nombre del operario responsable"
                />

                {/* Alerta persistente de stock insuficiente */}
                {errorStock && (
                  <Alert 
                    severity="error" 
                    onClose={() => setErrorStock(null)}
                    sx={{ mt: 1 }}
                  >
                    <Typography variant="subtitle2" fontWeight="bold">
                      No se puede crear la orden
                    </Typography>
                    <Typography variant="body2">
                      {errorStock}
                    </Typography>
                  </Alert>
                )}
              </>
            ) : (
              <>
                <Typography variant="subtitle2" color="textSecondary">
                  Seleccione los pedidos de venta para crear ordenes de produccion:
                </Typography>
                
                {loadingVentasDialog ? (
                  <Box display="flex" justifyContent="center" py={2}>
                    <CircularProgress size={24} />
                  </Box>
                ) : ventasDialogList.length === 0 ? (
                  <Alert severity="info">
                    No hay ventas confirmadas pendientes de produccion
                  </Alert>
                ) : (
                  <Box sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid #ddd', borderRadius: 1 }}>
                    <List dense>
                      {ventasDialogList.map((venta) => (
                        <ListItem
                          key={venta._id}
                          dense
                          button
                          onClick={() => handleToggleVentaParaOrden(venta._id)}
                          sx={{ 
                            bgcolor: ventasParaOrden.includes(venta._id) ? 'action.selected' : 'transparent'
                          }}
                        >
                          <ListItemIcon>
                            <Checkbox
                              edge="start"
                              checked={ventasParaOrden.includes(venta._id)}
                              tabIndex={-1}
                              disableRipple
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" fontWeight="bold">
                                  Venta #{venta.numeroVenta}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                  {formatearFecha(venta.fecha)}
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <Box>
                                <Typography variant="caption" display="block">
                                  Cliente: {venta.nombreCliente}
                                </Typography>
                                <Typography variant="caption" color="primary">
                                  Productos: {venta.itemsParaProducir.map(i => `${i.nombreProducto} (${i.cantidad})`).join(', ')}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
                
                {ventasParaOrden.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Alert severity="info" sx={{ mb: 1 }}>
                      {ventasParaOrden.length} pedido(s) seleccionado(s). Se crearán órdenes agrupadas por producto.
                    </Alert>
                    
                    {/* Indicador de validación en progreso */}
                    {validacionProduccion.validando && (
                      <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                        <CircularProgress size={16} />
                        <Typography variant="body2" color="textSecondary">
                          Validando disponibilidad de materias primas...
                        </Typography>
                      </Box>
                    )}

                    {/* Productos sin receta */}
                    {validacionProduccion.productsSinReceta.length > 0 && (
                      <Alert severity="error" sx={{ mb: 1 }}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          Productos sin receta definida:
                        </Typography>
                        {validacionProduccion.productsSinReceta.map((nombre, idx) => (
                          <Typography key={idx} variant="caption" display="block" sx={{ ml: 1 }}>
                            • {nombre}
                          </Typography>
                        ))}
                        <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                          Debe crear recetas para estos productos antes de generar órdenes de producción.
                        </Typography>
                      </Alert>
                    )}

                    {/* Resultados de validación de materias primas */}
                    {validacionProduccion.resultado.length > 0 && !validacionProduccion.validando && (
                      <Box>
                        {validacionProduccion.resultado.every(v => v.factible) && validacionProduccion.productsSinReceta.length === 0 ? (
                          <Alert severity="success" sx={{ mb: 1 }}>
                            ✓ Todos los productos tienen recetas y materias primas suficientes
                          </Alert>
                        ) : (
                          <>
                            {/* Productos con materias primas insuficientes */}
                            {validacionProduccion.resultado.filter(v => !v.factible && v.tieneReceta).map((resultado, idx) => (
                              <Alert key={idx} severity="warning" sx={{ mb: 1 }}>
                                <Typography variant="subtitle2" fontWeight="bold">
                                  {resultado.nombreProducto} (Cant: {resultado.cantidad}) - Stock insuficiente
                                </Typography>
                                {resultado.materiasInsuficientes.map((mp, mpIdx) => (
                                  <Typography key={mpIdx} variant="caption" display="block" sx={{ ml: 1 }}>
                                    • {mp.nombre}: Necesita {mp.necesaria}, Disponible: {mp.disponible}
                                  </Typography>
                                ))}
                              </Alert>
                            ))}
                            
                            {/* Productos con materias primas suficientes */}
                            {validacionProduccion.resultado.filter(v => v.factible).length > 0 && (
                              <Alert severity="success" sx={{ mb: 1 }}>
                                ✓ {validacionProduccion.resultado.filter(v => v.factible).length} producto(s) con materias primas suficientes
                              </Alert>
                            )}
                          </>
                        )}
                      </Box>
                    )}
                  </Box>
                )}

                {/* Alerta persistente de stock insuficiente (modo pedidos) */}
                {errorStock && (
                  <Alert 
                    severity="error" 
                    onClose={() => setErrorStock(null)}
                    sx={{ mt: 1 }}
                  >
                    <Typography variant="subtitle2" fontWeight="bold">
                      No se puede crear la orden
                    </Typography>
                    <Typography variant="body2">
                      {errorStock}
                    </Typography>
                  </Alert>
                )}
              </>
            )}

            {/* Campo responsable (solo para modo pedidos, en manual ya está arriba) */}
            {modoCreacion === 'pedido' && (
              <TextField
                label="Responsable"
                value={formData.responsable}
                onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                fullWidth
                placeholder="Nombre del operario responsable (opcional)"
              />
            )}

            <TextField
              label="Observaciones"
              multiline
              rows={2}
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button 
            variant="contained" 
            onClick={handleSubmit} 
            disabled={
              modoCreacion === 'manual' 
                ? !formData.receta 
                : ventasParaOrden.length === 0 || 
                  validacionProduccion.validando || 
                  validacionProduccion.productsSinReceta.length > 0
            }
          >
            {editingOrden ? 'Guardar' : 'Crear Orden(es)'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para completar orden */}
      <Dialog open={openCompletarDialog} onClose={handleCloseCompletarDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Completar Orden de Producción</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {ordenACompletar && (
              <>
                <Alert severity="info">
                  <Typography variant="subtitle2">
                    Orden: {ordenACompletar.numeroOrden}
                  </Typography>
                  <Typography variant="body2">
                    Producto: {ordenACompletar.nombreProducto || ordenACompletar.productoId?.nombre}
                  </Typography>
                  <Typography variant="body2">
                    Cantidad planificada: {ordenACompletar.cantidadAProducir ?? ordenACompletar.cantidadPlanificada}
                  </Typography>
                </Alert>
                
                <TextField
                  label="Cantidad Producida"
                  type="number"
                  value={cantidadProducida}
                  onChange={(e) => setCantidadProducida(parseInt(e.target.value) || 0)}
                  inputProps={{ min: 0 }}
                  fullWidth
                  autoFocus
                  helperText="Ingrese la cantidad real que fue producida"
                />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCompletarDialog}>Cancelar</Button>
          <Button 
            variant="contained" 
            color="success"
            onClick={handleConfirmarCompletar}
            disabled={cantidadProducida < 0}
          >
            Confirmar Producción
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Box sx={{ display: 'none' }}>
        <NotaPedidoProduccion 
          ref={notaPedidoRef} 
          tipo="agrupado" 
          resumenProductos={resumenParaImprimir} 
        />
      </Box>
    </Box>
  );
};

export default OrdenesProduccionPage;
