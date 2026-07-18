const fs = require('fs');
let txt = fs.readFileSync('frontend/src/components/SimulationLobby.jsx', 'utf8');

function findAndShow(label, searchStr) {
  const idx = txt.indexOf(searchStr);
  if (idx === -1) {
    console.log(label + ': NOT FOUND - "' + searchStr.substring(0, 40) + '"');
  } else {
    const before = txt.substring(Math.max(0, idx-20), idx).replace(/\r/g,'[CR]').replace(/\n/g,'[LF]');
    const after = txt.substring(idx, idx + Math.min(60, searchStr.length + 20)).replace(/\r/g,'[CR]').replace(/\n/g,'[LF]');
    console.log(label + ': FOUND at idx=' + idx + ', context: ...' + before + '|' + after + '...');
  }
}

findAndShow('Sonuç', 'Sonuç bulunamad');
findAndShow('Yeni Sim', 'Yeni Simülasyon Oluştur');
findAndShow('Tüm param', 'Tüm parametreler');
findAndShow('İptal', '\r\n              İptal');
findAndShow('Simülasyonu Başlat', 'Simülasyonu Başlat');
findAndShow('Devam Et', 'Devam Et');
findAndShow('Henüz', 'Henüz Simülasyon');
findAndShow('Simülasyon Lobisi', 'Simülasyon Lobisi');
findAndShow('Kripto group', "{ group: 'Kripto'");
