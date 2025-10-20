import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../redux/store';
import { addEmployee, updateEmployee } from '../redux/slices/employeesSlice';
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
    estado: 'activo',
    email: '',
    telefono: '',
    observaciones: ''
  });

  useEffect(() => {
    if (employee) {
      setFormData({
        nombre: employee.nombre,
        apellido: employee.apellido,
        documento: employee.documento,
        puesto: employee.puesto,
        fechaIngreso: employee.fechaIngreso,
        sueldoBase: employee.sueldoBase,
        estado: employee.estado,
        email: employee.email || '',
        telefono: employee.telefono || '',
        observaciones: employee.observaciones || ''
      });
    } else {
      setFormData({
        nombre: '',
        apellido: '',
        documento: '',
        puesto: '',
        fechaIngreso: new Date().toISOString().split('T')[0],
        sueldoBase: 0,
        estado: 'activo',
        email: '',
        telefono: '',
        observaciones: ''
      });
    }
  }, [employee]);

  const handleChange = (field: keyof typeof formData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: unknown } }
  ) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: field === 'sueldoBase' ? Number(value) : value
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
              type="number"
              value={formData.sueldoBase}
              onChange={handleChange('sueldoBase')}
              fullWidth
              required
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