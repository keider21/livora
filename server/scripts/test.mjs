#!/usr/bin/env node
/**
 * Ejecuta las pruebas contra una base de datos aparte.
 *
 * Antes esto era una sola línea de shell con `DATABASE_URL=... comando`, que es
 * sintaxis POSIX y no existe en Windows: `npm test` fallaba en cuanto el
 * proyecto salió de Linux. Node hace lo mismo en cualquier sistema.
 */
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...process.env, DATABASE_URL: 'file:./test.db' };

// Cada ejecución parte de una base vacía: así una prueba nunca ve datos de la
// anterior y el orden deja de importar.
for (const archivo of ['prisma/test.db', 'prisma/test.db-journal']) {
  rmSync(resolve(serverDir, archivo), { force: true });
}

/**
 * `npx` en Windows es un .cmd y necesita shell; `node` no, y pasarlo por el
 * shell impediría que expandiera el patrón de archivos por su cuenta.
 */
function run(command, args, { shell = false } = {}) {
  const { status } = spawnSync(command, args, { cwd: serverDir, env, stdio: 'inherit', shell });
  if (status !== 0) process.exit(status ?? 1);
}

run('npx', ['prisma', 'db', 'push', '--skip-generate'], { shell: process.platform === 'win32' });
run('node', ['--test', '--import', 'tsx', 'test/*.test.ts']);
