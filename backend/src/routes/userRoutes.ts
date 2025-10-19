import express from 'express';
import { 
  createUser, 
  getUsers, 
  deleteUser, 
  updateUser 
} from '../controllers/userController.js';
import { adminAuth } from '../middleware/adminAuth.js';

const router = express.Router();

// Todas las rutas requieren autenticación de admin
// router.use(adminAuth);

// @route   GET /api/users
// @desc    Obtener todos los usuarios
// @access  Private/Admin
router.get('/', getUsers);

// @route   POST /api/users
// @desc    Crear un nuevo usuario
// @access  Private/Admin
router.post('/', createUser);

// @route   PUT /api/users/:id
// @desc    Actualizar usuario
// @access  Private/Admin
router.put('/:id', updateUser);

// @route   DELETE /api/users/:id
// @desc    Eliminar usuario
// @access  Private/Admin
router.delete('/:id', deleteUser);

export default router;