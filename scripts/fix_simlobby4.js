const fs = require('fs');
let txt = fs.readFileSync('frontend/src/components/SimulationLobby.jsx', 'utf8');

// Fix YENİ SİMÜLASYON button text in span
txt = txt.replace('>YENİ SİMÜLASYON</span>', "{t('simLobby.newSimBtn')}</span>");

// Check and fix strategy placeholder if not done
if (txt.includes('placeholder="Stratejini anlat...')) {
  txt = txt.replace(
    /placeholder="Stratejini anlat[^"]*"/,
    "placeholder={t('simLobby.strategyPlaceholder')}"
  );
  console.log('strategy placeholder fixed');
}

// startDate / endDate sub-labels - check exact text
const sd = txt.indexOf('Başlangıç</div>');
const ed = txt.indexOf('Bitiş</div>');
if (sd !== -1) {
  txt = txt.replace('>Başlangıç</div>', ">{t('simLobby.startDate')}</div>");
  console.log('startDate fixed');
}
if (ed !== -1) {
  txt = txt.replace('>Bitiş</div>', ">{t('simLobby.endDate')}</div>");
  console.log('endDate fixed');
}

fs.writeFileSync('frontend/src/components/SimulationLobby.jsx', txt, 'utf8');
console.log('done');

const out = fs.readFileSync('frontend/src/components/SimulationLobby.jsx', 'utf8');
const checks = [
  'newSimBtn', 'emptyDesc', 'emptyBtn', 'liveData', 'startDate', 'endDate',
  'strategyPlaceholder', 'strategyHint',
];
checks.forEach(k => {
  console.log(k + ':', out.includes("t('simLobby." + k + "')") ? 'YES' : 'NO');
});
