const fs = require('fs');

let txt = fs.readFileSync('frontend/src/pages/TradeTerminal.jsx', 'utf8');

// Replace MOCK_STRUCTURE with version using trendKey and t() for labels
// Use regex since the values contain corrupted bytes
txt = txt.replace(
  /const MOCK_STRUCTURE = \{[\s\S]*?\};\s*\n\s*const getIntelData/,
  `const MOCK_STRUCTURE = {
        BTCUSDT: { trendKey: 'bull', trendColor: '#10b981', levels: [{ label: t('terminal.str.strongSupport'), price: '$61,200', strength: 92 }, { label: t('terminal.str.keyResistance'), price: '$72,400', strength: 85 }, { label: t('terminal.str.athZone'), price: '$73,800', strength: 78 }], summary: t('terminal.str.btcSummary') },
        ETHUSDT: { trendKey: 'neutral', trendColor: '#eab308', levels: [{ label: t('terminal.str.support'), price: '$3,200', strength: 75 }, { label: t('terminal.str.resistance'), price: '$3,800', strength: 80 }], summary: t('terminal.str.ethSummary') },
        XAUUSD:  { trendKey: 'bull', trendColor: '#10b981', levels: [{ label: t('terminal.str.support'), price: '$2,280', strength: 88 }, { label: t('terminal.str.resistance'), price: '$2,440', strength: 72 }], summary: t('terminal.str.xauSummary') },
        EURUSD:  { trendKey: 'bear', trendColor: '#ef4444', levels: [{ label: t('terminal.str.support'), price: '1.0640', strength: 70 }, { label: t('terminal.str.resistance'), price: '1.0890', strength: 82 }], summary: t('terminal.str.eurSummary') },
    };
    const getIntelData`
);

// Fix computeDivergence to use trendKey instead of Turkish trend
txt = txt.replace(
  /const techDir\s*=\s*struct\?\.trend === '[^']+' \? 'bull' : struct\?\.trend === '[^']+' \? 'bear' : 'neutral';/,
  "const techDir = struct?.trendKey || 'neutral';"
);

// Fix the trend label in localStorage effect (Yükseli / Düşüş labels)
txt = txt.replace(
  /const techLabel = divergence\.techDir === 'bull' \? '[^']+' : divergence\.techDir === 'bear' \? '[^']+' : '[^']+';/,
  "const techLabel = divergence.techDir === 'bull' ? t('terminal.str.bullish') : divergence.techDir === 'bear' ? t('terminal.str.bearish') : t('terminal.str.neutral');"
);
txt = txt.replace(
  /const fundLabel = divergence\.fundDir === 'bull' \? '[^']+' : divergence\.fundDir === 'bear' \? '[^']+' : '[^']+';/,
  "const fundLabel = divergence.fundDir === 'bull' ? t('terminal.str.bullish') : divergence.fundDir === 'bear' ? t('terminal.str.bearish') : t('terminal.str.neutral');"
);

// Fix st.trend render in JSX → st.trendKey label
txt = txt.replace(
  /<span style=\{\{ fontSize: '0\.78rem', fontWeight: 900, color: st\.trendColor \}\}>\{st\.trend\}<\/span>/,
  "<span style={{ fontSize: '0.78rem', fontWeight: 900, color: st.trendColor }}>{st.trendKey === 'bull' ? t('terminal.str.bullish') : st.trendKey === 'bear' ? t('terminal.str.bearish') : t('terminal.str.neutral')}</span>"
);

// Fix remaining MOCK_NEWS Turkish strings (ETH, XAUUSD, EURUSD titles with corrupted bytes)
// Replace all title values in MOCK_NEWS using regex
txt = txt.replace(/title: t\('terminal\.news\.btc(\d)'\)/, (m) => m); // keep already replaced ones
txt = txt.replace(/title: '[^']*Ethereum Pectra[^']*'/, "title: t('terminal.news.eth1')");
txt = txt.replace(/title: '[^']*ETH staking[^']*'/, "title: t('terminal.news.eth2')");
txt = txt.replace(/title: '[^']*Alt[^']*n ons[^']*'/, "title: t('terminal.news.xau1')");
txt = txt.replace(/title: '[^']*in MB[^']*'/, "title: t('terminal.news.xau2')");
txt = txt.replace(/title: '[^']*ECB faiz[^']*'/, "title: t('terminal.news.eur1')");
txt = txt.replace(/title: '[^']*Avrupa PMI[^']*'/, "title: t('terminal.news.eur2')");

// Fix time strings in MOCK_NEWS
txt = txt.replace(/time: '12 dk önce'/, "time: t('terminal.news.time12m')");
txt = txt.replace(/time: '1 sa önce'/, "time: t('terminal.news.time1h')");
txt = txt.replace(/time: '3 sa önce'/, "time: t('terminal.news.time3h')");
txt = txt.replace(/time: '45 dk önce'/, "time: t('terminal.news.time45m')");
txt = txt.replace(/time: '2 sa önce'/, "time: t('terminal.news.time2h')");
txt = txt.replace(/time: '20 dk önce'/, "time: t('terminal.news.time20m')");
txt = txt.replace(/time: '4 sa önce'/, "time: t('terminal.news.time4h')");
txt = txt.replace(/time: '35 dk önce'/, "time: t('terminal.news.time35m')");

// Fix MOCK_WHALES time strings
txt = txt.replace(/time: '2 dk'/, "time: t('terminal.wh.time2m')");
txt = txt.replace(/time: '8 dk'/, "time: t('terminal.wh.time8m')");
txt = txt.replace(/time: '22 dk'/, "time: t('terminal.wh.time22m')");
txt = txt.replace(/time: '5 dk'/, "time: t('terminal.wh.time5m')");
txt = txt.replace(/time: '14 dk'/, "time: t('terminal.wh.time14m')");
txt = txt.replace(/time: '1 sa'/, "time: t('terminal.wh.time1h')");
txt = txt.replace(/time: '3 sa'/, "time: t('terminal.wh.time3h')");

// Remove the old '{w.time}{t('terminal.agoSuffix')}' → '{w.time}' (since time already includes ago suffix)
txt = txt.replace(/{w\.time}\{t\('terminal\.agoSuffix'\)\}/, "{w.time}");

fs.writeFileSync('frontend/src/pages/TradeTerminal.jsx', txt, 'utf8');
console.log('done');

// Verify
const out = fs.readFileSync('frontend/src/pages/TradeTerminal.jsx', 'utf8');
console.log('trendKey in struct:', out.includes("trendKey: 'bull'"));
console.log('no old trend field:', !out.includes("trend: 'Yükseli"));
console.log('st.trendKey in JSX:', out.includes("st.trendKey === 'bull'"));
console.log('computeDivergence fixed:', out.includes("struct?.trendKey"));
