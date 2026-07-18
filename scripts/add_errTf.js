const fs = require('fs');
const trFile = 'frontend/src/locales/tr/translation.json';
const enFile = 'frontend/src/locales/en/translation.json';

const tr = JSON.parse(fs.readFileSync(trFile, 'utf8'));
const en = JSON.parse(fs.readFileSync(enFile, 'utf8'));

// Add missing key
tr.simLobby.errTfRequired = 'Zaman dilimi seçilmeli';
en.simLobby.errTfRequired = 'Please select a timeframe';

fs.writeFileSync(trFile, JSON.stringify(tr, null, 2), 'utf8');
fs.writeFileSync(enFile, JSON.stringify(en, null, 2), 'utf8');
console.log('errTfRequired added');
