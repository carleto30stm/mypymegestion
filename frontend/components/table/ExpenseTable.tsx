import React, { useEffect, useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../redux/store';
import { Gasto } from '../../types';
import { deleteGasto, confirmarCheque, cancelGasto, reactivateGasto, fetchGastos } from '../../redux/slices/gastosSlice';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { 
  Box, 
  Paper, 
  Typography, 
  Dialog, 
  DialogTitle, 
  DialogContent,
  DialogActions,
  Button,
  Chip,
  TextField,
  InputAdornment,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RestoreIcon from '@mui/icons-material/Restore';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import LockIcon from '@mui/icons-material/Lock';
import InfoIcon from '@mui/icons-material/Info';
import ExpenseForm from '../form/ExpenseForm';
import { formatDate, formatCurrencyWithSymbol } from '../../utils/formatters';
import { useAuthDebug } from '../../hooks/useAuthDebug';

interface ExpenseTableProps {
    isModalOpen: boolean;
    setIsModalOpen: (isOpen: boolean) => void;
    filterType: 'today' | 'month' | 'quarter' | 'semester' | 'year' | 'total';
    selectedMonth: string;
    selectedQuarter: string;
    selectedSemester: string;
    selectedYear: string;
    availableMonths: Array<{ value: string; label: string }>;
}

const ExpenseTable: React.FC<ExpenseTableProps> = ({ 
  isModalOpen, 
  setIsModalOpen, 
  filterType, 
  selectedMonth,
  selectedQuarter,
  selectedSemester,
  selectedYear
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: gastos, status, lastUpdated } = useSelector((state: RootState) => state.gastos);
  const { user } = useSelector((state: RootState) => state.auth);
  const authDebug = useAuthDebug();
  
  // Estados de modales
  const [gastoToEdit, setGastoToEdit] = useState<Gasto | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [gastoToDelete, setGastoToDelete] = useState<Gasto | null>(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [gastoToCancel, setGastoToCancel] = useState<Gasto | null>(null);
  const [comentarioCancelacion, setComentarioCancelacion] = useState('');
  const [reactivateConfirmOpen, setReactivateConfirmOpen] = useState(false);
  const [gastoToReactivate, setGastoToReactivate] = useState<Gasto | null>(null);
  const [comentarioReactivacion, setComentarioReactivacion] = useState('');
  // Estado para modal de gasto bloqueado
  const [blockedDialogOpen, setBlockedDialogOpen] = useState(false);
  const [blockedGasto, setBlockedGasto] = useState<Gasto | null>(null);
  
  // Estados de filtros locales
  const [searchText, setSearchText] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<'todos' | 'activos' | 'cancelados' | 'pendientes'>('activos');
  const [tipoOperacionFilter, setTipoOperacionFilter] = useState<'todos' | 'entrada' | 'salida' | 'transferencia'>('todos');

  useEffect(() => {
     dispatch(fetchGastos({ todosPeriodos: true }));   
  }, [lastUpdated]);
  
  
  // Obtener fecha de hoy en formato YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];
  
  // Verificar permisos según el tipo de usuario
  const canEdit = user?.userType !== 'oper'; // admin y oper_ad pueden editar
  const canDelete = user?.userType === 'admin'; // solo admin puede eliminar
  const canCancel = user?.userType === 'oper_ad'; // solo oper_ad puede cancelar
  const showActions = user?.userType !== 'oper'; // oper no ve la columna de acciones
  
  // Log de debug para permisos de usuario - solo en desarrollo
  if (process.env.NODE_ENV === 'development') {
    console.log('👤 [USER PERMISSIONS DEBUG] Usuario actual:', {
      username: user?.username,
      userType: user?.userType,
      permissions: {
        canEdit,
        canDelete, 
        canCancel,
        showActions
      }
    });
    
    // También usar el hook de debug
    authDebug.logCurrentUser();
  }
  

  const handleEditClick = (gasto: Gasto) => {
    // Verificar si el gasto está vinculado a un recibo (bloqueado)
    if (gasto.reciboRelacionadoId) {
      setBlockedGasto(gasto);
      setBlockedDialogOpen(true);
      return;
    }
    setGastoToEdit(gasto);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (gasto: Gasto) => {
    setGastoToDelete(gasto);
    setDeleteConfirmOpen(true);
  };

  const handleCancelClick = (gasto: Gasto) => {
    setGastoToCancel(gasto);
    setComentarioCancelacion(''); // Limpiar comentario anterior
    setCancelConfirmOpen(true);
  };

  const handleReactivateClick = (gasto: Gasto) => {
    setGastoToReactivate(gasto);
    setComentarioReactivacion(''); // Limpiar comentario anterior
    setReactivateConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (gastoToDelete) {
      dispatch(deleteGasto(gastoToDelete._id as string));
      setDeleteConfirmOpen(false);
      setGastoToDelete(null);
    }
  };

  const handleConfirmCancel = () => {
    if (gastoToCancel && comentarioCancelacion.trim()) {
      // Agregar el comentario de cancelación al comentario existente
      const comentarioFinal = gastoToCancel.comentario 
        ? `${gastoToCancel.comentario} | CANCELADO: ${comentarioCancelacion.trim()}`
        : `CANCELADO: ${comentarioCancelacion.trim()}`;
      
      dispatch(cancelGasto({
        id: gastoToCancel._id as string,
        comentario: comentarioFinal
      }));
      setCancelConfirmOpen(false);
      setGastoToCancel(null);
      setComentarioCancelacion('');
    }
  };

  const handleConfirmReactivate = () => {
    if (gastoToReactivate && comentarioReactivacion.trim()) {
      // Agregar el comentario de reactivación al comentario existente
      const comentarioFinal = gastoToReactivate.comentario 
        ? `${gastoToReactivate.comentario} | REACTIVADO: ${comentarioReactivacion.trim()}`
        : `REACTIVADO: ${comentarioReactivacion.trim()}`;
      
      dispatch(reactivateGasto({
        id: gastoToReactivate._id as string,
        comentario: comentarioFinal
      }));
      setReactivateConfirmOpen(false);
      setGastoToReactivate(null);
      setComentarioReactivacion('');
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setGastoToDelete(null);
  };

  const handleCancelCancelAction = () => {
    setCancelConfirmOpen(false);
    setGastoToCancel(null);
    setComentarioCancelacion(''); // Limpiar comentario al cancelar
  };

  const handleCancelReactivateAction = () => {
    setReactivateConfirmOpen(false);
    setGastoToReactivate(null);
    setComentarioReactivacion(''); // Limpiar comentario al cancelar
  };

  const handleConfirmarCheque = (id: string) => {
    dispatch(confirmarCheque(id));
  };  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setGastoToEdit(null), 300); // Reset edit state after dialog closes
  }

  const columns: GridColDef[] = [
    { field: 'fecha', headerName: 'Fecha', width: 120,
      valueFormatter: (value: string) => {
        return formatDate(value);
      } },
    { field: 'rubro', headerName: 'Rubro', width: 150 },
    { field: 'subRubro', headerName: 'Sub-Rubro', width: 150 },
    { field: 'medioDePago', headerName: 'Medio de Pago', width: 140 },
    { 
      field: 'numeroCheque', 
      headerName: 'Nro. Cheque', 
      width: 120,
      renderCell: (params) => {
        const gasto = params.row as Gasto;
        // Solo mostrar si es un medio de pago con cheque
        if (gasto.medioDePago?.includes('CHEQUE') && gasto.numeroCheque) {
          return <Typography variant="body2" sx={{ fontWeight: 500 }}>{gasto.numeroCheque}</Typography>;
        }
        return <Typography variant="body2" color="text.disabled">-</Typography>;
      }
    },
    { field: 'clientes', headerName: 'Clientes', width: 160 },
    { field: 'detalleGastos', headerName: 'Detalle', flex: 1, minWidth: 200 },
    { field: 'comentario', headerName: 'Comentario', width: 200 },
    { field: 'fechaStandBy', headerName: 'Fecha StandBy', width: 140,
      valueFormatter: (value: string) => {
        return formatDate(value);
      } },
    { 
      field: 'statusStandBy', 
      headerName: 'Estado', 
      width: 120,
      renderCell: (params) => {
        const gasto = params.row as Gasto;
        
        // Verificar si está cancelado
        if (gasto.estado === 'cancelado') {
          return <Chip 
            icon={<CancelIcon />} 
            label="CANCELADO" 
            color="error" 
            size="small" 
            variant="filled"
          />;
        }
        
        // Mostrar indicador de bloqueo si está vinculado a un recibo
        if (gasto.reciboRelacionadoId) {
          return <Chip 
            icon={<LockIcon />} 
            label="BLOQUEADO" 
            color="warning" 
            size="small" 
            variant="filled"
            title="Este gasto está vinculado a un recibo y no puede editarse directamente"
          />;
        }
        
        // Para cheques, mostrar estado de confirmación
        if (gasto.medioDePago?.toUpperCase().includes('CHEQUE')) {
          if (gasto.confirmado) {
            return <Chip 
              icon={<CheckCircleIcon />} 
              label="CONFIRMADO" 
              color="success" 
              size="small" 
              variant="filled"
            />;
          } else {
            return <Chip 
              label="PENDIENTE" 
              color="warning" 
              size="small" 
              variant="outlined"
            />;
          }
        }
        
        // Para otros gastos, mantener la lógica de StandBy
        if (!gasto.fechaStandBy) {
          return <Chip label="ACTIVO" color="success" size="small" />;
        }
        
        const fechaStandBy = new Date(gasto.fechaStandBy).toISOString().split('T')[0];
        const isActive = fechaStandBy <= today;
        
        if (isActive) {
          return <Chip label="ACTIVO" color="success" size="small" />;
        } else {
          return <Chip label="STANDBY" color="warning" size="small" />;
        }
      }
    },
    { field: 'tipoOperacion', headerName: 'Tipo', width: 100,
      valueFormatter: (value: string) => {
        switch(value) {
          case 'entrada': return 'Entrada';
          case 'salida': return 'Salida';
          case 'transferencia': return 'Transfer.';
          default: return value;
        }
      } },
    { field: 'entrada', headerName: 'Entrada', type: 'number', width: 130,
      valueFormatter: (value: number, row: any) => {
        if (row.tipoOperacion === 'transferencia') return '';
        return typeof value === 'number' && value > 0 ? formatCurrencyWithSymbol(value) : '';
      } },
    { field: 'salida', headerName: 'Salida', type: 'number', width: 130,
      valueFormatter: (value: number, row: any) => {
        if (row.tipoOperacion === 'transferencia') return '';
        return typeof value === 'number' && value > 0 ? formatCurrencyWithSymbol(value) : '';
      } },
    { field: 'transferencia', headerName: 'Cuentas', width: 160,
      valueGetter: (value: any, row: any) => {
        if (row.tipoOperacion === 'transferencia') {
          return `${row.cuentaOrigen} → ${row.cuentaDestino}`;
        }
        return '';
      } },
    { field: 'montoTransferencia', headerName: 'Monto Transfer.', type: 'number', width: 130,
      valueFormatter: (value: number, row: any) => {
        if (row.tipoOperacion === 'transferencia' && typeof value === 'number' && value > 0) {
          return formatCurrencyWithSymbol(value);
        }
        return '';
      } },
    { field: 'banco', headerName: 'Banco', width: 120,
      valueGetter: (value: any, row: any) => {
        if (row.tipoOperacion === 'transferencia') return '';
        return value || '';
      } },
    // Nueva columna: Saldo por Caja/Banco (saldo resultante despues del movimiento)
    { field: 'saldo', headerName: 'Saldo', width: 140,
      renderCell: (params) => {
        const gasto = params.row as Gasto;
        const saldo = gastosConSaldoMap[gasto._id as string] ?? 0;
        const bancoDisplay = gasto.tipoOperacion === 'transferencia' ? (gasto.cuentaDestino || gasto.cuentaOrigen) : (gasto.banco || '');
        return (
          <Tooltip title={bancoDisplay ? `Caja: ${bancoDisplay}` : ''}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: saldo >= 0 ? 'success.main' : 'error.main' }}>
              {formatCurrencyWithSymbol(saldo)}
            </Typography>
          </Tooltip>
        );
      }
    },
  ];

  // Solo agregar columna de acciones si el usuario puede ver acciones
  if (showActions) {
    columns.push({
      field: 'actions',
      type: 'actions',
      headerName: 'Acciones',
      width: 120,
      cellClassName: 'actions',
      getActions: ({ row }) => {
        const gasto = row as Gasto;
        const actions: React.ReactElement[] = [];
        
        // Para gastos cancelados, solo mostrar botón de eliminar si es admin
        if (gasto.estado === 'cancelado') {
          if (canDelete) { // Solo admin puede eliminar y reactivar registros cancelados
            actions.push(
              <GridActionsCellItem
                key="reactivate"
                icon={<RestoreIcon />}
                label="Reactivar"
                onClick={() => handleReactivateClick(gasto)}
                color="success"
              />
            );
            actions.push(
              <GridActionsCellItem
                key="delete"
                icon={<DeleteIcon />}
                label="Eliminar"
                onClick={() => handleDeleteClick(gasto)}
                color="error"
              />
            );
          }
          return actions;
        }
        
        // Para gastos activos, mostrar todas las acciones según permisos
        // Botón de editar (admin y oper_ad)
        if (canEdit) {
          actions.push(
            <GridActionsCellItem
              key="edit"
              icon={<EditIcon />}
              label="Edit"
              className="textPrimary"
              onClick={() => handleEditClick(gasto)}
              color="inherit"
            />
          );
        }
        
        // Botón de confirmar cheque (solo para cheques pendientes)
        if (gasto.medioDePago?.toUpperCase().includes('CHEQUE') && !gasto.confirmado) {
          actions.push(
            <GridActionsCellItem
              key="confirm"
              icon={<CheckCircleIcon />}
              label="Confirmar Cheque"
              onClick={() => handleConfirmarCheque(gasto._id as string)}
              color="success"
            />
          );
        }
        
        // Botón de eliminar (solo admin)
        if (canDelete) {
          actions.push(
            <GridActionsCellItem
              key="delete"
              icon={<DeleteIcon />}
              label="Eliminar"
              onClick={() => handleDeleteClick(gasto)}
              color="error"
            />
          );
        }
        
        // Botón de cancelar (solo oper_ad)
        if (canCancel) {
          actions.push(
            <GridActionsCellItem
              key="cancel"
              icon={<CancelIcon />}
              label="Cancelar"
              onClick={() => handleCancelClick(gasto)}
              color="warning"
            />
          );
        }
        
        return actions;
      },
    });
  }

  // Calcular saldos acumulados por caja/banco y luego filtrar con useMemo para optimizar rendimiento
  const { gastosConSaldoMap, gastosFiltered } = useMemo(() => {
    // Copia de gastos ordenada ascendentemente para calcular corridas (más antiguo primero)
    const sortedAsc = [...gastos].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    // Mapa de saldos por banco (caja)
    const saldoPorBanco: Record<string, number> = {};
    // Mapa de saldo resultante por gasto id
    const saldoPorGasto: Record<string, number> = {};

    for (const g of sortedAsc) {
      // Determinar comportamiento según tipo de operación
      const tipo = g.tipoOperacion;

      // Helper para sumar/restar en una cuenta
      const addToBank = (bank: string | undefined, amount: number) => {
        if (!bank) return;
        saldoPorBanco[bank] = (saldoPorBanco[bank] || 0) + amount;
      };

      // Si es transferencia, restar de origen y sumar a destino
      if (tipo === 'transferencia') {
        const monto = Number(g.montoTransferencia) || 0;
        const origen = g.cuentaOrigen;
        const destino = g.cuentaDestino;
        if (monto) {
          if (origen) addToBank(origen, -monto);
          if (destino) addToBank(destino, monto);
        }
        // Mostrar saldo de la cuenta destino si existe, sino origen
        const keyView = destino || origen || '';
        saldoPorGasto[g._id as string] = keyView ? (saldoPorBanco[keyView] || 0) : 0;
        continue;
      }

      // Para cheques no confirmados: NO impactan el saldo de caja todavía
      const isCheque = g.medioDePago?.toUpperCase().includes('CHEQUE');
      const incluirCheque = !isCheque || !!g.confirmado;

      const bank = g.banco;
      if (tipo === 'entrada' && incluirCheque) {
        addToBank(bank, Number(g.entrada) || 0);
      } else if (tipo === 'salida' && incluirCheque) {
        addToBank(bank, -(Number(g.salida) || 0));
      }

      // Registrar saldo actual para este gasto usando la cuenta asociada
      const keyView = bank || '';
      saldoPorGasto[g._id as string] = keyView ? (saldoPorBanco[keyView] || 0) : 0;
    }

    // Ahora aplicar filtros sobre la lista completa (misma lógica que antes)
    let filtered = [...gastos];

    // Filtrar por estado
    if (estadoFilter === 'activos') {
      filtered = filtered.filter(g => g.estado !== 'cancelado');
    } else if (estadoFilter === 'cancelados') {
      filtered = filtered.filter(g => g.estado === 'cancelado');
    } else if (estadoFilter === 'pendientes') {
      filtered = filtered.filter(g => g.confirmado === false || g.estadoCheque === 'recibido');
    }

    // Filtrar por tipo de operación
    if (tipoOperacionFilter !== 'todos') {
      filtered = filtered.filter(g => g.tipoOperacion === tipoOperacionFilter);
    }

    // Búsqueda por texto en múltiples campos
    if (searchText.trim()) {
      const search = searchText.toLowerCase().trim();
      filtered = filtered.filter(g => {
        const rubro = g.rubro?.toLowerCase() || '';
        const subRubro = g.subRubro?.toLowerCase() || '';
        const detalleGastos = g.detalleGastos?.toLowerCase() || '';
        const clientes = g.clientes?.toLowerCase() || '';
        const banco = g.banco?.toLowerCase() || '';
        const numeroCheque = g.numeroCheque?.toLowerCase() || '';
        const comentario = g.comentario?.toLowerCase() || '';
        
        return (
          rubro.includes(search) ||
          subRubro.includes(search) ||
          detalleGastos.includes(search) ||
          clientes.includes(search) ||
          banco.includes(search) ||
          numeroCheque.includes(search) ||
          comentario.includes(search)
        );
      });
    }

    // Ordenar por fecha descendente (más reciente primero)
    filtered.sort((a, b) => {
      const dateA = new Date(a.fecha).getTime();
      const dateB = new Date(b.fecha).getTime();
      return dateB - dateA; // DESC
    });

    return {
      gastosConSaldoMap: saldoPorGasto,
      gastosFiltered: filtered
    };
  }, [gastos, estadoFilter, tipoOperacionFilter, searchText]);

  return (
    <Paper sx={{ height: 'calc(100vh - 280px)', width: '100%' }}>
        <Box sx={{p: 2, borderBottom: '1px solid #ddd' }}>
            <Typography variant="h5" component="h2" gutterBottom>
                Dashboard de Gastos
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              El campo <strong>Saldo</strong> muestra el saldo acumulado por caja después de cada movimiento (los cheques no confirmados no afectan el saldo).
            </Typography>
            
            {/* Filtros rápidos */}
            <Stack spacing={2} sx={{ mb: 2 }}>
              {/* Búsqueda por texto */}
              <TextField
                size="small"
                placeholder="Buscar gastos..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                helperText="🔍 Busca en: Rubro, Sub-Rubro, Detalle, Cliente, Banco/Cuenta, Nro. Cheque, Comentario"
                sx={{ maxWidth: 500 }}
              />

              {/* Filtros de estado y tipo */}
              <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                    <FilterListIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                    Estado:
                  </Typography>
                  <ToggleButtonGroup
                    value={estadoFilter}
                    exclusive
                    onChange={(e, newValue) => newValue && setEstadoFilter(newValue)}
                    size="small"
                  >
                    <ToggleButton value="todos">Todos</ToggleButton>
                    <ToggleButton value="activos">Activos</ToggleButton>
                    <ToggleButton value="cancelados">Cancelados</ToggleButton>
                    <ToggleButton value="pendientes">Pendientes</ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                    <FilterListIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                    Tipo:
                  </Typography>
                  <ToggleButtonGroup
                    value={tipoOperacionFilter}
                    exclusive
                    onChange={(e, newValue) => newValue && setTipoOperacionFilter(newValue)}
                    size="small"
                  >
                    <ToggleButton value="todos">Todos</ToggleButton>
                    <ToggleButton value="entrada">Entradas</ToggleButton>
                    <ToggleButton value="salida">Salidas</ToggleButton>
                    <ToggleButton value="transferencia">Transferencias</ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              </Stack>
            </Stack>
            
            <Typography variant="body2" color="text.secondary">
              Mostrando {gastosFiltered.length} de {gastos.length} registros
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
              💡 Los registros en STANDBY se muestran pero no se incluyen en cálculos hasta su confirmación y depósito
            </Typography>
            
            {/* Botón de debug solo en desarrollo */}
            {process.env.NODE_ENV === 'development' && (
              <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
                <Button 
                  size="small" 
                  onClick={authDebug.logFullAuthState}
                  sx={{ fontSize: '0.7rem' }}
                  variant="outlined"
                  color="info"
                >
                  🐛 Debug Auth State
                </Button>
                
                {/* Mostrar información de expiración del token */}
                {authDebug.tokenExpiration && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    🕐 Sesión expira: {new Date(authDebug.tokenExpiration).toLocaleTimeString()} 
                    ({authDebug.getTokenInfo()?.formattedTime || 'calculando...'} restantes)
                  </Typography>
                )}
              </Box>
            )}
        </Box>
        <DataGrid
            rows={gastosFiltered.map(g => ({...g, id: g._id}))}
            columns={columns}
            loading={status === 'loading'}
            getRowId={(row) => row._id}
            initialState={{
                pagination: {
                    paginationModel: { page: 0, pageSize: 25 },
                },
                sorting: {
                    sortModel: [{ field: 'fecha', sort: 'desc' }],
                },
                columns: {
                    columnVisibilityModel: {
                        transferencia: false,
                        montoTransferencia: false,
                        comentario: false,
                        fechaStandBy: false,
                        tipoOperacion: false,
                      },
                },
            }}
            pageSizeOptions={[10, 25, 50]}
            
            disableRowSelectionOnClick
        />
        <Dialog open={isModalOpen} onClose={handleCloseModal} maxWidth="md" fullWidth>
            <DialogTitle>{gastoToEdit ? 'Editar Gasto' : 'Agregar Nuevo Gasto'}</DialogTitle>
            <DialogContent>
                <ExpenseForm onClose={handleCloseModal} gastoToEdit={gastoToEdit}/>
            </DialogContent>
        </Dialog>
        
        {/* Modal de confirmación para eliminar */}
        <Dialog
          open={deleteConfirmOpen}
          onClose={handleCancelDelete}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Confirmar Eliminación</DialogTitle>
          <DialogContent>
            <Typography>
              ¿Estás seguro de que deseas eliminar este registro?
            </Typography>
            {gastoToDelete && (
              <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Fecha:</strong> {formatDate(gastoToDelete.fecha)}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Rubro:</strong> {gastoToDelete.rubro}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Detalle:</strong> {gastoToDelete.detalleGastos}
                </Typography>
                {gastoToDelete.entrada && gastoToDelete.entrada > 0 && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Entrada:</strong> {formatCurrencyWithSymbol(gastoToDelete.entrada)}
                  </Typography>
                )}
                {gastoToDelete.salida && gastoToDelete.salida > 0 && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Salida:</strong> {formatCurrencyWithSymbol(gastoToDelete.salida)}
                  </Typography>
                )}
                {gastoToDelete.montoTransferencia && gastoToDelete.montoTransferencia > 0 && (
                  <Typography variant="body2">
                    <strong>Transferencia:</strong> {formatCurrencyWithSymbol(gastoToDelete.montoTransferencia)}
                  </Typography>
                )}
              </Box>
            )}
            <Typography variant="body2" color="error" sx={{ mt: 2, fontWeight: 'bold' }}>
              Esta acción no se puede deshacer.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancelDelete} color="primary">
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmDelete} 
              color="error" 
              variant="contained"
              autoFocus
            >
              Eliminar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal de confirmación para cancelar */}
        <Dialog
          open={cancelConfirmOpen}
          onClose={handleCancelCancelAction}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Confirmar Cancelación</DialogTitle>
          <DialogContent>
            <Typography sx={{ mb: 2 }}>
              ¿Estás seguro de que deseas cancelar este registro?
            </Typography>
            {gastoToCancel && (
              <Box sx={{ mt: 2, p: 2, backgroundColor: 'warning.light', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Fecha:</strong> {formatDate(gastoToCancel.fecha)}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Rubro:</strong> {gastoToCancel.rubro}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Detalle:</strong> {gastoToCancel.detalleGastos}
                </Typography>
                {gastoToCancel.entrada && gastoToCancel.entrada > 0 && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Entrada:</strong> {formatCurrencyWithSymbol(gastoToCancel.entrada)}
                  </Typography>
                )}
                {gastoToCancel.salida && gastoToCancel.salida > 0 && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Salida:</strong> {formatCurrencyWithSymbol(gastoToCancel.salida)}
                  </Typography>
                )}
                {gastoToCancel.montoTransferencia && gastoToCancel.montoTransferencia > 0 && (
                  <Typography variant="body2">
                    <strong>Transferencia:</strong> {formatCurrencyWithSymbol(gastoToCancel.montoTransferencia)}
                  </Typography>
                )}
              </Box>
            )}
            
            {/* Campo de comentario obligatorio */}
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Motivo de cancelación (obligatorio)"
              value={comentarioCancelacion}
              onChange={(e) => setComentarioCancelacion(e.target.value)}
              error={!comentarioCancelacion.trim()}
              helperText={!comentarioCancelacion.trim() ? 'El motivo de cancelación es obligatorio' : ''}
              sx={{ mt: 2 }}
              placeholder="Ingresa el motivo por el cual se cancela este registro..."
            />
            
            <Typography variant="body2" color="warning.main" sx={{ mt: 2, fontWeight: 'bold' }}>
              El registro se marcará como cancelado y no será incluido en los cálculos.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancelCancelAction} color="primary">
              No cancelar
            </Button>
            <Button 
              onClick={handleConfirmCancel} 
              color="warning" 
              variant="contained"
              disabled={!comentarioCancelacion.trim()}
              autoFocus
            >
              Cancelar registro
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal de confirmación para reactivar */}
        <Dialog
          open={reactivateConfirmOpen}
          onClose={handleCancelReactivateAction}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Confirmar Reactivación</DialogTitle>
          <DialogContent>
            <Typography sx={{ mb: 2 }}>
              ¿Estás seguro de que deseas reactivar este registro cancelado?
            </Typography>
            {gastoToReactivate && (
              <Box sx={{ mt: 2, p: 2, backgroundColor: 'success.light', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Fecha:</strong> {formatDate(gastoToReactivate.fecha)}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Rubro:</strong> {gastoToReactivate.rubro}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Detalle:</strong> {gastoToReactivate.detalleGastos}
                </Typography>
                {gastoToReactivate.entrada && gastoToReactivate.entrada > 0 && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Entrada:</strong> {formatCurrencyWithSymbol(gastoToReactivate.entrada)}
                  </Typography>
                )}
                {gastoToReactivate.salida && gastoToReactivate.salida > 0 && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Salida:</strong> {formatCurrencyWithSymbol(gastoToReactivate.salida)}
                  </Typography>
                )}
                {gastoToReactivate.montoTransferencia && gastoToReactivate.montoTransferencia > 0 && (
                  <Typography variant="body2">
                    <strong>Transferencia:</strong> {formatCurrencyWithSymbol(gastoToReactivate.montoTransferencia)}
                  </Typography>
                )}
              </Box>
            )}
            
            {/* Campo de comentario obligatorio */}
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Motivo de reactivación (obligatorio)"
              value={comentarioReactivacion}
              onChange={(e) => setComentarioReactivacion(e.target.value)}
              error={!comentarioReactivacion.trim()}
              helperText={!comentarioReactivacion.trim() ? 'El motivo de reactivación es obligatorio' : ''}
              sx={{ mt: 2 }}
              placeholder="Ingresa el motivo por el cual se reactiva este registro..."
            />
            
            <Typography variant="body2" color="success.main" sx={{ mt: 2, fontWeight: 'bold' }}>
              El registro se marcará como activo y volverá a ser incluido en los cálculos.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancelReactivateAction} color="primary">
              No reactivar
            </Button>
            <Button 
              onClick={handleConfirmReactivate} 
              color="success" 
              variant="contained"
              disabled={!comentarioReactivacion.trim()}
              autoFocus
            >
              Reactivar registro
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal informativo para gastos bloqueados (vinculados a recibos) */}
        <Dialog
          open={blockedDialogOpen}
          onClose={() => { setBlockedDialogOpen(false); setBlockedGasto(null); }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LockIcon color="warning" />
            Gasto Bloqueado
          </DialogTitle>
          <DialogContent>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: 2, 
              p: 2, 
              backgroundColor: 'warning.light', 
              borderRadius: 1,
              mb: 2
            }}>
              <InfoIcon color="warning" />
              <Typography>
                Este gasto está vinculado a un <strong>recibo de pago confirmado</strong> y no puede editarse directamente.
              </Typography>
            </Box>
            
            {blockedGasto && (
              <Box sx={{ p: 2, backgroundColor: 'grey.100', borderRadius: 1, mb: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Detalle:</strong> {blockedGasto.detalleGastos}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Monto:</strong> {formatCurrencyWithSymbol(blockedGasto.entrada || blockedGasto.salida || 0)}
                </Typography>
              </Box>
            )}
            
            <Typography variant="body2" color="text.secondary">
              Para corregir el monto de este cobro, use la opción <strong>"Corregir Monto"</strong> desde la página de <strong>Cobranzas</strong>.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => { setBlockedDialogOpen(false); setBlockedGasto(null); }} 
              color="primary"
              variant="contained"
            >
              Entendido
            </Button>
          </DialogActions>
        </Dialog>
    </Paper>
  );
};

export default ExpenseTable;
