// Toma app.json como base y añade lo que solo se conoce al compilar.
// BUILD_NUMBER lo pone GitHub Actions; en local vale 1.
const buildNumber = Number(process.env.BUILD_NUMBER) || 1;

module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    // Android solo instala una actualización si el versionCode no baja.
    versionCode: buildNumber,
  },
  extra: {
    ...config.extra,
    buildNumber,
  },
});
