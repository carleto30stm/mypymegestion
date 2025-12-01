import express from 'express';
import Category from '../models/Category.js';
import Employee from '../models/Employee.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// @desc    Obtener todas las categorías
// @route   GET /api/categories
// @access  Private
router.get('/', async (req, res) => {
    try {
        const categories = await Category.find({}).sort({ nombre: 1 });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener categorías', error });
    }
});

// @desc    Crear una categoría
// @route   POST /api/categories
// @access  Private
router.post('/', async (req, res) => {
    try {
        const { nombre, sueldoBasico, valorHora, descripcion } = req.body;

        const categoryExists = await Category.findOne({ nombre });
        if (categoryExists) {
            return res.status(400).json({ message: 'La categoría ya existe' });
        }

        const category = await Category.create({
            nombre,
            sueldoBasico,
            valorHora,
            descripcion
        });

        res.status(201).json(category);
    } catch (error) {
        res.status(400).json({ message: 'Error al crear categoría', error });
    }
});

// @desc    Actualizar una categoría
// @route   PUT /api/categories/:id
// @access  Private
router.put('/:id', async (req, res) => {
    try {
        const { nombre, sueldoBasico, valorHora, descripcion } = req.body;
        const category = await Category.findById(req.params.id);

        if (category) {
            category.nombre = nombre || category.nombre;
            category.sueldoBasico = sueldoBasico !== undefined ? sueldoBasico : category.sueldoBasico;
            category.valorHora = valorHora !== undefined ? valorHora : category.valorHora;
            category.descripcion = descripcion || category.descripcion;
            category.fechaActualizacion = new Date();

            const updatedCategory = await category.save();

            // Actualizar empleados asociados
            await Employee.updateMany(
                { categoria: category._id },
                {
                    $set: {
                        sueldoBase: updatedCategory.sueldoBasico,
                        hora: updatedCategory.valorHora
                    }
                }
            );

            res.json(updatedCategory);
        } else {
            res.status(404).json({ message: 'Categoría no encontrada' });
        }
    } catch (error) {
        res.status(400).json({ message: 'Error al actualizar categoría', error });
    }
});

// @desc    Eliminar una categoría
// @route   DELETE /api/categories/:id
// @access  Private
router.delete('/:id', async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (category) {
            await category.deleteOne();
            res.json({ message: 'Categoría eliminada' });
        } else {
            res.status(404).json({ message: 'Categoría no encontrada' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar categoría', error });
    }
});

// @desc    Aplicar aumento masivo (Paritaria)
// @route   POST /api/categories/paritaria
// @access  Private
router.post('/paritaria', async (req, res) => {
    try {
        const { porcentaje, ids } = req.body; // ids es opcional, si no viene se aplica a todas

        if (!porcentaje || isNaN(porcentaje)) {
            return res.status(400).json({ message: 'Porcentaje inválido' });
        }

        const factor = 1 + (porcentaje / 100);
        const filter = ids && ids.length > 0 ? { _id: { $in: ids } } : {};

        const categories = await Category.find(filter);
        const updatedCategories = [];

        for (const cat of categories) {
            cat.sueldoBasico = Math.round(cat.sueldoBasico * factor * 100) / 100;
            if (cat.valorHora) {
                cat.valorHora = Math.round(cat.valorHora * factor * 100) / 100;
            }
            cat.fechaActualizacion = new Date();
            await cat.save();
            updatedCategories.push(cat);

            // Actualizar empleados de esta categoría
            await Employee.updateMany(
                { categoria: cat._id },
                {
                    $set: {
                        sueldoBase: cat.sueldoBasico,
                        hora: cat.valorHora
                    }
                }
            );
        }

        res.json({ message: `Aumento del ${porcentaje}% aplicado a ${updatedCategories.length} categorías y sus empleados`, updatedCategories });

    } catch (error) {
        res.status(500).json({ message: 'Error al aplicar paritaria', error });
    }
});

export default router;
