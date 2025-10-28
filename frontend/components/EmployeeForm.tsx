import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../redux/store';
import { addEmployee, updateEmployee } from '../redux/slices/employeesSlice';
import { formatCurrency } from '../utils/formatters';
import { Employee } from '../types';
import {
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Box,
  InputAdornment
} from '@mui/material';

interface EmployeeFormProps {
  employee?: Employee | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const EmployeeForm: React.FC<EmployeeFormProps> = ({ employee, onSuccess, onCancel }) => {
  const dispatch = useDispatch<AppDispatch>();
  
  const [formData, setFormData] = useState<Omit<Employee, '_id'>>({
    nombre: '',
    apellido: '',
    documento: '',
    puesto: '',
    fechaIngreso: new Date().toISOString().split('T')[0],
    sueldoBase: 0,
    hora: 0,
    estado: 'activo',
    email: '',
    telefono: '',
    observaciones: ''
  });

  // Estado separado para el valor formateado del sueldo
  const [sueldoFormatted, setSueldoFormatted] = useState('');
  const [horaFormatted, setHoraFormatted] = useState('');

  // Función para formatear el número mientras se escribe (con decimales)
  const formatNumberInput = (value: string): string => {
    // Si el valor está vacío, retornar vacío
    if (!value) return '';
    
    // Permitir solo números y una coma
    const cleanValue = value.replace(/[^\d,]/g, '');
    
    // Si solo hay una coma al final, permitirla
    if (cleanValue === ',') return '';
    
    // Dividir por la coma (separador decimal argentino)
    const parts = cleanValue.split(',');
    
    // Solo permitir una coma
    if (parts.length > 2) {
      // Si hay más de una coma, tomar solo las primeras dos partes
      parts.splice(2);
    }
    
    // Parte entera
    let integerPart = parts[0] || '';
    
    // Formatear la parte entera con puntos cada tres dígitos (solo si tiene valor)
    if (integerPart.length > 0) {
      const num = parseInt(integerPart, 10);
      if (!isNaN(num) && num > 0) {
        integerPart = num.toLocaleString('es-AR');
      } else if (integerPart === '0') {
        integerPart = '0';
      }
    }
    
    // Parte decimal (máximo 2 dígitos)
    let decimalPart = parts[1];
    if (decimalPart !== undefined) {
      if (decimalPart.length > 2) {
        decimalPart = decimalPart.substring(0, 2);
      }
      // Si hay parte decimal (incluso vacía), agregar la coma
      return `${integerPart},${decimalPart}`;
    }
    
    // Si termina con coma en el input original, mantenerla
    if (value.endsWith(',') && parts.length === 2) {
      return `${integerPart},`;
    }
    
    return integerPart;
  };

  // Función para obtener el valor numérico desde el formato visual (con decimales)
  const getNumericValue = (formattedValue: string): number => {
    // Si el valor está vacío, solo una coma, solo un punto, o no es numérico, retornar 0
    if (!formattedValue || formattedValue === ',' || formattedValue === '.') return 0;
    // Si tiene coma, es decimal argentino
    if (formattedValue.includes(',')) {
      const cleanValue = formattedValue.replace(/\./g, '').replace(',', '.');
      const parsed = parseFloat(cleanValue);
      return isNaN(parsed) ? 0 : parsed;
    } else {
      // Si no tiene coma, tomar como entero (remover puntos)
      const cleanValue = formattedValue.replace(/\./g, '');
      const parsed = parseInt(cleanValue, 10);
      return isNaN(parsed) ? 0 : parsed;
    }
  };

  useEffect(() => {
    if (employee) {
      setFormData({
        nombre: employee.nombre,
        apellido: employee.apellido,
        documento: employee.documento,
        puesto: employee.puesto,
        fechaIngreso: employee.fechaIngreso,
        sueldoBase: employee.sueldoBase,
        hora: employee.hora,
        estado: employee.estado,
        email: employee.email || '',
        telefono: employee.telefono || '',
        observaciones: employee.observaciones || ''
      });
      
      // Formatear el sueldo existente con decimales
      if (employee.sueldoBase && employee.sueldoBase > 0) {
        setSueldoFormatted(formatCurrency(employee.sueldoBase));
      }
      
      // Formatear la hora existente con decimales
      if (employee.hora && employee.hora > 0) {
        setHoraFormatted(formatCurrency(employee.hora));
      }
    } else {
      setFormData({
        nombre: '',
        apellido: '',
        documento: '',
        puesto: '',
        fechaIngreso: new Date().toISOString().split('T')[0],
        sueldoBase: 0,
        hora: 0,
        estado: 'activo',
        email: '',
        telefono: '',
        observaciones: ''
      });
      setSueldoFormatted('');
      setHoraFormatted('');
    }
  }, [employee]);

  const handleChange = (field: keyof typeof formData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: unknown } }
  ) => {
    const value = event.target.value as string;
    
    // Manejar campo sueldo con formato especial
    if (field === 'sueldoBase') {
      const formatted = formatNumberInput(value);
      setSueldoFormatted(formatted);
      const numericValue = getNumericValue(formatted);
      setFormData(prev => ({
        ...prev,
        sueldoBase: numericValue
      }));
      return;
      
      // Manejar campo hora con formato especial
    } else if (field === 'hora') {
      const formatted = formatNumberInput(value);
      setHoraFormatted(formatted);
      const numericValue = getNumericValue(formatted);
      setFormData(prev => ({
        ...prev,
        hora: numericValue
      }));
      return;
    }
    
    // Para otros campos, comportamiento normal
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (employee?._id) {
        await dispatch(updateEmployee({ id: employee._id, employee: formData })).unwrap();
      } else {
        await dispatch(addEmployee(formData)).unwrap();
      }
      onSuccess();
    } catch (error) {
      console.error('Error al guardar empleado:', error);
      alert('Error al guardar el empleado. Por favor, intenta nuevamente.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Box sx={{ mt: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Nombre"
              value={formData.nombre}
              onChange={handleChange('nombre')}
              fullWidth
              required
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              label="Apellido"
              value={formData.apellido}
              onChange={handleChange('apellido')}
              fullWidth
              required
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              label="Documento (DNI)"
              value={formData.documento}
              onChange={handleChange('documento')}
              fullWidth
              required
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              label="Puesto"
              value={formData.puesto}
              onChange={handleChange('puesto')}
              fullWidth
              required
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              label="Fecha de Ingreso"
              type="date"
              value={formData.fechaIngreso}
              onChange={handleChange('fechaIngreso')}
              fullWidth
              required
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              label="Sueldo Base"
              type="text"
              value={sueldoFormatted}
              onChange={handleChange('sueldoBase')}
              fullWidth
              required
              placeholder="Ej: 150.000,50"
              helperText="Formato: 1.000,50 (usar coma para decimales)"
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Valor Hora"
              type="text"
              value={horaFormatted}
              onChange={handleChange('hora')}
              fullWidth
              required
              placeholder="Ej: 150.000,50"
              helperText="Formato: 1.000,50 (usar coma para decimales)"
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Estado</InputLabel>
              <Select
                value={formData.estado}
                label="Estado"
                onChange={handleChange('estado')}
              >
                <MenuItem value="activo">Activo</MenuItem>
                <MenuItem value="inactivo">Inactivo</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              fullWidth
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              label="Teléfono"
              value={formData.telefono}
              onChange={handleChange('telefono')}
              fullWidth
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              label="Observaciones"
              value={formData.observaciones}
              onChange={handleChange('observaciones')}
              fullWidth
              multiline
              rows={3}
            />
          </Grid>
        </Grid>
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
          <Button onClick={onCancel}>Cancelar</Button>
          <Button type="submit" variant="contained">
            {employee ? 'Actualizar' : 'Crear'}
          </Button>
        </Box>
      </Box>
    </form>
  );
};

export default EmployeeForm;