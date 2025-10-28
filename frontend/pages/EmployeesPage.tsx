import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { AppDispatch, RootState } from '../redux/store';
import { fetchEmployees } from '../redux/slices/employeesSlice';
import {
  Container,
  Typography,
  Box,
  Paper,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Fab,
  Badge,
  Grid,
  Button
} from '@mui/material';
import {
  Add as AddIcon,
  People as PeopleIcon,
  AccountBalance as PayrollIcon,
  Person as PersonIcon,
  ArrowBack as BackIcon
} from '@mui/icons-material';
import EmployeeList from '../components/EmployeeList';
import EmployeeForm from '../components/EmployeeForm';
import EmployeePayrollComponent from '../components/EmployeePayroll';
import Modal from '../components/Modal';
import { Employee } from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`employee-tabpanel-${index}`}
      aria-labelledby={`employee-tab-${index}`}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const EmployeesPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { items: employees, status, error } = useSelector((state: RootState) => state.employees);
  
  const [tabValue, setTabValue] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  
  // Estado para filtros de nómina
  const [payrollFilterType, setPayrollFilterType] = useState<'total' | 'month'>('month');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    dispatch(fetchEmployees());
  }, [dispatch]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleAddEmployee = () => {
    setEditingEmployee(null);
    setIsModalOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
  };

  const handleFormSuccess = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
    dispatch(fetchEmployees());
  };

  // Estadísticas de empleados
  const activeEmployees = employees.filter(emp => emp.estado === 'activo').length;
  const inactiveEmployees = employees.filter(emp => emp.estado === 'inactivo').length;
  const totalSalaryBudget = employees
    .filter(emp => emp.estado === 'activo')
    .reduce((sum, emp) => sum + emp.sueldoBase, 0);

  // Generar opciones de meses para el filtro
  const generateMonthOptions = () => {
    const months = [];
    const currentDate = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthValue = date.toISOString().slice(0, 7);
      const monthLabel = date.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long' 
      });
      months.push({ value: monthValue, label: monthLabel });
    }
    
    return months;
  };

  if (status === 'loading') {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography>Cargando empleados...</Typography>
      </Container>
    );
  }

  if (status === 'failed') {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography color="error">Error al cargar empleados: {error}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <PeopleIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Gestión de Empleados
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Administra la información de empleados y controla la nómina
            </Typography>
          </Box>
        </Box>

        {/* Estadísticas rápidas */}
        <Grid container spacing={2} sx={{ maxWidth: 400 }}>
          <Grid item xs={4}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Badge badgeContent={activeEmployees} color="success">
                <PersonIcon color="primary" />
              </Badge>
              <Typography variant="caption" display="block">
                Activos
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={4}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Badge badgeContent={inactiveEmployees} color="error">
                <PersonIcon color="disabled" />
              </Badge>
              <Typography variant="caption" display="block">
                Inactivos
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={4}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <PayrollIcon color="primary" />
              <Typography variant="caption" display="block">
                Presupuesto
              </Typography>
              <Typography variant="caption" display="block" fontWeight="bold">
                ${totalSalaryBudget.toLocaleString()}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Tabs de navegación */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            icon={<PeopleIcon />} 
            label="Lista de Empleados" 
            id="employee-tab-0"
            aria-controls="employee-tabpanel-0"
          />
          <Tab 
            icon={<PayrollIcon />} 
            label="Control de Nómina" 
            id="employee-tab-1"
            aria-controls="employee-tabpanel-1"
          />
        </Tabs>

        {/* Panel 1: Lista de Empleados */}
        <TabPanel value={tabValue} index={0}>
          <EmployeeList 
            employees={employees}
            onEdit={handleEditEmployee}
          />
        </TabPanel>

        {/* Panel 2: Control de Nómina */}
        <TabPanel value={tabValue} index={1}>
          {/* Controles de filtro para nómina */}
          <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Tipo de Filtro</InputLabel>
              <Select
                value={payrollFilterType}
                label="Tipo de Filtro"
                onChange={(e) => setPayrollFilterType(e.target.value as 'total' | 'month')}
              >
                <MenuItem value="total">Histórico Total</MenuItem>
                <MenuItem value="month">Por Mes</MenuItem>
              </Select>
            </FormControl>

            {payrollFilterType === 'month' && (
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Mes</InputLabel>
                <Select
                  value={selectedMonth}
                  label="Mes"
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  {generateMonthOptions().map((month) => (
                    <MenuItem key={month.value} value={month.value}>
                      {month.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>

          <EmployeePayrollComponent 
            filterType={payrollFilterType}
            selectedMonth={selectedMonth}
          />
        </TabPanel>
      </Paper>

      {/* Botón flotante para agregar empleado */}
      <Fab
        color="primary"
        aria-label="add employee"
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
        }}
        onClick={handleAddEmployee}
      >
        <AddIcon />
      </Fab>

      {/* Modal para formulario de empleado */}
      <Modal
        open={isModalOpen}
        onClose={handleCloseModal}
        title={editingEmployee ? 'Editar Empleado' : 'Agregar Empleado'}
        maxWidth="md"
      >
        <EmployeeForm
          employee={editingEmployee}
          onSuccess={handleFormSuccess}
          onCancel={handleCloseModal}
        />
      </Modal>
    </Container>
  );
};

export default EmployeesPage;