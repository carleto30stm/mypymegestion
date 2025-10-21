import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import { createGasto, updateGasto } from '../redux/slices/gastosSlice';
import { fetchEmployees } from '../redux/slices/employeesSlice';
import { Gasto, subRubrosByRubro } from '../types';
import { Grid, TextField, Button, Box, MenuItem, Select, InputLabel, FormControl, Alert } from '@mui/material';
import { formatCurrency, parseCurrency } from '../utils/formatters';

interface ExpenseFormProps {
  onClose: () => void;
  gastoToEdit?: Gasto | null;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ onClose, gastoToEdit }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: employees } = useSelector((state: RootState) => state.employees);

  // Función para formatear el número mientras se escribe
  const formatNumberInput = (value: string): string => {
    // Remover todo excepto números
    const numbers = value.replace(/[^\d]/g, '');
    
    if (numbers === '') return '';
    
    // Convertir a número y formatear con puntos
    const num = parseInt(numbers, 10);
    return num.toLocaleString('es-AR');
  };

  // Función para obtener el valor numérico desde el formato visual
  const getNumericValue = (formattedValue: string): number => {
    if (!formattedValue) return 0;
    // Remover puntos y convertir a número
    const cleanValue = formattedValue.replace(/\./g, '');
    return parseInt(cleanValue, 10) || 0;
  };

  const [formData, setFormData] = useState({
    fecha: '',
    rubro: '',
    subRubro: '',
    medioDePago: '',
    clientes: '',
    detalleGastos: '',
    tipoOperacion: 'salida',
    concepto: 'sueldo',
    comentario: '',
    fechaStandBy: '',
    entrada: '',
    salida: '',
    banco: '',
  });

  // Estados separados para los valores formateados de entrada y salida
  const [entradaFormatted, setEntradaFormatted] = useState('');
  const [salidaFormatted, setSalidaFormatted] = useState('');

  const [validationError, setValidationError] = useState('');

  // Cargar empleados al inicializar el componente
  useEffect(() => {
    dispatch(fetchEmployees());
  }, [dispatch]);

  // Función para validar entrada y salida
  const validateEntradaSalida = (entrada: string, salida: string) => {
    const entradaValue = Number(entrada) || 0;
    const salidaValue = Number(salida) || 0;

    if (entradaValue > 0 && salidaValue > 0) {
      return "No puedes registrar entrada y salida al mismo tiempo.";
    }
    
    if (entradaValue === 0 && salidaValue === 0 && (entrada !== '' || salida !== '')) {
      return "Debes registrar al menos una entrada o una salida.";
    }

    return '';
  };

  useEffect(() => {
    if (gastoToEdit) {
      // Determinar tipoOperacion basado en los valores existentes
      const tipoOperacion = (gastoToEdit.entrada && gastoToEdit.entrada > 0) ? 'entrada' : 'salida';
      
      setFormData({
        fecha: gastoToEdit.fecha ? new Date(gastoToEdit.fecha).toISOString().split('T')[0] : '',
        rubro: gastoToEdit.rubro || '',
        subRubro: gastoToEdit.subRubro || '',
        medioDePago: gastoToEdit.medioDePago || '',
        clientes: gastoToEdit.clientes || '',
        detalleGastos: gastoToEdit.detalleGastos || '',
        tipoOperacion: gastoToEdit.tipoOperacion || tipoOperacion,
        concepto: gastoToEdit.concepto || 'sueldo',
        comentario: gastoToEdit.comentario || '',
        fechaStandBy: gastoToEdit.fechaStandBy ? new Date(gastoToEdit.fechaStandBy).toISOString().split('T')[0] : '',
        entrada: gastoToEdit.entrada?.toString() || '',
        salida: gastoToEdit.salida?.toString() || '',
        banco: gastoToEdit.banco || '',
      });
      
      // Formatear los valores de entrada y salida
      if (gastoToEdit.entrada && gastoToEdit.entrada > 0) {
        setEntradaFormatted(gastoToEdit.entrada.toLocaleString('es-AR'));
      } else {
        setEntradaFormatted('');
      }
      
      if (gastoToEdit.salida && gastoToEdit.salida > 0) {
        setSalidaFormatted(gastoToEdit.salida.toLocaleString('es-AR'));
      } else {
        setSalidaFormatted('');
      }
      
      // Limpiar error de validación al cargar un gasto para editar
      setValidationError('');
    }
  }, [gastoToEdit]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    
    // Manejar campos de entrada y salida con formato especial
    if (name === 'entrada') {
      const formatted = formatNumberInput(value);
      setEntradaFormatted(formatted);
      const numericValue = getNumericValue(formatted);
      setFormData(prev => ({ ...prev, entrada: numericValue.toString() }));
      return;
    }
    
    if (name === 'salida') {
      const formatted = formatNumberInput(value);
      setSalidaFormatted(formatted);
      const numericValue = getNumericValue(formatted);
      setFormData(prev => ({ ...prev, salida: numericValue.toString() }));
      return;
    }
    
    // Para otros campos, comportamiento normal
    let newFormData = {
      ...formData,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value,
    };
    
    // Si cambia el tipo de operación, limpiar los campos de monto correspondientes
    if (name === 'tipoOperacion') {
      if (value === 'entrada') {
        newFormData.salida = '';
        setSalidaFormatted('');
      } else if (value === 'salida') {
        newFormData.entrada = '';
        setEntradaFormatted('');
      }
    }
    
    setFormData(newFormData);

    // Limpiar error de validación cuando cambien los campos relevantes
    if (name === 'entrada' || name === 'salida' || name === 'tipoOperacion') {
      setValidationError('');
    }
  };

  const handleSelectChange = (name: string, value: string) => {  
    if (name === 'rubro') {
      // Si selecciona SUELDOS, cargar empleados
      if (value === 'SUELDOS') {
        dispatch(fetchEmployees());
      }
      
      setFormData(prev => ({ 
        ...prev, 
        rubro: value, 
        subRubro: '' 
      }));
    } else if (name === 'tipoOperacion') {
      // Si cambia el tipo de operación, limpiar los campos de monto correspondientes
      const updatedFormData = {
        ...formData,
        tipoOperacion: value,
      };
      
      if (value === 'entrada') {
        updatedFormData.salida = '';
      } else if (value === 'salida') {
        updatedFormData.entrada = '';
      }
      
      setFormData(updatedFormData);
      setValidationError('');
    } else {
      setFormData(prev => ({ 
        ...prev, 
        [name]: value 
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.rubro || !formData.detalleGastos || !formData.fecha) {
      alert("Rubro, fecha y Detalle son campos requeridos.");
      return;
    }

    const entradaValue = Number(formData.entrada) || 0;
    const salidaValue = Number(formData.salida) || 0;

    // Validar según el tipo de operación
    if (formData.tipoOperacion === 'entrada') {
      if (entradaValue <= 0) {
        setValidationError('Debe ingresar un monto válido para la entrada');
        return;
      }
    } else if (formData.tipoOperacion === 'salida') {
      if (salidaValue <= 0) {
        setValidationError('Debe ingresar un monto válido para la salida');
        return;
      }
    }

    // Si es SUELDOS, validar que tenga concepto
    if (formData.rubro === 'SUELDOS' && !formData.concepto) {
      alert("Para gastos de SUELDOS debe seleccionar un concepto.");
      return;
    }
    
    // Preparar payload según el tipo de operación
    const payload = {
      ...formData,
      rubro: formData.rubro as any,
      subRubro: formData.subRubro as any,
      medioDePago: formData.medioDePago as any,
      banco: formData.banco as any,
      tipoOperacion: formData.tipoOperacion,
      entrada: formData.tipoOperacion === 'entrada' ? entradaValue : 0,
      salida: formData.tipoOperacion === 'salida' ? salidaValue : 0,
    };
    
    if (gastoToEdit) {
      dispatch(updateGasto({ _id: gastoToEdit._id, ...payload } as Gasto));
    } else {
      dispatch(createGasto(payload as any));
    }
    
    // Limpiar error de validación
    setValidationError('');
    onClose();
  };

  const handleClose = () => {
    // Limpiar error de validación al cerrar
    setValidationError('');
    onClose();
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
      <Grid container spacing={2}>
        {/* Fecha */}
        <Grid item xs={12} sm={6}>
          <TextField
            name="fecha"
            label="Fecha"
            type="date"
            value={formData.fecha}
            onChange={handleInputChange}
            fullWidth
            required
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        
        {/* Tipo de Operación */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required>
            <InputLabel>Tipo de Operación</InputLabel>
            <Select
              value={formData.tipoOperacion}
              label="Tipo de Operación"
              onChange={(e) => handleSelectChange('tipoOperacion', e.target.value)}
            >
              <MenuItem value="entrada">Entrada (Ingresos)</MenuItem>
              <MenuItem value="salida">Salida (Gastos)</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* Rubro */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required>
            <InputLabel>Rubro</InputLabel>
            <Select
              value={formData.rubro}
              label="Rubro"
              onChange={(e) => handleSelectChange('rubro', e.target.value)}
            >
              <MenuItem value="COBRO.VENTA">COBRO.VENTA</MenuItem>
              <MenuItem value="SERVICIOS">SERVICIOS</MenuItem>
              <MenuItem value="PROOV.MATERIA.PRIMA">PROOV.MATERIA.PRIMA</MenuItem>
              <MenuItem value="PROOVMANO.DE.OBRA">PROOVMANO.DE.OBRA</MenuItem>
              <MenuItem value="BANCO">BANCO</MenuItem>
              <MenuItem value="MANT.MAQ">MANT.MAQ</MenuItem>
              <MenuItem value="SUELDOS">SUELDOS</MenuItem>
              <MenuItem value="AFIT">AFIT</MenuItem>
              <MenuItem value="MOVILIDAD">MOVILIDAD</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* SubRubro */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth disabled={!formData.rubro}>
            <InputLabel>Sub-Rubro</InputLabel>
            <Select
              value={formData.subRubro}
              label="Sub-Rubro"
              onChange={(e) => handleSelectChange('subRubro', e.target.value)}
            >
              {!formData.rubro ? (
                <MenuItem disabled>Selecciona un rubro primero</MenuItem>
              ) : formData.rubro === 'SUELDOS' ? (
                // Si es SUELDOS, mostrar empleados activos
                employees
                  .filter(emp => emp.estado === 'activo')
                  .map((employee) => (
                    <MenuItem key={employee._id} value={`${employee.apellido}, ${employee.nombre}`}>
                      {employee.apellido}, {employee.nombre} - {employee.puesto}
                    </MenuItem>
                  ))
              ) : (
                // Para otros rubros, usar los sub-rubros estáticos
                subRubrosByRubro[formData.rubro]?.map((subRubro) => (
                  <MenuItem key={subRubro} value={subRubro}>
                    {subRubro}
                  </MenuItem>
                )) || <MenuItem disabled>No hay subrubros disponibles</MenuItem>
              )}
            </Select>
          </FormControl>
        </Grid>

        {/* Medio de Pago */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Medio de Pago</InputLabel>
            <Select
              value={formData.medioDePago}
              label="Medio de Pago"
              onChange={(e) => handleSelectChange('medioDePago', e.target.value)}
            >
              <MenuItem value="Efectivo">Efectivo</MenuItem>
              <MenuItem value="Transferencia">Transferencia</MenuItem>
              <MenuItem value="Tarjeta Débito">Tarjeta Débito</MenuItem>
              <MenuItem value="Tarjeta Crédito">Tarjeta Crédito</MenuItem>
              <MenuItem value="Cheque Propio">Cheque Propio</MenuItem>
              <MenuItem value="Cheque Tercero">Cheque Tercero</MenuItem>
              <MenuItem value="FCI">FCI</MenuItem>
              <MenuItem value="FT">FT</MenuItem>
              <MenuItem value="otro">Otro</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            name="detalleGastos"
            label="Detalle Gastos"
            value={formData.detalleGastos}
            onChange={handleInputChange}
            fullWidth
            required
          />
        </Grid>

        {/* Campo Concepto - Solo para SUELDOS */}
        {formData.rubro === 'SUELDOS' && (
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Concepto</InputLabel>
              <Select
                value={formData.concepto}
                label="Concepto"
                onChange={(e) => handleSelectChange('concepto', e.target.value)}
              >
                <MenuItem value="sueldo">Sueldo</MenuItem>
                <MenuItem value="adelanto">Adelanto</MenuItem>
                <MenuItem value="hora_extra">Hora Extra</MenuItem>
                <MenuItem value="aguinaldo">Aguinaldo</MenuItem>
                <MenuItem value="bonus">Bonus</MenuItem>
                <MenuItem value="otro">Otro</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        )}

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required>
            <InputLabel>Banco</InputLabel>
            <Select
              value={formData.banco}
              label="Banco"
              onChange={(e) => handleSelectChange('banco', e.target.value)}
            >
              <MenuItem value="SANTANDER">SANTANDER</MenuItem>
              <MenuItem value="EFECTIVO">EFECTIVO</MenuItem>
              <MenuItem value="PROVINCIA">PROVINCIA</MenuItem>
              <MenuItem value="RESERVA">RESERVA</MenuItem>
              <MenuItem value="FCI">FCI</MenuItem>
              <MenuItem value="OTROS">OTROS</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        {/* Resto de campos */}
        <Grid item xs={12} sm={6}>
          <TextField
            name="clientes"
            label="Clientes"
            value={formData.clientes}
            onChange={handleInputChange}
            fullWidth
          />
        </Grid>


        <Grid item xs={12} sm={6}>
          <TextField
            name="comentario"
            label="Comentario"
            value={formData.comentario}
            onChange={handleInputChange}
            fullWidth
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            name="fechaStandBy"
            label="Fecha StandBy"
            type="date"
            value={formData.fechaStandBy}
            onChange={handleInputChange}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </Grid>

        {/* Mostrar error de validación de entrada/salida */}
        {validationError && (
          <Grid item xs={12}>
            <Alert severity="error" sx={{ mb: 2 }}>
              {validationError}
            </Alert>
          </Grid>
        )}

        {/* Campo Entrada - Solo si tipoOperacion es 'entrada' */}
        {formData.tipoOperacion === 'entrada' && (
          <Grid item xs={12} sm={6}>
            <TextField
              name="entrada"
              label="Entrada (Monto del Ingreso)"
              type="text"
              value={entradaFormatted}
              onChange={handleInputChange}
              fullWidth
              required
              placeholder="Ej: 100.000"
              InputProps={{
                startAdornment: <span style={{ marginRight: '8px' }}>$</span>,
              }}
            />
          </Grid>
        )}

        {/* Campo Salida - Solo si tipoOperacion es 'salida' */}
        {formData.tipoOperacion === 'salida' && (
          <Grid item xs={12} sm={6}>
            <TextField
              name="salida"
              label="Salida (Monto del Gasto)"
              type="text"
              value={salidaFormatted}
              onChange={handleInputChange}
              fullWidth
              required
              placeholder="Ej: 50.000"
              InputProps={{
                startAdornment: <span style={{ marginRight: '8px' }}>$</span>,
              }}
            />
          </Grid>
        )}

        {/* Botones */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
            <Button onClick={handleClose} color="secondary">
              Cancelar
            </Button>
            <Button type="submit" variant="contained" color="primary">
              {gastoToEdit ? 'Actualizar' : 'Crear'} Gasto
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ExpenseForm;