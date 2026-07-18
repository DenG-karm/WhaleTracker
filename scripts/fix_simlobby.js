const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'frontend/src/components/SimulationLobby.jsx');
let txt = fs.readFileSync(file, 'utf8');

// 1. Add useTranslation import
txt = txt.replace(
  "import React, { useState, useEffect, useRef } from 'react';",
  "import React, { useState, useEffect, useRef } from 'react';\nimport { useTranslation } from 'react-i18next';"
);

// 2. Add useTranslation to PairDropdown component (it starts after function genId)
// PairDropdown starts after genId function - add hook
txt = txt.replace(
  'function PairDropdown({ value, onChange }) {\n  const [open, setOpen] = useState(false);',
  "function PairDropdown({ value, onChange }) {\n  const { t } = useTranslation();\n  const [open, setOpen] = useState(false);"
);

// 3. PairDropdown - group names translation map
txt = txt.replace(
  "            <div style={{ padding: '6px 14px 4px', fontSize: '0.68rem',\n              fontWeight: 700, letterSpacing: '0.12em', color: THEME.neonCyan,\n              textTransform: 'uppercase', opacity: 0.7 }}>\n              {group.group}\n            </div>",
  "            <div style={{ padding: '6px 14px 4px', fontSize: '0.68rem',\n              fontWeight: 700, letterSpacing: '0.12em', color: THEME.neonCyan,\n              textTransform: 'uppercase', opacity: 0.7 }}>\n              {({'Kripto': t('simLobby.groupCrypto'), 'Forex': 'Forex', 'Emtia': t('simLobby.groupCommodity'), 'Hisse': t('simLobby.groupEquity')})[group.group] || group.group}\n            </div>"
);

// 4. PairDropdown placeholder
txt = txt.replace(
  "        <span>{value ? (PAIR_LABELS[value] || value) : 'Parite seç...'}</span>",
  "        <span>{value ? (PAIR_LABELS[value] || value) : t('simLobby.pairPlaceholder')}</span>"
);

// 5. PairDropdown search placeholder
txt = txt.replace(
  'placeholder="Ara: EURUSD, BTC..."',
  "{...{placeholder: t('simLobby.searchPlaceholder')}}"
);

// 6. PairDropdown no results
txt = txt.replace(
  '\n                    Sonuç bulunamadı\n                  ',
  "\n                    {t('simLobby.noResults')}\n                  "
);

// 7. NewSimulationModal - add useTranslation
txt = txt.replace(
  "function NewSimulationModal({ onClose, onStart }) {\n  const [form, setForm] = useState({",
  "function NewSimulationModal({ onClose, onStart }) {\n  const { t } = useTranslation();\n  const [form, setForm] = useState({"
);

// 8. NewSimulationModal validation errors
txt = txt.replace("errs.pair = 'Parite seçilmeli'", "errs.pair = t('simLobby.errPairRequired')");
txt = txt.replace("errs.startBalance = 'Geçerli bir bakiye girin'", "errs.startBalance = t('simLobby.errBalanceInvalid')");

// 9. Modal title
txt = txt.replace(
  '\n              Yeni Simülasyon Oluştur\n',
  "\n              {t('simLobby.modalTitle')}\n"
);

// 10. Modal subtitle
txt = txt.replace(
  '\n                Tüm parametreler ayarlanabilir\n',
  "\n                {t('simLobby.modalSubtitle')}\n"
);

// 11. Form labels - pass t() calls to Label component
txt = txt.replace(' text="Parite & Piyasa"', " text={t('simLobby.pairMarket')}");
txt = txt.replace(' text="Zaman Dilimi"', " text={t('simLobby.timeframeLabel')}");
txt = txt.replace(' text="Tarih Aralığı"', " text={t('simLobby.dateRangeLabel')}");
txt = txt.replace(' text="Başlangıç Bakiyesi (USD)"', " text={t('simLobby.startBalance')}");
txt = txt.replace(' text="Strateji Açıklaması"', " text={t('simLobby.strategyLabel')}");

// 12. Date sub-labels
txt = txt.replace(
  "\n                <div style={{ fontSize: '0.7rem', color: THEME.textMuted, marginBottom: 5 }}>Başlangıç</div>",
  "\n                <div style={{ fontSize: '0.7rem', color: THEME.textMuted, marginBottom: 5 }}>{t('simLobby.startDate')}</div>"
);
txt = txt.replace(
  "\n                <div style={{ fontSize: '0.7rem', color: THEME.textMuted, marginBottom: 5 }}>Bitiş</div>",
  "\n                <div style={{ fontSize: '0.7rem', color: THEME.textMuted, marginBottom: 5 }}>{t('simLobby.endDate')}</div>"
);

// 13. Strategy hint
txt = txt.replace(
  '\n              AI koçun bu stratejiyi okuyarak seni analiz edecek\n',
  "\n              {t('simLobby.strategyHint')}\n"
);

