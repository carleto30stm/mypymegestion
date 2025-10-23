import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import { createGasto, updateGasto } from '../redux/slices/gastosSlice';
import { fetchEmployees } from '../redux/slices/employeesSlice';
import { formatCurrency, parseCurrency } from '../utils/formatters';
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
    tipoOperacion: 'salida',
    concepto: 'sueldo',
    comentario: '',
    fechaStandBy: '',
    entrada: '',
    salida: '',
    banco: '',
    // Campos para transferencias
    cuentaOrigen: '',
    cuentaDestino: '',
    montoTransferencia: '',
  });

  // Estados separados para los valores formateados
  const [entradaFormatted, setEntradaFormatted] = useState('');
  const [salidaFormatted, setSalidaFormatted] = useState('');
  const [montoTransferenciaFormatted, setMontoTransferenciaFormatted] = useState('');

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
    if (!formattedValue) return 0;
    
    // Convertir formato argentino a número: 1.000,50 -> 1000.50
    const cleanValue = formattedValue
      .replace(/\./g, '') // Remover puntos (separadores de miles)
      .replace(',', '.'); // Cambiar coma por punto (decimales)
    
    const parsed = parseFloat(cleanValue);
    return isNaN(parsed) ? 0 : parsed;
  };

  const [validationError, setValidationError] = useState('');

  // Cargar empleados al inicializar el componente
  useEffect(() => {
    dispatch(fetchEmployees());
  }, [dispatch]);

  // Funci??n para validar entrada y salida
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
      let tipoOperacion = 'salida';
      if (gastoToEdit.tipoOperacion === 'transferencia') {
        tipoOperacion = 'transferencia';
      } else if (gastoToEdit.entrada && gastoToEdit.entrada > 0) {
        tipoOperacion = 'entrada';
      }
      
      setFormData({
        fecha: gastoToEdit.fecha ? new Date(gastoToEdit.fecha).toISOString().split('T')[0] : '',
        rubro: gastoToEdit.rubro || '',
        subRubro: gastoToEdit.subRubro || '',
        medioDePago: gastoToEdit.medioDePago || '',
        clientes: gastoToEdit.clientes || '',
        detalleGastos: gastoToEdit.detalleGastos || '',
        tipoOperacion: tipoOperacion,
        concepto: gastoToEdit.concepto || 'sueldo',
        comentario: gastoToEdit.comentario || '',
        fechaStandBy: gastoToEdit.fechaStandBy ? new Date(gastoToEdit.fechaStandBy).toISOString().split('T')[0] : '',
        entrada: gastoToEdit.entrada?.toString() || '',
        salida: gastoToEdit.salida?.toString() || '',
        banco: gastoToEdit.banco || '',
        // Campos para transferencias
        cuentaOrigen: gastoToEdit.cuentaOrigen || '',
        cuentaDestino: gastoToEdit.cuentaDestino || '',
        montoTransferencia: gastoToEdit.montoTransferencia?.toString() || '',
      });
      
      // Formatear los valores existentes con decimales
      if (gastoToEdit.entrada && gastoToEdit.entrada > 0) {
        setEntradaFormatted(formatCurrency(gastoToEdit.entrada));
      }
      
      if (gastoToEdit.salida && gastoToEdit.salida > 0) {
        setSalidaFormatted(formatCurrency(gastoToEdit.salida));
      }

      if (gastoToEdit.montoTransferencia && gastoToEdit.montoTransferencia > 0) {
        setMontoTransferenciaFormatted(formatCurrency(gastoToEdit.montoTransferencia));
      }
      
      // Limpiar error de validación al cargar un gasto para editar
      setValidationError('');
    }
  }, [gastoToEdit]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    
    // Manejar campos de entrada, salida y transferencia con formato especial
    if (name === 'entrada') {
      const formatted = formatNumberInput(value);
      setEntradaFormatted(formatted);
      const numericValue = getNumericValue(formatted);
      setFormData(prev => ({ ...prev, entrada: numericValue.toString() }));
      setValidationError('');
      return;
    }
    
    if (name === 'salida') {
      const formatted = formatNumberInput(value);
      setSalidaFormatted(formatted);
      const numericValue = getNumericValue(formatted);
      setFormData(prev => ({ ...prev, salida: numericValue.toString() }));
      setValidationError('');
      return;
    }

    if (name === 'montoTransferencia') {
      const formatted = formatNumberInput(value);
      setMontoTransferenciaFormatted(formatted);
      const numericValue = getNumericValue(formatted);
      setFormData(prev => ({ ...prev, montoTransferencia: numericValue.toString() }));
      setValidationError('');
      return;
    }
    
    // Para otros campos, comportamiento normal
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value,
    }));
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
        updatedFormData.cuentaOrigen = '';
        updatedFormData.cuentaDestino = '';
        updatedFormData.montoTransferencia = '';
        setSalidaFormatted('');
        setMontoTransferenciaFormatted('');
      } else if (value === 'salida') {
        updatedFormData.entrada = '';
        updatedFormData.cuentaOrigen = '';
        updatedFormData.cuentaDestino = '';
        updatedFormData.montoTransferencia = '';
        setEntradaFormatted('');
        setMontoTransferenciaFormatted('');
      } else if (value === 'transferencia') {
        updatedFormData.entrada = '';
        updatedFormData.salida = '';
        setEntradaFormatted('');
        setSalidaFormatted('');
      }
      
      setFormData(updatedFormData);
      setValidationError('');
    } else if (name === 'medioDePago') {
      // Si selecciona Cheque Tercero, limpiar el banco (no es requerido)
      const updatedFormData = {
        ...formData,
        medioDePago: value,
      };
      
      if (value === 'Cheque Tercero') {
        updatedFormData.banco = ''; // Limpiar banco para Cheque Tercero
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
    
    // Para transferencias solo validar fecha y detalle
    if (formData.tipoOperacion === 'transferencia') {
      if (!formData.fecha || !formData.detalleGastos) {
        alert("Fecha y Detalle son campos requeridos.");
        return;
      }
    } else {
      // Para entrada y salida validar todos los campos
      if (!formData.rubro || !formData.detalleGastos || !formData.fecha) {
        alert("Rubro, fecha y Detalle son campos requeridos.");
        return;
      }
    }

    const entradaValue = Number(formData.entrada) || 0;
    const salidaValue = Number(formData.salida) || 0;
    const montoTransferenciaValue = Number(formData.montoTransferencia) || 0;

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
    } else if (formData.tipoOperacion === 'transferencia') {
      if (!formData.cuentaOrigen || !formData.cuentaDestino) {
        setValidationError('Debe seleccionar tanto la cuenta origen como la cuenta destino');
        return;
      }
      
      if (formData.cuentaOrigen === formData.cuentaDestino) {
        setValidationError('La cuenta origen y destino no pueden ser iguales');
        return;
      }
      
      if (montoTransferenciaValue <= 0) {
        setValidationError('Debe ingresar un monto válido para la transferencia');
        return;
      }
    }
    
    // Construir payload según el tipo de operación
    const payload: any = {
      fecha: formData.fecha,
      detalleGastos: formData.detalleGastos,
      tipoOperacion: formData.tipoOperacion,
      comentario: formData.comentario,
      fechaStandBy: formData.fechaStandBy,
      entrada: entradaValue,
      salida: salidaValue,
      montoTransferencia: montoTransferenciaValue,
    };

    // Solo agregar campos específicos según el tipo de operación
    if (formData.tipoOperacion === 'transferencia') {
      payload.cuentaOrigen = formData.cuentaOrigen;
      payload.cuentaDestino = formData.cuentaDestino;
    } else {
      payload.rubro = formData.rubro;
      payload.subRubro = formData.subRubro;
      payload.medioDePago = formData.medioDePago;
      payload.banco = formData.banco;
      payload.clientes = formData.clientes;
      payload.concepto = formData.concepto;
    }
    
    if (gastoToEdit && gastoToEdit._id) {
      dispatch(updateGasto({ _id: gastoToEdit._id, ...payload } as any));
    } else {
      dispatch(createGasto(payload as any));
    }
    
    // Limpiar error de validación
    setValidationError('');
    onClose();
  };

  const handleClose = () => {
    // Limpiar error de validaci??n al cerrar
    setValidationError('');
    onClose();
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
      {validationError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {validationError}
        </Alert>
      )}
      
      <Grid container spacing={2}>
        {/* Tipo de Operación */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Tipo de Operación</InputLabel>
            <Select
              value={formData.tipoOperacion}
              label="Tipo de Operación"
              onChange={(e) => handleSelectChange('tipoOperacion', e.target.value)}
            >
              <MenuItem value="entrada">Entrada</MenuItem>
              <MenuItem value="salida">Salida</MenuItem>
              <MenuItem value="transferencia">Transferencia</MenuItem>
            </Select>
          </FormControl>
        </Grid>

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

        {/* Campos que NO se muestran para transferencias */}
        {formData.tipoOperacion !== 'transferencia' && (
          <>
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
                  <MenuItem value="GASTOS ADMINISTRATIVOS">GASTOS ADMINISTRATIVOS</MenuItem>
                  <MenuItem value="ARCA">ARCA</MenuItem>
                  <MenuItem value="MOVILIDAD">MOVILIDAD</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </>
        )}

        {/* SubRubro - Solo para NO transferencias */}
        {formData.tipoOperacion !== 'transferencia' && (
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
        )}

        {/* Medio de Pago - Solo para NO transferencias */}
        {formData.tipoOperacion !== 'transferencia' && (
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Medio de Pago</InputLabel>
              <Select
                value={formData.medioDePago}
                label="Medio de Pago"
                onChange={(e) => handleSelectChange('medioDePago', e.target.value)}
              >
                <MenuItem value="Cheque Tercero">Cheque Tercero</MenuItem>
                <MenuItem value="Cheque Propio">Cheque Propio</MenuItem>
                <MenuItem value="Efectivo">Efectivo</MenuItem>
                <MenuItem value="Tarjeta Débito">Tarjeta Débito</MenuItem>
                <MenuItem value="Tarjeta Crédito">Tarjeta Crédito</MenuItem>
                <MenuItem value="Reserva">Reserva</MenuItem>
                <MenuItem value="Otro">Otro</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        )}
        
        {/* Detalle de Gastos - SIEMPRE se muestra */}
        <Grid item xs={12} sm={6}>
          <TextField
            name="detalleGastos"
            label="Detalle"
            value={formData.detalleGastos}
            onChange={handleInputChange}
            fullWidth
            required
          />
        </Grid>

        {/* Campo Concepto - Solo para SUELDOS y NO transferencias */}
        {formData.rubro === 'SUELDOS' && formData.tipoOperacion !== 'transferencia' && (
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

        {/* Banco - Solo para NO transferencias y NO Cheque Tercero */}
        {formData.tipoOperacion !== 'transferencia' && formData.medioDePago !== 'Cheque Tercero' && (
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Caja</InputLabel>
              <Select
                value={formData.banco}
                label="Banco"
                onChange={(e) => handleSelectChange('banco', e.target.value)}
              >
                <MenuItem value="PROVINCIA">PROVINCIA</MenuItem>
                <MenuItem value="SANTANDER">SANTANDER</MenuItem>
                <MenuItem value="EFECTIVO">EFECTIVO</MenuItem>
                <MenuItem value="FCI">FCI</MenuItem>
                <MenuItem value="RESERVA">RESERVA</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        )}
        
        {/* Clientes - Solo para NO transferencias */}
        {formData.tipoOperacion !== 'transferencia' && (
          <Grid item xs={12} sm={6}>
            <TextField
              name="clientes"
              label="Clientes"
              value={formData.clientes}
              onChange={handleInputChange}
              fullWidth
            />
          </Grid>
        )}

        {/* Comentario - Solo para NO transferencias */}
        {formData.tipoOperacion !== 'transferencia' && (
          <Grid item xs={12} sm={6}>
            <TextField
              name="comentario"
              label="Comentario"
              value={formData.comentario}
              onChange={handleInputChange}
              fullWidth
            />
          </Grid>
        )}

        {/* Fecha StandBy - Solo para cheques */}
        {formData.tipoOperacion !== 'transferencia' && 
         (formData.medioDePago === 'Cheque Propio' || formData.medioDePago === 'Cheque Tercero') && (
          <Grid item xs={12} sm={6}>
            <TextField
              name="fechaStandBy"
              label="Fecha StandBy"
              type="date"
              value={formData.fechaStandBy}
              onChange={handleInputChange}
              fullWidth
              InputLabelProps={{ shrink: true }}
              helperText="Fecha en que el cheque será efectivo"
            />
          </Grid>
        )}

        {/* Mostrar error de validaci??n de entrada/salida */}
        {validationError && (
          <Grid item xs={12}>
            <Alert severity="error" sx={{ mb: 2 }}>
              {validationError}
            </Alert>
          </Grid>
        )}

        {/* Campos condicionales según el tipo de operación */}
        {formData.tipoOperacion === 'transferencia' ? (
          <>
            {/* Cuenta Origen */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Cuenta Origen</InputLabel>
                <Select
                  value={formData.cuentaOrigen}
                  label="Cuenta Origen"
                  onChange={(e) => handleSelectChange('cuentaOrigen', e.target.value)}
                >
                  <MenuItem value="PROVINCIA">PROVINCIA</MenuItem>
                  <MenuItem value="SANTANDER">SANTANDER</MenuItem>
                  <MenuItem value="EFECTIVO">EFECTIVO</MenuItem>
                  <MenuItem value="FCI">FCI</MenuItem>
                  <MenuItem value="RESERVA">RESERVA</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Cuenta Destino */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Cuenta Destino</InputLabel>
                <Select
                  value={formData.cuentaDestino}
                  label="Cuenta Destino"
                  onChange={(e) => handleSelectChange('cuentaDestino', e.target.value)}
                >
                  <MenuItem value="PROVINCIA">PROVINCIA</MenuItem>
                  <MenuItem value="SANTANDER">SANTANDER</MenuItem>
                  <MenuItem value="EFECTIVO">EFECTIVO</MenuItem>
                  <MenuItem value="FCI">FCI</MenuItem>
                  <MenuItem value="RESERVA">RESERVA</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Monto Transferencia */}
            <Grid item xs={12} sm={6}>
              <TextField
                name="montoTransferencia"
                label="Monto de Transferencia"
                type="text"
                value={montoTransferenciaFormatted}
                onChange={handleInputChange}
                fullWidth
                required
                placeholder="Ej: 5.000,25"
                helperText="Formato: 1.000,50 (usar coma para decimales)"
              />
            </Grid>
          </>
        ) : (
          <>
            {/* Entrada (solo si tipo es entrada) */}
            {formData.tipoOperacion === 'entrada' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  name="entrada"
                  label="Entrada"
                  type="text"
                  value={entradaFormatted}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  placeholder="Ej: 1.500,50"
                  helperText="Formato: 1.000,50 (usar coma para decimales)"
                />
              </Grid>
            )}

            {/* Salida (solo si tipo es salida) */}
            {formData.tipoOperacion === 'salida' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  name="salida"
                  label="Salida"
                  type="text"
                  value={salidaFormatted}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  placeholder="Ej: 2.300,75"
                  helperText="Formato: 1.000,50 (usar coma para decimales)"
                />
              </Grid>
            )}
          </>
        )}

        {/* Botones */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
            <Button onClick={handleClose} color="secondary">
              Cancelar
            </Button>
            <Button type="submit" variant="contained" color="primary">
              {gastoToEdit ? 'Actualizar' : 'Crear'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ExpenseForm;
