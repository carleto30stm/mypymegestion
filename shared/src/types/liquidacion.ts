/**
 * Tipos compartidos para liquidación de sueldos
 * Usados tanto en frontend como backend
 */

export type TipoPeriodo = 'quincenal' | 'mensual';
export type ModalidadContratacion = 'formal' | 'informal';
export type EstadoLiquidacion = 'pendiente' | 'pagado' | 'cancelado';

export interface IHoraExtraResumen {
    horaExtraId: string;
    fecha: Date | string;
    cantidadHoras: number;
    valorHora: number;
    montoTotal: number;
    descripcion?: string;
}

export interface IDescuentoEmpleado {
    _id?: string;
    tipo: string;
    monto: number;
    montoCalculado?: number;
    esPorcentaje: boolean;
    estado: 'pendiente' | 'aplicado' | 'anulado';
}

export interface IIncentivoEmpleado {
    _id?: string;
    tipo: string;
    monto: number;
    montoCalculado?: number;
    esPorcentaje: boolean;
    estado: 'pendiente' | 'pagado' | 'anulado';
}

export interface IEmpleadoData {
    _id?: string;
    modalidadContratacion: ModalidadContratacion;
    fechaIngreso?: string | Date | null;
    sindicato?: string | null;
    aplicaAntiguedad?: boolean;
    aplicaPresentismo?: boolean;
    aplicaZonaPeligrosa?: boolean;
    convenioId?: string | null;
    categoriaConvenio?: string | null;
}

export interface ILiquidacionEmpleado {
    empleadoId: string;
    empleadoNombre: string;
    empleadoApellido: string;
    sueldoBase: number;
    horasExtra: IHoraExtraResumen[];
    totalHorasExtra: number;
    adelantos: number;
    aguinaldos: number;
    descuentos: number;
    incentivos?: number;
    totalAPagar: number;
    estado: EstadoLiquidacion;
    // Campos calculados (opcionales, se agregan al liquidar)
    adicionalPresentismo?: number;
    adicionalZona?: number;
    adicionalAntiguedad?: number;
    baseImponible?: number;
    aporteJubilacion?: number;
    aporteObraSocial?: number;
    aportePami?: number;
    aporteSindicato?: number;
    totalAportes?: number;
    totalHaberes?: number;
    totalDeducciones?: number;
    empleadoAntiguedad?: number;
    empleadoModalidad?: ModalidadContratacion;
    empleadoFechaIngreso?: string | Date;
    empleadoSindicato?: string;
}

export interface IAdicionalesConvenio {
    presentismo: number;
    zona: number;
    antiguedad?: number;
}

export interface ICalcularLiquidacionParams {
    liquidacion: ILiquidacionEmpleado;
    empleadoData?: IEmpleadoData | null;
    tipoPeriodo: TipoPeriodo;
    descuentosDetalle?: IDescuentoEmpleado[];
    incentivosDetalle?: IIncentivoEmpleado[];
    adicionalesConvenio?: IAdicionalesConvenio | null;
}

export interface ICalcularLiquidacionResult extends ILiquidacionEmpleado {
    // Todos los campos calculados (garantizados)
    sueldoBasePeriodo: number;
    baseImponible: number;
    adicionalPresentismo: number;
    adicionalZona: number;
    adicionalAntiguedad: number;
    empleadoAntiguedad: number;
    aporteJubilacion: number;
    aporteObraSocial: number;
    aportePami: number;
    aporteSindicato: number;
    totalAportes: number;
    totalHaberes: number;
    totalDeducciones: number;
    totalAPagar: number;
    // Contribuciones patronales (para costo empresa)
    contribJubilacion: number;
    contribObraSocial: number;
    contribPami: number;
    contribART: number;
    totalContribucionesPatronales: number;
    costoTotalEmpresa: number;
}
