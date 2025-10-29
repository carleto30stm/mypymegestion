import { configureStore } from '@reduxjs/toolkit';
import { createLogger } from 'redux-logger';
import authReducer from './slices/authSlice';
import gastosReducer from './slices/gastosSlice';
import employeesReducer from './slices/employeesSlice';
import horasExtraReducer from './slices/horasExtraSlice';
import liquidacionReducer from './slices/liquidacionSlice';

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
