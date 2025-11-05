import mongoose, { Document } from 'mongoose';
import { UNIDADES_MEDIDA } from '../Types/Types.js';
export interface IProducto extends Document {
  codigo: string;
  nombre: string;
  descripcion?: string;
  categoria: string;
  precioCompra: number;
  precioVenta: number;
  stock: number;
  stockMinimo: number;
  unidadMedida: typeof UNIDADES_MEDIDA[number];
  proveedor?: string;
  imagen?: string;
  estado: 'activo' | 'inactivo';
  fechaCreacion: Date;
  fechaActualizacion: Date;
}

const productoSchema = new mongoose.Schema<IProducto>({
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
  precioCompra: {
    type: Number,
    required: [true, 'El precio de compra es requerido'],
    min: [0, 'El precio de compra debe ser mayor o igual a 0']
  },
  precioVenta: {
    type: Number,
    required: [true, 'El precio de venta es requerido'],
    min: [0, 'El precio de venta debe ser mayor o igual a 0'],
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
  unidadMedida: {
    type: String,
    required: [true, 'La unidad de medida es requerida'],
    enum: UNIDADES_MEDIDA,
    default: 'UNIDAD'
  },
  proveedor: {
    type: String,
    trim: true,
    maxlength: [200, 'El proveedor no puede exceder 200 caracteres']
  },
  imagen: {
    type: String,
    trim: true
  },
  estado: {
    type: String,
    enum: ['activo', 'inactivo'],
    default: 'activo'
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  fechaActualizacion: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: {
    createdAt: 'fechaCreacion',
    updatedAt: 'fechaActualizacion'
  }
});

// Índices para búsqueda eficiente
productoSchema.index({ nombre: 1 });
productoSchema.index({ categoria: 1 });
productoSchema.index({ estado: 1 });
productoSchema.index({ stock: 1, stockMinimo: 1 }); // Para alertas de stock bajo

// Método virtual para verificar stock bajo
productoSchema.virtual('stockBajo').get(function(this: IProducto) {
  return this.stock <= this.stockMinimo;
});

// Método virtual para calcular margen de ganancia
productoSchema.virtual('margenGanancia').get(function(this: IProducto) {
  if (this.precioCompra === 0) return 0;
  return ((this.precioVenta - this.precioCompra) / this.precioCompra) * 100;
});

// Asegurar que los virtuales se incluyan en JSON
productoSchema.set('toJSON', { virtuals: true });
productoSchema.set('toObject', { virtuals: true });

const Producto = mongoose.model<IProducto>('Producto', productoSchema);

export default Producto;
