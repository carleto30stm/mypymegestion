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

    // Rutas de la API
    app.use('/api/auth', authRoutes);
    app.use('/api/gastos', gastosRoutes);
    app.use('/api/users', userRoutes);

    const env = process.env.NODE_ENV || 'development';
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en puerto ${PORT} (env: ${env})`);
      console.log(`[DB] Conectado a MongoDB: ${conn?.connection.host}/${conn?.connection.name}`);
      console.log(`[CORS] Origen permitido: ${process.env.CORS_ORIGIN || "http://localhost:5173"}`);
    });
  } catch (err) {
    console.error('[Server] No se pudo iniciar la aplicación debido a un error:', err);
    process.exit(1);
  }
};

start();
