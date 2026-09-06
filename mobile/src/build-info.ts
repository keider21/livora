import raw from './generated/build-info.json';

/**
 * Datos de la compilación. En desarrollo son los del archivo por defecto
 * (build 0); en GitHub Actions `scripts/write-build-info.mjs` los sobrescribe
 * antes de empaquetar con el número de build, el commit y los últimos cambios.
 */
export interface BuildInfo {
  version: string;
  buildNumber: number;
  commit: string;
  branch: string;
  builtAt: string | null;
  changes: string[];
}

export const buildInfo: BuildInfo = raw;

export const RELEASES_URL = 'https://github.com/keider21/livora/releases';
export const LATEST_APK_URL = `${RELEASES_URL}/latest/download/livora.apk`;

export const isCiBuild = buildInfo.buildNumber > 0;

export function versionLabel(): string {
  return isCiBuild ? `v${buildInfo.version} · build ${buildInfo.buildNumber}` : `v${buildInfo.version} · desarrollo`;
}
