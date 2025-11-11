// Validación de JWT usando jsonwebtoken
// Fix: Aliased Request and Response to avoid global type conflicts.
import type { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
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

      // Verificar que el token existe
      if (!token) {
        return res.status(401).json({ message: 'No autorizado, token no proporcionado' });
      }

      // Verificar y decodificar el JWT
      const secret = String(process.env.JWT_SECRET || 'secret');
      const decoded = jwt.verify(token, secret) as unknown as { id: string };

      // Obtener usuario por id extraído del JWT (sin la contraseña)
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        return res.status(401).json({ message: 'No autorizado, usuario no encontrado' });
      }

      next();
    } catch (error: any) {
      console.error('Error en autenticación JWT:', error.message);
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expirado' });
      } else if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Token inválido' });
      }
      
      return res.status(401).json({ message: 'No autorizado, token fallido' });
    }
  } else {
    return res.status(401).json({ message: 'No autorizado, no hay token' });
  }
};