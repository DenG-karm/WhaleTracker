const fs = require('fs');

const txt = fs.readFileSync('frontend/src/pages/TradeTerminal.jsx', 'utf8');

const oldNews = `    const MOCK_NEWS = {
        BTCUSDT: [
            { id: 1, title: 'BlackRock BTC ETF spot hacmi rekor kırdı: $2.4B tek günde', source: 'Bloomberg', time: '12 dk önce', score: 91, dir: 'bull' },
            { id: 2, title: 'Kurumsal yatırımcılar Q2\\'de BTC pozisyonlarını %34 artırdı', source: 'Reuters', time: '1 sa önce', score: 78, dir: 'bull' },
            { id: 3, title: 'Fed faiz kararı öncesi kripto piyasaları temkinli seyrediyor', source: 'CNBC', time: '3 sa önce', score: 48, dir: 'neutral' },
        ],`;

// Check if present
console.log('MOCK_NEWS start found:', txt.includes("const MOCK_NEWS = {"));
console.log('BTCUSDT news found:', txt.includes("BlackRock BTC ETF"));
