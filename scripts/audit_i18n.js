const fs = require('fs');

function audit(filePath, label) {
  const txt = fs.readFileSync(filePath, 'utf8');
  const suspicious = [
    // Turkish chars
    />[^<{]*[İıŞşÇçĞğÖöÜü][^<{]*</g,
    // Common Turkish words in JSX context
    />[^<{]*(Pozisyon|Bakiye|Tarama|Simülasyon|Lobisi|Başlat)[^<{]*</g,
  ];
  
  const lines = txt.split('\n');
  const issues = [];
  lines.forEach((line, i) => {
    // Check for Turkish chars outside of t() calls, strings in attributes (non-{t(...)})
    // Simple heuristic: line has Turkish chars but no t('
    if (
      /[İıŞşÇçĞğÖöÜü]/.test(line) &&
      !line.trim().startsWith('//') &&
      !line.trim().startsWith('*') &&
      !line.includes("t('") &&
      !line.includes('t("') &&
      !line.includes('Translation') &&
      !line.includes('useTranslation') &&
      !line.includes('import') &&
      !line.includes('// ') &&
      !line.includes('/* ')
    ) {
      issues.push({ line: i + 1, content: line.trim().substring(0, 100) });
    }
  });
  
  if (issues.length === 0) {
    console.log(label + ': ✅ No obvious hardcoded Turkish strings');
  } else {
    console.log(label + ': ⚠️ Possible hardcoded strings (' + issues.length + '):');
    issues.slice(0, 10).forEach(issue => {
      console.log('  L' + issue.line + ': ' + issue.content);
    });
  }
}

audit('frontend/src/pages/TradeTerminal.jsx', 'TradeTerminal');
audit('frontend/src/pages/BacktestLab.jsx', 'BacktestLab');
audit('frontend/src/components/SimulationLobby.jsx', 'SimulationLobby');
