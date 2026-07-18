const fs = require('fs');
const p = 'src/pages/LandingPage.jsx';
let c = fs.readFileSync(p, 'utf8');
c = c.replace(/\\`/g, '`');
fs.writeFileSync(p, c);
console.log('Fixed');
