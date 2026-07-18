const fs = require('fs');
let txt = fs.readFileSync('frontend/src/components/SimulationLobby.jsx', 'utf8');

// Find and fix strategy hint
const hintIdx = txt.indexOf('AI koçun bu stratejiyi okuyarak seni analiz edecek');
if (hintIdx !== -1) {
  const before = txt.substring(Math.max(0, hintIdx - 30), hintIdx).replace(/\r/g,'[CR]').replace(/\n/g,'[LF]');
  const after = txt.substring(hintIdx, hintIdx + 80).replace(/\r/g,'[CR]').replace(/\n/g,'[LF]');
  console.log('hint context:', before + '|' + after);
  
  txt = txt.replace('AI koçun bu stratejiyi okuyarak seni analiz edecek', "{t('simLobby.strategyHint')}");
  console.log('strategy hint fixed');
}

fs.writeFileSync('frontend/src/components/SimulationLobby.jsx', txt, 'utf8');

const out = fs.readFileSync('frontend/src/components/SimulationLobby.jsx', 'utf8');
console.log('strategyHint done:', out.includes("t('simLobby.strategyHint')"));

// Check for any remaining obvious hardcoded Turkish strings
const hardcoded = [
  'Yeni Simülasyon Oluştur', 'Simülasyon Lobisi', 'Parite seç', 'Aranıyor',
  'Sonuç bulunamadı', 'Devam Et', 'Silmek için', 'Henüz Simülasyon',
  'İlk Simülasyonumu', 'İptal', 'Simülasyonu Başlat', 'YENİ SİMÜLASYON',
  'Geçmiş Simülasyonlar', 'Tüm parametreler', 'AI koçun bu',
];
hardcoded.forEach(s => {
  if (out.includes(s)) console.log('STILL HARDCODED:', s);
});
console.log('Hardcode check done');
