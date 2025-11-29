import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../redux/store';
import { addEmployee, updateEmployee } from '../../redux/slices/employeesSlice';
import { fetchCategories } from '../../redux/slices/categoriesSlice';
import { formatCurrency, formatNumberInput, getNumericValue } from '../../utils/formatters';
import { Employee } from '../../types';
import {
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Box,
  InputAdornment,
  SelectChangeEvent
} from '@mui/material';

interface EmployeeFormProps {
  employee?: Employee | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const EmployeeForm: React.FC<EmployeeFormProps> = ({ employee, onSuccess, onCancel }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: categories } = useSelector((state: RootState) => state.categories);
  
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
    direccion: '',
    fechaNacimiento: '',
    observaciones: '',
    categoria: '',
    antiguedad: 0
  });

  // Estado separado para el valor formateado del sueldo
  const [sueldoFormatted, setSueldoFormatted] = useState('');
  const [horaFormatted, setHoraFormatted] = useState('');

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

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
        direccion: employee.direccion || '',
        fechaNacimiento: employee.fechaNacimiento || '',
        observaciones: employee.observaciones || '',
        categoria: employee.categoria,
        antiguedad: employee.antiguedad || 0
      });
      
      if (employee.sueldoBase && employee.sueldoBase > 0) {
        setSueldoFormatted(formatCurrency(employee.sueldoBase));
      } else {
        setSueldoFormatted('');
      }
      if (employee.hora && employee.hora > 0) {
        setHoraFormatted(formatCurrency(employee.hora));
      } else {
        setHoraFormatted('');
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
        direccion: '',
        fechaNacimiento: '',
        observaciones: '',
        categoria: '',
        antiguedad: 0
      });
      setSueldoFormatted('');
      setHoraFormatted('');
    }
  }, [employee]);

  const handleChange = (field: keyof typeof formData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent
  ) => {
    const value = event.target.value as string;
    
    if (field === 'sueldoBase') {
      const formatted = formatNumberInput(value);
      setSueldoFormatted(formatted);
      const numericValue = getNumericValue(formatted);
      setFormData(prev => ({ ...prev, sueldoBase: numericValue }));
      return;
    } else if (field === 'hora') {
      const formatted = formatNumberInput(value);
      setHoraFormatted(formatted);
      const numericValue = getNumericValue(formatted);
      setFormData(prev => ({ ...prev, hora: numericValue }));
      return;
    } else if (field === 'antiguedad') {
      const numericValue = parseInt(value, 10);
      setFormData(prev => ({ ...prev, antiguedad: isNaN(numericValue) ? 0 : numericValue }));
      return;
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCategoryChange = (event: SelectChangeEvent) => {
    const categoryId = event.target.value;
    const selectedCategory = categories.find(c => c._id === categoryId);
    
    if (selectedCategory) {
      setFormData(prev => ({
        ...prev,
        categoria: categoryId,
        sueldoBase: selectedCategory.sueldoBasico,
        hora: selectedCategory.valorHora || 0,
        puesto: selectedCategory.nombre // Opcional: actualizar puesto con nombre de categoría
      }));
      setSueldoFormatted(formatCurrency(selectedCategory.sueldoBasico));
      setHoraFormatted(formatCurrency(selectedCategory.valorHora || 0));
    } else {
      setFormData(prev => ({ ...prev, categoria: '' }));
      setSueldoFormatted('');
      setHoraFormatted('');
    }
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
            <FormControl fullWidth>
              <InputLabel>Categoría</InputLabel>
              <Select
                value={formData.categoria || ''}
                label="Categoría"
                onChange={handleCategoryChange}
              >
                <MenuItem value=""><em>Ninguna</em></MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat._id} value={cat._id}>
                    {cat.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              label="Puesto"
              value={formData.puesto}
              onChange={handleChange('puesto')}
              fullWidth
              required
              helperText="Se actualiza automáticamente al seleccionar categoría"
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
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Antigüedad (Años)"
              type="number"
              value={formData.antiguedad}
              onChange={handleChange('antiguedad')}
              fullWidth
              InputProps={{ inputProps: { min: 0 } }}
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
              helperText="Se actualiza automáticamente al seleccionar categoría"
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
              helperText="Se actualiza automáticamente al seleccionar categoría"
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
          
          <Grid item xs={12} sm={6}>
            <TextField
              label="Dirección"
              value={formData.direccion}
              onChange={handleChange('direccion')}
              fullWidth
              placeholder="Ej: Calle 123, Ciudad, Provincia"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              label="Fecha de Nacimiento"
              type="date"
              value={formData.fechaNacimiento}
              onChange={handleChange('fechaNacimiento')}
              fullWidth
              InputLabelProps={{ shrink: true }}
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