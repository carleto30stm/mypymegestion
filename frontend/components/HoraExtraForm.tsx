import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import { addHoraExtra, updateHoraExtra } from '../redux/slices/horasExtraSlice';
import { fetchEmployees } from '../redux/slices/employeesSlice';
import { formatCurrency } from '../utils/formatters';
import { HoraExtra } from '../types';
import {
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Box,
  Typography,
  Alert,
  InputAdornment
} from '@mui/material';

interface HoraExtraFormProps {
  horaExtra?: HoraExtra | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const HoraExtraForm: React.FC<HoraExtraFormProps> = ({ horaExtra, onSuccess, onCancel }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: employees } = useSelector((state: RootState) => state.employees);
  
  const [formData, setFormData] = useState({
    empleadoId: '',
    fecha: new Date().toISOString().split('T')[0],
    cantidadHoras: '',
    descripcion: ''
  });

  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [montoCalculado, setMontoCalculado] = useState(0);
  const [error, setError] = useState('');

  // Cargar empleados al montar el componente
  useEffect(() => {
    if (employees.length === 0) {
      dispatch(fetchEmployees());
    }
  }, [dispatch, employees.length]);

  // Cargar datos si es edición
  useEffect(() => {
    if (horaExtra) {
      setFormData({
        empleadoId: horaExtra.empleadoId,
        fecha: horaExtra.fecha,
        cantidadHoras: horaExtra.cantidadHoras.toString(),
        descripcion: horaExtra.descripcion || ''
      });
      
      // Encontrar el empleado
      const employee = employees.find(emp => emp._id === horaExtra.empleadoId);
      if (employee) {
        setSelectedEmployee(employee);
        calculateMonto(horaExtra.cantidadHoras, employee.hora);
      }
    }
  }, [horaExtra, employees]);

  // Calcular monto cuando cambia la cantidad de horas o el empleado
  const calculateMonto = (horas: number, valorHora: number) => {
    // Factor de 1.5 para horas extra
    const monto = horas * valorHora * 1.5;
    setMontoCalculado(monto);
  };

  const handleEmployeeChange = (empleadoId: string) => {
    const employee = employees.find(emp => emp._id === empleadoId);
    setSelectedEmployee(employee);
    setFormData(prev => ({ ...prev, empleadoId }));
    
    if (employee && formData.cantidadHoras) {
      calculateMonto(parseFloat(formData.cantidadHoras), employee.hora);
    }
  };

  const handleHorasChange = (value: string) => {
    // Solo permitir números y un punto decimal
    const cleanValue = value.replace(/[^0-9.]/g, '');
    
    // Evitar múltiples puntos decimales
    const parts = cleanValue.split('.');
    if (parts.length > 2) {
      return;
    }
    
    // Limitar decimales a 2 dígitos
    if (parts[1] && parts[1].length > 2) {
      parts[1] = parts[1].substring(0, 2);
    }
    
    const finalValue = parts.join('.');
    setFormData(prev => ({ ...prev, cantidadHoras: finalValue }));
    
    if (selectedEmployee && finalValue) {
      const horas = parseFloat(finalValue);
      if (!isNaN(horas) && horas > 0) {
        calculateMonto(horas, selectedEmployee.hora);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (!formData.empleadoId) {
      setError('Debe seleccionar un empleado');
      return;
    }

    if (!formData.fecha) {
      setError('Debe ingresar una fecha');
      return;
    }

    const horas = parseFloat(formData.cantidadHoras);
    if (!horas || horas <= 0) {
      setError('Debe ingresar una cantidad de horas válida');
      return;
    }

    if (!selectedEmployee) {
      setError('Error al obtener datos del empleado');
      return;
    }

    try {
      const payload = {
        empleadoId: formData.empleadoId,
        empleadoNombre: selectedEmployee.nombre,
        empleadoApellido: selectedEmployee.apellido,
        fecha: formData.fecha,
        cantidadHoras: horas,
        valorHora: selectedEmployee.hora,
        descripcion: formData.descripcion,
        estado: 'registrada' as const
      };

      if (horaExtra?._id) {
        await dispatch(updateHoraExtra({ 
          id: horaExtra._id, 
          horaExtra: payload 
        })).unwrap();
      } else {
        await dispatch(addHoraExtra(payload)).unwrap();
      }

      onSuccess();
    } catch (error) {
      console.error('Error al guardar hora extra:', error);
      setError('Error al guardar la hora extra. Por favor, intenta nuevamente.');
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {horaExtra ? 'Editar Hora Extra' : 'Registrar Horas Extra'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Empleado</InputLabel>
              <Select
                value={formData.empleadoId}
                label="Empleado"
                onChange={(e) => handleEmployeeChange(e.target.value)}
                disabled={!!horaExtra} // No permitir cambiar empleado en edición
              >
                {employees
                  .filter(emp => emp.estado === 'activo')
                  .map((employee) => (
                    <MenuItem key={employee._id} value={employee._id}>
                      {employee.apellido}, {employee.nombre} - {employee.puesto}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Fecha"
              type="date"
              value={formData.fecha}
              onChange={(e) => setFormData(prev => ({ ...prev, fecha: e.target.value }))}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Cantidad de Horas"
              type="text"
              value={formData.cantidadHoras}
              onChange={(e) => handleHorasChange(e.target.value)}
              fullWidth
              required
              placeholder="Ej: 2.5"
              helperText="Ingrese la cantidad de horas extra realizadas"
            />
          </Grid>

          {selectedEmployee && (
            <Grid item xs={12} sm={6}>
              <TextField
                label="Valor Hora Base"
                value={formatCurrency(selectedEmployee.hora)}
                fullWidth
                disabled
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                helperText="Valor hora del empleado (se aplica factor 1.5x para extras)"
              />
            </Grid>
          )}

          {montoCalculado > 0 && (
            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Monto calculado:</strong> {formatCurrency(montoCalculado)}
                  <br />
                  <em>({formData.cantidadHoras} horas × {formatCurrency(selectedEmployee?.hora || 0)} × 1.5)</em>
                </Typography>
              </Alert>
            </Grid>
          )}

          <Grid item xs={12}>
            <TextField
              label="Descripción (Opcional)"
              value={formData.descripcion}
              onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
              fullWidth
              multiline
              rows={3}
              placeholder="Descripción del trabajo extra realizado..."
            />
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
          <Button onClick={onCancel}>Cancelar</Button>
          <Button type="submit" variant="contained">
            {horaExtra ? 'Actualizar' : 'Registrar'}
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default HoraExtraForm;