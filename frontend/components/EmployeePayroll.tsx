import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
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
  Alert,
  Tooltip
} from '@mui/material';
import {
  AccountBalance as PayrollIcon,
  TrendingDown as DescuentoIcon,
  TrendingUp as IncentivoIcon,
  Work as FormalIcon,
  Work as WorkIcon,
  Person as InformalIcon
} from '@mui/icons-material';
import { formatCurrency } from '../utils/formatters';
import { fetchGastos } from '../redux/slices';
import { fetchDescuentos } from '../redux/slices/descuentosEmpleadoSlice';
import { fetchIncentivos } from '../redux/slices/incentivosEmpleadoSlice';

// Función para calcular años de antigüedad desde fecha de ingreso
const calcularAntiguedad = (fechaIngreso: string): { anios: number; meses: number; texto: string } => {
  if (!fechaIngreso) return { anios: 0, meses: 0, texto: '-' };
  
  const ingreso = new Date(fechaIngreso);
  const hoy = new Date();
  const diffMs = hoy.getTime() - ingreso.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  const diffYears = diffDays / 365.25;
  const diffMonths = diffDays / 30.44;
  
  if (diffYears < 0) return { anios: 0, meses: 0, texto: '0' };
  
  const anios = Math.floor(diffYears);
  const mesesRestantes = Math.floor((diffYears - anios) * 12);
  
  if (anios === 0) {
    const meses = Math.floor(diffMonths);
    return { 
      anios: 0, 
      meses, 
      texto: meses === 0 ? '< 1 mes' : `${meses} mes${meses > 1 ? 'es' : ''}`
    };
  }
  
  return { 
    anios, 
    meses: mesesRestantes,
    texto: `${anios} año${anios > 1 ? 's' : ''}${mesesRestantes > 0 ? ` ${mesesRestantes}m` : ''}`
  };
};

// Función para calcular adicional por antigüedad (1% por año por defecto)
const calcularAdicionalAntiguedad = (sueldoBase: number, aniosAntiguedad: number, porcentajePorAnio: number = 1): number => {
  return sueldoBase * (porcentajePorAnio / 100) * aniosAntiguedad;
};

