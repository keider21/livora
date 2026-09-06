#!/usr/bin/env node
/**
 * Escribe src/generated/build-info.json con los datos de esta compilación y,
 * si se pide, las notas de la versión en Markdown para la release de GitHub.
 *
 *   BUILD_NUMBER=42 node scripts/write-build-info.mjs [ruta-notas.md]
 *
 * Sin BUILD_NUMBER escribe una build 0 (desarrollo). Los cambios son los
 * últimos commits que tocaron livora-stream/, con el prefijo de tipo quitado.
 */
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const mobileDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const projectDir = resolve(mobileDir, '..');

const git = (args) => {
  try {
    return execSync(`git ${args}`, { cwd: projectDir, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
};

const appJson = JSON.parse(readFileSync(resolve(mobileDir, 'app.json'), 'utf8'));
const buildNumber = Number(process.env.BUILD_NUMBER ?? 0) || 0;
const commit = (process.env.GITHUB_SHA ?? git('rev-parse HEAD') ?? 'local').slice(0, 7) || 'local';
const branch = process.env.GITHUB_REF_NAME ?? git('rev-parse --abbrev-ref HEAD') ?? 'local';

const changes = git(`log -15 --pretty=%s -- "${projectDir}"`)
  .split('\n')
  .map((line) => line.replace(/^\w+(\([^)]*\))?!?:\s*/, '').trim())
  .filter(Boolean);

const info = {
  version: appJson.expo.version,
  buildNumber,
  commit,
  branch,
  builtAt: new Date().toISOString(),
  changes,
};

const target = resolve(mobileDir, 'src/generated/build-info.json');
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `${JSON.stringify(info, null, 2)}\n`);
console.log(`build-info: v${info.version} build ${buildNumber} (${commit}) con ${changes.length} cambios`);

const notesPath = process.argv[2];
if (notesPath) {
  const notes = [
    `## Livora Stream v${info.version} · build ${buildNumber}`,
    '',
    `Commit \`${commit}\` en \`${branch}\`, ${new Date().toLocaleString('es', { timeZone: 'UTC' })} UTC.`,
    '',
    '### Cambios recientes',
    '',
    ...changes.map((change) => `- ${change}`),
    '',
    '### Instalar',
    '',
    '**En el teléfono**',
    '',
    '1. Descarga `livora-stream.apk` de aquí abajo (con sesión iniciada en GitHub).',
    '2. Ábrela y acepta instalar desde esta fuente.',
    '',
    '**En el PC, para que la app tenga con quién hablar**',
    '',
    '1. Descarga `livora-servidor.zip` de aquí abajo y descomprímelo.',
    '2. Entra en la carpeta `livora-stream` y haz doble clic en `iniciar-servidor.bat`.',
    '3. Te dirá qué dirección escribir en la app: ajustes de **Servidor** → pégala → Probar conexión → Guardar y usar.',
    '',
  ].join('\n');
  writeFileSync(notesPath, notes);
  console.log(`notas de la versión en ${notesPath}`);
}