// 14. Strategy placeholder
txt = txt.replace(
  'placeholder="Stratejini anlat...',
  "{...{placeholder: t('simLobby.strategyPlaceholder')}}  {/*"
);
// Undo broken approach - just replace the placeholder directly
let fixedTxt = fs.readFileSync(file, 'utf8');
// Revert the broken placeholder if needed
if (fixedTxt.includes('{...{placeholder: t(\'simLobby.strategyPlaceholder\')}}  {/*')) {
  // already got replaced partially, let's fix it
}
// Actually let's just re-read and try again
txt = fs.readFileSync(file, 'utf8');
txt = txt.replace(
  "import React, { useState, useEffect, useRef } from 'react';",
  "import React, { useState, useEffect, useRef } from 'react';\nimport { useTranslation } from 'react-i18next';"
);
// Do all replacements fresh
txt = txt.replace(
  'function PairDropdown({ value, onChange }) {\n  const [open, setOpen] = useState(false);',
  "function PairDropdown({ value, onChange }) {\n  const { t } = useTranslation();\n  const [open, setOpen] = useState(false);"
);
txt = txt.replace(
  "        <span>{value ? (PAIR_LABELS[value] || value) : 'Parite seç...'}</span>",
  "        <span>{value ? (PAIR_LABELS[value] || value) : t('simLobby.pairPlaceholder')}</span>"
);
txt = txt.replace(
  'placeholder="Ara: EURUSD, BTC..."',
  "placeholder={t('simLobby.searchPlaceholder')}"
);
txt = txt.replace(
  />\s*\n(\s+)Sonuç bulunamadı\n(\s+)</,
  ">\n$1{t('simLobby.noResults')}\n$2<"
);
txt = txt.replace(
  "            <div style={{ padding: '6px 14px 4px', fontSize: '0.68rem',\n              fontWeight: 700, letterSpacing: '0.12em', color: THEME.neonCyan,\n              textTransform: 'uppercase', opacity: 0.7 }}>\n              {group.group}\n            </div>",
  "            <div style={{ padding: '6px 14px 4px', fontSize: '0.68rem',\n              fontWeight: 700, letterSpacing: '0.12em', color: THEME.neonCyan,\n              textTransform: 'uppercase', opacity: 0.7 }}>\n              {({'Kripto': t('simLobby.groupCrypto'), 'Forex': 'Forex', 'Emtia': t('simLobby.groupCommodity'), 'Hisse': t('simLobby.groupEquity')})[group.group] || group.group}\n            </div>"
);
txt = txt.replace(
  "function NewSimulationModal({ onClose, onStart }) {\n  const [form, setForm] = useState({",
  "function NewSimulationModal({ onClose, onStart }) {\n  const { t } = useTranslation();\n  const [form, setForm] = useState({"
);
txt = txt.replace("errs.pair = 'Parite seçilmeli'", "errs.pair = t('simLobby.errPairRequired')");
txt = txt.replace("errs.startBalance = 'Geçerli bir bakiye girin'", "errs.startBalance = t('simLobby.errBalanceInvalid')");
txt = txt.replace(/>\s*\n(\s+)Yeni Simülasyon Oluştur\n(\s+)</, ">\n$1{t('simLobby.modalTitle')}\n$2<");
txt = txt.replace(/>\s*\n(\s+)Tüm parametreler ayarlanabilir\n(\s+)</, ">\n$1{t('simLobby.modalSubtitle')}\n$2<");
txt = txt.replace(' text="Parite & Piyasa"', " text={t('simLobby.pairMarket')}");
txt = txt.replace(' text="Zaman Dilimi"', " text={t('simLobby.timeframeLabel')}");
txt = txt.replace(' text="Tarih Aralığı"', " text={t('simLobby.dateRangeLabel')}");
txt = txt.replace(' text="Başlangıç Bakiyesi (USD)"', " text={t('simLobby.startBalance')}");
txt = txt.replace(' text="Strateji Açıklaması"', " text={t('simLobby.strategyLabel')}");
txt = txt.replace(
  "/>Başlangıç</div>",
  "/>{t('simLobby.startDate')}</div>"
);
txt = txt.replace(
  "/>Bitiş</div>",
  "/>{t('simLobby.endDate')}</div>"
);
// Strategy hint
txt = txt.replace(
  />\s*\n(\s+)AI koçun bu stratejiyi okuyarak seni analiz edecek\n(\s+)</,
  ">\n$1{t('simLobby.strategyHint')}\n$2<"
);
// Strategy placeholder
txt = txt.replace(
  'placeholder="Stratejini anlat...(Örn: SMC, Order Block ve likidite avı. Sadece seans açılışlarında işlem yapacağım, günde max 2 trade.)"',
  "placeholder={t('simLobby.strategyPlaceholder')}"
);
// Cancel/Submit buttons
txt = txt.replace(/>\s*\n(\s+)İptal\n(\s+)</, ">\n$1{t('simLobby.cancel')}\n$2<");
txt = txt.replace(/>\s*\n(\s+)Simülasyonu Başlat\n(\s+)</, ">\n$1{t('simLobby.startSim')}\n$2<");

