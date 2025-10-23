import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../redux/store';
import { Gasto } from '../types';
import { deleteGasto, confirmarCheque, cancelGasto } from '../redux/slices/gastosSlice';
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
  Chip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpenseForm from './ExpenseForm';
import { formatDate, formatCurrencyWithSymbol } from '../utils/formatters';

interface ExpenseTableProps {
    isModalOpen: boolean;
    setIsModalOpen: (isOpen: boolean) => void;
    filterType: 'total' | 'month';
    selectedMonth: string;
    availableMonths: Array<{ value: string; label: string }>;
}

const ExpenseTable: React.FC<ExpenseTableProps> = ({ 
  isModalOpen, 
  setIsModalOpen, 
  filterType, 
  selectedMonth 
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: gastos, status } = useSelector((state: RootState) => state.gastos);
  const { user } = useSelector((state: RootState) => state.auth);
  const [gastoToEdit, setGastoToEdit] = useState<Gasto | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [gastoToDelete, setGastoToDelete] = useState<Gasto | null>(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [gastoToCancel, setGastoToCancel] = useState<Gasto | null>(null);
  
  // Obtener fecha de hoy en formato YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];
  
  // Verificar permisos según el tipo de usuario
  const canEdit = user?.userType !== 'oper'; // admin y oper_ad pueden editar
  const canDelete = user?.userType === 'admin'; // solo admin puede eliminar
  const canCancel = user?.userType === 'oper_ad'; // solo oper_ad puede cancelar
  const showActions = user?.userType !== 'oper'; // oper no ve la columna de acciones
  

  const handleEditClick = (gasto: Gasto) => {
    setGastoToEdit(gasto);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (gasto: Gasto) => {
    setGastoToDelete(gasto);
    setDeleteConfirmOpen(true);
  };

  const handleCancelClick = (gasto: Gasto) => {
    setGastoToCancel(gasto);
    setCancelConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (gastoToDelete) {
      dispatch(deleteGasto(gastoToDelete._id as string));
      setDeleteConfirmOpen(false);
      setGastoToDelete(null);
    }
  };

  const handleConfirmCancel = () => {
    if (gastoToCancel) {
      dispatch(cancelGasto(gastoToCancel._id as string));
      setCancelConfirmOpen(false);
      setGastoToCancel(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setGastoToDelete(null);
  };

  const handleCancelCancelAction = () => {
    setCancelConfirmOpen(false);
    setGastoToCancel(null);
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
        
        // Para cheques, mostrar estado de confirmación
        if (gasto.medioDePago?.includes('Cheque')) {
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
          if (canDelete) { // Solo admin puede eliminar registros cancelados
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
        if (gasto.medioDePago?.includes('Cheque') && !gasto.confirmado) {
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

  // Función para filtrar gastos según el tipo de filtro
  const getFilteredGastos = () => {
    // CAMBIO: Ya NO filtramos por fechaStandBy aquí - mostramos TODOS los registros
    // La lógica de StandBy solo aplicará en los cálculos (BankSummary)
    
    if (filterType === 'total') {
      return gastos; // Mostrar todos los gastos
    } else {
      // Filtrar solo por mes seleccionado
      return gastos.filter(gasto => {
        const fechaGasto = new Date(gasto.fecha).toISOString().slice(0, 7); // YYYY-MM
        return fechaGasto === selectedMonth;
      });
    }
  };

  const gastosFiltered = getFilteredGastos();

  return (
    <Paper sx={{ height: 'calc(100vh - 280px)', width: '100%' }}>
        <Box sx={{p: 2, borderBottom: '1px solid #ddd' }}>
            <Typography variant="h5" component="h2" gutterBottom>
                Dashboard de Gastos
            </Typography>
            
            <Typography variant="body2" color="text.secondary">
              Mostrando {gastosFiltered.length} de {gastos.length} registros
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
              💡 Los registros en STANDBY se muestran pero no se incluyen en cálculos hasta su confirmación y depósito
            </Typography>
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
            }}
            pageSizeOptions={[10, 25, 50]}
            checkboxSelection
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
            <Typography>
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
              autoFocus
            >
              Cancelar registro
            </Button>
          </DialogActions>
        </Dialog>
    </Paper>
  );
};

export default ExpenseTable;
