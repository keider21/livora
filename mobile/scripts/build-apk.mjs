#!/usr/bin/env node
/**
 * Compila la APK en este equipo, reutilizando lo que ya está compilado.
 *
 *   npm run apk            (desde mobile/)
 *   npm run apk -- --clean (rehace el proyecto nativo desde cero)
 *
 * `expo prebuild` borra y regenera la carpeta `android/`, y con ella se lleva
 * la caché de compilación: los módulos nativos (React Native, WebRTC, LiveKit)
 * vuelven a compilarse enteros y son media hora. Por eso solo se ejecuta la
 * primera vez, o cuando cambia algo que afecta al proyecto nativo: las
 * dependencias, `app.json` o los plugins. Para un cambio de JavaScript, que es
 * la mayoría, basta con volver a empaquetar y son unos minutos.
 *
 * Al saltarse el prebuild hay que poner el `versionCode` a mano en
 * `build.gradle`, porque es ahí donde lo escribe Expo a partir de BUILD_NUMBER.
 * Android no instala encima una versión con número menor, así que por defecto
 * se sube uno respecto al que haya.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const mobileDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const androidDir = join(mobileDir, 'android');
const gradleFile = join(androidDir, 'app', 'build.gradle');

const args = process.argv.slice(2);
const clean = args.includes('--clean');

/** Rutas del SDK de Android, en el orden en que suele instalarlo Android Studio. */
function findSdk() {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Android', 'Sdk'),
    process.env.HOME && join(process.env.HOME, 'Library', 'Android', 'sdk'),
    process.env.HOME && join(process.env.HOME, 'Android', 'Sdk'),
  ].filter(Boolean);

  return candidates.find((path) => existsSync(join(path, 'platform-tools')));
}

function run(command, commandArgs, options = {}) {
  const { status } = spawnSync(command, commandArgs, {
    cwd: mobileDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  });
  if (status !== 0) process.exit(status ?? 1);
}

const sdk = findSdk();
if (!sdk) {
  console.error(
    'No se encontró el SDK de Android. Instálalo con Android Studio o define ANDROID_HOME.',
  );
  process.exit(1);
}

const necesitaPrebuild = clean || !existsSync(gradleFile);

// El número de build sube solo, para que la APK nueva se pueda instalar encima
// de la anterior. Las compilaciones locales empiezan en 1000 y así nunca chocan
// con las de GitHub Actions, que van por la centena baja.
let buildNumber = 1000;
if (!necesitaPrebuild) {
  const actual = /versionCode (\d+)/.exec(readFileSync(gradleFile, 'utf8'));
  buildNumber = Math.max(1000, Number(actual?.[1] ?? 0) + 1);
}

console.log(`\n▶ Compilando build ${buildNumber}${necesitaPrebuild ? ' (proyecto nativo desde cero)' : ''}\n`);

run('node', ['scripts/write-build-info.mjs'], { env: { ...process.env, BUILD_NUMBER: String(buildNumber) } });

if (necesitaPrebuild) {
  run('npx', ['expo', 'prebuild', '--platform', 'android', '--no-install'], {
    env: { ...process.env, BUILD_NUMBER: String(buildNumber) },
  });
} else {
  // Sin prebuild, el versionCode se queda como estaba: se sustituye a mano.
  const gradle = readFileSync(gradleFile, 'utf8');
  writeFileSync(gradleFile, gradle.replace(/versionCode \d+/, `versionCode ${buildNumber}`));
  console.log(`· versionCode ${buildNumber} y prebuild omitido (usa --clean para rehacerlo)`);
}

// local.properties no se versiona y prebuild no lo escribe: sin él Gradle no
// encuentra el SDK y falla con «SDK location not found».
writeFileSync(join(androidDir, 'local.properties'), `sdk.dir=${sdk.replace(/\\/g, '/')}\n`);

// Ruta completa: con `shell: true` en Windows, un `gradlew.bat` suelto no se
// busca en el directorio de trabajo y da «no se reconoce como un comando».
const gradlew = join(androidDir, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
run(`"${gradlew}"`, ['assembleRelease'], { cwd: androidDir });

const apk = join(androidDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
const destino = join(mobileDir, '..', 'livora.apk');
copyFileSync(apk, destino);

const tamano = (readFileSync(destino).length / 1024 / 1024).toFixed(0);
console.log(`\n✔ build ${buildNumber} lista: ${destino} (${tamano} MB)`);

// Si hay un teléfono conectado por USB, se ofrece instalarla de una vez.
const adb = join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
try {
  const dispositivos = execFileSync(adb, ['devices'], { encoding: 'utf8' })
    .split('\n')
    .slice(1)
    .filter((line) => line.trim().endsWith('device'));
  if (dispositivos.length > 0) {
    console.log(`  Instálala en el teléfono conectado con:\n    "${adb}" install -r "${destino}"`);
  }
} catch {
  // adb no está o no responde: no pasa nada, es solo una ayuda.
}