interface EmployeePayrollProps {
  filterType: 'total' | 'month';
  selectedMonth: string;
}
const EmployeePayrollComponent: React.FC<EmployeePayrollProps> = ({ filterType, selectedMonth }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: employees } = useSelector((state: RootState) => state.employees);
  const { items: gastos } = useSelector((state: RootState) => state.gastos);
  const { items: descuentos } = useSelector((state: RootState) => state.descuentosEmpleado);
  const { items: incentivos } = useSelector((state: RootState) => state.incentivosEmpleado);

 useEffect(() => {
  dispatch(fetchGastos({todosPeriodos: true}));
  // Cargar descuentos e incentivos del período seleccionado
  if (filterType === 'month') {
    dispatch(fetchDescuentos({ periodoAplicacion: selectedMonth }));
    dispatch(fetchIncentivos({ periodoAplicacion: selectedMonth }));
  } else {
    dispatch(fetchDescuentos({}));
    dispatch(fetchIncentivos({}));
  }
  }, [dispatch, filterType, selectedMonth]);
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
        // Calcular antigüedad desde fecha de ingreso
        const antiguedadInfo = calcularAntiguedad(employee.fechaIngreso);
        const adicionalAntiguedad = (employee as any).aplicaAntiguedad === false
          ? 0
          : calcularAdicionalAntiguedad(employee.sueldoBase, antiguedadInfo.anios);
        const sueldoBruto = employee.sueldoBase + adicionalAntiguedad;
        
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
        // bonus removed

        // Calcular saldo pendiente usando sueldo bruto (base + antigüedad)
        // Horas extra, aguinaldos y bonus NO afectan el sueldo base
        const pagosContraBasicos = sueldos + adelantos;
        
        // Calcular descuentos e incentivos del empleado
        const descuentosEmpleado = descuentos
          .filter(d => {
            const empId = typeof d.empleadoId === 'string' ? d.empleadoId : d.empleadoId._id;
            return empId === employee._id && d.estado !== 'anulado';
          })
          .reduce((sum, d) => sum + (d.montoCalculado || d.monto), 0);
        
        const incentivosEmpleado = incentivos
          .filter(i => {
            const empId = typeof i.empleadoId === 'string' ? i.empleadoId : i.empleadoId._id;
            return empId === employee._id && i.estado !== 'anulado';
          })
          .reduce((sum, i) => sum + (i.montoCalculado || i.monto), 0);
        
        // Saldo pendiente: sueldo bruto - pagos + incentivos - descuentos
        const saldoPendiente = sueldoBruto - pagosContraBasicos - descuentosEmpleado + incentivosEmpleado;

        return {
          employeeId: employee._id || '',
          nombre: employee.nombre,
          apellido: employee.apellido,
          sueldoBase: employee.sueldoBase,
          antiguedadAnios: antiguedadInfo.anios,
          antiguedadTexto: antiguedadInfo.texto,
          adicionalAntiguedad,
          sueldoBruto,
          modalidad: employee.modalidadContratacion || 'informal',
          totalPagado,
          adelantos,
          horasExtra,
          sueldos,
          aguinaldos,
          // bonus removed
          descuentos: descuentosEmpleado,
          incentivos: incentivosEmpleado,
          saldoPendiente
        };
      });
  }, [employees, sueldosActivos, descuentos, incentivos]);

  // Calcular totales generales
  const totales = payrollData.reduce((acc, emp) => ({
    sueldoBase: acc.sueldoBase + emp.sueldoBase,
    adicionalAntiguedad: acc.adicionalAntiguedad + emp.adicionalAntiguedad,
    sueldoBruto: acc.sueldoBruto + emp.sueldoBruto,
    totalPagado: acc.totalPagado + emp.totalPagado,
    adelantos: acc.adelantos + emp.adelantos,
    horasExtra: acc.horasExtra + emp.horasExtra,
    sueldos: acc.sueldos + emp.sueldos,
    aguinaldos: acc.aguinaldos + emp.aguinaldos,
    // bonus removed
    descuentos: acc.descuentos + (emp.descuentos || 0),
    incentivos: acc.incentivos + (emp.incentivos || 0),
    saldoPendiente: acc.saldoPendiente + emp.saldoPendiente
  }), { 
    sueldoBase: 0,
    adicionalAntiguedad: 0,
    sueldoBruto: 0,
    totalPagado: 0, 
    adelantos: 0, 
    horasExtra: 0,
    sueldos: 0,
    aguinaldos: 0,
    // bonus removed
    descuentos: 0,
    incentivos: 0,
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
          <strong>Información:</strong> Los datos se calculan automáticamente. El <strong>Sueldo Bruto</strong> incluye 
          el Sueldo Base + Adicional por Antigüedad (1% por año). El saldo pendiente se calcula como: 
          Sueldo Bruto - Pagos + Incentivos - Descuentos. Las horas extra y aguinaldos son pagos adicionales.
        </Typography>
      </Alert>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Empleados activos: {payrollData.length} | Registros de sueldos: {sueldosActivos.length} | 
        Descuentos: {descuentos.filter(d => d.estado !== 'anulado').length} | 
        Incentivos: {incentivos.filter(i => i.estado !== 'anulado').length}
      </Typography>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Empleado</strong></TableCell>
              <TableCell align="center">
                <Tooltip title="Modalidad de contratación del empleado">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                    <WorkIcon fontSize="small" />
                    <strong>Modalidad</strong>
                  </Box>
                </Tooltip>
              </TableCell>
              <TableCell align="right"><strong>Sueldo Base</strong></TableCell>
              <TableCell align="center">
                <Tooltip title="Años de antigüedad desde fecha de ingreso">
                  <strong>Antigüedad</strong>
                </Tooltip>
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Adicional por antigüedad (1% del sueldo base por año)">
                  <strong>Adic. Antigüedad</strong>
                </Tooltip>
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Sueldo Base + Adicional por Antigüedad">
                  <strong>Sueldo Bruto</strong>
                </Tooltip>
              </TableCell>
              <TableCell align="right"><strong>Sueldos</strong></TableCell>
              <TableCell align="right"><strong>Adelantos</strong></TableCell>
              <TableCell align="right"><strong>Horas Extra</strong></TableCell>
              <TableCell align="right"><strong>Aguinaldos</strong></TableCell>
              {/* Bonus column removed */}
              <TableCell align="right">
                <Tooltip title="Descuentos por sanciones, faltantes, etc.">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                    <DescuentoIcon fontSize="small" color="error" />
                    <strong>Descuentos</strong>
                  </Box>
                </Tooltip>
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Incentivos, premios, bonificaciones">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                    <IncentivoIcon fontSize="small" color="success" />
                    <strong>Incentivos</strong>
                  </Box>
                </Tooltip>
              </TableCell>
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
                
                <TableCell align="center">
                  <Chip
                    icon={<WorkIcon />}
                    label={employee.modalidad === 'formal' ? 'Formal' : 'Informal'}
                    size="small"
                    color={employee.modalidad === 'formal' ? 'success' : 'warning'}
                    variant="outlined"
                  />
                </TableCell>
                
                <TableCell align="right">
                  <Typography variant="body2" color="primary">
                    {formatCurrency(employee.sueldoBase)}
                  </Typography>
                </TableCell>
                
                <TableCell align="center">
                  <Chip
                    label={employee.antiguedadTexto || `${employee.antiguedadAnios || 0} ${(employee.antiguedadAnios || 0) === 1 ? 'año' : 'años'}`}
                    size="small"
                    color="default"
                    variant="outlined"
                  />
                </TableCell>
                
                <TableCell align="right">
                  <Typography variant="body2" color="info.main">
                    {formatCurrency(employee.adicionalAntiguedad || 0)}
                  </Typography>
                </TableCell>
                
                <TableCell align="right">
                  <Typography variant="body2" color="primary" fontWeight="medium">
                    {formatCurrency(employee.sueldoBruto || employee.sueldoBase)}
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
                
                {/* Bonus cell removed */}
                
                <TableCell align="right">
                  <Typography variant="body2" color="error.main" fontWeight={(employee.descuentos || 0) > 0 ? 'bold' : 'normal'}>
                    {(employee.descuentos || 0) > 0 ? `-${formatCurrency(employee.descuentos || 0)}` : formatCurrency(0)}
                  </Typography>
                </TableCell>
                
                <TableCell align="right">
                  <Typography variant="body2" color="success.main" fontWeight={(employee.incentivos || 0) > 0 ? 'bold' : 'normal'}>
                    {(employee.incentivos || 0) > 0 ? `+${formatCurrency(employee.incentivos || 0)}` : formatCurrency(0)}
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
                  {getStatusChip(employee.saldoPendiente, employee.sueldoBruto || employee.sueldoBase)}
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
              <TableCell align="center">
                {/* Modalidad - columna vacía en totales */}
              </TableCell>
              <TableCell align="right">
                <Typography variant="h6" color="primary" fontWeight="bold">
                  {formatCurrency(totales.sueldoBase)}
                </Typography>
              </TableCell>
              <TableCell align="center">
                {/* Antigüedad - columna vacía en totales */}
              </TableCell>
              <TableCell align="right">
                <Typography variant="h6" color="info.main" fontWeight="bold">
                  {formatCurrency(totales.adicionalAntiguedad || 0)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="h6" color="primary" fontWeight="bold">
                  {formatCurrency(totales.sueldoBruto || totales.sueldoBase)}
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
              {/* Bonus total removed */}
              <TableCell align="right">
                <Typography variant="h6" fontWeight="bold" color="error.main">
                  -{formatCurrency(totales.descuentos)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="h6" fontWeight="bold" color="success.main">
                  +{formatCurrency(totales.incentivos)}
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
                <TableCell colSpan={15} align="center">
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
          📊 <strong>Saldo Pendiente:</strong> Se calcula como Sueldo Base - (Sueldos + Adelantos). Las horas extra y aguinaldos NO afectan el cálculo del sueldo base.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          💰 <strong>Pagos Adicionales:</strong> Horas extra y aguinaldos son compensaciones adicionales independientes del sueldo base
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          📉 <strong>Descuentos:</strong> Sanciones, faltantes de caja, roturas, ausencias y otros descuentos aplicados al empleado
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          🏆 <strong>Incentivos:</strong> Premios por productividad, ventas, presentismo perfecto, comisiones y bonificaciones especiales
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          🔍 <strong>Filtro:</strong> {filterType === 'total' ? 'Histórico completo' : `Período: ${monthName}`}
        </Typography>
      </Box>
    </Paper>
  );
};

export default EmployeePayrollComponent;