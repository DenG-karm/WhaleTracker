const fs = require('fs');
const path = require('path');

const trFile = path.join(__dirname, 'frontend/src/locales/tr/translation.json');
const enFile = path.join(__dirname, 'frontend/src/locales/en/translation.json');

const tr = JSON.parse(fs.readFileSync(trFile, 'utf8'));
const en = JSON.parse(fs.readFileSync(enFile, 'utf8'));

// ── terminal new keys ────────────────────────────────────────────────────────
const terminalNewTr = {
  longBtn: "🟢 LONG AÇ",
  shortBtn: "🔴 SHORT AÇ",
  stopLoss: "Stop Loss",
  scalpMode: "SCALP MODU",
  autoStop: "Auto-Stop",
  autoTp: "Auto-TP",
  drawerIntel: "/// İSTİHBARAT AĞI",
  drawerStress: "/// KIYAMET SİMÜLATÖRÜ",
  drawerWatchlist: "/// GÖZLEM LİSTESİ",
  xrayRadar: "/// X-RAY RADARI",
  xrayMode: "X-RAY MODU",
  quickTradeTerminal: "/// HIZLI İŞLEM TERMİNALİ",
  dockTrade: "İŞLEM",
  dockIntel: "İSTİHBARAT",
  dockStress: "KIYAMET",
  dockWatchlist: "GÖZLEM",
  confirmTrade: "ONAYLA",
};

const terminalNewEn = {
  longBtn: "🟢 LONG",
  shortBtn: "🔴 SHORT",
  stopLoss: "Stop Loss",
  scalpMode: "SCALP MODE",
  autoStop: "Auto-Stop",
  autoTp: "Auto-TP",
  drawerIntel: "/// INTELLIGENCE FEED",
  drawerStress: "/// STRESS SIMULATOR",
  drawerWatchlist: "/// WATCHLIST",
  xrayRadar: "/// X-RAY RADAR",
  xrayMode: "X-RAY MODE",
  quickTradeTerminal: "/// QUICK TRADE TERMINAL",
  dockTrade: "TRADE",
  dockIntel: "INTEL",
  dockStress: "STRESS",
  dockWatchlist: "WATCHLIST",
  confirmTrade: "CONFIRM",
};

// ── backtest.lab new keys ────────────────────────────────────────────────────
const backtestNewTr = {
  loadingData: "VERİ ÇEKİLİYOR...",
  searching: "Aranıyor...",
  noResults: "Sonuç bulunamadı",
  positionSize: "Boyut (USDT)",
  accountBalance: "Bakiye",
  freeMargin: "Serbest Bakiye",
  equity: "Equity",
  openPnl: "Açık PnL",
  openPositions: "AÇIK POZİSYONLAR",
  openBadge: "AÇIK",
  noOpenPositions: "Açık pozisyon yok",
  closePosition: "Pozisyonu Kapat",
  colPnl: "PnL",
  toolCursor: "Seç (S)",
  toolLine: "Trend Çizgisi (L)",
  toolRect: "Bölge / Kutu (R)",
  toolClearAll: "Tümünü Temizle",
  balanceLabel: "BAKİYE",
  aiScan: "AI Tarama",
  aiScanTitle: "AI Tarama Başlat",
  errorForex: "Forex geçmiş verisi desteklenmiyor",
  errorAssetType: "Bu varlık türü desteklenmiyor",
  errorInsufficientData: "Yeterli geçmiş veri bulunamadı",
  errorGeneric: "Veri yüklenemedi",
  errorForexHint: "Kripto (BTCUSDT, ETHUSDT) veya hisse senedi seçin.",
  errorGenericHint: "Farklı bir varlık veya zaman dilimi deneyin.",
  retry: "Tekrar Dene",
};

const backtestNewEn = {
  loadingData: "LOADING DATA...",
  searching: "Searching...",
  noResults: "No results found",
  positionSize: "Position Size (USDT)",
  accountBalance: "Balance",
  freeMargin: "Free Margin",
  equity: "Equity",
  openPnl: "Open P&L",
  openPositions: "OPEN POSITIONS",
  openBadge: "OPEN",
  noOpenPositions: "No open positions",
  closePosition: "Close Position",
  colPnl: "P&L",
  toolCursor: "Select (S)",
  toolLine: "Trend Line (L)",
  toolRect: "Region / Box (R)",
  toolClearAll: "Clear All",
  balanceLabel: "BALANCE",
  aiScan: "AI Scan",
  aiScanTitle: "Start AI Scan",
  errorForex: "Forex historical data not supported",
  errorAssetType: "This asset type is not supported",
  errorInsufficientData: "Insufficient historical data found",
  errorGeneric: "Failed to load data",
  errorForexHint: "Select a crypto (BTCUSDT, ETHUSDT) or equity.",
  errorGenericHint: "Try a different asset or timeframe.",
  retry: "Retry",
};

