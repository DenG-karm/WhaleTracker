const fs = require('fs');
const txt = fs.readFileSync('frontend/src/components/SimulationLobby.jsx', 'utf8');

const checks = {
  pairPlaceholder: "t('simLobby.pairPlaceholder')",
  searchPlaceholder: "t('simLobby.searchPlaceholder')",
  noResults: "t('simLobby.noResults')",
  modalTitle: "t('simLobby.modalTitle')",
  modalSubtitle: "t('simLobby.modalSubtitle')",
  pairMarket: "t('simLobby.pairMarket')",
  startBalance: "t('simLobby.startBalance')",
  errPairRequired: "t('simLobby.errPairRequired')",
  cancel: "t('simLobby.cancel')",
  startSim: "t('simLobby.startSim')",
  resume: "t('simLobby.resume')",
  emptyTitle: "t('simLobby.emptyTitle')",
  title: "t('simLobby.title')",
  sessionCount: "t('simLobby.sessionCount'",
  colPair: "t('simLobby.colPair')",
  deleteConfirm: "t('simLobby.deleteConfirm')",
  statusActive: "t('simLobby.statusActive')",
  groupCrypto: "t('simLobby.groupCrypto')",
};

for (const [k, v] of Object.entries(checks)) {
  console.log(k + ':', txt.includes(v) ? 'YES' : 'NO');
}
