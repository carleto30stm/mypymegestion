import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';
import { Employee } from '../../types';

interface EmployeesState {
  items: Employee[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: EmployeesState = {
  items: [],
  status: 'idle',
  error: null,
};

// Async thunks
export const fetchEmployees = createAsyncThunk(
  'employees/fetchEmployees',
  async () => {
    const response = await api.get('/api/employees');
    return response.data;
  }
);

export const addEmployee = createAsyncThunk(
  'employees/addEmployee',
  async (employee: Omit<Employee, '_id'>) => {
    const response = await api.post('/api/employees', employee);
    return response.data;
  }
);

export const updateEmployee = createAsyncThunk(
  'employees/updateEmployee',
  async ({ id, employee }: { id: string; employee: Partial<Employee> }) => {
    const response = await api.put(`/api/employees/${id}`, employee);
    return response.data;
  }
);

export const deleteEmployee = createAsyncThunk(
  'employees/deleteEmployee',
  async (id: string) => {
    await api.delete(`/api/employees/${id}`);
    return id;
  }
);

const employeesSlice = createSlice({
  name: 'employees',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch employees
      .addCase(fetchEmployees.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchEmployees.fulfilled, (state, action: PayloadAction<Employee[]>) => {
        state.status = 'succeeded';
        state.items = action.payload;
        state.error = null;
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Error al cargar empleados';
      })
      // Add employee
      .addCase(addEmployee.fulfilled, (state, action: PayloadAction<Employee>) => {
        state.items.push(action.payload);
      })
      // Update employee
      .addCase(updateEmployee.fulfilled, (state, action: PayloadAction<Employee>) => {
        const index = state.items.findIndex(emp => emp._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      // Delete employee
      .addCase(deleteEmployee.fulfilled, (state, action: PayloadAction<string>) => {
        state.items = state.items.filter(emp => emp._id !== action.payload);
      });
  },
});

export default employeesSlice.reducer;