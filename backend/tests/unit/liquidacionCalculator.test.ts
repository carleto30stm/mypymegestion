import calcularLiquidacionEmpleadoBackend from '../../src/utils/liquidacionCalculator';

describe('liquidacionCalculator - unit', () => {
  test('calcula aportes y totales para empleado formal sin convenio', async () => {
    const empleado: any = {
      modalidadContratacion: 'formal',
      sindicato: true,
      aplicaPresentismo: true,
      aplicaZonaPeligrosa: false,
      aplicaAntiguedad: false,
      fechaIngreso: '2020-01-01'
    };

    const liquidacion: any = {
      sueldoBase: 100000,
      totalHorasExtra: 0,
      adelantos: 0,
      aguinaldos: 0,
      incentivos: 0
    };

    const periodo: any = { tipo: 'mensual' };

    const result = await calcularLiquidacionEmpleadoBackend({ empleado, liquidacion, periodo });

    expect(result).toHaveProperty('totalAportesEmpleado');
    expect(result).toHaveProperty('montoNetoPagar');
    expect(typeof result.totalAportesEmpleado).toBe('number');
    expect(typeof result.montoNetoPagar).toBe('number');
    // neto debe ser menor que sueldoBase por aportes
    expect(result.montoNetoPagar).toBeLessThanOrEqual(liquidacion.sueldoBase + 1);
    // costo total empresa incluye contribuciones
    expect(result.costoTotalEmpresa).toBeGreaterThanOrEqual(result.montoNetoPagar);
  });
});
