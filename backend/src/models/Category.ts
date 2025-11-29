import mongoose from 'mongoose';

export interface ICategory extends mongoose.Document {
  nombre: string;
  sueldoBasico: number;
  valorHora?: number;
  descripcion?: string;
  fechaActualizacion: Date;
}

const categorySchema = new mongoose.Schema<ICategory>({
  nombre: {
    type: String,
    required: [true, 'El nombre de la categoría es requerido'],
    trim: true,
    unique: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres']
  },
  sueldoBasico: {
    type: Number,
    required: [true, 'El sueldo básico es requerido'],
    min: [0, 'El sueldo básico debe ser mayor a 0']
  },
  valorHora: {
    type: Number,
    min: [0, 'El valor hora debe ser mayor a 0']
  },
  descripcion: {
    type: String,
    trim: true,
    maxlength: [500, 'La descripción no puede exceder 500 caracteres']
  },
  fechaActualizacion: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const Category = mongoose.model<ICategory>('Category', categorySchema);

export default Category;
