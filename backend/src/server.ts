import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import { seedAdminUser } from './models/User.js';
import authRoutes from './routes/auth.js';
import gastosRoutes from './routes/gastos.js';
import userRoutes from './routes/userRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware de logging para debug
app.use((req, res, next) => {
  console.log(`🔥 [${new Date().toISOString()}] ${req.method} ${req.path} - Origin: ${req.headers.origin || 'No origin'}`);
  next();
});

// Conectar a la base de datos y arrancar el servidor solo si la conexión es exitosa
const start = async () => {
  try {
    const conn = await connectDB();

    // Crear usuario admin si no existe
    await seedAdminUser();

    // Configuración de CORS
    const corsOptions = {
      origin: process.env.CORS_ORIGIN || "http://localhost:5173",
      credentials: true,
      optionsSuccessStatus: 200
    };

    // Middlewares
    app.use(cors(corsOptions));
    app.use(express.json()); // para parsear application/json

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      });
    });

    // DEBUG ENDPOINTS - TEMPORALES
    app.get('/api/debug/test', (req, res) => {
      console.log('🔵 [DEBUG] Endpoint /api/debug/test llamado');
      res.json({ 
        message: 'Backend funcionando correctamente!',
        timestamp: new Date().toISOString(),
        cors: req.headers.origin || 'No origin header',
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          PORT: process.env.PORT,
          MONGODB_CONNECTED: conn?.connection.readyState === 1,
          DATABASE_NAME: conn?.connection.name,
          CORS_ORIGIN: process.env.CORS_ORIGIN
        }
      });
    });

    app.get('/api/debug/gastos', (req, res) => {
      console.log('🔵 [DEBUG] Endpoint /api/debug/gastos llamado');
      res.json({ 
        message: 'Ruta de gastos accesible',
        gastos: [
          { id: 1, descripcion: 'Gasto de prueba', monto: 100 },
          { id: 2, descripcion: 'Otro gasto', monto: 200 }
        ]
      });
    });

    // DEBUG LOGIN - SIN JWT TEMPORALMENTE
    app.post('/api/debug/login', (req, res) => {
      console.log('🔵 [DEBUG] Login intentado:', req.body);
      res.json({
        message: 'Login debug exitoso',
        user: {
          id: '12345',
          username: 'admin',
          userType: 'admin'
        },
        token: 'fake-token-for-debug'
      });
    });

    // Rutas de la API
    app.use('/api/auth', authRoutes);
    app.use('/api/gastos', gastosRoutes);
    app.use('/api/users', userRoutes);

    const env = process.env.NODE_ENV || 'development';
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en puerto ${PORT} (env: ${env})`);
      console.log(`[DB] Conectado a MongoDB: ${conn?.connection.host}/${conn?.connection.name}`);
      console.log(`[CORS] Origen permitido: ${process.env.CORS_ORIGIN || "http://localhost:5173"}`);
      console.log(`[DEBUG] Variables de entorno:`);
      console.log(`  - NODE_ENV: ${process.env.NODE_ENV}`);
      console.log(`  - PORT: ${process.env.PORT}`);
      console.log(`  - MONGODB_URI: ${process.env.MONGODB_URI ? 'SET' : 'NOT SET'}`);
      console.log(`  - JWT_SECRET: ${process.env.JWT_SECRET ? 'SET' : 'NOT SET'}`);
      console.log(`  - CORS_ORIGIN: ${process.env.CORS_ORIGIN || 'NOT SET'}`);
    });
  } catch (err) {
    console.error('[Server] No se pudo iniciar la aplicación debido a un error:', err);
    process.exit(1);
  }
};

start();
