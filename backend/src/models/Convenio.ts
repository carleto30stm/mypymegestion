import mongoose, { Schema, Document } from 'mongoose';

// =====================================================
// MODELO DE CONVENIO COLECTIVO DE TRABAJO (CCT)
// Sistema de escalas salariales por categoría
// =====================================================

// Interface para una categoría dentro del convenio
export interface ICategoriaConvenio {
  codigo: string;           // Ej: "A", "B", "C" o "CAT1", "CAT2"
  nombre: string;           // Ej: "Oficial", "Medio Oficial", "Ayudante"
  descripcion?: string;
  salarioBasico: number;    // Sueldo básico de la categoría
  valorHora?: number;       // Valor hora (opcional, si no se define se calcula automáticamente)
  adicionales?: {
    concepto: string;       // Ej: "Antigüedad", "Título", "Presentismo"
    tipo: 'porcentaje' | 'fijo';
    valor: number;          // Porcentaje o monto fijo
    aplicaSobre?: 'basico' | 'bruto'; // Sobre qué se calcula el porcentaje
  }[];
  orden: number;            // Para ordenar las categorías (1 = más baja)
  activa: boolean;
}

// Interface para el historial de paritarias/ajustes
export interface IHistorialAjuste {
  fecha: Date;
  tipoAjuste: 'paritaria' | 'decreto' | 'acuerdo' | 'otro';
  porcentajeAumento: number;
  montoFijo?: number;       // Algunos acuerdos incluyen suma fija
  descripcion: string;
  aplicadoA: 'todas' | string[]; // 'todas' o array de códigos de categorías
  retroactivo?: boolean;
  fechaRetroactiva?: Date;
  registradoPor?: string;
}

// Interface principal del Convenio
export interface IConvenio extends Document {
  // Datos del convenio
  numero: string;           // Ej: "260/75", "130/75"
  nombre: string;           // Ej: "Comercio", "Metalúrgico"
  descripcion?: string;
  rama?: string;            // Rama o actividad específica
  sindicato: string;        // Ej: "FAECYS", "UOM"
  
  // Vigencia
  fechaVigenciaDesde: Date;
  fechaVigenciaHasta?: Date;
  estado: 'vigente' | 'vencido' | 'suspendido';
  
  // Escalas salariales
  categorias: ICategoriaConvenio[];
  
  // Configuración de adicionales comunes a todas las categorías
  adicionalesGenerales?: {
    presentismo?: {
      activo: boolean;
      porcentaje: number;    // Típicamente 8.33% o similar
      condiciones?: string;
    };
    antiguedad?: {
      activo: boolean;
      porcentajePorAnio: number; // Típicamente 1% o 2% por año
      tope?: number;         // Tope máximo de antigüedad
      aplicaSobre: 'basico' | 'bruto';
    };
    zonaPeligrosa?: {
      activo: boolean;
      porcentaje: number;
    };
    titulo?: {
      activo: boolean;
      valores: {
        nivel: string;       // Ej: "Secundario", "Universitario"
        porcentaje: number;
      }[];
    };
  };
  
  // Jornada laboral
  jornadaCompleta: number;  // Horas semanales (típicamente 48)
  horasExtras50: number;    // % adicional horas extra 50%
  horasExtras100: number;   // % adicional horas extra 100%
  
  // Historial de ajustes/paritarias
  historialAjustes: IHistorialAjuste[];
  
