import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import type { IUser } from '../models/User.js';

interface AuthRequest extends Request {
  user?: IUser;
}

export const adminAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      try {
        // Obtener token del header
        token = req.headers.authorization.split(' ')[1];

        // Verificar token
        const secret = String(process.env.JWT_SECRET || 'secret');
        const decoded = jwt.verify(token as string, secret) as any;

        // Obtener usuario del token
        req.user = await User.findById(decoded.id).select('-password');

        // Verificar que el usuario sea admin
        if (req.user?.userType !== 'admin') {
          return res.status(403).json({ 
            message: 'Acceso denegado. Solo los administradores pueden realizar esta acción.' 
          });
        }

        next();
      } catch (error) {
        console.error(error);
        res.status(401).json({ message: 'No autorizado, token falló' });
      }
    }

    if (!token) {
      res.status(401).json({ message: 'No autorizado, no hay token' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};