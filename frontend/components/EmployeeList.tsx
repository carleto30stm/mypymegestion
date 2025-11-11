import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../redux/store';
import { fetchEmployees, deleteEmployee } from '../redux/slices/employeesSlice';
import { Employee } from '../types';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Box,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon
} from '@mui/icons-material';

interface EmployeeListProps {
  employees: Employee[];
  onEdit: (employee: Employee) => void;
}

const EmployeeList: React.FC<EmployeeListProps> = ({ employees, onEdit }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { status } = useSelector((state: RootState) => state.employees);
  
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; employee: Employee | null }>({
    open: false,
    employee: null
  });

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchEmployees());
    }
  }, [dispatch, status]);

  const handleEdit = (employee: Employee) => {
    onEdit(employee);
  };

  const handleDelete = (employee: Employee) => {
    setDeleteDialog({ open: true, employee });
  };

  const confirmDelete = async () => {
    if (deleteDialog.employee?._id) {
      try {
        await dispatch(deleteEmployee(deleteDialog.employee._id)).unwrap();
        setDeleteDialog({ open: false, employee: null });
      } catch (error) {
        console.error('Error al eliminar empleado:', error);
        alert('Error al eliminar el empleado. Por favor, intenta nuevamente.');
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('es-AR', { 
      style: 'currency', 
      currency: 'ARS',
      minimumFractionDigits: 2 
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  if (status === 'loading') {
    return <Typography>Cargando empleados...</Typography>;
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon color="primary" />
          <Typography variant="h5" component="h2">
            Lista de Empleados
          </Typography>
        </Box>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Total de empleados: {employees.length} ({employees.filter(emp => emp.estado === 'activo').length} activos)
      </Typography>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Nombre Completo</strong></TableCell>
              <TableCell><strong>Documento</strong></TableCell>
              <TableCell><strong>Puesto</strong></TableCell>
              <TableCell><strong>Fecha Ingreso</strong></TableCell>
              <TableCell align="right"><strong>Sueldo Base</strong></TableCell>
              <TableCell align="center"><strong>Estado</strong></TableCell>
              <TableCell align="center"><strong>Acciones</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {employees.map((employee) => (
              <TableRow key={employee._id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {employee.apellido}, {employee.nombre}
                  </Typography>
                  {employee.email && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {employee.email}
                    </Typography>
                  )}
                </TableCell>
                
                <TableCell>
                  <Typography variant="body2">
                    {employee.documento}
                  </Typography>
                  {employee.telefono && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {employee.telefono}
                    </Typography>
                  )}
                  {employee.direccion && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {employee.direccion}
                    </Typography>
                  )}
                  {employee.fechaNacimiento && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {employee.fechaNacimiento}
                    </Typography>
                  )}
                </TableCell>
                
                <TableCell>
                  <Typography variant="body2">
                    {employee.puesto}
                  </Typography>
                </TableCell>
                
                <TableCell>
                  <Typography variant="body2">
                    {formatDate(employee.fechaIngreso)}
                  </Typography>
                </TableCell>
                
                <TableCell align="right">
                  <Typography variant="body2" fontWeight="medium" color="primary">
                    {formatCurrency(employee.sueldoBase)}
                  </Typography>
                </TableCell>
                
                <TableCell align="center">
                  <Chip
                    label={employee.estado}
                    color={employee.estado === 'activo' ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                
                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={() => handleEdit(employee)}
                    color="primary"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(employee)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            
            {employees.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    No hay empleados registrados. Haz clic en "Nuevo Empleado" para agregar uno.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, employee: null })}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que deseas eliminar al empleado{' '}
            <strong>{deleteDialog.employee?.nombre} {deleteDialog.employee?.apellido}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, employee: null })}>
            Cancelar
          </Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default EmployeeList;