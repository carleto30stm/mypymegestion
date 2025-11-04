import mongoose, { Document } from 'mongoose';
import { UNIDADES_MEDIDA } from '../Types/Types.js';

export interface IMateriaPrima extends Document {
  codigo: string;
  nombre: string;
  descripcion?: string;
  categoria: string;
  precioUltimaCompra: number;
  precioPromedio: number; // Precio promedio ponderado
  stock: number;
  stockMinimo: number;
  stockMaximo: number;
  unidadMedida: typeof UNIDADES_MEDIDA[number];
  proveedorPrincipal?: mongoose.Types.ObjectId; // Referencia a Proveedor
  proveedoresAlternativos?: mongoose.Types.ObjectId[]; // Otros proveedores
  ubicacion?: string; // Ubicación física en almacén
  lote?: string;
  fechaVencimiento?: Date;
  estado: 'activo' | 'inactivo' | 'discontinuado';
  observaciones?: string;
  fechaCreacion: Date;
  fechaActualizacion: Date;
  ultimaCompra?: Date;
}

const materiaPrimaSchema = new mongoose.Schema<IMateriaPrima>({
  codigo: {
    type: String,
    required: [true, 'El código es requerido'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [50, 'El código no puede exceder 50 caracteres']
  },
  nombre: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true,
    maxlength: [200, 'El nombre no puede exceder 200 caracteres']
  },
  descripcion: {
    type: String,
    trim: true,
    maxlength: [1000, 'La descripción no puede exceder 1000 caracteres']
  },
  categoria: {
    type: String,
    required: [true, 'La categoría es requerida'],
    trim: true,
    maxlength: [100, 'La categoría no puede exceder 100 caracteres']
  },
  precioUltimaCompra: {
    type: Number,
    required: [true, 'El precio de última compra es requerido'],
    min: [0, 'El precio debe ser mayor o igual a 0'],
    default: 0
  },
  precioPromedio: {
    type: Number,
    required: [true, 'El precio promedio es requerido'],
    min: [0, 'El precio promedio debe ser mayor o igual a 0'],
    default: 0
  },
  stock: {
    type: Number,
    required: [true, 'El stock es requerido'],
    min: [0, 'El stock no puede ser negativo'],
    default: 0
  },
  stockMinimo: {
    type: Number,
    required: [true, 'El stock mínimo es requerido'],
    min: [0, 'El stock mínimo debe ser mayor o igual a 0'],
    default: 0
  },
  stockMaximo: {
    type: Number,
    min: [0, 'El stock máximo debe ser mayor o igual a 0'],
    default: 0,
    validate: {
      validator: function(this: IMateriaPrima, value: number) {
        return value === 0 || value >= this.stockMinimo;
      },
      message: 'El stock máximo debe ser mayor o igual al stock mínimo'
    }
  },
  unidadMedida: {
    type: String,
    required: [true, 'La unidad de medida es requerida'],
    enum: UNIDADES_MEDIDA,
    default: 'KG'
  },
  proveedorPrincipal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proveedor'
  },
  proveedoresAlternativos: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proveedor'
  }],
  ubicacion: {
    type: String,
    trim: true,
    maxlength: [100, 'La ubicación no puede exceder 100 caracteres']
  },
  lote: {
    type: String,
    trim: true,
    maxlength: [50, 'El lote no puede exceder 50 caracteres']
  },
  fechaVencimiento: {
    type: Date
  },
  estado: {
    type: String,
    enum: ['activo', 'inactivo', 'discontinuado'],
    default: 'activo'
  },
  observaciones: {
    type: String,
    trim: true,
    maxlength: [1000, 'Las observaciones no pueden exceder 1000 caracteres']
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  fechaActualizacion: {
    type: Date,
    default: Date.now
  },
  ultimaCompra: {
    type: Date
  }
}, {
  timestamps: {
    createdAt: 'fechaCreacion',
    updatedAt: 'fechaActualizacion'
  }
});

// Índices para búsqueda eficiente
materiaPrimaSchema.index({ nombre: 1 });
materiaPrimaSchema.index({ categoria: 1 });
materiaPrimaSchema.index({ estado: 1 });
materiaPrimaSchema.index({ stock: 1, stockMinimo: 1 }); // Para alertas de stock bajo
materiaPrimaSchema.index({ proveedorPrincipal: 1 });

// Método virtual para verificar stock bajo
materiaPrimaSchema.virtual('stockBajo').get(function(this: IMateriaPrima) {
  return this.stock <= this.stockMinimo;
});

// Método virtual para verificar stock crítico (menos del 50% del mínimo)
materiaPrimaSchema.virtual('stockCritico').get(function(this: IMateriaPrima) {
  return this.stock <= (this.stockMinimo * 0.5);
});

// Método virtual para verificar si está vencido
materiaPrimaSchema.virtual('estaVencido').get(function(this: IMateriaPrima) {
  if (!this.fechaVencimiento) return false;
  return this.fechaVencimiento < new Date();
});

// Método virtual para verificar si está próximo a vencer (30 días)
materiaPrimaSchema.virtual('proximoVencer').get(function(this: IMateriaPrima) {
  if (!this.fechaVencimiento) return false;
  const treintaDias = new Date();
  treintaDias.setDate(treintaDias.getDate() + 30);
  return this.fechaVencimiento <= treintaDias && this.fechaVencimiento > new Date();
});

// Asegurar que los virtuales se incluyan en JSON
materiaPrimaSchema.set('toJSON', { virtuals: true });
materiaPrimaSchema.set('toObject', { virtuals: true });

const MateriaPrima = mongoose.model<IMateriaPrima>('MateriaPrima', materiaPrimaSchema);

export default MateriaPrima;
