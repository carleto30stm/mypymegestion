import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../redux/store';
import { addEmployee, updateEmployee } from '../../redux/slices/employeesSlice';
import { categoriasAPI, CategoriaUnificada } from '../../services/rrhhService';
import { formatCurrency, formatNumberInput, getNumericValue } from '../../utils/formatters';
import { Employee, ObraSocial } from '../../types';
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
  SelectChangeEvent,
  Typography,
  Divider,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface EmployeeFormProps {
  employee?: Employee | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const EmployeeForm: React.FC<EmployeeFormProps> = ({ employee, onSuccess, onCancel }) => {
  const dispatch = useDispatch<AppDispatch>();
  
  // Estado local para categorías unificadas (internas + CCT)
  const [categorias, setCategorias] = useState<CategoriaUnificada[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(false);
  
  const [formData, setFormData] = useState<Omit<Employee, '_id'>>({
    nombre: '',
    apellido: '',
    documento: '',
    puesto: '',
    fechaIngreso: new Date().toISOString().split('T')[0],
    sueldoBase: 0,
    hora: 0,
    estado: 'activo',
    modalidadContratacion: 'informal', // Por defecto informal (pago en mano)
    email: '',
    telefono: '',
    direccion: '',
    fechaNacimiento: '',
    observaciones: '',
    categoria: '',
    antiguedad: 0,
    // Flags para controlar aplicación de adicionales en la liquidación
    aplicaAntiguedad: true,
    aplicaPresentismo: true,
    aplicaZonaPeligrosa: false,
    // Campos Argentina
    cuit: '',
    legajo: '',
    cbu: '',
    sindicato: '',
    obraSocial: {
      nombre: '',
      numero: ''
    },
    // legacy `adicionales` removed; use top-level flags `aplica*`
  });

  // Estado separado para el valor formateado del sueldo
  const [sueldoFormatted, setSueldoFormatted] = useState('');
  const [horaFormatted, setHoraFormatted] = useState('');
  
  // No manejamos más `adicionales` anidados; usamos solo flags `aplica*`

  useEffect(() => {
    const cargarCategorias = async () => {
      setLoadingCategorias(true);
      try {
        // Cargar todas las categorías (con y sin valorHora) para empleados
        const data = await categoriasAPI.obtenerTodasParaManoObra(false);
        setCategorias(data);
      } catch (error) {
        console.error('Error cargando categorías:', error);
      } finally {
        setLoadingCategorias(false);
      }
    };
    cargarCategorias();
  }, []);

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
        modalidadContratacion: employee.modalidadContratacion || 'informal',
        email: employee.email || '',
        telefono: employee.telefono || '',
        direccion: employee.direccion || '',
        fechaNacimiento: employee.fechaNacimiento || '',
        observaciones: employee.observaciones || '',
        categoria: employee.categoria,
        antiguedad: employee.antiguedad || 0,
        aplicaAntiguedad: typeof (employee as any).aplicaAntiguedad !== 'undefined' ? (employee as any).aplicaAntiguedad : true,
        aplicaPresentismo: typeof (employee as any).aplicaPresentismo !== 'undefined' ? (employee as any).aplicaPresentismo : true,
        aplicaZonaPeligrosa: typeof (employee as any).aplicaZonaPeligrosa !== 'undefined' ? (employee as any).aplicaZonaPeligrosa : false,
        // Campos Argentina
        cuit: employee.cuit || '',
        legajo: employee.legajo || '',
        cbu: employee.cbu || '',
        sindicato: employee.sindicato || '',
        obraSocial: employee.obraSocial || { nombre: '', numero: '' },
        // legacy `adicionales` intentionally ignored; migrate to top-level flags
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
        modalidadContratacion: 'informal',
        email: '',
        telefono: '',
        direccion: '',
        fechaNacimiento: '',
        observaciones: '',
        categoria: '',
        antiguedad: 0,
        aplicaAntiguedad: true,
        aplicaPresentismo: true,
        aplicaZonaPeligrosa: false,
        // Campos Argentina
        cuit: '',
        legajo: '',
        cbu: '',
        sindicato: '',
        obraSocial: { nombre: '', numero: '' },
        // legacy `adicionales` intentionally not included
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
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Manejador para campos de Obra Social
  const handleObraSocialChange = (field: keyof ObraSocial) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      obraSocial: {
        nombre: prev.obraSocial?.nombre ?? '',
        numero: prev.obraSocial?.numero ?? '',
        [field]: value
      }
    }));
  };

  // Switches para aplicar conceptos en la liquidación
  const handleAplicarFlag = (field: 'aplicaAntiguedad' | 'aplicaPresentismo' | 'aplicaZonaPeligrosa') => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: event.target.checked }));
  };

  // Agregar/eliminar de `adicionales` legacy eliminado

  // Validar CUIT argentino (formato XX-XXXXXXXX-X)
  const formatCUIT = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 10) return `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 10)}-${cleaned.slice(10, 11)}`;
  };

  const handleCUITChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCUIT(event.target.value);
    setFormData(prev => ({ ...prev, cuit: formatted }));
  };

  // Formatear CBU (22 dígitos)
  const handleCBUChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = event.target.value.replace(/\D/g, '').slice(0, 22);
    setFormData(prev => ({ ...prev, cbu: cleaned }));
  };

  const handleCategoryChange = (event: SelectChangeEvent) => {
    const categoryId = event.target.value;
    const selectedCategory = categorias.find(c => c._id === categoryId);
    
    if (selectedCategory) {
      setFormData(prev => ({
        ...prev,
        categoria: categoryId,
        sueldoBase: selectedCategory.sueldoBasico || 0,
        hora: selectedCategory.valorHora || 0,
        puesto: selectedCategory.nombre.split(' (')[0] // Quitar el nombre del convenio si existe
      }));
      setSueldoFormatted(formatCurrency(selectedCategory.sueldoBasico || 0));
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
                disabled={loadingCategorias}
              >
                <MenuItem value=""><em>Ninguna</em></MenuItem>
                {categorias.map((cat) => (
                  <MenuItem key={cat._id} value={cat._id}>
                    {cat.origen === 'convenio' ? '📋 ' : '🏢 '}{cat.nombre}
                    {cat.sueldoBasico ? ` - $${cat.sueldoBasico.toLocaleString('es-AR')}` : ''}
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
              type="text"
              value={(() => {
                if (!formData.fechaIngreso) return '-';
                const ingreso = new Date(formData.fechaIngreso);
                const hoy = new Date();
                const diffMs = hoy.getTime() - ingreso.getTime();
                const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);
                if (diffYears < 0) return '0';
                if (diffYears < 1) {
                  const meses = Math.floor(diffYears * 12);
                  return meses === 0 ? 'Menos de 1 mes' : `${meses} mes${meses > 1 ? 'es' : ''}`;
                }
                return `${Math.floor(diffYears)} año${Math.floor(diffYears) > 1 ? 's' : ''}`;
              })()}
              fullWidth
              disabled
              InputProps={{ readOnly: true }}
              helperText="Calculado automáticamente desde la fecha de ingreso"
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
            <FormControl fullWidth required>
              <InputLabel>Modalidad de Contratación</InputLabel>
              <Select
                value={formData.modalidadContratacion || 'informal'}
                label="Modalidad de Contratación"
                onChange={handleChange('modalidadContratacion')}
              >
                <MenuItem value="informal">💵 Informal (Pago en mano)</MenuItem>
                <MenuItem value="formal">📋 Formal (Con aportes)</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {formData.modalidadContratacion === 'formal' 
                ? 'Se aplicarán aportes y contribuciones legales' 
                : 'Sin aportes, se paga el bruto completo'}
            </Typography>
          </Grid>

          {/* Switches para decidir si aplicar antigüedad/presentismo/zona peligrosa */}
          <Grid item xs={12} sm={4}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.aplicaAntiguedad ?? true}
                  onChange={handleAplicarFlag('aplicaAntiguedad')}
                />
              }
              label="Aplicar Antigüedad"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.aplicaPresentismo ?? true}
                  onChange={handleAplicarFlag('aplicaPresentismo')}
                />
              }
              label="Aplicar Presentismo"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.aplicaZonaPeligrosa ?? false}
                  onChange={handleAplicarFlag('aplicaZonaPeligrosa')}
                />
              }
              label="Aplicar Zona Peligrosa"
            />
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

          {/* Sección Argentina */}
          <Grid item xs={12}>
            <Accordion defaultExpanded={false} sx={{ mt: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" fontWeight="medium">
                  🇦🇷 Datos Laborales Argentina
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="CUIT"
                      value={formData.cuit || ''}
                      onChange={handleCUITChange}
                      fullWidth
                      placeholder="XX-XXXXXXXX-X"
                      helperText="Clave Única de Identificación Tributaria"
                      inputProps={{ maxLength: 13 }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Legajo"
                      value={formData.legajo || ''}
                      onChange={handleChange('legajo')}
                      fullWidth
                      placeholder="Ej: 001234"
                      helperText="Número de legajo interno"
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="CBU"
                      value={formData.cbu || ''}
                      onChange={handleCBUChange}
                      fullWidth
                      placeholder="22 dígitos"
                      helperText="Clave Bancaria Uniforme para depósito de haberes"
                      inputProps={{ maxLength: 22 }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Sindicato"
                      value={formData.sindicato || ''}
                      onChange={handleChange('sindicato')}
                      fullWidth
                      placeholder="Ej: UOCRA, UOM, Comercio"
                    />
                  </Grid>
                  
                  {/* Obra Social */}
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Obra Social
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Nombre Obra Social"
                      value={formData.obraSocial?.nombre || ''}
                      onChange={handleObraSocialChange('nombre')}
                      fullWidth
                      placeholder="Ej: OSECAC, OSDE, Swiss Medical"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Número Afiliado"
                      value={formData.obraSocial?.numero || ''}
                      onChange={handleObraSocialChange('numero')}
                      fullWidth
                      placeholder="Número de afiliado"
                    />
                  </Grid>
                  
                  {/* Adicionales removed — use top-level aplica* flags */}
                </Grid>
              </AccordionDetails>
            </Accordion>
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