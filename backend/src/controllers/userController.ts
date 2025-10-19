import type { Request, Response } from 'express';
import User from '../models/User.js';
import type { IUser } from '../models/User.js';

interface AuthRequest extends Request {
  user?: IUser;
}

// @desc    Crear un nuevo usuario
// @route   POST /api/users
// @access  Private/Admin
export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, userType } = req.body;

    // Validar campos requeridos
    if (!username || !password || !userType) {
      return res.status(400).json({ 
        message: 'Por favor proporcione username, password y userType' 
      });
    }

    // Validar tipo de usuario
    if (!['admin', 'oper', 'oper_ad'].includes(userType)) {
      return res.status(400).json({ 
        message: 'userType debe ser admin, oper o oper_ad' 
      });
    }

    // Verificar si el usuario ya existe
    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ 
        message: 'El usuario ya existe' 
      });
    }

    // Crear el usuario
    const user = await User.create({
      username,
      password,
      userType
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        userType: user.userType,
        createdAt: user.createdAt,
        message: 'Usuario creado exitosamente'
      });
    } else {
      res.status(400).json({ message: 'Datos de usuario inválidos' });
    }
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({ 
      message: 'Error del servidor al crear usuario',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// @desc    Obtener todos los usuarios
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ 
      message: 'Error del servidor al obtener usuarios',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// @desc    Eliminar usuario
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar que no se esté intentando eliminar a sí mismo
    if (req.user?._id && req.user._id.toString() === id) {
      return res.status(400).json({ 
        message: 'No puedes eliminar tu propia cuenta' 
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Prevenir eliminar el último admin
    if (user.userType === 'admin') {
      const adminCount = await User.countDocuments({ userType: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ 
          message: 'No se puede eliminar el último administrador del sistema' 
        });
      }
    }

    await User.findByIdAndDelete(id);

    res.json({ 
      message: 'Usuario eliminado exitosamente',
      deletedUser: {
        _id: user._id,
        username: user.username,
        userType: user.userType
      }
    });
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({ 
      message: 'Error del servidor al eliminar usuario',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// @desc    Actualizar usuario
// @route   PUT /api/users/:id
// @access  Private/Admin
export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { username, userType, password } = req.body;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Validar tipo de usuario si se proporciona
    if (userType && !['admin', 'oper', 'oper_ad'].includes(userType)) {
      return res.status(400).json({ 
        message: 'userType debe ser admin, oper o oper_ad' 
      });
    }

    // Prevenir cambiar el tipo del último admin
    if (user.userType === 'admin' && userType && userType !== 'admin') {
      const adminCount = await User.countDocuments({ userType: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ 
          message: 'No se puede cambiar el tipo del último administrador del sistema' 
        });
      }
    }

    // Verificar username único si se está cambiando
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ 
          message: 'El username ya está en uso' 
        });
      }
    }

    // Actualizar campos
    if (username) user.username = username;
    if (userType) user.userType = userType;
    if (password) user.password = password; // Se hasheará automáticamente por el middleware

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      userType: updatedUser.userType,
      updatedAt: updatedUser.updatedAt,
      message: 'Usuario actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({ 
      message: 'Error del servidor al actualizar usuario',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};