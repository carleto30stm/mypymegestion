// No usamos jwt: validación simple mediante el id del usuario como token
// Fix: Aliased Request and Response to avoid global type conflicts.
import type { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';
import User from '../models/User.js';

// Fix: Use declaration merging to add the 'user' property to the Express Request type.
// This is a cleaner approach than a custom interface and fixes type errors.
declare global {
  namespace Express {
    export interface Request {
      user?: any;
    }
  }
}

// Fix: Use the standard Express Request type now that it's been augmented.
export const protect = async (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Obtener token del header
      token = req.headers.authorization.split(' ')[1];

      // Token simple: enviamos el user id directamente como token
      const userId = token;

      // Obtener usuario por id (sin la contraseña)
      try {
        req.user = await User.findById(userId).select('-password');
      } catch (err) {
        console.error('Error buscando usuario por token simple:', err);
        return res.status(401).json({ message: 'No autorizado, token inválido' });
      }
      
      if (!req.user) {
        return res.status(401).json({ message: 'No autorizado, usuario no encontrado' });
      }

      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'No autorizado, token fallido' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'No autorizado, no hay token' });
  }
};