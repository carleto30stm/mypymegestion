import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';
import { Producto } from '../../types';

interface ProductosState {
  items: Producto[];
  productosStockBajo: Producto[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: ProductosState = {
  items: [],
  productosStockBajo: [],
  status: 'idle',
  error: null,
};

// Thunks
export const fetchProductos = createAsyncThunk('productos/fetchProductos', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/api/productos');
    return response.data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Error al cargar productos');
  }
});

export const fetchProductosStockBajo = createAsyncThunk('productos/fetchStockBajo', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/api/productos/stock-bajo');
    return response.data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Error al cargar productos con stock bajo');
  }
});

export const createProducto = createAsyncThunk('productos/create', async (newProducto: Omit<Producto, '_id'>, { rejectWithValue }) => {
  try {
    const response = await api.post('/api/productos', newProducto);
    return response.data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Error al crear producto');
  }
});

export const updateProducto = createAsyncThunk('productos/update', async (producto: Producto, { rejectWithValue }) => {
  try {
    const { _id, ...productoData } = producto;
    const response = await api.put(`/api/productos/${_id}`, productoData);
    return response.data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Error al actualizar producto');
  }
});

export const ajustarStock = createAsyncThunk(
  'productos/ajustarStock',
  async ({ id, cantidad, tipo, motivo }: { id: string; cantidad: number; tipo: 'entrada' | 'salida'; motivo: string }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/api/productos/${id}/ajustar-stock`, { cantidad, tipo, motivo });
      return response.data.producto;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al ajustar stock');
    }
  }
);

export const deleteProducto = createAsyncThunk('productos/delete', async (id: string, { rejectWithValue }) => {
  try {
    await api.delete(`/api/productos/${id}`);
    return id;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Error al eliminar producto');
  }
});

export const reactivarProducto = createAsyncThunk('productos/reactivar', async (id: string, { rejectWithValue }) => {
  try {
    const response = await api.patch(`/api/productos/${id}/reactivar`);
    return response.data.producto;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Error al reactivar producto');
  }
});

const productosSlice = createSlice({
  name: 'productos',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch productos
      .addCase(fetchProductos.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchProductos.fulfilled, (state, action: PayloadAction<Producto[]>) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchProductos.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      // Fetch stock bajo
      .addCase(fetchProductosStockBajo.fulfilled, (state, action: PayloadAction<Producto[]>) => {
        state.productosStockBajo = action.payload;
      })
      // Create producto
      .addCase(createProducto.fulfilled, (state, action: PayloadAction<Producto>) => {
        state.items.push(action.payload);
      })
      // Update producto
      .addCase(updateProducto.fulfilled, (state, action: PayloadAction<Producto>) => {
        const index = state.items.findIndex(p => p._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      // Ajustar stock
      .addCase(ajustarStock.fulfilled, (state, action: PayloadAction<Producto>) => {
        const index = state.items.findIndex(p => p._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      // Delete producto
      .addCase(deleteProducto.fulfilled, (state, action: PayloadAction<string>) => {
        const index = state.items.findIndex(p => p._id === action.payload);
        if (index !== -1) {
          state.items[index].estado = 'inactivo';
        }
      })
      // Reactivar producto
      .addCase(reactivarProducto.fulfilled, (state, action: PayloadAction<Producto>) => {
        const index = state.items.findIndex(p => p._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      });
  },
});

export default productosSlice.reducer;
