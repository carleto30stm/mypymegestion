import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Fix: Add an interface for the User document to include custom methods for TypeScript.
export interface IUser extends mongoose.Document {
  username: string;
  password: string;
  userType: 'admin' | 'oper' | 'oper_ad';
  createdAt: Date;
  updatedAt: Date;
  matchPassword(enteredPassword: string): Promise<boolean>;
}

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  userType: {
    type: String,
    enum: ['admin', 'oper', 'oper_ad'],
    default: 'oper',
    required: true,
  },
}, { timestamps: true });

// Middleware para hashear la contraseña antes de guardar
// Fix: Type the `this` context in the pre-save hook.
userSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Método para comparar la contraseña ingresada con la hasheada
// Fix: Add type for enteredPassword parameter.
userSchema.methods.matchPassword = async function (enteredPassword: string) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Fix: Type the model with the IUser interface.
const User = mongoose.model<IUser>('User', userSchema);

// Función para crear un usuario admin si no existe ninguno
export const seedAdminUser = async () => {
    try {
        const userCount = await User.countDocuments();
        if (userCount === 0) {
            console.log('No users found, creating admin user...');
            await User.create({
                username: 'admin',
                password: 'password',
                userType: 'admin'
            });
            console.log('Admin user created with credentials: admin / password');
        }
    } catch (error) {
    // Detectar si el error es por autenticación en MongoDB y mostrar guía útil
    const errMsg = (error && (error as any).message) ? (error as any).message : String(error);
    if (errMsg.toLowerCase().includes('requires authentication') || errMsg.toLowerCase().includes('not authorized')) {
      console.error('Error seeding admin user: la base de datos requiere autenticación.');
      console.error('Soluciones posibles:');
      console.error('- Proveer un MONGO_URI con usuario y contraseña (p. ej. mongodb://user:pass@host:27017/db?authSource=admin)');
      console.error("- Crear un usuario con privilegios en la BD antes de ejecutar la aplicación (usa mongosh o la interfaz de administración)");
      console.error(`Detalle del error: ${errMsg}`);
    } else {
      console.error('Error seeding admin user:', error);
    }
    }
}


export default User;