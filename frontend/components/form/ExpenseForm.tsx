import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../redux/store';
import { createGasto, updateGasto } from '../../redux/slices/gastosSlice';
import { fetchEmployees } from '../../redux/slices/employeesSlice';
import { formatCurrency, parseCurrency, formatNumberInput, getNumericValue } from '../../utils/formatters';
import { Gasto, subRubrosByRubro } from '../../types';
import { Grid, TextField, Button, Box, MenuItem, Select, InputLabel, FormControl, Alert, Snackbar, CircularProgress } from '@mui/material';

interface ExpenseFormProps {
  onClose: () => void;
  gastoToEdit?: Gasto | null;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ onClose, gastoToEdit }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: employees } = useSelector((state: RootState) => state.employees);
  const { status, error } = useSelector((state: RootState) => state.gastos);

  // Estados para notificaciones
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Estado para controlar si se acaba de completar una operación
  const [operationCompleted, setOperationCompleted] = useState(false);
  
  // Estado para prevenir doble submit
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Ref para bloquear reentradas de submit de forma síncrona
  const submittingRef = useRef(false);

  // Función para mostrar notificaciones
  const showNotification = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };

  // Función para cerrar notificaciones
  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  // Efecto para manejar estados del slice de gastos
  useEffect(() => {
    if (status === 'succeeded' && operationCompleted) {
      showNotification(
        gastoToEdit ? 'Gasto actualizado exitosamente' : 'Gasto registrado exitosamente',
        'success'
      );
      // Resetear el estado de operación completada
      setOperationCompleted(false);
      setIsSubmitting(false); // Permitir nuevo submit después de éxito
      submittingRef.current = false; // Reset ref sync
      // Cerrar el modal después de un éxito
      setTimeout(() => {
        onClose();
      }, 1500);
    } else if (status === 'failed' && error && operationCompleted) {
      showNotification(`Error: ${error}`, 'error');
      // Resetear el estado de operación completada
      setOperationCompleted(false);
      setIsSubmitting(false); // Permitir reintentar después de error
      submittingRef.current = false; // Reset ref sync
    }
  }, [status, error, gastoToEdit, onClose, operationCompleted]);

  // Efecto para resetear estados cuando se abre el formulario
  useEffect(() => {
    // Resetear notificación y estado de operación al abrir el formulario
    setNotification({
      open: false,
      message: '',
      severity: 'info'
    });
    setOperationCompleted(false);
    setIsSubmitting(false);
    submittingRef.current = false;
    submittingRef.current = false;
  }, []); // Solo se ejecuta al montar el componente

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
    numeroCheque: '',
    entrada: '',
    salida: '',
    banco: '',
    // Campos para transferencias
    cuentaOrigen: '',
    cuentaDestino: '',
    montoTransferencia: '',
    horasExtra: '', // Nuevo campo para cantidad de horas extra
    // Campo para préstamos
    montoInteres: '', // Monto de intereses del préstamo
  });

  // Estados separados para los valores formateados
  const [entradaFormatted, setEntradaFormatted] = useState('');
  const [salidaFormatted, setSalidaFormatted] = useState('');
  const [montoTransferenciaFormatted, setMontoTransferenciaFormatted] = useState('');
  const [montoInteresFormatted, setMontoInteresFormatted] = useState('');

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
        numeroCheque: gastoToEdit.numeroCheque || '',
        entrada: gastoToEdit.entrada?.toString() || '',
        salida: gastoToEdit.salida?.toString() || '',
        banco: gastoToEdit.banco || '',
        // Campos para transferencias
        cuentaOrigen: gastoToEdit.cuentaOrigen || '',
        cuentaDestino: gastoToEdit.cuentaDestino || '',
        montoTransferencia: gastoToEdit.montoTransferencia?.toString() || '',
        horasExtra: '', // Resetear horas extra al editar
        montoInteres: '', // Campo para intereses de préstamos
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

    if (name === 'montoInteres') {
      const formatted = formatNumberInput(value);
      setMontoInteresFormatted(formatted);
      const numericValue = getNumericValue(formatted);
      setFormData(prev => ({ ...prev, montoInteres: numericValue.toString() }));
      setValidationError('');
      return;
    }

    // Horas extra: solo permitir números enteros positivos
    if (name === 'horasExtra') {
      const cleanValue = value.replace(/[^\d]/g, '');
      setFormData(prev => ({ ...prev, horasExtra: cleanValue }));
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
      // Si selecciona CHEQUE TERCERO, limpiar el banco (no es requerido)
      const updatedFormData = {
        ...formData,
        medioDePago: value,
      };
      
      if (value === 'CHEQUE TERCERO') {
        updatedFormData.banco = ''; // Limpiar banco para CHEQUE TERCERO
      }
      setFormData(updatedFormData);
      setValidationError('');
    } else if (name === 'subRubro') {
      // Si cambia subRubro y NO es PRESTAMO, limpiar campo de intereses
      const updatedFormData = {
        ...formData,
        subRubro: value,
      };
      
      if (value !== 'PRESTAMO') {
        updatedFormData.montoInteres = '';
        setMontoInteresFormatted('');
      }
      
      setFormData(updatedFormData);
    } else {
      setFormData(prev => ({ 
        ...prev, 
        [name]: value 
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Prevenir doble submit si ya está en proceso
    if (status === 'loading' || operationCompleted || submittingRef.current) {
      console.log('🚫 Submit bloqueado - ya hay una operación en curso');
      return;
    }

    // Marcar que estamos procesando (ref sincronizado + state para re-render)
    submittingRef.current = true;
    setIsSubmitting(true);

    // La fecha ya no la ingresa el usuario: el sistema usará hoy por defecto cuando sea necesario
    if (formData.tipoOperacion === 'transferencia') {
      // Para transferencias validar solo detalle (las cuentas y monto se validan después)
      if (!formData.detalleGastos) {
        alert("Detalle es requerido.");
        setIsSubmitting(false);
        submittingRef.current = false;
        return;
      }
    } else {
      // Para entrada y salida validar campos esenciales (fecha se asignará automáticamente si falta)
      if (!formData.rubro || !formData.detalleGastos || !formData.medioDePago) {
        alert("Rubro, medio de pago y detalle son campos requeridos.");
        setIsSubmitting(false);
        submittingRef.current = false;
        return;
      }
    }

    const entradaValue = Number(formData.entrada) || 0;
    const salidaValue = Number(formData.salida) || 0;
    const montoTransferenciaValue = Number(formData.montoTransferencia) || 0;
    const horasExtraValue = Number(formData.horasExtra) || 0;
    const montoInteresValue = Number(formData.montoInteres) || 0;

    // Validar según el tipo de operación
    if (formData.tipoOperacion === 'entrada') {
        if (entradaValue <= 0) {
        setValidationError('Debe ingresar un monto válido para la entrada');
        setIsSubmitting(false);
        submittingRef.current = false;
        return;
      }
    } else if (formData.tipoOperacion === 'salida') {
      // Si es SUELDOS y concepto hora_extra, validar horas extra en lugar de salida
      if (formData.rubro === 'SUELDOS' && formData.concepto === 'hora_extra') {
        if (horasExtraValue <= 0) {
          setValidationError('Debe ingresar la cantidad de horas extra');
          setIsSubmitting(false);
          submittingRef.current = false;
          return;
        }
      } else {
        // Para otros casos, validar salida normalmente
        if (salidaValue <= 0) {
          setValidationError('Debe ingresar un monto válido para la salida');
          setIsSubmitting(false);
          submittingRef.current = false;
          return;
        }
      }
    } else if (formData.tipoOperacion === 'transferencia') {
      if (!formData.cuentaOrigen || !formData.cuentaDestino) {
        setValidationError('Debe seleccionar tanto la cuenta origen como la cuenta destino');
        setIsSubmitting(false);
        submittingRef.current = false;
        return;
      }
      if (formData.cuentaOrigen === formData.cuentaDestino) {
        setValidationError('La cuenta origen y destino no pueden ser iguales');
        setIsSubmitting(false);
        submittingRef.current = false;
        return;
      }
      if (montoTransferenciaValue <= 0) {
        setValidationError('Debe ingresar un monto válido para la transferencia');
        setIsSubmitting(false);
        submittingRef.current = false;
        return;
      }
    }

    // Construir payload según el tipo de operación
    const payload: any = {
      // Si no se pasó fecha, usar la fecha de hoy (formato YYYY-MM-DD)
      fecha: formData.fecha || new Date().toISOString().split('T')[0],
      detalleGastos: formData.detalleGastos,
      tipoOperacion: formData.tipoOperacion,
      comentario: formData.comentario,
      fechaStandBy: formData.fechaStandBy,
      numeroCheque: formData.numeroCheque,
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
      payload.concepto = formData.concepto;
      // Solo agregar clientes si no es SUELDOS
      if (formData.rubro !== 'SUELDOS') {
        payload.clientes = formData.clientes;
      }
      // Si es SUELDOS y concepto hora_extra, agregar horasExtra y calcular salida
      if (formData.rubro === 'SUELDOS' && formData.concepto === 'hora_extra') {
        payload.horasExtra = horasExtraValue;
        // Buscar empleado por subRubro (apellido, nombre)
        const empleado = employees.find(emp => `${emp.apellido}, ${emp.nombre}` === formData.subRubro);
        if (empleado) {
          // Calcular monto: cantidad * valor hora * 1.5
          const montoHoraExtra = horasExtraValue * (empleado.hora * 1.5);
          payload.salida = montoHoraExtra;
        }
      }
    }

    // CASO ESPECIAL: Préstamo con intereses
    // Si es un préstamo (subRubro=PRESTAMO) con monto de intereses > 0, crear 2 gastos
    const esPrestamo = formData.rubro === 'BANCO' && formData.subRubro === 'PRESTAMO';
    const tieneIntereses = montoInteresValue > 0;
    
    if (esPrestamo && tieneIntereses && !gastoToEdit) {
      // Calcular capital = salida - intereses
      const montoCapital = salidaValue - montoInteresValue;
      
      if (montoCapital < 0) {
        setValidationError('El monto de intereses no puede ser mayor al monto total del préstamo');
        setIsSubmitting(false);
        return;
      }
      
      // Crear primer gasto: CAPITAL
      const payloadCapital = {
        ...payload,
        salida: montoCapital,
        detalleGastos: `${formData.detalleGastos} - Capital`,
      };
      
      // Crear segundo gasto: INTERESES
      const payloadInteres = {
        ...payload,
        subRubro: 'INTERES',
        salida: montoInteresValue,
        detalleGastos: `${formData.detalleGastos} - Interés`,
      };
      
      // Dispatch ambos gastos
      dispatch(createGasto(payloadCapital as any));
      dispatch(createGasto(payloadInteres as any));
      
      showNotification('Préstamo registrado: capital e intereses separados', 'success');
    } else {
      // Caso normal: un solo gasto
      if (gastoToEdit && gastoToEdit._id) {
        dispatch(updateGasto({ _id: gastoToEdit._id, ...payload } as any));
      } else {
        dispatch(createGasto(payload as any));
      }
    }

    // Marcar que se inició una operación
    setOperationCompleted(true);

    // Si es creación (no edit), limpiar el formulario inmediatamente para evitar duplicados por re-click
    if (!gastoToEdit) {
      setFormData({
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
        numeroCheque: '',
        entrada: '',
        salida: '',
        banco: '',
        cuentaOrigen: '',
        cuentaDestino: '',
        montoTransferencia: '',
        horasExtra: '',
        montoInteres: '',
      });
      // Limpiar formatos visuales
      setEntradaFormatted('');
      setSalidaFormatted('');
      setMontoTransferenciaFormatted('');
      setMontoInteresFormatted('');
    }
    // Limpiar error de validación
    setValidationError('');
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
              disabled={isSubmitting || status === 'loading'}
            >
              <MenuItem value="entrada">Entrada</MenuItem>
              <MenuItem value="salida">Salida</MenuItem>
              <MenuItem value="transferencia">Transferencia</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* Fecha: eliminada del formulario. El sistema usará la fecha actual al crear registros */}

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
                  disabled={isSubmitting || status === 'loading'}
                >
                  <MenuItem value="COBRO.VENTA">COBRO.VENTA</MenuItem>
                  <MenuItem value="SERVICIOS">SERVICIOS</MenuItem>
                  <MenuItem value="PROOV.MATERIA.PRIMA">PROOV.MATERIA.PRIMA</MenuItem>
                  <MenuItem value="PROOVMANO.DE.OBRA">PROOVMANO.DE.OBRA</MenuItem>
                  <MenuItem value="BANCO">BANCO</MenuItem>
                  <MenuItem value="MANT.MAQ">MANT.MAQ</MenuItem>
                  <MenuItem value="MANT.EMPRESA">MANT.EMPRESA</MenuItem>
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
                disabled={isSubmitting || status === 'loading'}
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
                disabled={isSubmitting || status === 'loading'}
              >
                <MenuItem value="CHEQUE TERCERO">Cheque Tercero</MenuItem>
                <MenuItem value="CHEQUE PROPIO">Cheque Propio</MenuItem>
                <MenuItem value="EFECTIVO">Efectivo</MenuItem>
                <MenuItem value="TRANSFERENCIA">Transferencia</MenuItem>
                <MenuItem value="TARJETA DÉBITO">Tarjeta Débito</MenuItem>
                <MenuItem value="TARJETA CRÉDITO">Tarjeta Crédito</MenuItem>
                <MenuItem value="RESERVA">Reserva</MenuItem>
                <MenuItem value="OTRO">Otro</MenuItem>
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
            disabled={isSubmitting || status === 'loading'}
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
                disabled={isSubmitting || status === 'loading'}
              >
                <MenuItem value="sueldo">Sueldo</MenuItem>
                <MenuItem value="adelanto">Adelanto</MenuItem>
                {/* <MenuItem value="hora_extra">Hora Extra</MenuItem> */}
                <MenuItem value="aguinaldo">Aguinaldo</MenuItem>
                <MenuItem value="bonus">Bonus</MenuItem>
                <MenuItem value="otro">Otro</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        )}

        {/* Banco - Solo para NO transferencias y NO CHEQUE TERCERO */}
        {formData.tipoOperacion !== 'transferencia' && formData.medioDePago !== 'CHEQUE TERCERO' && (
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Caja</InputLabel>
              <Select
                value={formData.banco}
                label="Banco"
                onChange={(e) => handleSelectChange('banco', e.target.value)}
                disabled={isSubmitting || status === 'loading'}
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
        
        {/* Clientes - Solo para NO transferencias y NO SUELDOS */}
        {formData.tipoOperacion !== 'transferencia' && formData.rubro !== 'SUELDOS' && (
          <Grid item xs={12} sm={6}>
            <TextField
              name="clientes"
              label="Clientes"
              value={formData.clientes}
              onChange={handleInputChange}
              disabled={isSubmitting || status === 'loading'}
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
              disabled={isSubmitting || status === 'loading'}
              fullWidth
            />
          </Grid>
        )}

        {/* Horas Extra - Solo para SUELDOS y concepto hora_extra */}
        {formData.rubro === 'SUELDOS' && formData.concepto === 'hora_extra' && (
          <Grid item xs={12} sm={6}>
            <TextField
              name="horasExtra"
              label="Horas Extra"
              type="number"
              value={formData.horasExtra}
              onChange={handleInputChange}
              disabled={isSubmitting || status === 'loading'}
              fullWidth
              required
              inputProps={{ min: 1 }}
              helperText="Cantidad de horas extra realizadas por el empleado"
            />
          </Grid>
        )}

        {/* Fecha StandBy - Solo para cheques */}
        {formData.tipoOperacion !== 'transferencia' && 
         (formData.medioDePago === 'CHEQUE PROPIO' || formData.medioDePago === 'CHEQUE TERCERO') && (
          <Grid item xs={12} sm={6}>
            <TextField
              name="fechaStandBy"
              label="Fecha StandBy"
              type="date"
              value={formData.fechaStandBy}
              onChange={handleInputChange}
              disabled={isSubmitting || status === 'loading'}
              fullWidth
              InputLabelProps={{ shrink: true }}
              helperText="Fecha en que el cheque será efectivo"
            />
          </Grid>
        )}
        {formData.tipoOperacion !== 'transferencia' && 
         (formData.medioDePago === 'CHEQUE PROPIO' || formData.medioDePago === 'CHEQUE TERCERO') && (
          <Grid item xs={12} sm={6}>
            <TextField
              name="numeroCheque"
              label="Número de Cheque"
              type="text"
              value={formData.numeroCheque}
              onChange={handleInputChange}
              disabled={isSubmitting || status === 'loading'}
              fullWidth
              InputLabelProps={{ shrink: true }}
              helperText="Número de cheque"
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
                disabled={isSubmitting || status === 'loading'}
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
                  disabled={isSubmitting || status === 'loading'}
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
                  label={formData.subRubro === 'PRESTAMO' ? 'Monto Total Cuota' : 'Salida'}
                  type="text"
                  value={salidaFormatted}
                  onChange={handleInputChange}
                  disabled={isSubmitting || status === 'loading'}
                  fullWidth
                  required
                  placeholder="Ej: 2.300,75"
                  helperText={formData.subRubro === 'PRESTAMO' ? 'Monto total de la cuota (capital + intereses)' : 'Formato: 1.000,50 (usar coma para decimales)'}
                />
              </Grid>
            )}

            {/* Monto Intereses (solo si es PRESTAMO) */}
            {formData.tipoOperacion === 'salida' && formData.subRubro === 'PRESTAMO' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  name="montoInteres"
                  label="Monto Intereses (opcional)"
                  type="text"
                  value={montoInteresFormatted}
                  onChange={handleInputChange}
                  disabled={isSubmitting || status === 'loading'}
                  fullWidth
                  placeholder="Ej: 500,00"
                  helperText="Si incluye intereses, se crearán 2 registros separados (capital e interés)"
                />
              </Grid>
            )}
          </>
        )}

        {/* Botones */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
            <Button onClick={handleClose} color="secondary" disabled={isSubmitting || status === 'loading'}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary" 
              disabled={isSubmitting || status === 'loading'}
            >
              {(isSubmitting || status === 'loading') ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
                  Guardando...
                </>
              ) : (
                gastoToEdit ? 'Actualizar' : 'Guardar'
              )}
            </Button>
          </Box>
        </Grid>
      </Grid>

      {/* Snackbar para notificaciones */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{ width: '100%' }}
          variant="filled"
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ExpenseForm;
