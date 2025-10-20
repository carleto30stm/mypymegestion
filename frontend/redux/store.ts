import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import gastosReducer from './slices/gastosSlice';
import employeesReducer from './slices/employeesSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    gastos: gastosReducer,
    employees: employeesReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