  // Metadata
  observaciones?: string;
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// SCHEMAS
// =====================================================

const AdicionalCategoriaSchema = new Schema({
  concepto: { type: String, required: true },
  tipo: { type: String, enum: ['porcentaje', 'fijo'], required: true },
  valor: { type: Number, required: true },
  aplicaSobre: { type: String, enum: ['basico', 'bruto'], default: 'basico' }
}, { _id: false });

const CategoriaConvenioSchema = new Schema({
  codigo: { type: String, required: true },
  nombre: { type: String, required: true },
  descripcion: { type: String },
  salarioBasico: { type: Number, required: true, min: 0 },
  valorHora: { type: Number, min: 0 }, // Opcional: si no se define, se calcula automáticamente
  adicionales: [AdicionalCategoriaSchema],
  orden: { type: Number, default: 0 },
  activa: { type: Boolean, default: true }
});

const HistorialAjusteSchema = new Schema({
  fecha: { type: Date, required: true },
  tipoAjuste: { 
    type: String, 
    enum: ['paritaria', 'decreto', 'acuerdo', 'otro'],
    required: true 
  },
  porcentajeAumento: { type: Number, required: true },
  montoFijo: { type: Number },
  descripcion: { type: String, required: true },
  aplicadoA: { type: Schema.Types.Mixed, default: 'todas' }, // 'todas' o array de strings
  retroactivo: { type: Boolean, default: false },
  fechaRetroactiva: { type: Date },
  registradoPor: { type: String }
}, { timestamps: true });

const ConvenioSchema = new Schema({
  // Datos del convenio
  numero: { 
    type: String, 
    required: true,
    unique: true,
    trim: true
  },
  nombre: { 
    type: String, 
    required: true,
    trim: true
  },
  descripcion: { type: String },
  rama: { type: String, trim: true },
  sindicato: { 
    type: String, 
    required: true,
    trim: true
  },
  
  // Vigencia
  fechaVigenciaDesde: { type: Date, required: true },
  fechaVigenciaHasta: { type: Date },
  estado: { 
    type: String, 
    enum: ['vigente', 'vencido', 'suspendido'],
    default: 'vigente'
  },
  
  // Escalas salariales
  categorias: [CategoriaConvenioSchema],
  
  // Adicionales generales
  adicionalesGenerales: {
    presentismo: {
      activo: { type: Boolean, default: true },
      porcentaje: { type: Number, default: 8.33 },
      condiciones: { type: String }
    },
    antiguedad: {
      activo: { type: Boolean, default: true },
      porcentajePorAnio: { type: Number, default: 1 },
      tope: { type: Number },
      aplicaSobre: { type: String, enum: ['basico', 'bruto'], default: 'basico' }
    },
    zonaPeligrosa: {
      activo: { type: Boolean, default: false },
      porcentaje: { type: Number, default: 0 }
    },
    titulo: {
      activo: { type: Boolean, default: false },
      valores: [{
        nivel: { type: String },
        porcentaje: { type: Number }
      }]
    }
  },
  
  // Jornada laboral
  jornadaCompleta: { type: Number, default: 48 },
  horasExtras50: { type: Number, default: 50 },
  horasExtras100: { type: Number, default: 100 },
  
  // Historial de ajustes
  historialAjustes: [HistorialAjusteSchema],
  
  // Metadata
  observaciones: { type: String }
}, {
  timestamps: true
});

// =====================================================
// ÍNDICES
// =====================================================

ConvenioSchema.index({ numero: 1 });
ConvenioSchema.index({ nombre: 'text', sindicato: 'text' });
ConvenioSchema.index({ estado: 1 });
ConvenioSchema.index({ 'categorias.codigo': 1 });

// =====================================================
// MÉTODOS VIRTUALES
// =====================================================

// Obtener la cantidad de categorías activas
ConvenioSchema.virtual('categoriasActivas').get(function() {
  return this.categorias.filter(c => c.activa).length;
});

// Obtener el último ajuste registrado
ConvenioSchema.virtual('ultimoAjuste').get(function() {
  if (this.historialAjustes.length === 0) return null;
  return this.historialAjustes.sort((a, b) => 
    new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  )[0];
});

// =====================================================
// MÉTODOS DE INSTANCIA
// =====================================================

// Obtener categoría por código
ConvenioSchema.methods.obtenerCategoria = function(codigo: string): ICategoriaConvenio | null {
  return this.categorias.find((c: ICategoriaConvenio) => c.codigo === codigo) || null;
};

// Calcular sueldo total de una categoría con adicionales
ConvenioSchema.methods.calcularSueldoCategoria = function(
  codigoCategoria: string,
  antiguedadAnios: number = 0,
  aplicaPresentismo: boolean = true,
  tieneZonaPeligrosa: boolean = false,
  nivelTitulo?: string
): { basico: number; adicionales: { concepto: string; monto: number }[]; total: number } {
  const categoria = this.categorias.find((c: ICategoriaConvenio) => c.codigo === codigoCategoria);
  if (!categoria) {
    throw new Error(`Categoría ${codigoCategoria} no encontrada`);
  }
  
  const basico = categoria.salarioBasico;
  const adicionales: { concepto: string; monto: number }[] = [];
  let total = basico;
  
  // Adicionales de la categoría
  if (categoria.adicionales) {
    for (const adicional of categoria.adicionales) {
      let monto = 0;
      if (adicional.tipo === 'fijo') {
        monto = adicional.valor;
      } else {
        const base = adicional.aplicaSobre === 'bruto' ? total : basico;
        monto = base * (adicional.valor / 100);
      }
      adicionales.push({ concepto: adicional.concepto, monto });
      total += monto;
    }
  }
  
  // Adicionales generales
  const generales = this.adicionalesGenerales;
  
  // Presentismo
  if (generales?.presentismo?.activo && aplicaPresentismo) {
    const montoPresentismo = basico * (generales.presentismo.porcentaje / 100);
    adicionales.push({ concepto: 'Presentismo', monto: montoPresentismo });
    total += montoPresentismo;
  }
  
  // Antigüedad
  if (generales?.antiguedad?.activo && antiguedadAnios > 0) {
    let aniosAplicar = antiguedadAnios;
    if (generales.antiguedad.tope && antiguedadAnios > generales.antiguedad.tope) {
      aniosAplicar = generales.antiguedad.tope;
    }
    const base = generales.antiguedad.aplicaSobre === 'bruto' ? total : basico;
    const montoAntiguedad = base * (generales.antiguedad.porcentajePorAnio / 100) * aniosAplicar;
    adicionales.push({ concepto: `Antigüedad (${aniosAplicar} años)`, monto: montoAntiguedad });
    total += montoAntiguedad;
  }
  
  // Zona peligrosa
  if (generales?.zonaPeligrosa?.activo && tieneZonaPeligrosa) {
    const montoZona = basico * (generales.zonaPeligrosa.porcentaje / 100);
    adicionales.push({ concepto: 'Zona Peligrosa', monto: montoZona });
    total += montoZona;
  }
  
  // Título
  if (generales?.titulo?.activo && nivelTitulo) {
    const valorTitulo = generales.titulo.valores?.find((v: { nivel: string; porcentaje: number }) => v.nivel === nivelTitulo);
    if (valorTitulo) {
      const montoTitulo = basico * (valorTitulo.porcentaje / 100);
      adicionales.push({ concepto: `Título (${nivelTitulo})`, monto: montoTitulo });
      total += montoTitulo;
    }
  }
  
  return { basico, adicionales, total };
};

// Aplicar aumento a todas las categorías
ConvenioSchema.methods.aplicarAumento = function(
  porcentaje: number,
  tipoAjuste: string,
  descripcion: string,
  categoriasAfectadas: 'todas' | string[] = 'todas',
  montoFijo?: number
): void {
  const categoriasAAjustar = categoriasAfectadas === 'todas' 
    ? this.categorias 
    : this.categorias.filter((c: ICategoriaConvenio) => (categoriasAfectadas as string[]).includes(c.codigo));
  
  for (const categoria of categoriasAAjustar) {
    // Aplicar porcentaje
    categoria.salarioBasico = Math.round(categoria.salarioBasico * (1 + porcentaje / 100));
    
    // Aplicar monto fijo si existe
    if (montoFijo) {
      categoria.salarioBasico += montoFijo;
    }
  }
  
  // Registrar en historial
  this.historialAjustes.push({
    fecha: new Date(),
    tipoAjuste,
    porcentajeAumento: porcentaje,
    montoFijo,
    descripcion,
    aplicadoA: categoriasAfectadas
  });
};

export default mongoose.model<IConvenio>('Convenio', ConvenioSchema);
