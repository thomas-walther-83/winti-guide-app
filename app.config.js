// Dynamische Expo-Konfiguration.
//
// Basis ist weiterhin app.json – diese Datei ergänzt nur Werte, die vom
// Build-Kontext abhängen. Konkret: Für das GitHub-Pages-Deployment liegt die
// App unter einem Unterpfad (z. B. /winti-guide-app/), daher muss Expo beim
// Web-Export einen passenden baseUrl setzen. Lokal (npx expo start) ist die
// Variable nicht gesetzt, sodass die App weiterhin sauber unter "/" läuft.
module.exports = ({ config }) => {
  const baseUrl = process.env.EXPO_BASE_URL;

  if (baseUrl) {
    config.experiments = {
      ...(config.experiments || {}),
      baseUrl,
    };
  }

  return config;
};
