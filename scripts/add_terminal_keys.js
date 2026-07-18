const fs = require('fs');

const trFile = 'frontend/src/locales/tr/translation.json';
const enFile = 'frontend/src/locales/en/translation.json';

const tr = JSON.parse(fs.readFileSync(trFile, 'utf8'));
const en = JSON.parse(fs.readFileSync(enFile, 'utf8'));

// New terminal keys
const trNew = {
  analysisDone: 'Analiz tamamlandı.',
  serverUnreachable: 'Sunucuya ulaşılamadı. Manuel kontrol edin.',
  // Structure
  'str.bullish': 'Yükseliş',
  'str.bearish': 'Düşüş',
  'str.neutral': 'Nötr',
  'str.support': 'Destek',
  'str.resistance': 'Direnç',
  'str.strongSupport': 'Güçlü Destek',
  'str.keyResistance': 'Kritik Direnç',
  'str.athZone': 'ATH Bölgesi',
  'str.btcSummary': 'Haftalık kapanış EMA200 üzerinde. RSI 58 — aşırı alım değil. Momentum güçlü, trend sağlıklı.',
  'str.ethSummary': 'Fiyat $3,200–$3,800 aralığında sıkıştı. Breakout yönü belirleyici olacak.',
  'str.xauSummary': 'Güçlü trend. Dolar endeksi (DXY) zayıfladıkça destek artıyor.',
  'str.eurSummary': 'ECB faiz indirim beklentisi EUR üzerinde baskı yaratıyor. DXY güçlü.',
  // News titles
  'news.btc1': 'BlackRock BTC ETF spot hacmi rekor kırdı: $2.4B tek günde',
  'news.btc2': "Kurumsal yatırımcılar Q2'de BTC pozisyonlarını %34 artırdı",
  'news.btc3': 'Fed faiz kararı öncesi kripto piyasaları temkinli seyrediyor',
  'news.eth1': 'Ethereum Pectra yükseltmesi mainnet\'te aktif — validator sayısı %12 arttı',
  'news.eth2': "ETH staking getirisi yıllık %5.2'ye yükseldi",
  'news.xau1': 'Altın ons fiyatı $2,400 direncini test ediyor — merkez bankaları alımları sürüyor',
  'news.xau2': 'Çin MB 8. ay üst üste altın rezervini artırdı',
  'news.eur1': "ECB faiz kararı: Haziran'da 25 baz puan indirim beklentisi güçlendi",
  'news.eur2': 'Avrupa PMI verisi beklentilerin üzerinde geldi — EUR güçlendi',
  // Time strings
  'news.time12m': '12 dk önce',
  'news.time1h': '1 sa önce',
  'news.time3h': '3 sa önce',
  'news.time45m': '45 dk önce',
  'news.time2h': '2 sa önce',
  'news.time20m': '20 dk önce',
  'news.time4h': '4 sa önce',
  'news.time35m': '35 dk önce',
  // Whale times
  'wh.time2m': '2 dk',
  'wh.time8m': '8 dk',
  'wh.time22m': '22 dk',
  'wh.time5m': '5 dk',
  'wh.time14m': '14 dk',
  'wh.time1h': '1 sa',
  'wh.time3h': '3 sa',
};

const enNew = {
  analysisDone: 'Analysis complete.',
  serverUnreachable: 'Unable to reach server. Please check manually.',
  'str.bullish': 'Bullish',
  'str.bearish': 'Bearish',
  'str.neutral': 'Neutral',
  'str.support': 'Support',
  'str.resistance': 'Resistance',
  'str.strongSupport': 'Strong Support',
  'str.keyResistance': 'Key Resistance',
  'str.athZone': 'ATH Zone',
  'str.btcSummary': 'Weekly close above EMA200. RSI 58 — not overbought. Momentum strong, trend healthy.',
  'str.ethSummary': 'Price stuck in $3,200–$3,800 range. Breakout direction will be decisive.',
  'str.xauSummary': 'Strong trend. Support builds as DXY weakens.',
  'str.eurSummary': 'ECB rate cut expectations pressuring EUR. DXY strong.',
  'news.btc1': 'BlackRock BTC ETF spot volume hits record: $2.4B in a single day',
  'news.btc2': 'Institutional investors raised BTC positions by 34% in Q2',
  'news.btc3': 'Crypto markets cautious ahead of Fed rate decision',
  'news.eth1': 'Ethereum Pectra upgrade live on mainnet — validator count up 12%',
  'news.eth2': 'ETH staking yield climbs to 5.2% annualized',
  'news.xau1': 'Gold tests $2,400/oz resistance — central bank buying continues',
  'news.xau2': 'China PBoC increases gold reserves for 8th consecutive month',
  'news.eur1': 'ECB rate decision: June 25bps cut expectations strengthen',
  'news.eur2': 'European PMI beats estimates — EUR rallies',
  'news.time12m': '12m ago',
  'news.time1h': '1h ago',
  'news.time3h': '3h ago',
  'news.time45m': '45m ago',
  'news.time2h': '2h ago',
  'news.time20m': '20m ago',
  'news.time4h': '4h ago',
  'news.time35m': '35m ago',
  'wh.time2m': '2m',
  'wh.time8m': '8m',
  'wh.time22m': '22m',
  'wh.time5m': '5m',
  'wh.time14m': '14m',
  'wh.time1h': '1h',
  'wh.time3h': '3h',
};

// Merge into terminal section using dot notation
function setNested(obj, dotKey, val) {
  const parts = dotKey.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]]) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = val;
}

for (const [k, v] of Object.entries(trNew)) {
  setNested(tr.terminal, k, v);
}
for (const [k, v] of Object.entries(enNew)) {
  setNested(en.terminal, k, v);
}

fs.writeFileSync(trFile, JSON.stringify(tr, null, 2), 'utf8');
fs.writeFileSync(enFile, JSON.stringify(en, null, 2), 'utf8');
console.log('locale files updated');
