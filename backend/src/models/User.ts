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
export default User;