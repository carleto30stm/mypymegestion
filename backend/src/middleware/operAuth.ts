import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

interface AuthRequest extends Request {
  user?: any;
}

// Middleware para verificar permisos de edición/eliminación
// Los usuarios "admin" y "oper_ad" pueden editar/eliminar, pero "oper" NO
export const requireEditDeletePermission = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token = req.header('Authorization');

  if (!token) {
    return res.status(401).json({ message: 'No token, acceso denegado' });
  }

  try {
    // Remove Bearer prefix if present
    if (token.startsWith('Bearer ')) {
      token = token.slice(7);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string };
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'Token no válido' });
    }

    // Verificar que el usuario tenga permisos de edición/eliminación
    if (user.userType === 'oper') {
      return res.status(403).json({ 
        message: 'No tienes permisos para editar o eliminar registros. Solo usuarios admin y oper_ad pueden realizar estas acciones.' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Error en middleware de autorización:', error);
    res.status(401).json({ message: 'Token no válido' });
  }
};