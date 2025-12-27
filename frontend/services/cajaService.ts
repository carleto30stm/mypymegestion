import api from './api';

export interface CajaBalance {
    caja: string;
    monto: number;
}

export interface CajaSesion {
    _id: string;
    fechaApertura: string;
    usuarioApertura: string;
    saldosIniciales: CajaBalance[];
    fechaCierre?: string;
    usuarioCierre?: string;
    saldosFinalesDeclarados?: CajaBalance[];
    saldosFinalesSistema?: CajaBalance[];
    diferencias?: CajaBalance[];
    estado: 'abierta' | 'cerrada';
    observacionesApertura?: string;
    observacionesCierre?: string;
}

export interface CajaEstadoResponse {
    estado: 'abierta' | 'cerrada';
    sesion: CajaSesion | null;
}

export const getEstadoCaja = async (): Promise<CajaEstadoResponse> => {
    const response = await api.get('/api/caja/estado');
    return response.data;
};

export const abrirCaja = async (datos: { saldosIniciales: CajaBalance[], observacionesApertura?: string }) => {
    const response = await api.post('/api/caja/abrir', datos);
    return response.data;
};

export const cerrarCaja = async (datos: {
    saldosFinalesDeclarados: CajaBalance[],
    saldosFinalesSistema: CajaBalance[],
    observacionesCierre?: string
}) => {
    const response = await api.post('/api/caja/cerrar', datos);
    return response.data;
};

export const getHistorialCaja = async (pagina = 1, limite = 10) => {
    const response = await api.get(`/api/caja/historial?pagina=${pagina}&limite=${limite}`);
    return response.data;
};
