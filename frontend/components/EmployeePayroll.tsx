import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { EmployeePayroll } from '../types';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Chip,
  Alert
} from '@mui/material';
import {
  AccountBalance as PayrollIcon
} from '@mui/icons-material';
import { formatCurrency } from '../utils/formatters';

interface EmployeePayrollProps {
  filterType: 'total' | 'month';
  selectedMonth: string;
}

const EmployeePayrollComponent: React.FC<EmployeePayrollProps> = ({ filterType, selectedMonth }) => {
  const { items: employees } = useSelector((state: RootState) => state.employees);
  const { items: gastos } = useSelector((state: RootState) => state.gastos);

  // Obtener fecha de hoy para filtros StandBy
  const today = new Date().toISOString().split('T')[0];

  // Función para filtrar gastos de sueldos según el tipo de filtro
  const getFilteredSueldos = () => {
    // Filtrar solo gastos de SUELDOS
    let sueldosGastos = gastos.filter(gasto => gasto.rubro === 'SUELDOS');

    // Aplicar lógica de StandBy
    sueldosGastos = sueldosGastos.filter(gasto => {
      if (!gasto.fechaStandBy) {
        return true;
      }
      const fechaStandBy = new Date(gasto.fechaStandBy).toISOString().split('T')[0];
      return fechaStandBy <= today;
    });

    // Aplicar filtro de fecha según el tipo
    if (filterType === 'total') {
      return sueldosGastos;
    } else {
      // Filtrar por mes seleccionado
      const filteredByMonth = sueldosGastos.filter(gasto => {
        const fechaGasto = new Date(gasto.fecha).toISOString().slice(0, 7); // YYYY-MM
        return fechaGasto === selectedMonth;
      });
      
      // Log para depuración
      console.log('🔍 Debug filtro de nómina:', {
        selectedMonth,
        totalSueldos: sueldosGastos.length,
        filteredByMonth: filteredByMonth.length,
        fechasDisponibles: [...new Set(sueldosGastos.map(g => new Date(g.fecha).toISOString().slice(0, 7)))]
      });
      
      return filteredByMonth;
    }
  };

  const sueldosActivos = getFilteredSueldos();

  // Calcular nómina para cada empleado
  const payrollData: EmployeePayroll[] = useMemo(() => {
    return employees
      .filter(emp => emp.estado === 'activo') // Solo empleados activos
      .map(employee => {
        // Buscar pagos a este empleado en los gastos de sueldos
        // Coincidencia por nombre y apellido en el subRubro
        const employeePayments = sueldosActivos.filter(gasto => {
          const nombreCompleto = `${employee.nombre} ${employee.apellido}`.toLowerCase();
          const nombreInvertido = `${employee.apellido} ${employee.nombre}`.toLowerCase();
          const subRubro = gasto.subRubro.toLowerCase();
          
          return subRubro.includes(employee.nombre.toLowerCase()) ||
                 subRubro.includes(employee.apellido.toLowerCase()) ||
                 subRubro.includes(nombreCompleto) ||
                 subRubro.includes(nombreInvertido);
        });

        // Calcular totales por concepto
        const totalPagado = employeePayments.reduce((sum, gasto) => sum + (gasto.salida || 0), 0);
        const adelantos = employeePayments
          .filter(gasto => gasto.concepto === 'adelanto')
          .reduce((sum, gasto) => sum + (gasto.salida || 0), 0);
        const horasExtra = employeePayments
          .filter(gasto => gasto.concepto === 'hora_extra')
          .reduce((sum, gasto) => sum + (gasto.salida || 0), 0);
        const sueldos = employeePayments
          .filter(gasto => gasto.concepto === 'sueldo')
          .reduce((sum, gasto) => sum + (gasto.salida || 0), 0);
        const aguinaldos = employeePayments
          .filter(gasto => gasto.concepto === 'aguinaldo')
          .reduce((sum, gasto) => sum + (gasto.salida || 0), 0);
        const bonus = employeePayments
          .filter(gasto => gasto.concepto === 'bonus')
          .reduce((sum, gasto) => sum + (gasto.salida || 0), 0);

        const saldoPendiente = employee.sueldoBase - totalPagado;

        return {
          employeeId: employee._id || '',
          nombre: employee.nombre,
          apellido: employee.apellido,
          sueldoBase: employee.sueldoBase,
          totalPagado,
          adelantos,
          horasExtra,
          sueldos,
          aguinaldos,
          bonus,
          saldoPendiente
        };
      });
  }, [employees, sueldosActivos]);

  // Calcular totales generales
  const totales = payrollData.reduce((acc, emp) => ({
    sueldoBase: acc.sueldoBase + emp.sueldoBase,
    totalPagado: acc.totalPagado + emp.totalPagado,
    adelantos: acc.adelantos + emp.adelantos,
    horasExtra: acc.horasExtra + emp.horasExtra,
    sueldos: acc.sueldos + emp.sueldos,
    aguinaldos: acc.aguinaldos + emp.aguinaldos,
    bonus: acc.bonus + emp.bonus,
    saldoPendiente: acc.saldoPendiente + emp.saldoPendiente
  }), { 
    sueldoBase: 0, 
    totalPagado: 0, 
    adelantos: 0, 
    horasExtra: 0,
    sueldos: 0,
    aguinaldos: 0,
    bonus: 0,
    saldoPendiente: 0 
  });

  const getStatusChip = (saldoPendiente: number, sueldoBase: number) => {
    const percentage = (saldoPendiente / sueldoBase) * 100;
    
    if (saldoPendiente <= 0) {
      return <Chip label="PAGADO" color="success" size="small" />;
    } else if (percentage > 50) {
      return <Chip label="PENDIENTE" color="error" size="small" />;
    } else {
      return <Chip label="PARCIAL" color="warning" size="small" />;
    }
  };

  const monthName = filterType === 'month' ? 
    new Date(selectedMonth + '-01').toLocaleDateString('es-ES', { year: 'numeric', month: 'long' }) :
    'Histórico Total';

  return (
    <Paper sx={{ p: 3, mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <PayrollIcon color="primary" />
        <Typography variant="h5" component="h2">
          Control de Nómina - {monthName}
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          <strong>Información:</strong> Los datos se calculan automáticamente desde los registros de gastos 
          en el rubro "SUELDOS". Los totales pagados incluyen todos los pagos registrados para cada empleado.
        </Typography>
      </Alert>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Empleados activos: {payrollData.length} | Registros de sueldos: {sueldosActivos.length}
      </Typography>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Empleado</strong></TableCell>
              <TableCell align="right"><strong>Sueldo Base</strong></TableCell>
              <TableCell align="right"><strong>Sueldos</strong></TableCell>
              <TableCell align="right"><strong>Adelantos</strong></TableCell>
              <TableCell align="right"><strong>Horas Extra</strong></TableCell>
              <TableCell align="right"><strong>Aguinaldos</strong></TableCell>
              <TableCell align="right"><strong>Bonus</strong></TableCell>
              <TableCell align="right"><strong>Total Pagado</strong></TableCell>
              <TableCell align="right"><strong>Saldo Pendiente</strong></TableCell>
              <TableCell align="center"><strong>Estado</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payrollData.map((employee) => (
              <TableRow key={employee.employeeId} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {employee.apellido}, {employee.nombre}
                  </Typography>
                </TableCell>
                
                <TableCell align="right">
                  <Typography variant="body2" color="primary">
                    {formatCurrency(employee.sueldoBase)}
                  </Typography>
                </TableCell>
                
                <TableCell align="right">
                  <Typography variant="body2" color="success.main">
                    {formatCurrency(employee.sueldos)}
                  </Typography>
                </TableCell>
                
                <TableCell align="right">
                  <Typography variant="body2" color="warning.main">
                    {formatCurrency(employee.adelantos)}
                  </Typography>
                </TableCell>
                
                <TableCell align="right">
                  <Typography variant="body2" color="info.main">
                    {formatCurrency(employee.horasExtra)}
                  </Typography>
                </TableCell>
                
                <TableCell align="right">
                  <Typography variant="body2" color="secondary.main">
                    {formatCurrency(employee.aguinaldos)}
                  </Typography>
                </TableCell>
                
                <TableCell align="right">
                  <Typography variant="body2" color="purple">
                    {formatCurrency(employee.bonus)}
                  </Typography>
                </TableCell>
                
                <TableCell align="right">
                  <Typography variant="body2" fontWeight="medium" color="text.primary">
                    {formatCurrency(employee.totalPagado)}
                  </Typography>
                </TableCell>
                
                <TableCell align="right">
                  <Typography 
                    variant="body2" 
                    fontWeight="medium"
                    sx={{ 
                      color: employee.saldoPendiente > 0 ? 'error.main' : 'success.main'
                    }}
                  >
                    {formatCurrency(employee.saldoPendiente)}
                  </Typography>
                </TableCell>
                
                <TableCell align="center">
                  {getStatusChip(employee.saldoPendiente, employee.sueldoBase)}
                </TableCell>
              </TableRow>
            ))}

            {/* Fila de totales */}
            <TableRow sx={{ backgroundColor: 'grey.50', borderTop: 2 }}>
              <TableCell>
                <Typography variant="h6" fontWeight="bold">
                  TOTALES
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="h6" color="primary" fontWeight="bold">
                  {formatCurrency(totales.sueldoBase)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="h6" color="success.main" fontWeight="bold">
                  {formatCurrency(totales.sueldos)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="h6" color="warning.main" fontWeight="bold">
                  {formatCurrency(totales.adelantos)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="h6" color="info.main" fontWeight="bold">
                  {formatCurrency(totales.horasExtra)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="h6" color="secondary.main" fontWeight="bold">
                  {formatCurrency(totales.aguinaldos)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="h6" fontWeight="bold">
                  {formatCurrency(totales.bonus)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="h6" fontWeight="bold" color="text.primary">
                  {formatCurrency(totales.totalPagado)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography 
                  variant="h6" 
                  fontWeight="bold"
                  sx={{ 
                    color: totales.saldoPendiente > 0 ? 'error.main' : 'success.main'
                  }}
                >
                  {formatCurrency(totales.saldoPendiente)}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Typography variant="body2" fontWeight="bold">
                  {totales.saldoPendiente > 0 ? 'PENDIENTE' : 'COMPLETO'}
                </Typography>
              </TableCell>
            </TableRow>

            {payrollData.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    No hay empleados activos registrados.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Información adicional */}
      <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          📊 <strong>Cálculo:</strong> Total Pagado se obtiene de la suma de salidas en gastos de SUELDOS que coincidan con el nombre del empleado
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          💰 <strong>Adelantos:</strong> Se identifican por la palabra "adelanto" en el detalle del gasto
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          🔍 <strong>Filtro:</strong> {filterType === 'total' ? 'Histórico completo' : `Período: ${monthName}`}
        </Typography>
      </Box>
    </Paper>
  );
};

export default EmployeePayrollComponent;