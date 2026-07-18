const fs = require('fs');

let txt = fs.readFileSync('frontend/src/pages/TradeTerminal.jsx', 'utf8');

// 1. Replace MOCK_NEWS titles with translation keys
const newsReplacements = [
  ["'BlackRock BTC ETF spot hacmi rekor kırdı: $2.4B tek günde'", "t('terminal.news.btc1')"],
  ["'Kurumsal yatırımcılar Q2\\'de BTC pozisyonlarını %34 artırdı'", "t('terminal.news.btc2')"],
  ["'Fed faiz kararı öncesi kripto piyasaları temkinli seyrediyor'", "t('terminal.news.btc3')"],
];

// Check that original titles are in file
for (const [from] of newsReplacements) {
  console.log('found:', txt.includes(from), '|', from.substring(0, 50));
}
