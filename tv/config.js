/* Réglages de l'écran TV. Modifiable sans toucher au reste du code. */
window.TV_CONFIG = {
  // Fichiers publiés par l'outil interne (chemins relatifs à cette page)
  content: '../data/content.json',
  flash: '../data/flash.json',

  // Rafraîchissements
  contentEveryMs: 5 * 60 * 1000,   // contenus : toutes les 5 minutes
  flashEveryMs: 30 * 1000,         // flashs : toutes les 30 secondes
  weatherEveryMs: 15 * 60 * 1000,  // météo : toutes les 15 minutes

  // Durées d'affichage (secondes)
  slideSeconds: 12,
  galleryPhotoSeconds: 5,
  galleryVideoMaxSeconds: 90,

  // Météo de Lyon (Open-Meteo, sans clé)
  lat: 45.7578,
  lon: 4.8320,

  // Rechargement complet de la page chaque nuit (prend en compte les mises à jour du code)
  nightlyReloadHour: 4
};
