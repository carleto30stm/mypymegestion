import cron from 'node-cron';
import InteresPunitorio from '../models/InteresPunitorio.js';
import ConfiguracionIntereses from '../models/ConfiguracionIntereses.js';
import Venta from '../models/Venta.js';

/**
 * Cron job para calcular intereses punitorios diariamente
 * Se ejecuta todos los días a las 00:00 (medianoche)
 * 
 * Formato cron: segundo minuto hora día mes díaDeLaSemana
 * '0 0 * * *' = cada día a las 00:00
 */
export const iniciarCalculoInteresesDiario = () => {
  // Ejecutar todos los días a medianoche
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Iniciando cálculo automático de intereses punitorios...');
    
    try {
      // Antes del cálculo, crear intereses nuevos desde ventas vencidas si corresponde
      const creadosDesdeVentas = await crearInteresesDesdeVentas();
      console.log(`[CRON] Se crearon ${creadosDesdeVentas.creados || 0} intereses desde ventas vencidas`);
      // Buscar todos los intereses activos (en estado "devengando")
      const interesesActivos = await InteresPunitorio.find({ 
        estado: 'devengando' 
      }).populate('clienteId', 'nombre apellido razonSocial');
      
      console.log(`[CRON] Encontrados ${interesesActivos.length} intereses en estado devengando`);
      
      let actualizados = 0;
      let errores = 0;
      
      // Actualizar cada registro
      for (const interes of interesesActivos) {
        try {
          await (interes as any).actualizarCalculo('sistema_cron');
          actualizados++;
          
          console.log(
            `[CRON] ✓ Interés actualizado - Cliente: ${(interes.clienteId as any)?.razonSocial || 'N/A'}, ` +
            `Documento: ${interes.documentoRelacionado.tipo} ${interes.documentoRelacionado.numeroDocumento}, ` +
            `Devengado: $${interes.interesDevengado.toFixed(2)}, Días: ${interes.diasTranscurridos}`
          );
        } catch (error: any) {
          errores++;
          console.error(
            `[CRON] ✗ Error al actualizar interés ${interes._id}:`, 
            error.message
          );
        }
      }
      
      console.log(
        `[CRON] Finalizado - Actualizados: ${actualizados}, Errores: ${errores}, Total: ${interesesActivos.length}`
      );
      
    } catch (error: any) {
      console.error('[CRON] Error crítico en cálculo de intereses:', error);
    }
  });
  
  console.log('[CRON] Job de cálculo de intereses punitorios programado (00:00 diario)');
};

/**
 * Función auxiliar para ejecutar cálculo manual (debugging/testing)
 */
export const ejecutarCalculoManual = async () => {
  console.log('[MANUAL] Ejecutando cálculo manual de intereses...');
  
  try {
    // Primero crear intereses faltantes desde ventas
    const creados = await crearInteresesDesdeVentas();

    const interesesActivos = await InteresPunitorio.find({ 
      estado: 'devengando' 
    });
    
    let actualizados = 0;
    
    for (const interes of interesesActivos) {
      await (interes as any).actualizarCalculo('sistema_manual');
      actualizados++;
    }
    
    console.log(`[MANUAL] Finalizado - ${actualizados} intereses actualizados (creados: ${creados.creados || 0})`);
    return { success: true, actualizados, creados: creados.creados || 0 };
    
  } catch (error: any) {
    console.error('[MANUAL] Error en cálculo manual:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Crear InteresPunitorio desde ventas vencidas según configuración vigente
 */
export const crearInteresesDesdeVentas = async () => {
  try {
    const config: any = await (ConfiguracionIntereses as any).obtenerVigente();
    if (!config) return { success: false, message: 'No hay configuración vigente' };

    const aplicaDesde = config.aplicaDesde || 31;
    const tasaMensual = config.tasaMensualVigente || 0;
    const tasaDiaria = tasaMensual / 30;

    const desdeFecha = new Date();
    desdeFecha.setDate(desdeFecha.getDate() - aplicaDesde);

    const ventasVencidas = await Venta.find({
      fecha: { $lte: desdeFecha },
      estado: 'confirmada',
      estadoCobranza: { $ne: 'cobrado' },
      saldoPendiente: { $gt: 0 }
    }).lean();

    let creados = 0;
    let errores = 0;

    for (const venta of ventasVencidas) {
      try {
        const existente = await InteresPunitorio.findOne({ 'documentoRelacionado.documentoId': venta._id });
        if (existente) continue;

        const fechaVenc = new Date(venta.fecha);
        fechaVenc.setDate(fechaVenc.getDate() + (aplicaDesde - 1));
        const fechaInicio = new Date(fechaVenc);
        fechaInicio.setDate(fechaInicio.getDate() + 1);

        const diasTranscurridosRaw = Math.floor((new Date().getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24));
        const diasTranscurridos = diasTranscurridosRaw === 0 && new Date().toDateString() === fechaInicio.toDateString() ? 1 : Math.max(0, diasTranscurridosRaw);

        const interesDevengado = venta.saldoPendiente * (tasaDiaria / 100) * diasTranscurridos;

        const nuevoInteres = new InteresPunitorio({
          clienteId: venta.clienteId,
          documentoRelacionado: {
            tipo: 'venta',
            documentoId: venta._id,
            numeroDocumento: venta.numeroVenta || `${venta._id}`
          },
          capitalOriginal: venta.saldoPendiente,
          fechaVencimiento: fechaVenc,
          fechaInicioPunitorio: fechaInicio,
          fechaFinCalculo: new Date(),
          tasaInteresMensual: tasaMensual,
          tasaDiariaAplicada: tasaDiaria,
          diasTranscurridos: diasTranscurridos,
          interesDevengado,
          interesCobrado: 0,
          interesCondonado: 0,
          interesPendiente: interesDevengado,
          estado: 'devengando',
          acciones: [{
            fecha: new Date(),
            tipo: 'calculo',
            monto: interesDevengado,
            usuario: 'sistema',
            observaciones: 'Creado desde ventas vencidas'
          }],
          creadoPor: 'sistema'
        });

        await nuevoInteres.save();
        creados++;
      } catch (error) {
        errores++;
        console.error('Error creando interes desde venta', venta._id, error);
      }
    }

    return { success: true, creados, errores };
  } catch (error: any) {
    console.error('Error creando intereses desde ventas:', error);
    return { success: false, error: error.message };
  }
};
