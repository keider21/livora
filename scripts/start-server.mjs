#!/usr/bin/env node
/**
 * Arranque para probar desde el teléfono.
 *
 * Deja el backend listo (dependencias, base de datos, datos de prueba) y, sobre
 * todo, imprime la dirección exacta que hay que escribir en la app. Encontrar
 * esa IP es donde más gente se atasca, así que el script la busca por ti.
 *
 *   npm start        (desde livora-stream/)
 */
import { execSync, spawn } from 'node:child_process';
import { existsSync, copyFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const server = resolve(root, 'server');
const isWindows = process.platform === 'win32';
const PORT = 4000;

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[92m',
  yellow: '\x1b[93m',
  red: '\x1b[91m',
};

function log(message = '') {
  console.log(message);
}

function step(message) {
  log(`${c.dim}·${c.reset} ${message}`);
}

function fail(message, hint) {
  log(`\n${c.red}${c.bold}✗ ${message}${c.reset}`);
  if (hint) log(`  ${hint}`);
  process.exit(1);
}

function run(command, cwd) {
  execSync(command, { cwd, stdio: 'inherit', shell: true });
}

/**
 * Direcciones IPv4 candidatas de la red local, la más probable primero.
 *
 * Se descartan la de bucle interno y las interfaces virtuales (Docker, WSL,
 * VirtualBox), que el teléfono no alcanza. Las privadas van primero por ser
 * las de una red doméstica, pero si no hay ninguna se ofrecen igualmente las
 * demás en vez de dejar al usuario sin nada que probar.
 */
function localAddresses() {
  const virtual = /^(docker|br-|veth|virbr|vboxnet|vEthernet|utun|tun|tap|zt|wsl)/i;
  const isPrivate = (ip) => /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip);
  const found = [];

  for (const [name, addresses] of Object.entries(networkInterfaces())) {
    if (virtual.test(name)) continue;
    for (const address of addresses ?? []) {
      if (address.family !== 'IPv4' || address.internal) continue;
      found.push({ name, ip: address.address, private: isPrivate(address.address) });
    }
  }

  return found.sort((a, b) => {
    // Primero las privadas, y dentro de ellas las 192.168.x.x, que son las
    // típicas de un router doméstico.
    if (a.private !== b.private) return Number(b.private) - Number(a.private);
    return Number(b.ip.startsWith('192.168.')) - Number(a.ip.startsWith('192.168.'));
  });
}

function checkNode() {
  const major = Number(process.versions.node.split('.')[0]);
  if (major < 20) {
    fail(
      `Necesitas Node 20 o superior (tienes ${process.versions.node}).`,
      'Descárgalo en https://nodejs.org y vuelve a ejecutar este comando.',
    );
  }
}

function prepare() {
  if (!existsSync(resolve(server, '.env'))) {
    step('Creando server/.env a partir del ejemplo');
    copyFileSync(resolve(server, '.env.example'), resolve(server, '.env'));
  }

  if (!existsSync(resolve(server, 'node_modules'))) {
    step('Instalando dependencias del servidor (tarda un par de minutos la primera vez)');
    run('npm install', server);
  }

  if (!existsSync(resolve(server, 'prisma', 'dev.db'))) {
    step('Creando la base de datos y cargando datos de prueba');
    run('npx prisma db push --skip-generate', server);
    run('npm run seed', server);
  }
}

function banner(addresses) {
  const line = '═'.repeat(58);
  log(`\n${c.green}${line}${c.reset}`);
  log(`${c.green}${c.bold}  Livora Stream · servidor en marcha${c.reset}`);
  log(`${c.green}${line}${c.reset}\n`);

  if (addresses.length === 0) {
    log(`  ${c.yellow}No encontré ninguna dirección de red en este equipo.${c.reset}`);
    log('  ¿Está conectado a la Wi-Fi? Búscala a mano y escríbela en la app:');
    log(`    ${c.dim}Windows:${c.reset} abre CMD y escribe  ipconfig`);
    log(`    ${c.dim}Mac:${c.reset}     Ajustes → Wi-Fi → Detalles`);
    log(`    ${c.dim}Linux:${c.reset}   ip addr`);
    log(`  ${c.dim}Busca una que empiece por 192.168. y añádele  :${PORT}${c.reset}\n`);
  } else {
    log('  En la app, pantalla de acceso → engranaje (arriba a la derecha):\n');
    for (const { ip, name, private: isPrivate } of addresses) {
      const mark = isPrivate ? `${c.green}${c.bold}` : c.dim;
      const note = isPrivate ? `${c.dim}(${name})${c.reset}` : `${c.dim}(${name}, poco probable)${c.reset}`;
      log(`      ${mark}http://${ip}:${PORT}${c.reset}   ${note}`);
    }
    log(`\n  Pulsa ${c.bold}Probar conexión${c.reset} y luego ${c.bold}Guardar y usar${c.reset}.`);
    if (addresses.length > 1) {
      log(`  ${c.dim}Si la primera no funciona, prueba la siguiente.${c.reset}`);
    }
  }

  log(`\n  ${c.bold}Entra con${c.reset}  usuario ${c.green}luna${c.reset}  ·  contraseña ${c.green}livora123${c.reset}`);
  log(`\n  ${c.yellow}Requisitos:${c.reset}`);
  log('   · El teléfono y este equipo, en la misma red Wi-Fi.');
  log(`   · El cortafuegos debe dejar pasar el puerto ${PORT}.`);
  log(`     ${c.dim}En Windows, la primera vez sale un aviso: pulsa «Permitir acceso».${c.reset}`);
  log(`\n  ${c.dim}Para parar el servidor: Ctrl + C${c.reset}`);
  log(`${c.green}${line}${c.reset}\n`);
}

checkNode();
prepare();
banner(localAddresses());

// El servidor hereda la consola: sus registros se ven debajo del recuadro.
const child = spawn(isWindows ? 'npm.cmd' : 'npm', ['run', 'dev'], {
  cwd: server,
  stdio: 'inherit',
  shell: isWindows,
});

child.on('exit', (code) => process.exit(code ?? 0));
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}
