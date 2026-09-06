const { withAndroidManifest } = require('expo/config-plugins');

/**
 * El backend de Livora se sirve por HTTP plano en la red local
 * (http://192.168.x.x:4000). Desde Android 9 el tráfico sin cifrar está
 * bloqueado salvo que la aplicación lo pida de forma explícita, y la plantilla
 * de Expo solo lo activa en las compilaciones de debug. Sin esto, la APK de
 * release falla con «No se pudo conectar con el servidor» aunque la IP sea
 * correcta.
 */
module.exports = function withCleartextTraffic(config) {
  return withAndroidManifest(config, (cfg) => {
    const application = cfg.modResults.manifest.application?.[0];
    if (application) {
      application.$['android:usesCleartextTraffic'] = 'true';
    }
    return cfg;
  });
};
