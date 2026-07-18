const fs = require('fs');
let txt = fs.readFileSync('frontend/src/components/SimulationLobby.jsx', 'utf8');

// Fix all remaining replacements using exact string matching

// noResults - strip whitespace variant
txt = txt.replace('                    Sonuç bulunamadı\r\n                  ', "                    {t('simLobby.noResults')}\r\n                  ");

// modalTitle - content inside div
txt = txt.replace('              Yeni Simülasyon Oluştur\r\n', "              {t('simLobby.modalTitle')}\r\n");

// modalSubtitle
txt = txt.replace('              Tüm parametreler ayarlanabilir\r\n', "              {t('simLobby.modalSubtitle')}\r\n");

// İptal button
txt = txt.replace('\r\n              İptal\r\n            </button>', "\r\n              {t('simLobby.cancel')}\r\n            </button>");

// Simülasyonu Başlat button
txt = txt.replace('\r\n              Simülasyonu Başlat\r\n            </motion.button>', "\r\n              {t('simLobby.startSim')}\r\n            </motion.button>");

// Devam Et button
txt = txt.replace('\r\n            Devam Et\r\n          </motion.button>', "\r\n            {t('simLobby.resume')}\r\n          </motion.button>");

// Henüz Simülasyon Yok - EmptyState title
txt = txt.replace('\r\n        Henüz Simülasyon Yok\r\n', "\r\n        {t('simLobby.emptyTitle')}\r\n");

// Empty state description
txt = txt.replace(
  'İlk simülasyonunu oluştur. Gerçek piyasa verisi üzerinde,\r\n        hiç risk almadan trade pratiği yap.',
  "{t('simLobby.emptyDesc')}"
);

// İlk Simülasyonumu Oluştur button
txt = txt.replace('\r\n        İlk Simülasyonumu Oluştur\r\n      ', "\r\n        {t('simLobby.emptyBtn')}\r\n      ");

// Simülasyon Lobisi h1 - in the JSX (second occurrence, after the comment at top)
const h1Pattern = '\r\n              Simülasyon Lobisi\r\n            ';
const h1Idx = txt.indexOf(h1Pattern, 200); // skip the comment
if (h1Idx !== -1) {
  txt = txt.substring(0, h1Idx) + "\r\n              {t('simLobby.title')}\r\n            " + txt.substring(h1Idx + h1Pattern.length);
  console.log('h1 replaced');
} else {
  // Try alternate pattern
  const h1Alt = txt.indexOf('Simülasyon Lobisi', 200);
  if (h1Alt !== -1) {
    console.log('h1 alt context:', JSON.stringify(txt.substring(h1Alt - 30, h1Alt + 50)));
  }
}

// YENİ SİMÜLASYON button
const newSimPattern = '\r\n          YENİ SİMÜLASYON\r\n        ';
if (txt.includes(newSimPattern)) {
  txt = txt.replace(newSimPattern, "\r\n          {t('simLobby.newSimBtn')}\r\n        ");
  console.log('YENİ SİMÜLASYON replaced');
} else {
  // Find it
  const idx = txt.indexOf('YENİ SİMÜLASYON');
  if (idx !== -1) {
    console.log('YENİ SİMÜLASYON context:', JSON.stringify(txt.substring(idx - 20, idx + 40)));
  }
}

// Status labels in SessionRow
txt = txt.replace('Aktif</>', "{t('simLobby.statusActive')}</>"); 
txt = txt.replace(": 'Tamamlandı'}", ": t('simLobby.statusCompleted')}");

// Geçmiş Simülasyonlar table section label
txt = txt.replace('\r\n            Geçmiş Simülasyonlar\r\n          ', "\r\n            {t('simLobby.historyTitle')}\r\n          ");

// Group names in PairDropdown
txt = txt.replace(
  "{ group: 'Kripto',  items: ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','AVAXUSDT','DOGEUSDT'] }",
  "{ group: 'Kripto',  label: 'simLobby.groupCrypto',  items: ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','AVAXUSDT','DOGEUSDT'] }"
);
txt = txt.replace(
  "{ group: 'Forex',   items: ['EUR/USD','GBP/USD','USD/JPY','AUD/USD','USD/CAD','EUR/GBP','USD/CHF'] }",
  "{ group: 'Forex',   label: 'Forex',                 items: ['EUR/USD','GBP/USD','USD/JPY','AUD/USD','USD/CAD','EUR/GBP','USD/CHF'] }"
);
txt = txt.replace(
  "{ group: 'Emtia',   items: ['XAUUSD','XAGUSD','USOIL','NGAS'] }",
  "{ group: 'Emtia',   label: 'simLobby.groupCommodity', items: ['XAUUSD','XAGUSD','USOIL','NGAS'] }"
);
txt = txt.replace(
  "{ group: 'Hisse',   items: ['AAPL','TSLA','NVDA','MSFT','META','SPY','QQQ'] }",
  "{ group: 'Hisse',   label: 'simLobby.groupEquity',  items: ['AAPL','TSLA','NVDA','MSFT','META','SPY','QQQ'] }"
);

// Update the group rendering to use the label key  
txt = txt.replace(
  "{({'Kripto': t('simLobby.groupCrypto'), 'Forex': 'Forex', 'Emtia': t('simLobby.groupCommodity'), 'Hisse': t('simLobby.groupEquity')})[group.group] || group.group}",
  "{group.label ? (group.label.startsWith('simLobby.') ? t(group.label) : group.label) : group.group}"
);

// PAIR_LABELS for commodity/special pairs
txt = txt.replace(
  "XAUUSD:'XAU/USD (Altın)', XAGUSD:'XAG/USD (Gümüş)', USOIL:'Brent Ham Petrol', NGAS:'Doğal Gaz',",
  "XAUUSD:'XAUUSD_LABEL', XAGUSD:'XAGUSD_LABEL', USOIL:'USOIL_LABEL', NGAS:'NGAS_LABEL',"
);
// Note: We'll handle these in the rendering via t() in PairDropdown and SessionRow
// Actually, let's just keep static display labels and not translate PAIR_LABELS
// Revert the PAIR_LABELS change since it would break display
txt = txt.replace(
  "XAUUSD:'XAUUSD_LABEL', XAGUSD:'XAGUSD_LABEL', USOIL:'USOIL_LABEL', NGAS:'NGAS_LABEL',",
  "XAUUSD:'XAU/USD (Altın)', XAGUSD:'XAG/USD (Gümüş)', USOIL:'Brent Ham Petrol', NGAS:'Doğal Gaz',"
);

fs.writeFileSync('frontend/src/components/SimulationLobby.jsx', txt, 'utf8');
console.log('SimulationLobby fix2 done');

// Verify
const out = fs.readFileSync('frontend/src/components/SimulationLobby.jsx', 'utf8');
const checks = [
  ['noResults', "t('simLobby.noResults')"],
  ['modalTitle', "t('simLobby.modalTitle')"],
  ['modalSubtitle', "t('simLobby.modalSubtitle')"],
  ['cancel', "t('simLobby.cancel')"],
  ['startSim', "t('simLobby.startSim')"],
  ['resume', "t('simLobby.resume')"],
  ['emptyTitle', "t('simLobby.emptyTitle')"],
  ['title', "t('simLobby.title')"],
  ['newSimBtn', "t('simLobby.newSimBtn')"],
  ['statusActive', "t('simLobby.statusActive')"],
  ['historyTitle', "t('simLobby.historyTitle')"],
  ['groupCrypto via label', 'simLobby.groupCrypto'],
];
for (const [k, v] of checks) {
  console.log(k + ':', out.includes(v) ? 'YES' : 'NO');
}
