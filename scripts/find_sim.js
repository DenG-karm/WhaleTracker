const fs = require('fs');
const txt = fs.readFileSync('frontend/src/components/SimulationLobby.jsx', 'utf8');

// Find all occurrences of Simülasyon Lobisi
let idx = 0;
while (true) {
  idx = txt.indexOf('Simülasyon Lobisi', idx);
  if (idx === -1) break;
  const ctx = txt.substring(Math.max(0, idx-40), idx+60).replace(/\r/g,'[CR]').replace(/\n/g,'[LF]');
  console.log('At idx=' + idx + ': ' + ctx);
  idx++;
}