// ── simLobby new section ─────────────────────────────────────────────────────
const simLobbyTr = {
  title: "Simülasyon Lobisi",
  sessionCount: "{{count}} oturum · Gerçek veri, sıfır risk",
  newSimBtn: "YENİ SİMÜLASYON",
  statTotal: "Toplam Oturum",
  statActive: "Aktif Oturum",
  statPnl: "Toplam PnL",
  historyTitle: "Geçmiş Simülasyonlar",
  colPair: "Parite & Piyasa",
  colStart: "Başlangıç",
  colCurrent: "Güncel Bakiye",
  colDateRange: "Tarih Aralığı",
  colStatus: "Durum",
  deleteConfirm: "Silmek için tekrar çöp kutusu ikonuna tıkla. Bu işlem geri alınamaz.",
  statusActive: "Aktif",
  statusCompleted: "Tamamlandı",
  liveData: "Canlı veri",
  resume: "Devam Et",
  emptyTitle: "Henüz Simülasyon Yok",
  emptyDesc: "İlk simülasyonunu oluştur. Gerçek piyasa verisi üzerinde, hiç risk almadan trade pratiği yap.",
  emptyBtn: "İlk Simülasyonumu Oluştur",
  modalTitle: "Yeni Simülasyon Oluştur",
  modalSubtitle: "Tüm parametreler ayarlanabilir",
  pairMarket: "Parite & Piyasa",
  timeframeLabel: "Zaman Dilimi",
  dateRangeLabel: "Tarih Aralığı",
  startDate: "Başlangıç",
  endDate: "Bitiş",
  startBalance: "Başlangıç Bakiyesi (USD)",
  strategyLabel: "Strateji Açıklaması",
  pairPlaceholder: "Parite seç...",
  searchPlaceholder: "Ara: EURUSD, BTC...",
  noResults: "Sonuç bulunamadı",
  groupCrypto: "Kripto",
  groupForex: "Forex",
  groupCommodity: "Emtia",
  groupEquity: "Hisse",
  errPairRequired: "Parite seçilmeli",
  errBalanceInvalid: "Geçerli bir bakiye girin",
  strategyHint: "AI koçun bu stratejiyi okuyarak seni analiz edecek",
  strategyPlaceholder: "Stratejini anlat... (Örn: SMC, Order Block ve likidite avı. Sadece seans açılışlarında işlem yapacağım, günde max 2 trade.)",
  cancel: "İptal",
  startSim: "Simülasyonu Başlat",
};

const simLobbyEn = {
  title: "Simulation Lobby",
  sessionCount: "{{count}} sessions · Real data, zero risk",
  newSimBtn: "NEW SIMULATION",
  statTotal: "Total Sessions",
  statActive: "Active Sessions",
  statPnl: "Total P&L",
  historyTitle: "Session History",
  colPair: "Pair & Market",
  colStart: "Starting",
  colCurrent: "Current Balance",
  colDateRange: "Date Range",
  colStatus: "Status",
  deleteConfirm: "Click the trash icon again to confirm deletion. This cannot be undone.",
  statusActive: "Active",
  statusCompleted: "Completed",
  liveData: "Live data",
  resume: "Resume",
  emptyTitle: "No Simulations Yet",
  emptyDesc: "Create your first simulation. Practice trading on real market data with zero risk.",
  emptyBtn: "Create My First Simulation",
  modalTitle: "New Simulation",
  modalSubtitle: "All parameters are adjustable",
  pairMarket: "Pair & Market",
  timeframeLabel: "Timeframe",
  dateRangeLabel: "Date Range",
  startDate: "Start",
  endDate: "End",
  startBalance: "Starting Balance (USD)",
  strategyLabel: "Strategy Description",
  pairPlaceholder: "Select pair...",
  searchPlaceholder: "Search: EURUSD, BTC...",
  noResults: "No results found",
  groupCrypto: "Crypto",
  groupForex: "Forex",
  groupCommodity: "Commodities",
  groupEquity: "Equities",
  errPairRequired: "Please select a pair",
  errBalanceInvalid: "Please enter a valid balance",
  strategyHint: "Your AI coach will analyze your performance based on this strategy",
  strategyPlaceholder: "Describe your strategy... (e.g., SMC, Order Blocks and liquidity sweeps. Only trading session opens, max 2 trades per day.)",
  cancel: "Cancel",
  startSim: "Start Simulation",
};

// ── Apply to TR ──────────────────────────────────────────────────────────────
Object.assign(tr.terminal, terminalNewTr);
Object.assign(tr.backtest.lab, backtestNewTr);
tr.simLobby = simLobbyTr;

// ── Apply to EN ──────────────────────────────────────────────────────────────
Object.assign(en.terminal, terminalNewEn);
Object.assign(en.backtest.lab, backtestNewEn);
en.simLobby = simLobbyEn;

// ── Write files ──────────────────────────────────────────────────────────────
fs.writeFileSync(trFile, JSON.stringify(tr, null, 2), 'utf8');
fs.writeFileSync(enFile, JSON.stringify(en, null, 2), 'utf8');

console.log('Locale files updated');

// Verify
const trOut = JSON.parse(fs.readFileSync(trFile, 'utf8'));
const enOut = JSON.parse(fs.readFileSync(enFile, 'utf8'));
console.log('TR terminal.longBtn:', trOut.terminal.longBtn);
console.log('EN terminal.longBtn:', enOut.terminal.longBtn);
console.log('TR backtest.lab.freeMargin:', trOut.backtest.lab.freeMargin);
console.log('EN backtest.lab.freeMargin:', enOut.backtest.lab.freeMargin);
console.log('TR simLobby.title:', trOut.simLobby.title);
console.log('EN simLobby.title:', enOut.simLobby.title);
console.log('TR simLobby.sessionCount:', trOut.simLobby.sessionCount);
console.log('EN simLobby.statPnl:', enOut.simLobby.statPnl);
