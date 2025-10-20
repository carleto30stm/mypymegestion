import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import { createGasto, updateGasto } from '../redux/slices/gastosSlice';
import { fetchEmployees } from '../redux/slices/employeesSlice';
import { Gasto, subRubrosByRubro } from '../types';
import { Grid, TextField, Button, Box, MenuItem, Select, InputLabel, FormControl, Alert } from '@mui/material';

interface ExpenseFormProps {
  onClose: () => void;
  gastoToEdit?: Gasto | null;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ onClose, gastoToEdit }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: employees } = useSelector((state: RootState) => state.employees);

  const [formData, setFormData] = useState({
    fecha: '',
    rubro: '',
    subRubro: '',
    medioDePago: '',
    clientes: '',
    detalleGastos: '',
    concepto: 'sueldo',
    comentario: '',
    fechaStandBy: '',
    entrada: '',
    salida: '',
    banco: '',
  });

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
      setFormData({
        fecha: gastoToEdit.fecha ? new Date(gastoToEdit.fecha).toISOString().split('T')[0] : '',
        rubro: gastoToEdit.rubro || '',
        subRubro: gastoToEdit.subRubro || '',
        medioDePago: gastoToEdit.medioDePago || '',
        clientes: gastoToEdit.clientes || '',
        detalleGastos: gastoToEdit.detalleGastos || '',
        concepto: gastoToEdit.concepto || 'sueldo',
        comentario: gastoToEdit.comentario || '',
        fechaStandBy: gastoToEdit.fechaStandBy ? new Date(gastoToEdit.fechaStandBy).toISOString().split('T')[0] : '',
        entrada: gastoToEdit.entrada?.toString() || '',
        salida: gastoToEdit.salida?.toString() || '',
        banco: gastoToEdit.banco || '',
      });
      // Limpiar error de validación al cargar un gasto para editar
      setValidationError('');
    }
  }, [gastoToEdit]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const newFormData = {
      ...formData,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value,
    };
    
    setFormData(newFormData);

    // Validar entrada/salida cuando cambien estos campos
    if (name === 'entrada' || name === 'salida') {
      const entrada = name === 'entrada' ? value : formData.entrada;
      const salida = name === 'salida' ? value : formData.salida;
      const error = validateEntradaSalida(entrada.toString(), salida.toString());
      setValidationError(error);
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

    // Validar entrada y salida usando la función de validación
    const error = validateEntradaSalida(formData.entrada.toString(), formData.salida.toString());
    if (error) {
      setValidationError(error);
      return;
    }

    // Verificar que al menos uno tenga valor mayor a 0
    if (entradaValue === 0 && salidaValue === 0) {
      setValidationError("Debes registrar al menos una entrada o una salida. No pueden estar ambos en 0.");
      return;
    }
    
    const payload = {
      ...formData,
      rubro: formData.rubro as any,
      subRubro: formData.subRubro as any,
      medioDePago: formData.medioDePago as any,
      banco: formData.banco as any,
      entrada: entradaValue,
      salida: salidaValue,
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
              <MenuItem value="Mov. Banco">Mov. Banco</MenuItem>
              <MenuItem value="reserva">reserva</MenuItem>
              <MenuItem value="CR.F">CR.F</MenuItem>
              <MenuItem value="DLL.B">DLL.B</MenuItem>
              <MenuItem value="FCI">FCI</MenuItem>
              <MenuItem value="FT">FT</MenuItem>
              <MenuItem value="Visa">Visa</MenuItem>
              <MenuItem value="Amex">Amex</MenuItem>
              <MenuItem value="otro">otro</MenuItem>
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
              <MenuItem value="FCI">FCI</MenuItem>
              <MenuItem value="CHEQUES 3ro">CHEQUES 3ro</MenuItem>
              <MenuItem value="CHEQUE PRO.">CHEQUE PRO.</MenuItem>
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

        <Grid item xs={12} sm={6}>
          <TextField
            name="entrada"
            label="Entrada"
            type="number"
            value={formData.entrada}
            onChange={handleInputChange}
            fullWidth
            error={!!validationError}
            helperText={validationError && "Revisa entrada y salida"}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            name="salida"
            label="Salida"
            type="number"
            value={formData.salida}
            onChange={handleInputChange}
            fullWidth
            error={!!validationError}
            helperText={validationError && "Revisa entrada y salida"}
          />
        </Grid>
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