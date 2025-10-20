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
        if (!value) return '';
        // Parse the date and format it correctly to avoid timezone issues
        const date = new Date(value);
        return date.toLocaleDateString('es-ES', { timeZone: 'UTC' });
      } },
    { field: 'rubro', headerName: 'Rubro', width: 150 },
    { field: 'subRubro', headerName: 'Sub-Rubro', width: 150 },
    { field: 'medioDePago', headerName: 'Medio de Pago', width: 140 },
    { field: 'clientes', headerName: 'Clientes', width: 160 },
    { field: 'detalleGastos', headerName: 'Detalle', flex: 1, minWidth: 200 },
  { field: 'comentario', headerName: 'Comentario', width: 200 },
    { field: 'fechaStandBy', headerName: 'Fecha StandBy', width: 140,
      valueFormatter: (value: string) => {
        if (!value) return '';
        // Parse the date and format it correctly to avoid timezone issues
        const date = new Date(value);
        return date.toLocaleDateString('es-ES', { timeZone: 'UTC' });
      } },
    { field: 'entrada', headerName: 'Entrada', type: 'number', width: 130,
      valueFormatter: (value: number) => typeof value === 'number' ? value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }) : '' },
    { field: 'salida', headerName: 'Salida', type: 'number', width: 130,
      valueFormatter: (value: number) => typeof value === 'number' ? value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }) : '' },
    { field: 'banco', headerName: 'Banco', width: 120},
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

  // Función para filtrar gastos según el tipo de filtro (misma lógica que BankSummary)
  const getFilteredGastos = () => {
    // Primero aplicar la lógica de StandBy
    let gastosStandBy = gastos.filter(gasto => {
      // Si no tiene fechaStandBy, se incluye normalmente
      if (!gasto.fechaStandBy) {
        return true;
      }
      
      // Si tiene fechaStandBy, solo se incluye cuando la fecha StandBy sea hoy o anterior
      const fechaStandBy = new Date(gasto.fechaStandBy).toISOString().split('T')[0];
      return fechaStandBy <= today; // Cambio: <= en lugar de ===
    });

    // Luego aplicar filtro de fecha según el tipo
    if (filterType === 'total') {
      return gastosStandBy;
    } else {
      // Filtrar por mes seleccionado
      return gastosStandBy.filter(gasto => {
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
