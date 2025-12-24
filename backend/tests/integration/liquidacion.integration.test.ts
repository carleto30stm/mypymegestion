import express from 'express';
import request from 'supertest';
import liquidacionRoutes from '../../src/routes/liquidacion';
import { connect, closeDatabase, clearDatabase } from '../setup';
import Employee from '../../src/models/Employee';
import LiquidacionPeriodo from '../../src/models/LiquidacionPeriodo';
import Gasto from '../../src/models/Gasto';
import calcularLiquidacionEmpleadoBackend from '../../src/utils/liquidacionCalculator';

let app: express.Express;

beforeAll(async () => {
  await connect();
  app = express();
  app.use(express.json());
  // montar rutas necesarias
  app.use('/api/liquidacion', liquidacionRoutes);
});

afterAll(async () => {
  await closeDatabase();
});

afterEach(async () => {
  await clearDatabase();
});

describe('POST /api/liquidacion/liquidar (integration)', () => {
  test('al recibir calculos desde frontend crea gastos con el monto neto esperado y marca la liquidacion como pagada', async () => {
    // Crear empleado
    const empleado = await Employee.create({
      nombre: 'Test',
      apellido: 'Empleado',
      documento: '12345678',
      puesto: 'Operario',
      fechaIngreso: '2020-01-01',
      sueldoBase: 100000,
      hora: 1000,
      modalidadContratacion: 'formal',
      sindicato: 'SIND',
      aplicaPresentismo: true,
      aplicaAntiguedad: false,
      aplicaZonaPeligrosa: false
    });

    // Crear periodo con liquidacion para el empleado
    const periodo = await LiquidacionPeriodo.create({
      nombre: 'Periodo Test',
      fechaInicio: new Date('2025-12-01'),
      fechaFin: new Date('2025-12-31'),
      tipo: 'mensual',
      liquidaciones: [{
        empleadoId: empleado._id,
        empleadoNombre: empleado.nombre,
        empleadoApellido: empleado.apellido,
        sueldoBase: empleado.sueldoBase,
        horasExtra: [],
        totalHorasExtra: 0,
        adelantos: 0,
        aguinaldos: 0,
        bonus: 0,
        descuentos: 0,
        totalAPagar: empleado.sueldoBase,
        estado: 'pendiente',
        gastosRelacionados: []
      }]
    });

    // Obtener calculo del util para usarlo como payload (simula calculo frontend)
    const calc = await calcularLiquidacionEmpleadoBackend({ empleado: empleado.toObject(), liquidacion: periodo.liquidaciones[0], periodo });

    const payload = {
      periodoId: (periodo._id as any).toString(),
      empleadoId: (empleado._id as any).toString(),
      medioDePago: 'EFECTIVO',
      banco: 'EFECTIVO',
      calculos: {
        adicionalPresentismo: calc.adicionalPresentismo,
        adicionalZona: calc.adicionalZona,
        adicionalAntiguedad: calc.adicionalAntiguedad,
        totalAportesEmpleado: calc.totalAportesEmpleado,
        totalContribucionesPatronales: calc.totalContribucionesPatronales,
        sueldoBasePeriodo: calc.sueldoBasePeriodo,
        montoNetoPagar: calc.montoNetoPagar,
        costoTotalEmpresa: calc.costoTotalEmpresa,
        aporteJubilacion: calc.aporteJubilacion,
        aporteObraSocial: calc.aporteObraSocial,
        aportePami: calc.aportePami,
        aporteSindicato: calc.aporteSindicato,
        contribJubilacion: calc.contribJubilacion,
        contribObraSocial: calc.contribObraSocial,
        contribPami: calc.contribPami,
        contribART: calc.contribART,
        totalAPagar: calc.totalAPagar
      }
    };

    const res = await request(app)
      .post('/api/liquidacion/liquidar')
      .send(payload)
      .expect(200);

    expect(res.body).toHaveProperty('gastosCreados');
    expect(Array.isArray(res.body.gastosCreados)).toBe(true);
    // Debe haber al menos un gasto de sueldo con salida igual al monto neto
    const gastos = res.body.gastosCreados;
    const gastoSueldo = gastos.find((g: any) => g.concepto === 'sueldo');
    expect(gastoSueldo).toBeDefined();
    // comparar con tolerancia por redondeos
    expect(Math.abs(gastoSueldo.salida - calc.montoNetoPagar)).toBeLessThanOrEqual(0.5);

    // Verificar que la liquidación quedó marcada como pagada en DB
    const periodoDB = await LiquidacionPeriodo.findById(periodo._id as any);
    expect(periodoDB).toBeDefined();
    const liq = periodoDB!.liquidaciones.find((l: any) => l.empleadoId.toString() === (empleado._id as any).toString());
    expect(liq).toBeDefined();
    expect(liq!.estado).toBe('pagado');
    expect(liq!.totalAPagar).toBeDefined();
  });
});
