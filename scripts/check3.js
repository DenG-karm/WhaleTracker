const fs = require('fs');

// Read as buffer to check exact bytes
const buf = fs.readFileSync('frontend/src/pages/TradeTerminal.jsx');
const txt = buf.toString('utf8');

// Find the MOCK_STRUCTURE section
const idx = txt.indexOf('const MOCK_STRUCTURE = {');
const section = txt.substring(idx, idx + 1200);
console.log(JSON.stringify(section.substring(0, 600)));
