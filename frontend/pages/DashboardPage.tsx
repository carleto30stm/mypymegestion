import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Box from '@mui/material/Box';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { 
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography
} from '@mui/material';
import Sidebar from '../components/Sidebar';
import ExpenseTable from '../components/ExpenseTable';
import BankSummary from '../components/BankSummary';
import PendingChecks from '../components/PendingChecks';
import ChequesDisponibles from '../components/ChequesDisponibles';
import { AppDispatch, RootState } from '../redux/store';
import { fetchGastos } from '../redux/slices/gastosSlice';

const DashboardPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showBankSummary, setShowBankSummary] = useState(true);
  const [showPendingChecks, setShowPendingChecks] = useState(true);
  const [showChequesDisponibles, setShowChequesDisponibles] = useState(true);
  const { error } = useSelector((state: RootState) => state.gastos);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // Estados para filtros unificados
  const [filterType, setFilterType] = useState<'total' | 'month'>('month');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Generar lista de meses disponibles
  const availableMonths = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return {
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })
    };
  });

  useEffect(() => {
    dispatch(fetchGastos());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
        setSnackbarOpen(true);
    }
  }, [error]);

  const handleCloseSnackbar = (/* event */ _?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  const handleAddNew = () => {
    setIsModalOpen(true);
  }

  const toggleSidebar = () => setSidebarOpen((s) => !s);
  
  const toggleBankSummary = () => setShowBankSummary((s) => !s);
  const togglePendingChecks = () => setShowPendingChecks((s) => !s);
  const toggleChequesDisponibles = () => setShowChequesDisponibles((s) => !s);

  return (
    <Box sx={{ display: 'flex' }}>
      <Sidebar 
        onAddNew={handleAddNew} 
        isOpen={sidebarOpen} 
        onToggle={toggleSidebar}
        onToggleBankSummary={toggleBankSummary}
        showBankSummary={showBankSummary}
        onTogglePendingChecks={togglePendingChecks}
        showPendingChecks={showPendingChecks}
        onToggleChequesDisponibles={toggleChequesDisponibles}
        showChequesDisponibles={showChequesDisponibles}
      />
      <Box component="main" sx={{ flexGrow: 1, p: 3, height: '100vh', overflow: 'auto' }}>
        {/* Controles de filtro unificados */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Filtros
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <ToggleButtonGroup
              value={filterType}
              exclusive
              onChange={(_, newFilter) => newFilter && setFilterType(newFilter)}
              aria-label="tipo de filtro"
            >
              <ToggleButton value="month" aria-label="mes">
                Mes
              </ToggleButton>
              <ToggleButton value="total" aria-label="total">
                Total
              </ToggleButton>
            </ToggleButtonGroup>

            {filterType === 'month' && (
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Mes</InputLabel>
                <Select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  label="Mes"
                >
                  {availableMonths.map((month) => (
                    <MenuItem key={month.value} value={month.value}>
                      {month.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>
        </Paper>

        {showBankSummary && (
          <BankSummary 
            filterType={filterType}
            selectedMonth={selectedMonth}
            availableMonths={availableMonths}
          />
        )}
        
        {/* Componente de cheques pendientes */}
        {showPendingChecks && (
          <PendingChecks 
            filterType={filterType}
            selectedMonth={selectedMonth}
            availableMonths={availableMonths}
          />
        )}

        {showChequesDisponibles && (
          <ChequesDisponibles 
            filterType={filterType}
            selectedMonth={selectedMonth}
            availableMonths={availableMonths}
          />
        )}
        
        <ExpenseTable 
          isModalOpen={isModalOpen}
          setIsModalOpen={setIsModalOpen}
          filterType={filterType}
          selectedMonth={selectedMonth}
          availableMonths={availableMonths}
        />
      </Box>
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DashboardPage;
