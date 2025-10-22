import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../redux/store';
import { Gasto } from '../types';
import { deleteGasto } from '../redux/slices/gastosSlice';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { 
  Box, 
  Paper, 
  Typography, 
  Dialog, 
  DialogTitle, 
  DialogContent
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
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
  
  // Obtener fecha de hoy en formato YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];
  
  // Verificar si el usuario puede editar/eliminar (OPER NO puede)
  const canEditDelete = user?.userType !== 'oper';
  

  const handleEditClick = (gasto: Gasto) => {
    setGastoToEdit(gasto);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if(window.confirm('¿Está seguro de que desea eliminar este registro?')) {
        dispatch(deleteGasto(id));
    }
  };
  
  const handleCloseModal = () => {
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
      width: 100,
      renderCell: (params) => {
        const gasto = params.row as Gasto;
        if (!gasto.fechaStandBy) {
          return <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>✅ ACTIVO</span>;
        }
        
        const fechaStandBy = new Date(gasto.fechaStandBy).toISOString().split('T')[0];
        const isActive = fechaStandBy <= today;
        
        if (isActive) {
          return <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>✅ ACTIVO</span>;
        } else {
          return <span style={{ color: '#f57c00', fontWeight: 'bold' }}>⏳ STANDBY</span>;
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

  // Solo agregar columna de acciones si el usuario puede editar/eliminar
  if (canEditDelete) {
    columns.push({
      field: 'actions',
      type: 'actions',
      headerName: 'Acciones',
      width: 100,
      cellClassName: 'actions',
      getActions: ({ row }) => {
        return [
          <GridActionsCellItem
            key="edit"
            icon={<EditIcon />}
            label="Edit"
            className="textPrimary"
            onClick={() => handleEditClick(row as Gasto)}
            color="inherit"
          />,
          <GridActionsCellItem
            key="delete"
            icon={<DeleteIcon />}
            label="Delete"
            onClick={() => handleDeleteClick(row._id as string)}
            color="inherit"
          />,
        ];
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
              💡 Los registros en STANDBY se muestran pero no se incluyen en cálculos hasta su fecha de activación
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
    </Paper>
  );
};

export default ExpenseTable;
