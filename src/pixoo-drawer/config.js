// ===== CONFIGURATION CENTRALE =====
// Changez les ports ici. Les services (web, simulateur, bluetooth)
// les lisent automatiquement au démarrage.

export const PORTS = {
  web: 3010,
  simulator: 3011,
  bluetooth: 3012,
};

// URL interne : le site web relaie vers ces cibles.
// Inutile de les changer si vous gardez les ports ci-dessus.
export const TARGETS = {
  simulator: `http://localhost:${PORTS.simulator}/display`,
  bluetooth: `http://localhost:${PORTS.bluetooth}/display`,
};
