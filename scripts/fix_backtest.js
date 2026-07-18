const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'frontend/src/pages/BacktestLab.jsx');
let txt = fs.readFileSync(file, 'utf8');

// 1. LoadingSkeleton - pass t as prop
txt = txt.replace('const LoadingSkeleton = () => (', 'const LoadingSkeleton = ({ t }) => (');

// 2. LoadingSkeleton loading text (unique span with wt-pulse)
txt = txt.replace(
  /(wt-pulse 1\.5s ease-in-out infinite' \}\}>)[^<]+(<\/span>)/,
  "$1{t('backtest.lab.loadingData')}$2"
);

// 3. LoadingSkeleton call site
txt = txt.replace('{dataLoading && <LoadingSkeleton />}', '{dataLoading && <LoadingSkeleton t={t} />}');

// 4. SearchDropdown - add useTranslation
txt = txt.replace(
  'const SearchDropdown = ({ results, loading, onSelect }) => {\n    if (!results',
  "const SearchDropdown = ({ results, loading, onSelect }) => {\n    const { t } = useTranslation();\n    if (!results"
);

// 5. SearchDropdown loading text - match by context (first of the two similar divs)
txt = txt.replace(
  /(<div style=\{ padding: '12px 14px', fontSize: '0\.68rem', color: THEME\.textMuted, fontWeight: 600 \}>)Aran[^<]+(<\/div>)/,
  "$1{t('backtest.lab.searching')}$2"
);

// 6. SearchDropdown no results text
txt = txt.replace(
  /(<div style=\{ padding: '12px 14px', fontSize: '0\.68rem', color: THEME\.textMuted, fontWeight: 600 \}>)Sonu[^<]+(<\/div>)/,
  "$1{t('backtest.lab.noResults')}$2"
);

// 7. DrawingToolbar - add useTranslation
txt = txt.replace(
  'const DrawingToolbar = ({ activeTool, onToolChange, onClearAll }) => {\n    const tools = [',
  "const DrawingToolbar = ({ activeTool, onToolChange, onClearAll }) => {\n    const { t } = useTranslation();\n    const tools = ["
);

// 8. DrawingToolbar tool titles (Turkish chars but unique)
txt = txt.replace(/title: 'Se[^']+\(S\)'/, "title: t('backtest.lab.toolCursor')");
txt = txt.replace(/title: 'Trend [^']+\(L\)'/, "title: t('backtest.lab.toolLine')");
txt = txt.replace(/title: 'B[^']+\(R\)'/, "title: t('backtest.lab.toolRect')");
txt = txt.replace('title="Tümünü Temizle"', "title={t('backtest.lab.toolClearAll')}");

// 9. Boyut (USDT) position size
txt = txt.replace('<span style={lbl}>Boyut (USDT)</span>', "{t('backtest.lab.positionSize')}");

// 10. Account summary - add id fields and translate labels
txt = txt.replace(
  "{ lbl: 'Bakiye',        val: accountBalance, color: THEME.textMain },",
  "{ id: 'balance',   lbl: t('backtest.lab.accountBalance'), val: accountBalance, color: THEME.textMain },"
);
txt = txt.replace(
  "{ lbl: 'Serbest Bakiye', val: freeMargin,     color: freeMargin < 0 ? THEME.neonDown : THEME.textMuted },",
  "{ id: 'margin',    lbl: t('backtest.lab.freeMargin'),     val: freeMargin,     color: freeMargin < 0 ? THEME.neonDown : THEME.textMuted },"
);
txt = txt.replace(
  "{ lbl: 'Equity',         val: equity,         color: equity >= (accountBalance + openPositions.reduce((s,p)=>s+p.size,0)) ? '#00E676' : '#FF3B30' },",
  "{ id: 'equity',    lbl: t('backtest.lab.equity'),         val: equity,         color: equity >= (accountBalance + openPositions.reduce((s,p)=>s+p.size,0)) ? '#00E676' : '#FF3B30' },"
);
txt = txt.replace(
  "{ lbl: 'Acik PnL',       val: totalOpenPnl,   color: totalOpenPnl >= 0 ? '#00E676' : '#FF3B30', sign: true },",
  "{ id: 'openPnl',   lbl: t('backtest.lab.openPnl'),        val: totalOpenPnl,   color: totalOpenPnl >= 0 ? '#00E676' : '#FF3B30', sign: true },"
);
// Fix React key
txt = txt.replace('<div key={row.lbl}', '<div key={row.id}');

// 11. ACIK POZISYONLAR section header
txt = txt.replace(
  '\n                            ACIK POZISYONLAR\n',
  "\n                            {t('backtest.lab.openPositions')}\n"
);

// 12. ACIK badge (badge count)
txt = txt.replace('{openPositions.length} ACIK', "{openPositions.length} {t('backtest.lab.openBadge')}");

// 13. "Acik pozisyon yok" empty state
txt = txt.replace(
  '\n                            Acik pozisyon yok\n',
  "\n                            {t('backtest.lab.noOpenPositions')}\n"
);

// 14. Pozisyonu Kapat tooltip
txt = txt.replace('title="Pozisyonu Kapat"', "title={t('backtest.lab.closePosition')}");

// 15. PnL column header
txt = txt.replace(
  "t('backtest.lab.colEntry'), 'PnL', t('backtest.lab.colResult')",
  "t('backtest.lab.colEntry'), t('backtest.lab.colPnl'), t('backtest.lab.colResult')"
);

// 16. BALANCE label in header
txt = txt.replace(
  ">BALANCE</span>",
  ">{t('backtest.lab.balanceLabel')}</span>"
);

// 17. Data error messages (Turkish chars - use regex)
txt = txt.replace(/'forex-unsupported': 'Forex ge[^']+'/g, "'forex-unsupported': t('backtest.lab.errorForex')");
txt = txt.replace(/'asset-type-unsupported': 'Bu varl[^']+'/g, "'asset-type-unsupported': t('backtest.lab.errorAssetType')");
txt = txt.replace(/'insufficient-data': 'Yeterli ge[^']+'/g, "'insufficient-data': t('backtest.lab.errorInsufficientData')");
txt = txt.replace(/\} \|\| 'Veri y[^']+'/g, "} || t('backtest.lab.errorGeneric')");

