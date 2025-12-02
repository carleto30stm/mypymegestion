import express from 'express';
import Category from '../models/Category.js';
import type { ICategory } from '../models/Category.js';
import Employee from '../models/Employee.js';
import Convenio from '../models/Convenio.js';
import type { IConvenio } from '../models/Convenio.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// @desc    Obtener todas las categorías (internas)
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

// @desc    Obtener todas las categorías unificadas (internas + CCT) para mano de obra
// @route   GET /api/categories/todas-mano-obra
// @access  Private
// @query   soloConValorHora (boolean) - Solo devolver categorías que tienen valor hora > 0
router.get('/todas-mano-obra', async (req, res) => {
    try {
        const soloConValorHora = req.query.soloConValorHora === 'true';
        const categoriasUnificadas: Array<{
            _id: string;
            nombre: string;
            valorHora: number;
            sueldoBasico?: number;
            origen: 'interna' | 'convenio';
            convenioId?: string;
            convenioNombre?: string;
            codigoCategoria?: string;
        }> = [];

        // 1. Obtener categorías internas
        const categoriasInternas = await Category.find({}).sort({ nombre: 1 });
        
        for (const cat of categoriasInternas) {
            // Usar valorHora si está definido, sino calcularlo desde sueldoBasico
            // Fórmula: sueldoBasico / (48 horas semanales * 4.33 semanas promedio)
            let valorHoraFinal: number;
            if (cat.valorHora && cat.valorHora > 0) {
                valorHoraFinal = cat.valorHora;
            } else if (cat.sueldoBasico && cat.sueldoBasico > 0) {
                const horasMensuales = 48 * 4.33; // ~208 horas mensuales
                valorHoraFinal = cat.sueldoBasico / horasMensuales;
            } else {
                valorHoraFinal = 0;
            }
            
            // Si se requiere valorHora > 0 y no lo tiene, saltar
            if (soloConValorHora && valorHoraFinal <= 0) continue;
            
            categoriasUnificadas.push({
                _id: (cat._id as any).toString(),
                nombre: cat.nombre,
                valorHora: Math.round(valorHoraFinal * 100) / 100,
                sueldoBasico: cat.sueldoBasico,
                origen: 'interna'
            });
        }

        // 2. Obtener categorías de convenios CCT activos
        const convenios = await Convenio.find({ estado: 'vigente' });
        
        for (const conv of convenios) {
            if (!conv.categorias) continue;
            
            for (const cat of conv.categorias) {
                if (cat.activa === false) continue;
                
                // Usar valorHora del convenio si está definido, sino calcularlo
                let valorHoraFinal: number;
                if (cat.valorHora && cat.valorHora > 0) {
                    // Usar el valor hora definido manualmente
                    valorHoraFinal = cat.valorHora;
                } else {
                    // Calcular automáticamente: salarioBasico / (jornadaCompleta * 4.33 semanas promedio)
                    const horasMensuales = (conv.jornadaCompleta || 48) * 4.33;
                    valorHoraFinal = cat.salarioBasico / horasMensuales;
                }
                
                // Si se requiere valorHora > 0 y no lo tiene, saltar
                if (soloConValorHora && valorHoraFinal <= 0) continue;
                
                categoriasUnificadas.push({
                    _id: `${(conv._id as any).toString()}|${cat.codigo}`, // ID compuesto
                    nombre: `${cat.nombre} (${conv.nombre})`,
                    valorHora: Math.round(valorHoraFinal * 100) / 100,
                    sueldoBasico: cat.salarioBasico,
                    origen: 'convenio',
                    convenioId: (conv._id as any).toString(),
                    convenioNombre: conv.nombre,
                    codigoCategoria: cat.codigo
                });
            }
        }

        // Ordenar: primero internas, luego por convenio, y alfabéticamente
        categoriasUnificadas.sort((a, b) => {
            if (a.origen !== b.origen) {
                return a.origen === 'interna' ? -1 : 1;
            }
            if (a.origen === 'convenio' && b.origen === 'convenio') {
                if (a.convenioNombre !== b.convenioNombre) {
                    return (a.convenioNombre || '').localeCompare(b.convenioNombre || '');
                }
            }
            return a.nombre.localeCompare(b.nombre);
        });

        res.json(categoriasUnificadas);
    } catch (error) {
        console.error('Error al obtener categorías unificadas:', error);
        res.status(500).json({ message: 'Error al obtener categorías unificadas', error });
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
