import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI as string);
    console.info(`[DB] MongoDB conectado correctamente: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error: any) {
    console.error(`[DB] Error de conexión a MongoDB: ${error?.message || error}`);
    // No continuar si no hay conexión a la base de datos
    process.exit(1);
  }
};

export default connectDB;