import api from './api';

export interface OrdenProcesamiento {
    _id: string;
    numeroOrden: string;
    proveedorId: {
        _id: string;
        razonSocial: string;
    };
    tipoProcesamiento: 'interno' | 'externo';
    fechaEnvio: string;
    fechaEstimadaRecepcion?: string;
    fechaRecepcionReal?: string;
    estado: 'borrador' | 'pendiente' | 'en_proceso' | 'completada' | 'cancelada';
    itemsSalida: ItemProcesamiento[];
    itemsEntrada: ItemProcesamiento[];
    costoServicio: number;
    moneda: 'ARS' | 'USD';
    observaciones?: string;
}

export interface ItemProcesamiento {
    materiaPrimaId: string;
    codigoMateriaPrima: string;
    nombreMateriaPrima: string;
    cantidad: number;
    lote?: string;
    unidadMedida: string;
    costoUnitario?: number;
}

export const getOrdenes = async () => {
    const response = await api.get('/api/ordenes-procesamiento');
    return response.data;
};

export const getOrdenById = async (id: string) => {
    const response = await api.get(`/api/ordenes-procesamiento/${id}`);
    return response.data;
};

export const crearOrden = async (data: Partial<OrdenProcesamiento>) => {
    const response = await api.post('/api/ordenes-procesamiento', data);
    return response.data;
};

export const enviarOrden = async (id: string) => {
    const response = await api.post(`/api/ordenes-procesamiento/${id}/enviar`);
    return response.data;
};

export const recibirOrden = async (id: string, data: { itemsEntrada: any[], costoServicio: number, fechaRecepcion?: Date }) => {
    const response = await api.post(`/api/ordenes-procesamiento/${id}/recibir`, data);
    return response.data;
};