// 18. Error hints
txt = txt.replace(
  /\? 'Kripto \([^']+\)'/,
  "? t('backtest.lab.errorForexHint')"
);
txt = txt.replace(
  /: 'Farkl[^']+\.'/,
  ": t('backtest.lab.errorGenericHint')"
);

// 19. Tekrar Dene button
txt = txt.replace(/> Tekrar Dene\s*<\/button>/, "> {t('backtest.lab.retry')}\n                                </button>");

// 20. AI Tarama title attr
txt = txt.replace('title="AI Tarama Başlat"', "title={t('backtest.lab.aiScanTitle')}");

// 21. AI Tarama button text
txt = txt.replace('\n                            AI Tarama\n', "\n                            {t('backtest.lab.aiScan')}\n");

fs.writeFileSync(file, txt, 'utf8');
console.log('BacktestLab.jsx replacements done');

// Verify key changes
const out = fs.readFileSync(file, 'utf8');
console.log('LoadingSkeleton prop:', out.includes("({ t }) => ("));
console.log('useTranslation in SearchDropdown:', out.includes("const { t } = useTranslation();\n    if (!results"));
console.log('useTranslation in DrawingToolbar:', out.includes("const { t } = useTranslation();\n    const tools"));
console.log('toolCursor:', out.includes("t('backtest.lab.toolCursor')"));
console.log('accountBalance:', out.includes("t('backtest.lab.accountBalance')"));
console.log('openPositions:', out.includes("t('backtest.lab.openPositions')"));
console.log('errorForex:', out.includes("t('backtest.lab.errorForex')"));
console.log('aiScan:', out.includes("t('backtest.lab.aiScan')"));
console.log('balanceLabel:', out.includes("t('backtest.lab.balanceLabel')"));
