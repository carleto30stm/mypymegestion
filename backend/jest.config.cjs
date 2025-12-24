module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.test.json'
    }
  },
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  // No tratar como ESM para compatibilidad con dependencias CJS (express)
  // Mapear solo imports relativos que terminan en .js hacia el módulo sin extensión
  // Esto evita mapear paquetes de node como 'ipaddr.js'
  moduleNameMapper: {
    '^(\\.{1,2}\/.*)\\.js$': '$1'
  },
  testTimeout: 20000
};
