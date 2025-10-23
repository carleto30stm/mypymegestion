// Fix: Aliased Request and Response to avoid global type conflicts.
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
// Fix: Import the IUser interface to correctly type the user document.
import User, {type  IUser } from '../models/User.js';
import jwt from 'jsonwebtoken';

// Función para generar JWT token con expiración de 12 horas
const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '12h', // Cambio: De 30 días a 12 horas
  });
};

// @desc    Autenticar un usuario y obtener token
// @route   POST /api/login
// @access  Public
export const loginUser = async (req: ExpressRequest, res: ExpressResponse) => {
    const { username, password } = req.body;

    try {
        // Fix: Explicitly type the user variable to ensure `matchPassword` is available.
        const user: IUser | null = await User.findOne({ username });

        if (user && (await user.matchPassword(password))) {
            res.json({
                user: { 
                    id: String(user._id), 
                    username: user.username,
                    userType: user.userType 
                },
                token: generateToken(String(user._id)),
            });
        } else {
            res.status(401).json({ message: 'Usuario o contraseña inválidos' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor' });
    }
};
