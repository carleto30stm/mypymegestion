import { configureStore } from '@reduxjs/toolkit';
import { createLogger } from 'redux-logger';
import authReducer from './slices/authSlice';
import gastosReducer from './slices/gastosSlice';
import employeesReducer from './slices/employeesSlice';
import horasExtraReducer from './slices/horasExtraSlice';
import liquidacionReducer from './slices/liquidacionSlice';
import productosReducer from './slices/productosSlice';
import clientesReducer from './slices/clientesSlice';
import ventasReducer from './slices/ventasSlice';
import facturasReducer from './slices/facturasSlice';
import remitosReducer from './slices/remitosSlice';
import recibosReducer from './slices/recibosSlice';
import cuentaCorrienteReducer from './slices/cuentaCorrienteSlice';
import metricasProductosReducer from './slices/metricasProductosSlice';

// Configurar el logger solo en desarrollo
const logger = createLogger({
  collapsed: true, // Colapsar los logs por defecto
  diff: true, // Mostrar diferencias en el estado
  duration: true, // Mostrar duración de las acciones
  timestamp: true, // Mostrar timestamp
  logErrors: true, // Loggear errores
  predicate: () => process.env.NODE_ENV === 'development', // Solo en desarrollo
});

export const store = configureStore({
  reducer: {
    auth: authReducer,
    gastos: gastosReducer,
    employees: employeesReducer,
    horasExtra: horasExtraReducer,
    liquidacion: liquidacionReducer,
    productos: productosReducer,
    clientes: clientesReducer,
    ventas: ventasReducer,
    facturas: facturasReducer,
    remitos: remitosReducer,
    recibos: recibosReducer,
    cuentaCorriente: cuentaCorrienteReducer,
    metricasProductos: metricasProductosReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }).concat(logger),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