// SessionRow - add useTranslation
txt = txt.replace(
  "function SessionRow({ session, onDelete, onResume, index }) {\n  const pnl",
  "function SessionRow({ session, onDelete, onResume, index }) {\n  const { t } = useTranslation();\n  const pnl"
);
// Status labels
txt = txt.replace(/Aktif<\/>\)$\s+: 'Tamamlandı'\}/m, (m) => {
  return m
    .replace('Aktif</>', '{t(\'simLobby.statusActive\')}\'</>')
    .replace(': \'Tamamlandı\'', ": t('simLobby.statusCompleted')");
});
// Resume button text  
txt = txt.replace(/>\s*\n(\s+)Devam Et\n(\s+)</, ">\n$1{t('simLobby.resume')}\n$2<");
// Live data label
txt = txt.replace(
  ": <span style={{ opacity: 0.45 }}>Canlı veri</span>}",
  ": <span style={{ opacity: 0.45 }}>{t('simLobby.liveData')}</span>}"
);

// EmptyState - add useTranslation
txt = txt.replace(
  "function EmptyState({ onNew }) {\n  return (",
  "function EmptyState({ onNew }) {\n  const { t } = useTranslation();\n  return ("
);
// Empty state texts
txt = txt.replace(/>\s*\n(\s+)Henüz Simülasyon Yok\n(\s+)</, ">\n$1{t('simLobby.emptyTitle')}\n$2<");
txt = txt.replace(
  /İlk simülasyonunu oluştur\. Gerçek piyasa verisi üzerinde,\s*\n\s*hiç risk almadan trade pratiği yap\./,
  "{t('simLobby.emptyDesc')}"
);
txt = txt.replace(/>\s*\n(\s+)İlk Simülasyonumu Oluştur\n(\s+)</, ">\n$1{t('simLobby.emptyBtn')}\n$2<");

// SimulationLobby main - add useTranslation
txt = txt.replace(
  "export default function SimulationLobby({ onStart }) {\n  const [sessions, setSessions]",
  "export default function SimulationLobby({ onStart }) {\n  const { t } = useTranslation();\n  const [sessions, setSessions]"
);

// Title h1
txt = txt.replace(/>\s*\n(\s+)Simülasyon Lobisi\n(\s+)</, ">\n$1{t('simLobby.title')}\n$2<");

// Subtitle
txt = txt.replace(
  '{sessions.length} oturum · Gerçek veri, sıfır risk',
  "{t('simLobby.sessionCount', { count: sessions.length })}"
);

// New simulation button
txt = txt.replace(/>\s*\n(\s+)YENİ SİMÜLASYON\n(\s+)</, ">\n$1{t('simLobby.newSimBtn')}\n$2<");

// Stats cards
txt = txt.replace("label: 'Toplam Oturum'", "label: t('simLobby.statTotal')");
txt = txt.replace("label: 'Aktif Oturum'", "label: t('simLobby.statActive')");
txt = txt.replace("label: 'Toplam PnL'", "label: t('simLobby.statPnl')");

// Table header section label
txt = txt.replace(/>\s*\n(\s+)Geçmiş Simülasyonlar\n(\s+)</, ">\n$1{t('simLobby.historyTitle')}\n$2<");

// Table column headers - they're an array
txt = txt.replace(
  "['Parite & Piyasa', 'Başlangıç', 'Güncel Bakiye', 'Tarih Aralığı', 'Durum', '']",
  "[t('simLobby.colPair'), t('simLobby.colStart'), t('simLobby.colCurrent'), t('simLobby.colDateRange'), t('simLobby.colStatus'), '']"
);

// Delete confirm message
txt = txt.replace(
  'Silmek için tekrar çöp kutusu ikonuna tıkla. Bu işlem geri alınamaz.',
  "{t('simLobby.deleteConfirm')}"
);

fs.writeFileSync(file, txt, 'utf8');
console.log('SimulationLobby.jsx replacements done');

const out = fs.readFileSync(file, 'utf8');
console.log('useTranslation import:', out.includes("from 'react-i18next'"));
console.log('PairDropdown hook:', out.includes("function PairDropdown({ value, onChange }) {\n  const { t } = useTranslation();"));
console.log('pairPlaceholder:', out.includes("t('simLobby.pairPlaceholder')"));
console.log('modalTitle:', out.includes("t('simLobby.modalTitle')"));
console.log('SimulationLobby hook:', out.includes("export default function SimulationLobby({ onStart }) {\n  const { t } = useTranslation();"));
console.log('colPair:', out.includes("t('simLobby.colPair')"));
console.log('sessionCount:', out.includes("t('simLobby.sessionCount'"));
console.log('statTotal:', out.includes("t('simLobby.statTotal')"));
