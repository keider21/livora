/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // Solo pruebas unitarias de la lógica en src/: las pantallas se validan
  // empaquetando la app (ver PLAN.md, Comprobaciones).
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts?(x)'],
  clearMocks: true,
};
