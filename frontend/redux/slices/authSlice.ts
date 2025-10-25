import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';
import { User } from '../../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  tokenExpiration: number | null; // Timestamp de cuándo expira el token
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}


// Log inicial del estado de autenticación y usuario persistido
const existingToken = localStorage.getItem('token');
const existingExpiration = localStorage.getItem('tokenExpiration');
const existingUser = localStorage.getItem('user');

const now = Date.now();
const isTokenExpired = existingExpiration ? now > parseInt(existingExpiration) : false;

console.log('🔍 [AUTH DEBUG] Estado inicial de autenticación:', {
  tokenPresent: !!existingToken,
  tokenLength: existingToken?.length || 0,
  tokenExpired: isTokenExpired,
  expirationTime: existingExpiration ? new Date(parseInt(existingExpiration)).toLocaleString() : null,
  isAuthenticated: !!existingToken && !isTokenExpired,
  userPersisted: !!existingUser
});

if (isTokenExpired) {
  localStorage.removeItem('token');
  localStorage.removeItem('tokenExpiration');
  localStorage.removeItem('user');
  console.log('🚨 [AUTH DEBUG] Token expirado - removiendo del localStorage');
}

let parsedUser: User | null = null;
if (existingUser && !isTokenExpired) {
  try {
    parsedUser = JSON.parse(existingUser);
  } catch (e) {
    parsedUser = null;
    console.error('❌ [AUTH DEBUG] Error al parsear usuario persistido:', e);
  }
}

const initialState: AuthState = {
  user: parsedUser,
  token: isTokenExpired ? null : existingToken,
  tokenExpiration: isTokenExpired ? null : (existingExpiration ? parseInt(existingExpiration) : null),
  isAuthenticated: !!existingToken && !isTokenExpired,
  status: 'idle',
  error: null,
};

export const login = createAsyncThunk(
  'auth',
  async (credentials: { username: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/auth', credentials);
      localStorage.setItem('token', response.data.token);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      console.log('🚪 [AUTH DEBUG] Usuario cerrando sesión:', {
        username: state.user?.username,
        userType: state.user?.userType,
        wasAuthenticated: state.isAuthenticated,
        tokenExpiration: state.tokenExpiration ? new Date(state.tokenExpiration).toLocaleString() : null
      });
      state.user = null;
      state.token = null;
      state.tokenExpiration = null;
      state.isAuthenticated = false;
      localStorage.removeItem('token');
      localStorage.removeItem('tokenExpiration');
      console.log('🚪 [AUTH DEBUG] Sesión cerrada completamente');
    },
    checkTokenExpiration: (state) => {
      const now = Date.now();
      if (state.tokenExpiration && now > state.tokenExpiration) {
        console.log('🚨 [AUTH DEBUG] Token expirado detectado - cerrando sesión automáticamente');
        state.user = null;
        state.token = null;
        state.tokenExpiration = null;
        state.isAuthenticated = false;
        localStorage.removeItem('token');
        localStorage.removeItem('tokenExpiration');
      }
    },
    debugAuthState: (state) => {
      const timeUntilExpiration = state.tokenExpiration ? state.tokenExpiration - Date.now() : null;
      console.log('🔍 [AUTH DEBUG] Estado completo de autenticación:', {
        user: state.user,
        token: state.token ? `${state.token.substring(0, 20)}...` : null,
        isAuthenticated: state.isAuthenticated,
        tokenExpiration: state.tokenExpiration ? new Date(state.tokenExpiration).toLocaleString() : null,
        timeUntilExpiration: timeUntilExpiration ? `${Math.round(timeUntilExpiration / (1000 * 60))} minutos` : null,
        status: state.status,
        error: state.error,
        timestamp: new Date().toISOString()
      });
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        console.log('⏳ [AUTH DEBUG] Iniciando proceso de login...');
        state.status = 'loading';
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<{ user: User; token: string }>) => {
        // Calcular cuándo expira el token (12 horas desde ahora)
        const expirationTime = Date.now() + (12 * 60 * 60 * 1000); // 12 horas en millisegundos

        console.log('✅ [AUTH DEBUG] Login exitoso:', {
          username: action.payload.user.username,
          userType: action.payload.user.userType,
          id: action.payload.user.id,
          tokenPresent: !!action.payload.token,
          expirationTime: new Date(expirationTime).toLocaleString()
        });

        state.status = 'succeeded';
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.tokenExpiration = expirationTime;

        // Guardar en localStorage
        localStorage.setItem('tokenExpiration', expirationTime.toString());
        localStorage.setItem('user', JSON.stringify(action.payload.user));

        console.log('✅ [AUTH DEBUG] Estado actualizado - Usuario activo:', {
          username: state.user.username,
          userType: state.user.userType,
          isAuthenticated: state.isAuthenticated,
          expiresAt: new Date(expirationTime).toLocaleString()
        });
      })
      .addCase(login.rejected, (state, action) => {
        console.error('❌ [AUTH DEBUG] Login falló:', {
          error: action.payload,
          previousUser: state.user?.username
        });
        state.status = 'failed';
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.tokenExpiration = null;
      });
  },
});

export const { logout, checkTokenExpiration, debugAuthState } = authSlice.actions;

export default authSlice.reducer;
