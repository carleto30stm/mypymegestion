import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';
import { Category } from '../../types';

interface CategoriesState {
    items: Category[];
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

const initialState: CategoriesState = {
    items: [],
    status: 'idle',
    error: null,
};

// Async thunks
export const fetchCategories = createAsyncThunk(
    'categories/fetchCategories',
    async () => {
        const response = await api.get('/api/categories');
        return response.data;
    }
);

export const addCategory = createAsyncThunk(
    'categories/addCategory',
    async (category: Omit<Category, '_id' | 'fechaActualizacion'>) => {
        const response = await api.post('/api/categories', category);
        return response.data;
    }
);

export const updateCategory = createAsyncThunk(
    'categories/updateCategory',
    async ({ id, category }: { id: string; category: Partial<Category> }) => {
        const response = await api.put(`/api/categories/${id}`, category);
        return response.data;
    }
);

export const deleteCategory = createAsyncThunk(
    'categories/deleteCategory',
    async (id: string) => {
        await api.delete(`/api/categories/${id}`);
        return id;
    }
);

export const applyParitaria = createAsyncThunk(
    'categories/applyParitaria',
    async ({ porcentaje, ids }: { porcentaje: number; ids?: string[] }) => {
        const response = await api.post('/api/categories/paritaria', { porcentaje, ids });
        return response.data.updatedCategories;
    }
);

const categoriesSlice = createSlice({
    name: 'categories',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            // Fetch categories
            .addCase(fetchCategories.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchCategories.fulfilled, (state, action: PayloadAction<Category[]>) => {
                state.status = 'succeeded';
                state.items = action.payload;
                state.error = null;
            })
            .addCase(fetchCategories.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message || 'Error al cargar categorías';
            })
            // Add category
            .addCase(addCategory.fulfilled, (state, action: PayloadAction<Category>) => {
                state.items.push(action.payload);
            })
            // Update category
            .addCase(updateCategory.fulfilled, (state, action: PayloadAction<Category>) => {
                const index = state.items.findIndex(cat => cat._id === action.payload._id);
                if (index !== -1) {
                    state.items[index] = action.payload;
                }
            })
            // Delete category
            .addCase(deleteCategory.fulfilled, (state, action: PayloadAction<string>) => {
                state.items = state.items.filter(cat => cat._id !== action.payload);
            })
            // Apply Paritaria
            .addCase(applyParitaria.fulfilled, (state, action: PayloadAction<Category[]>) => {
                // Update all affected categories
                action.payload.forEach(updatedCat => {
                    const index = state.items.findIndex(cat => cat._id === updatedCat._id);
                    if (index !== -1) {
                        state.items[index] = updatedCat;
                    }
                });
            });
    },
});

export default categoriesSlice.reducer;
