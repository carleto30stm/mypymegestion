import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useOutletContext } from 'react-router-dom';
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
import ExpenseTable from '../components/table/ExpenseTable';
import BankSummary from '../components/BankSummary';
import PendingChecks from '../components/PendingChecks';
import ChequesDisponibles from '../components/ChequesDisponibles';
import { AppDispatch, RootState } from '../redux/store';
import { fetchGastos } from '../redux/slices/gastosSlice';

// Tipo para el contexto del Layout
interface LayoutContextType {
  showBankSummary: boolean;
  showPendingChecks: boolean;
  showChequesDisponibles: boolean;
  onToggleBankSummary: () => void;
  onTogglePendingChecks: () => void;
  onToggleChequesDisponibles: () => void;
}

const DashboardPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { error, lastUpdated } = useSelector((state: RootState) => state.gastos);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  
  // Obtener estados del Layout a través del contexto
  const { 
    showBankSummary, 
    showPendingChecks, 
    showChequesDisponibles 
  } = useOutletContext<LayoutContextType>();

  // Estados para filtros unificados
  const [filterType, setFilterType] = useState<'today' | 'month' | 'quarter' | 'semester' | 'year' | 'total'>('month');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedQuarter, setSelectedQuarter] = useState(() => {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3) + 1;
    return `${now.getFullYear()}-Q${quarter}`;
  });
  const [selectedSemester, setSelectedSemester] = useState(() => {
    const now = new Date();
    const semester = now.getMonth() < 6 ? 1 : 2;
    return `${now.getFullYear()}-S${semester}`;
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    return String(new Date().getFullYear());
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

  // Generar lista de trimestres disponibles (últimos 8 trimestres)
  const availableQuarters = Array.from({ length: 8 }, (_, i) => {
    const date = new Date();
    const currentMonth = date.getMonth(); // 0-11
    const currentQuarter = Math.floor(currentMonth / 3) + 1; // 1-4
    const currentYear = date.getFullYear();
    
    // Calcular trimestre hacia atrás
    const totalQuarters = (currentYear * 4 + currentQuarter) - i;
    const year = Math.floor((totalQuarters - 1) / 4);
    const quarter = ((totalQuarters - 1) % 4) + 1;
    
    return {
      value: `${year}-Q${quarter}`,
      label: `Q${quarter} ${year}`
    };
  });

  // Generar lista de semestres disponibles (últimos 6 semestres)
  const availableSemesters = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    const currentMonth = date.getMonth(); // 0-11
    const currentSemester = currentMonth < 6 ? 1 : 2; // 1 o 2
    const currentYear = date.getFullYear();
    
    // Calcular semestre hacia atrás
    const totalSemesters = (currentYear * 2 + currentSemester) - i;
    const year = Math.floor((totalSemesters - 1) / 2);
    const semester = ((totalSemesters - 1) % 2) + 1;
    
    return {
      value: `${year}-S${semester}`,
      label: `S${semester} ${year}`
    };
  });

  // Generar lista de años disponibles (últimos 5 años)
  const availableYears = Array.from({ length: 5 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return {
      value: String(year),
      label: String(year)
    };
  });

  // Función helper para calcular rango de fechas según el filtro
  const calcularRangoFechas = () => {
    const hoy = new Date();
    let desde: Date;
    let hasta: Date = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59);

    switch (filterType) {
      case 'today':
        desde = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0);
        break;
      
      case 'month': {
        const [year, month] = selectedMonth.split('-').map(Number);
        desde = new Date(year, month - 1, 1, 0, 0, 0);
        hasta = new Date(year, month, 0, 23, 59, 59); // último día del mes
        break;
      }
      
      case 'quarter': {
        const [year, quarterStr] = selectedQuarter.split('-Q');
        const quarter = Number(quarterStr);
        const startMonth = (quarter - 1) * 3;
        desde = new Date(Number(year), startMonth, 1, 0, 0, 0);
        hasta = new Date(Number(year), startMonth + 3, 0, 23, 59, 59);
        break;
      }
      
      case 'semester': {
        const [year, semesterStr] = selectedSemester.split('-S');
        const semester = Number(semesterStr);
        const startMonth = semester === 1 ? 0 : 6;
        desde = new Date(Number(year), startMonth, 1, 0, 0, 0);
        hasta = new Date(Number(year), startMonth + 6, 0, 23, 59, 59);
        break;
      }
      
      case 'year': {
        const year = Number(selectedYear);
        desde = new Date(year, 0, 1, 0, 0, 0);
        hasta = new Date(year, 11, 31, 23, 59, 59);
        break;
      }
      
      case 'total':
      default:
        // Para "total", no enviamos fechas (backend traerá todo)
        return null;
    }

    return {
      desde: desde.toISOString().split('T')[0],
      hasta: hasta.toISOString().split('T')[0]
    };
  };

  useEffect(() => {
    const rangoFechas = calcularRangoFechas();
    
    if (rangoFechas) {
      // Filtro con fechas específicas
      dispatch(fetchGastos({ 
        desde: rangoFechas.desde, 
        hasta: rangoFechas.hasta 
      }));
    } else {
      // Filtro "total" - traer todos los registros
      dispatch(fetchGastos({ todosPeriodos: true }));
    }
  }, [dispatch, filterType, selectedMonth, selectedQuarter, selectedSemester, selectedYear, lastUpdated]);

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
  
  // Event listener para el modal desde el sidebar
  useEffect(() => {
    const handleOpenModal = () => setIsModalOpen(true);
    window.addEventListener('openAddModal', handleOpenModal);
    return () => window.removeEventListener('openAddModal', handleOpenModal);
  }, []);

  // Función para obtener el selector apropiado según el tipo de filtro
  const getFilterValue = () => {
    switch (filterType) {
      case 'today':
        return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      case 'month':
        return selectedMonth;
      case 'quarter':
        return selectedQuarter;
      case 'semester':
        return selectedSemester;
      case 'year':
        return selectedYear;
      case 'total':
      default:
        return 'total';
    }
  };

  return (
    <>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          backgroundColor: '#f5f5f5',
          minHeight: '100vh',
          p: 2
        }}
      >
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
              size="small"
            >
              <ToggleButton value="today" aria-label="hoy">
                Hoy
              </ToggleButton>
              <ToggleButton value="month" aria-label="mes">
                Mes
              </ToggleButton>
              <ToggleButton value="quarter" aria-label="trimestre">
                Trimestre
              </ToggleButton>
              <ToggleButton value="semester" aria-label="semestre">
                Semestre
              </ToggleButton>
              <ToggleButton value="year" aria-label="año">
                Año
              </ToggleButton>
              <ToggleButton value="total" aria-label="total">
                Total
              </ToggleButton>
            </ToggleButtonGroup>

            {filterType === 'month' && (
              <FormControl sx={{ minWidth: 200 }} size="small">
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

            {filterType === 'quarter' && (
              <FormControl sx={{ minWidth: 150 }} size="small">
                <InputLabel>Trimestre</InputLabel>
                <Select
                  value={selectedQuarter}
                  onChange={(e) => setSelectedQuarter(e.target.value)}
                  label="Trimestre"
                >
                  {availableQuarters.map((quarter) => (
                    <MenuItem key={quarter.value} value={quarter.value}>
                      {quarter.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {filterType === 'semester' && (
              <FormControl sx={{ minWidth: 150 }} size="small">
                <InputLabel>Semestre</InputLabel>
                <Select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  label="Semestre"
                >
                  {availableSemesters.map((semester) => (
                    <MenuItem key={semester.value} value={semester.value}>
                      {semester.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {filterType === 'year' && (
              <FormControl sx={{ minWidth: 120 }} size="small">
                <InputLabel>Año</InputLabel>
                <Select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  label="Año"
                >
                  {availableYears.map((year) => (
                    <MenuItem key={year.value} value={year.value}>
                      {year.label}
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
            selectedQuarter={selectedQuarter}
            selectedSemester={selectedSemester}
            selectedYear={selectedYear}
            availableMonths={availableMonths}
          />
        )}
        
        {/* Componente de cheques pendientes */}
        {showPendingChecks && (
          <PendingChecks />
        )}

        {showChequesDisponibles && (
          <ChequesDisponibles 
            filterType={filterType}
            selectedMonth={selectedMonth}
            selectedQuarter={selectedQuarter}
            selectedSemester={selectedSemester}
            selectedYear={selectedYear}
            availableMonths={availableMonths}
          />
        )}
        
        <ExpenseTable 
          isModalOpen={isModalOpen}
          setIsModalOpen={setIsModalOpen}
          filterType={filterType}
          selectedMonth={selectedMonth}
          selectedQuarter={selectedQuarter}
          selectedSemester={selectedSemester}
          selectedYear={selectedYear}
          availableMonths={availableMonths}
        />
      </Box>
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </>
  );
};

export default DashboardPage;
