import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Collapse,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  AttachMoney as MoneyIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Receipt as ReceiptIcon,
  CheckCircle as CheckIcon,
  PersonAdd as PersonAddIcon
} from '@mui/icons-material';
import { AppDispatch, RootState } from '../redux/store';
import { LiquidacionPeriodo, LiquidacionEmpleado } from '../types';
import { liquidarEmpleado, fetchPeriodoById, cerrarPeriodo, agregarEmpleado } from '../redux/slices/liquidacionSlice';
import { fetchGastos } from '../redux/slices/gastosSlice';
import { fetchEmployees } from '../redux/slices/employeesSlice';
import { formatCurrency } from '../utils/formatters';
import ReciboSueldo from './ReciboSueldo';

interface ResumenLiquidacionProps {
  periodo: LiquidacionPeriodo;
}

const ResumenLiquidacion: React.FC<ResumenLiquidacionProps> = ({ periodo }) => {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const { items: empleados } = useSelector((state: RootState) => state.employees);
  
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [openLiquidar, setOpenLiquidar] = useState(false);
  const [selectedEmpleado, setSelectedEmpleado] = useState<LiquidacionEmpleado | null>(null);
  const [observaciones, setObservaciones] = useState('');
  const [medioDePago, setMedioDePago] = useState<string>('Transferencia');
  const [banco, setBanco] = useState<string>('PROVINCIA');
  const [openCerrar, setOpenCerrar] = useState(false);
  const [observacionesCierre, setObservacionesCierre] = useState('');
  const [openRecibo, setOpenRecibo] = useState(false);
  const [reciboEmpleado, setReciboEmpleado] = useState<LiquidacionEmpleado | null>(null);
  const [openAgregarEmpleado, setOpenAgregarEmpleado] = useState(false);
  const [nuevoEmpleadoId, setNuevoEmpleadoId] = useState('');

  const isEditable = periodo.estado === 'abierto' && user?.userType === 'admin';

  // Cargar empleados si no están cargados
  React.useEffect(() => {
    if (empleados.length === 0) {
      dispatch(fetchEmployees());
    }
  }, [dispatch, empleados.length]);

  // Filtrar empleados que no están en el período
  const empleadosDisponibles = empleados.filter(emp => 
    emp.estado === 'activo' && 
    !periodo.liquidaciones.some(liq => liq.empleadoId === emp._id)
  );

  const toggleRow = (empleadoId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(empleadoId)) {
      newExpanded.delete(empleadoId);
    } else {
      newExpanded.add(empleadoId);
    }
    setExpandedRows(newExpanded);
  };

  const handleOpenLiquidar = (empleado: LiquidacionEmpleado) => {
    setSelectedEmpleado(empleado);
    setObservaciones('');
    setMedioDePago('Transferencia');
    setBanco('PROVINCIA');
    setOpenLiquidar(true);
  };

  const handleCloseLiquidar = () => {
    setOpenLiquidar(false);
    setSelectedEmpleado(null);
    setObservaciones('');
  };

  const handleLiquidar = async () => {
    if (!selectedEmpleado || !periodo._id) return;

    try {
      await dispatch(liquidarEmpleado({
        periodoId: periodo._id,
        empleadoId: selectedEmpleado.empleadoId,
        observaciones,
        medioDePago,
        banco
      })).unwrap();
      
      // Refrescar el período y los gastos
      await dispatch(fetchPeriodoById(periodo._id));
      await dispatch(fetchGastos());
      handleCloseLiquidar();
    } catch (error) {
      console.error('Error al liquidar empleado:', error);
    }
  };

  const handleOpenCerrar = () => {
    setOpenCerrar(true);
  };

  const handleCloseCerrar = () => {
    setOpenCerrar(false);
    setObservacionesCierre('');
  };

  const handleCerrarPeriodo = async () => {
    if (!periodo._id || !user) return;

    try {
      await dispatch(cerrarPeriodo({
        id: periodo._id,
        cerradoPor: user.username,
        observaciones: observacionesCierre
      })).unwrap();
      
      handleCloseCerrar();
    } catch (error) {
      console.error('Error al cerrar período:', error);
    }
  };

  const handleOpenRecibo = (empleado: LiquidacionEmpleado) => {
    setReciboEmpleado(empleado);
    setOpenRecibo(true);
  };

  const handleCloseRecibo = () => {
    setOpenRecibo(false);
    setReciboEmpleado(null);
  };

  const handleOpenAgregarEmpleado = () => {
    setNuevoEmpleadoId('');
    setOpenAgregarEmpleado(true);
  };

  const handleCloseAgregarEmpleado = () => {
    setOpenAgregarEmpleado(false);
    setNuevoEmpleadoId('');
  };

  const handleAgregarEmpleado = async () => {
    if (!nuevoEmpleadoId || !periodo._id) return;

    try {
      await dispatch(agregarEmpleado({
        periodoId: periodo._id,
        empleadoId: nuevoEmpleadoId
      })).unwrap();
      
      // Refrescar el período
      await dispatch(fetchPeriodoById(periodo._id));
      handleCloseAgregarEmpleado();
    } catch (error) {
      console.error('Error al agregar empleado:', error);
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'warning';
      case 'pagado':
        return 'success';
      case 'cancelado':
        return 'error';
      default:
        return 'default';
    }
  };

  const pendientesCount = periodo.liquidaciones.filter(l => l.estado === 'pendiente').length;
  const pagadosCount = periodo.liquidaciones.filter(l => l.estado === 'pagado').length;

  return (
    <Box>
      {/* Estadísticas */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Paper sx={{ flex: 1, p: 2 }}>
          <Typography variant="body2" color="text.secondary">Empleados Totales</Typography>
          <Typography variant="h4" fontWeight="bold">{periodo.liquidaciones.length}</Typography>
        </Paper>
        <Paper sx={{ flex: 1, p: 2 }}>
          <Typography variant="body2" color="text.secondary">Pendientes de Pago</Typography>
          <Typography variant="h4" fontWeight="bold" color="warning.main">{pendientesCount}</Typography>
        </Paper>
        <Paper sx={{ flex: 1, p: 2 }}>
          <Typography variant="body2" color="text.secondary">Pagados</Typography>
          <Typography variant="h4" fontWeight="bold" color="success.main">{pagadosCount}</Typography>
        </Paper>
        <Paper sx={{ flex: 1, p: 2 }}>
          <Typography variant="body2" color="text.secondary">Total a Liquidar</Typography>
          <Typography variant="h4" fontWeight="bold" color="primary.main">
            {formatCurrency(periodo.totalGeneral)}
          </Typography>
        </Paper>
      </Box>

      {/* Alertas y acciones */}
      {empleadosDisponibles.length > 0 && isEditable && (
        <Alert severity="info" sx={{ mb: 2 }} action={
          <Button 
            color="inherit" 
            size="small" 
            startIcon={<PersonAddIcon />}
            onClick={handleOpenAgregarEmpleado}
          >
            Agregar Empleado
          </Button>
        }>
          Hay {empleadosDisponibles.length} empleado(s) activo(s) que no están en este período.
        </Alert>
      )}

      {isEditable && pendientesCount === 0 && (
        <Alert severity="success" sx={{ mb: 2 }} action={
          <Button color="inherit" size="small" onClick={handleOpenCerrar}>
            Cerrar Período
          </Button>
        }>
          Todos los empleados han sido liquidados. Puedes cerrar el período.
        </Alert>
      )}

      {/* Tabla de liquidaciones */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell width={50}></TableCell>
              <TableCell><strong>Empleado</strong></TableCell>
              <TableCell align="right"><strong>Sueldo Base</strong></TableCell>
              <TableCell align="right"><strong>Horas Extra</strong></TableCell>
              <TableCell align="right"><strong>Adelantos</strong></TableCell>
              <TableCell align="right"><strong>Total a Pagar</strong></TableCell>
              <TableCell align="center"><strong>Estado</strong></TableCell>
              <TableCell align="center"><strong>Acciones</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {periodo.liquidaciones.map((liquidacion) => (
              <React.Fragment key={liquidacion.empleadoId}>
                <TableRow hover>
                  <TableCell>
                    <IconButton size="small" onClick={() => toggleRow(liquidacion.empleadoId)}>
                      {expandedRows.has(liquidacion.empleadoId) ? <CollapseIcon /> : <ExpandIcon />}
                    </IconButton>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {liquidacion.empleadoApellido}, {liquidacion.empleadoNombre}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="text.secondary">
                      {formatCurrency(liquidacion.sueldoBase)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="info.main">
                      +{formatCurrency(liquidacion.totalHorasExtra)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="warning.main">
                      -{formatCurrency(liquidacion.adelantos)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="bold" color="primary.main">
                      {formatCurrency(liquidacion.totalAPagar)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={liquidacion.estado.toUpperCase()}
                      color={getEstadoColor(liquidacion.estado)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    {liquidacion.estado === 'pendiente' && isEditable && (
                      <Tooltip title="Liquidar">
                        <IconButton
                          color="primary"
                          onClick={() => handleOpenLiquidar(liquidacion)}
                        >
                          <MoneyIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    {liquidacion.estado === 'pagado' && (
                      <Tooltip title="Ver recibo">
                        <IconButton 
                          color="success"
                          onClick={() => handleOpenRecibo(liquidacion)}
                        >
                          <ReceiptIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
                
                {/* Fila expandida con detalles */}
                <TableRow>
                  <TableCell colSpan={8} sx={{ p: 0 }}>
                    <Collapse in={expandedRows.has(liquidacion.empleadoId)} timeout="auto" unmountOnExit>
                      <Box sx={{ p: 2, backgroundColor: 'grey.50' }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Detalle de Liquidación
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary">Sueldo Base:</Typography>
                            <Typography variant="body2">{formatCurrency(liquidacion.sueldoBase)}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">Horas Extra ({liquidacion.horasExtra.length}):</Typography>
                            <Typography variant="body2" color="info.main">
                              +{formatCurrency(liquidacion.totalHorasExtra)}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">Aguinaldos:</Typography>
                            <Typography variant="body2" color="secondary.main">
                              +{formatCurrency(liquidacion.aguinaldos)}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">Bonus:</Typography>
                            <Typography variant="body2" color="secondary.main">
                              +{formatCurrency(liquidacion.bonus)}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">Adelantos:</Typography>
                            <Typography variant="body2" color="warning.main">
                              -{formatCurrency(liquidacion.adelantos)}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">Descuentos:</Typography>
                            <Typography variant="body2" color="error.main">
                              -{formatCurrency(liquidacion.descuentos)}
                            </Typography>
                          </Box>
                        </Box>
                        
                        {liquidacion.horasExtra.length > 0 && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="caption" color="text.secondary">Horas Extra Registradas:</Typography>
                            <Box sx={{ mt: 0.5 }}>
                              {liquidacion.horasExtra.map((he, index) => (
                                <Typography key={index} variant="caption" display="block">
                                  • {new Date(he.fecha).toLocaleDateString('es-ES')}: {he.cantidadHoras}hs × {formatCurrency(he.valorHora)} = {formatCurrency(he.montoTotal)}
                                </Typography>
                              ))}
                            </Box>
                          </Box>
                        )}
                        
                        {liquidacion.observaciones && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="caption" color="text.secondary">Observaciones:</Typography>
                            <Typography variant="body2">{liquidacion.observaciones}</Typography>
                          </Box>
                        )}
                        
                        {liquidacion.fechaPago && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="caption" color="text.secondary">Fecha de Pago:</Typography>
                            <Typography variant="body2">
                              {new Date(liquidacion.fechaPago).toLocaleString('es-ES')}
                            </Typography>
                          </Box>
                        )}
                        
                        {liquidacion.medioDePago && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="caption" color="text.secondary">Medio de Pago:</Typography>
                            <Typography variant="body2">
                              {liquidacion.medioDePago} - {liquidacion.banco}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog Liquidar Empleado */}
      <Dialog open={openLiquidar} onClose={handleCloseLiquidar} maxWidth="sm" fullWidth>
        <DialogTitle>
          Liquidar Sueldo
        </DialogTitle>
        <DialogContent>
          {selectedEmpleado && (
            <Box sx={{ pt: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Se generará un gasto de tipo SUELDOS por el monto total a pagar
              </Alert>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2">Empleado:</Typography>
                <Typography variant="body1" fontWeight="bold">
                  {selectedEmpleado.empleadoApellido}, {selectedEmpleado.empleadoNombre}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">Desglose:</Typography>
                <Box sx={{ mt: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">Sueldo Base:</Typography>
                    <Typography variant="body2">{formatCurrency(selectedEmpleado.sueldoBase)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" color="info.main">Horas Extra:</Typography>
                    <Typography variant="body2" color="info.main">
                      +{formatCurrency(selectedEmpleado.totalHorasExtra)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" color="warning.main">Adelantos:</Typography>
                    <Typography variant="body2" color="warning.main">
                      -{formatCurrency(selectedEmpleado.adelantos)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, pt: 1, borderTop: 1, borderColor: 'divider' }}>
                    <Typography variant="subtitle2" fontWeight="bold">Total a Pagar:</Typography>
                    <Typography variant="subtitle2" fontWeight="bold" color="primary.main">
                      {formatCurrency(selectedEmpleado.totalAPagar)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <FormControl fullWidth required>
                  <InputLabel>Medio de Pago</InputLabel>
                  <Select
                    value={medioDePago}
                    onChange={(e) => setMedioDePago(e.target.value)}
                    label="Medio de Pago"
                  >
                    <MenuItem value="Efectivo">Efectivo</MenuItem>
                    <MenuItem value="Transferencia">Transferencia</MenuItem>
                    <MenuItem value="Cheque Propio">Cheque Propio</MenuItem>
                    <MenuItem value="Cheque Tercero">Cheque Tercero</MenuItem>
                    <MenuItem value="Tarjeta Débito">Tarjeta Débito</MenuItem>
                    <MenuItem value="Tarjeta Crédito">Tarjeta Crédito</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth required>
                  <InputLabel>Banco/Caja</InputLabel>
                  <Select
                    value={banco}
                    onChange={(e) => setBanco(e.target.value)}
                    label="Banco/Caja"
                  >
                    <MenuItem value="PROVINCIA">Banco Provincia</MenuItem>
                    <MenuItem value="SANTANDER">Banco Santander</MenuItem>
                    <MenuItem value="EFECTIVO">Efectivo</MenuItem>
                    <MenuItem value="FCI">FCI</MenuItem>
                    <MenuItem value="RESERVA">Reserva</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              <TextField
                label="Observaciones (opcional)"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                fullWidth
                multiline
                rows={3}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseLiquidar}>Cancelar</Button>
          <Button
            onClick={handleLiquidar}
            variant="contained"
            startIcon={<CheckIcon />}
            disabled={!medioDePago || !banco}
          >
            Confirmar Liquidación
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Cerrar Período */}
      <Dialog open={openCerrar} onClose={handleCloseCerrar} maxWidth="sm" fullWidth>
        <DialogTitle>Cerrar Período de Liquidación</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Una vez cerrado el período, no se podrán realizar más modificaciones.
            </Alert>
            
            <Typography variant="body2" gutterBottom>
              Todos los empleados han sido liquidados. ¿Deseas cerrar el período?
            </Typography>
            
            <TextField
              label="Observaciones de cierre (opcional)"
              value={observacionesCierre}
              onChange={(e) => setObservacionesCierre(e.target.value)}
              fullWidth
              multiline
              rows={3}
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCerrar}>Cancelar</Button>
          <Button onClick={handleCerrarPeriodo} variant="contained" color="error">
            Cerrar Período
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Agregar Empleado */}
      <Dialog open={openAgregarEmpleado} onClose={handleCloseAgregarEmpleado} maxWidth="sm" fullWidth>
        <DialogTitle>Agregar Empleado al Período</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {empleadosDisponibles.length === 0 ? (
              <Alert severity="info">
                No hay empleados activos disponibles para agregar. Todos los empleados activos ya están en este período.
              </Alert>
            ) : (
              <>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Selecciona un empleado activo para agregarlo a este período de liquidación.
                </Alert>
                <FormControl fullWidth required>
                  <InputLabel>Empleado</InputLabel>
                  <Select
                    value={nuevoEmpleadoId}
                    onChange={(e) => setNuevoEmpleadoId(e.target.value)}
                    label="Empleado"
                  >
                    {empleadosDisponibles.map((emp) => (
                      <MenuItem key={emp._id} value={emp._id}>
                        {emp.apellido}, {emp.nombre} - Sueldo: $ {formatCurrency(emp.sueldoBase)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAgregarEmpleado}>Cancelar</Button>
          <Button
            onClick={handleAgregarEmpleado}
            variant="contained"
            disabled={!nuevoEmpleadoId}
            startIcon={<PersonAddIcon />}
          >
            Agregar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Recibo de Sueldo */}
      {reciboEmpleado && (
        <ReciboSueldo
          liquidacion={reciboEmpleado}
          periodo={periodo}
          open={openRecibo}
          onClose={handleCloseRecibo}
        />
      )}
    </Box>
  );
};

export default ResumenLiquidacion;
