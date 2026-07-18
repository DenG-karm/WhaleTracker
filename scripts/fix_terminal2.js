const fs = require('fs');

let txt = fs.readFileSync('frontend/src/pages/TradeTerminal.jsx', 'utf8');

// Replace MOCK_NEWS title values (data-level) with t() calls
// These are inside a const inside a React function component, so t() is in scope
const newsReplacements = [
  // BTCUSDT
  ["'BlackRock BTC ETF spot hacmi rekor kırdı: $2.4B tek günde'", "t('terminal.news.btc1')"],
  ["'Kurumsal yatırımcılar Q2\\'de BTC pozisyonlarını %34 artırdı'", "t('terminal.news.btc2')"],
  ["'Fed faiz kararı öncesi kripto piyasaları temkinli seyrediyor'", "t('terminal.news.btc3')"],
  // ETHUSDT - has corrupted bytes, use partial match
];

// Also MOCK_STRUCTURE:
// trend field: replace Turkish strings with enum keys
// levels label: replace with t() keys
// summary: replace with t() keys

// MOCK_STRUCTURE trend fields
const structReplacements = [
  ["trend: 'Yükseli\uFFFDx', trendColor: '#10b981', levels: [{ label: 'Güçlü Destek'", "trendKey: 'bull', trendColor: '#10b981', levels: [{ label: t('terminal.str.strongSupport')"],
  ["trend: 'Nötr', trendColor: '#eab308', levels: [{ label: 'Destek', price: '$3,200'", "trendKey: 'neutral', trendColor: '#eab308', levels: [{ label: t('terminal.str.support'), price: '$3,200'"],
  ["trend: 'Yükseli\uFFFDx', trendColor: '#10b981', levels: [{ label: 'Destek', price: '$2,280'", "trendKey: 'bull', trendColor: '#10b981', levels: [{ label: t('terminal.str.support'), price: '$2,280'"],
  ["trend: 'Dü\uFFFDx\uFFFD\uFFFDx', trendColor: '#ef4444'", "trendKey: 'bear', trendColor: '#ef4444'"],
];

// Do replacements
for (const [from, to] of newsReplacements) {
  if (txt.includes(from)) {
    txt = txt.replace(from, to);
    console.log('✅ news replaced:', from.substring(0, 40));
  } else {
    console.log('❌ NOT found:', from.substring(0, 40));
  }
}

// For struct, use regex since there are corrupted bytes
// Check what's actually in the file with a broad search
const btcStructMatch = txt.match(/BTCUSDT: \{ trend: '[^']+', trendColor: '#10b981'/);
if (btcStructMatch) {
  console.log('BTC struct:', btcStructMatch[0]);
}

fs.writeFileSync('frontend/src/pages/TradeTerminal.jsx', txt, 'utf8');
console.log('done');
