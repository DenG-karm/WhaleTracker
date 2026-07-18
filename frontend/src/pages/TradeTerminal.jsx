import React, { useState, useContext, useEffect, useLayoutEffect, useRef } from 'react';
import { useOutletContext, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
    ChevronLeft, ChevronRight, Zap, Target, CheckCircle,
    BrainCircuit, ShieldAlert, ShieldOff, Scan, AlertTriangle,
    Newspaper, Activity, BookMarked, X
} from 'lucide-react';
import { AdvancedRealTimeChart } from "react-ts-tradingview-widgets";
import XRayChart from '../components/XRayChart';
import AiStressTestWidget from '../components/AiStressTestWidget';
import { AuthContext, ToastContext } from '../contexts/AuthContext';
import { useTilt } from '../contexts/TiltContext';
import { apiClient } from '../api/client';
import { useLivePrice } from './useLivePrice';
import { useTranslation } from 'react-i18next';


const WARROOM_LAYOUT_KEY = 'wt_warroom_layout_v5';


// ������ Forex / sembol prefix haritası ��������������������������������������������������������������������������������
const BINANCE_SYMBOLS = new Set([
    'BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','ADAUSDT','AVAXUSDT',
    'DOGEUSDT','DOTUSDT','LTCUSDT','MATICUSDT','LINKUSDT','UNIUSDT',
]);
const FX_PAIRS = new Set([
    'EURUSD','GBPUSD','USDJPY','USDCHF','AUDUSD','NZDUSD','USDCAD',
    'EURGBP','EURJPY','GBPJPY','EURCHF','AUDCAD','CADJPY',
    'XAUUSD','XAGUSD','XPTUSD','XPDUSD',
]);
const INDEX_MAP = {
    'SPX500':  'FOREXCOM:SPXUSD',
    'NDX100':  'FOREXCOM:NSXUSD',
    'DJI':     'FOREXCOM:DJIUS',
    'DAX':     'FOREXCOM:GER40',
    'FTSE100': 'FOREXCOM:UK100',
};

const toTvSymbol = (sym) => {
    if (!sym) return sym;
    const s = sym.toUpperCase().trim();
    if (INDEX_MAP[s])           return INDEX_MAP[s];
    if (FX_PAIRS.has(s))        return `FX_IDC:${s}`;
    if (s.endsWith('.IS'))      return `BIST:${s.replace('.IS', '')}`;
    if (BINANCE_SYMBOLS.has(s)) return `BINANCE:${s}`;
    if (s.endsWith('USDT') || s.endsWith('BTC') || s.endsWith('ETH'))
        return `BINANCE:${s}`;
    return s;
};

// ������ Grafik durumu persistence (localStorage) ��������������������������������������������������������������
const TV_PERSIST_KEY = 'wt_tv_state_v1';
const loadTvState = () => { try { return JSON.parse(localStorage.getItem(TV_PERSIST_KEY)) || {}; } catch { return {}; } };
const saveTvState = (s) => { try { localStorage.setItem(TV_PERSIST_KEY, JSON.stringify(s)); } catch {} };

// ������ TradingView wrapper ��������������������������������������������������������������������������������������������������������
const TradingViewChart = ({ symbol, onSymbolChange, ...props }) => {
    const { t } = useTranslation();
    const [shouldRender, setShouldRender] = useState(false);
    // interval localStorage'dan yüklenir; widget de�xi�xtirince persist edilir
    const [interval, setIntervalState] = useState(() => loadTvState().interval || 'D');
    const containerRef = useRef(null);

    useEffect(() => {
        saveTvState({ ...loadTvState(), symbol, interval });
    }, [symbol, interval]);

    useLayoutEffect(() => {
        if (!symbol) { setShouldRender(false); return; }
        const timer = setTimeout(() => {
            if (containerRef.current?.offsetParent !== null) setShouldRender(true);
        }, 100);
        return () => clearTimeout(timer);
    }, [symbol]);

    useEffect(() => {
        const handleMessage = (event) => {
            try {
                const msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                if (msg?.name === 'widgetReady') return;
                // interval de�xi�xikli�xi
                const newInterval = msg?.data?.interval || msg?.interval;
                if (newInterval && typeof newInterval === 'string') {
                    setIntervalState(newInterval);
                }
                // sembol de�xi�xikli�xi
                const newSymbol = msg?.data?.symbol || msg?.symbol || msg?.ticker;
                if (newSymbol && typeof newSymbol === 'string' && newSymbol !== symbol) {
                    const clean = newSymbol.includes(':') ? newSymbol.split(':')[1] : newSymbol;
                    if (clean && onSymbolChange) onSymbolChange(clean.toUpperCase());
                }
            } catch (_) {}
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [symbol, onSymbolChange]);

    const tvSym = toTvSymbol(symbol);

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
            {!shouldRender ? (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    ⏳ {t('terminal.chartLoading')}
                </div>
            ) : (
                <AdvancedRealTimeChart
                    key={`tv-${tvSym}`}
                    symbol={tvSym}
                    interval={interval}
                    {...props}
                />
            )}
        </div>
    );
};

// ������ Sabitler ����������������������������������������������������������������������������������������������������������������������������
const POPULAR_PAIRS = [
    "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "ADAUSDT", "AVAXUSDT", "DOGEUSDT",
    "XAUUSD", "XAGUSD", "EURUSD", "GBPUSD", "USDJPY",
    "TSLA", "AAPL", "NVDA", "MSFT", "SPX500", "NDX100",
    "AMZN", "GOOGL", "META"
];

// ������ Ana Bile�xen ������������������������������������������������������������������������������������������������������������������������
const TradeTerminal = () => {
    const { t } = useTranslation();
    const { fetchTrades: refresh } = useOutletContext();
    const { user } = useContext(AuthContext);
    const showToast = useContext(ToastContext);
    const location = useLocation();
    const { isTiltLocked, triggerReason, countdown, unlockNow } = useTilt();

    const [direction,    setDirection]    = useState('LONG');
    const [tradeMode,    setTradeMode]    = useState('MARGIN');
    const [isPanelOpen,  setIsPanelOpen]  = useState(true);

    const defaultSymbol = location.state?.symbol || loadTvState().symbol || 'BTCUSDT'; // NVDA idi, düzeltildi

    const [form, setForm] = useState(() => ({
        symbol: defaultSymbol,
        title: '',
        bal: user?.settings?.target || 10000,
        risk: 1,
        entry: '', stop: '', tp: '',
        posSize: '',
        scalpSlPerc: 0.5, scalpRr: 2.0
    }));

    const [journal,     setJournal]     = useState({ strat: '', psych: '', img: null });
    const [aiAnalysis,  setAiAnalysis]  = useState({ loading: false, data: null });
    const [isFetching,  setIsFetching]  = useState(false);
    const [isXRayActive, setIsXRayActive] = useState(false);

    // ���� Sava�x Odası: İstihbarat + Watchlist state ��������������������������������������������������
    const [intelTab,     setIntelTab]     = useState('news');  // 'news' | 'whale' | 'structure'
    const [watchlistPairs, setWatchlistPairs] = useState(() => {
        try { return JSON.parse(localStorage.getItem('wt_terminal_wl')) || ['ETHUSDT','SOLUSDT','XAUUSD','EURUSD']; }
        catch { return ['ETHUSDT','SOLUSDT','XAUUSD','EURUSD']; }
    });
    const [wlInput, setWlInput] = useState('');

    const saveWl = (arr) => {
        setWatchlistPairs(arr);
        try { localStorage.setItem('wt_terminal_wl', JSON.stringify(arr)); } catch {}
    };
    const addToWl = () => {
        const s = wlInput.trim().toUpperCase();
        if (!s || watchlistPairs.includes(s)) { setWlInput(''); return; }
        saveWl([...watchlistPairs, s]);
        setWlInput('');
    };
    const removeFromWl = (sym) => saveWl(watchlistPairs.filter(x => x !== sym));

    const liveData = useLivePrice([form.symbol, ...watchlistPairs]);

    useEffect(() => {
        if (location.state?.symbol)      setForm(f => ({ ...f, symbol: location.state.symbol }));
        if (location.state?.defaultSide) setDirection(location.state.defaultSide);
    }, [location.state]);

    // ���� Canlı fiyat çekme ��������������������������������������������������������������������������������������������������
    const fetchLivePrice = async () => {
        if (!form.symbol) return;
        setIsFetching(true);
        try {
            const clean = form.symbol.replace(/[^A-Z]/gi, '').toUpperCase();
            const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${clean}`);
            if (res.ok) {
                const data = await res.json();
                setForm(f => ({ ...f, entry: parseFloat(data.price).toString(), symbol: clean }));
                showToast(`${t('terminal.fetchPrice')}: $${data.price}`, 'success');
            } else { showToast(t('terminal.priceOnly'), 'warning'); }
        } catch { showToast(t('terminal.priceFailed'), 'error'); }
        setIsFetching(false);
    };

    const quickCalcValues = (v) => setForm(f => ({ ...f, risk: v }));

    // ���� Hesaplamalar ������������������������������������������������������������������������������������������������������������
    const e   = Number(form.entry);
    const s   = Number(form.stop);
    const tp  = Number(form.tp);
    const bal = Number(form.bal);
    const riskPerc = Number(form.risk);

    let riskUsd = bal * (riskPerc / 100);
    let calcPosSize = 0, calcProfit = 0, calcRr = 0, actualStop = s, actualTp = tp;

    if (tradeMode === 'MARGIN' && e > 0 && s > 0) {
        const diff = Math.abs(e - s);
        if (diff > 0) calcPosSize = riskUsd / diff;
        if (calcPosSize > 0 && tp > 0) {
            calcProfit = calcPosSize * Math.abs(tp - e);
            calcRr = calcProfit / riskUsd;
        }
    } else if (tradeMode === 'SCALP' && e > 0) {
        const slDist = e * (Number(form.scalpSlPerc) / 100);
        actualStop = direction === 'LONG' ? e - slDist : e + slDist;
        const tpDist = slDist * Number(form.scalpRr);
        actualTp = direction === 'LONG' ? e + tpDist : e - tpDist;
        calcPosSize = riskUsd / slDist;
        calcProfit  = calcPosSize * tpDist;
        calcRr      = Number(form.scalpRr);
    } else if (tradeMode === 'SPOT' && e > 0 && Number(form.posSize) > 0) {
        calcPosSize = Number(form.posSize);
        riskUsd = calcPosSize * e;
    }

    // ���� AI Pre-Check ������������������������������������������������������������������������������������������������������������
    const runPreCheck = async () => {
        if (!e) return showToast(t('terminal.entryRequired'), 'error');
        if (tradeMode !== 'SPOT' && (!s || s <= 0)) return showToast(t('terminal.stopRequired'), 'error');
        setAiAnalysis({ loading: true, data: null });
        try {
            const res = await apiClient('/analyze-setup', {
                method: 'POST',
                body: { symbol: form.symbol, entry_price: e, stop_loss: actualStop || e * 0.95, balance: bal, risk: riskPerc, image: journal.img, lang: localStorage.getItem('wt_lang') || 'TR' }
            });
            setAiAnalysis({ loading: false, data: res.analysis || t('terminal.analysisDone') });
            showToast(t('terminal.aiApproved'), 'success');
        } catch (err) {
            setAiAnalysis({ loading: false, data: t('terminal.serverUnreachable') });
            showToast(t('terminal.aiApprovedFail'), 'error');
        }
    };

    // ���� İ�xlem Kaydet ����������������������������������������������������������������������������������������������������������
    const saveTrade = async () => {
        if (!e) return showToast(t('terminal.entryRequired'), 'error');
        if (tradeMode === 'MARGIN' && (!s || s <= 0)) return showToast(t('terminal.stopRequired'), 'error');
        if (tradeMode === 'SCALP'  && (!s || s <= 0)) return showToast(t('terminal.stopRequired'), 'error');
        if (tradeMode === 'SPOT'   && (!form.posSize || Number(form.posSize) <= 0)) return showToast(t('terminal.lotRequired'), 'error');

        const title = form.title || `${form.symbol} ${direction} (${tradeMode})`;
        const finalStrategy = `[Y�N: ${direction} | MOD: ${tradeMode} | TP: ${actualTp || '-'}]\n${journal.strat}`;

        try {
            await apiClient('/save-trade', {
                method: 'POST',
                body: {
                    title, symbol: form.symbol, trade_type: tradeMode,
                    account_balance: bal, risk_percentage: riskPerc,
                    entry_price: e,
                    stop_loss: tradeMode === 'SPOT' ? null : (actualStop || null),
                    position_size: ['SPOT', 'SCALP'].includes(tradeMode) ? calcPosSize : null,
                    strategy_note: finalStrategy, psychology_note: journal.psych,
                    risk_note: '', screenshot: journal.img
                }
            });
            showToast(t('terminal.tradeSaved'), "success");
            refresh();
            setForm(f => ({ ...f, title: '', entry: '', stop: '', tp: '', posSize: '' }));
            setJournal({ strat: '', psych: '', img: null });
            setAiAnalysis({ loading: false, data: null });
        } catch (err) {
            showToast(err.message || t('terminal.saveFailed'), "error");
        }
    };

    const handlePaste = (event) => {
        for (const item of event.clipboardData.items) {
            if (item.type.startsWith("image")) {
                const reader = new FileReader();
                reader.onload = (ev) => setJournal(prev => ({ ...prev, img: ev.target.result }));
                reader.readAsDataURL(item.getAsFile());
            }
        }
    };

    // ���� Renk yardımcıları ��������������������������������������������������������������������������������������������������
    const isLong    = direction === 'LONG';
    const dirColor  = isLong ? '#4edea3' : '#ef4444';
    const dirShadow = isLong ? 'rgba(78,222,163,0.22)' : 'rgba(239,68,68,0.22)';

    // ���� Ortak input stili ��������������������������������������������������������������������������������������������������
    const inputRow = (borderColor = 'var(--border)', bgColor = 'rgba(0,0,0,0.2)') => ({
        display: 'flex', background: bgColor, border: `1px solid ${borderColor}`,
        borderRadius: 8, overflow: 'hidden', transition: '0.15s'
    });
    const inputField = (color = 'white') => ({
        flex: 1, background: 'none', border: 'none', color, fontWeight: 800,
        fontSize: '0.98rem', padding: '9px 12px', outline: 'none', minWidth: 0
    });
    const inputSuffix = (borderColor = 'var(--border)', color = 'var(--text-muted)') => ({
        display: 'flex', alignItems: 'center', padding: '0 11px',
        fontSize: '0.68rem', fontWeight: 700, color,
        borderLeft: `1px solid ${borderColor}`, flexShrink: 0
    });
    const labelStyle = (color = 'var(--text-muted)') => ({
        fontSize: '0.6rem', color, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 5
    });

    // ������������������������������������������������������������������������������������������������������������������������������������������

    // ���� İstihbarat paneli mock verileri ����������������������������������������������������������������������
    const MOCK_NEWS = {
        BTCUSDT: [
            { id: 1, title: t('terminal.news.btc1'), source: 'Bloomberg', time: t('terminal.news.time12m'), score: 91, dir: 'bull' },
            { id: 2, title: t('terminal.news.btc2'), source: 'Reuters', time: t('terminal.news.time1h'), score: 78, dir: 'bull' },
            { id: 3, title: t('terminal.news.btc3'), source: 'CNBC', time: t('terminal.news.time3h'), score: 48, dir: 'neutral' },
        ],
        ETHUSDT: [
            { id: 1, title: t('terminal.news.eth1'), source: 'CoinDesk', time: t('terminal.news.time45m'), score: 85, dir: 'bull' },
            { id: 2, title: t('terminal.news.eth2'), source: 'The Block', time: t('terminal.news.time2h'), score: 72, dir: 'bull' },
        ],
        XAUUSD: [
            { id: 1, title: t('terminal.news.xau1'), source: 'FT', time: t('terminal.news.time20m'), score: 82, dir: 'bull' },
            { id: 2, title: t('terminal.news.xau2'), source: 'Reuters', time: t('terminal.news.time4h'), score: 77, dir: 'bull' },
        ],
        EURUSD: [
            { id: 1, title: t('terminal.news.eur1'), source: 'Bloomberg', time: t('terminal.news.time35m'), score: 58, dir: 'bear' },
            { id: 2, title: t('terminal.news.eur2'), source: 'Reuters', time: t('terminal.news.time2h'), score: 69, dir: 'bull' },
        ],
    };
    const MOCK_WHALES = {
        BTCUSDT: [
            { id: 1, wallet: '0x3a4f⬦b82c', side: 'BUY',  amount: '�� 420',    usd: '$28.4M', exchange: 'Binance �  Cold', time: t('terminal.wh.time2m') },
            { id: 2, wallet: '0xf91a⬦c3d1', side: 'SELL', amount: '�� 210',    usd: '$14.2M', exchange: 'Coinbase �  OTC', time: t('terminal.wh.time8m') },
            { id: 3, wallet: '0x7b2e⬦9a12', side: 'BUY',  amount: '�� 1,850',  usd: '$125M',  exchange: 'Unknown �  Binance', time: t('terminal.wh.time22m') },
        ],
        ETHUSDT: [
            { id: 1, wallet: '0xd41f⬦8c33', side: 'BUY',  amount: 'Ξ 12,400', usd: '$43.6M', exchange: 'OKX �  Cold',     time: t('terminal.wh.time5m') },
            { id: 2, wallet: '0x88ac⬦4f70', side: 'SELL', amount: 'Ξ 5,200',  usd: '$18.3M', exchange: 'Kraken �  CEX',   time: t('terminal.wh.time14m') },
        ],
        XAUUSD: [
            { id: 1, wallet: 'ETF Flow',   side: 'BUY',  amount: '4.8t oz',  usd: '$380M',  exchange: 'GLD ETF Inflow',  time: t('terminal.wh.time1h') },
        ],
        EURUSD: [
            { id: 1, wallet: 'Hedge Fund', side: 'SELL', amount: '��420M',    usd: '$458M',  exchange: 'CME OTC',         time: t('terminal.wh.time3h') },
        ],
    };
    const MOCK_STRUCTURE = {
        BTCUSDT: { trendKey: 'bull', trendColor: '#10b981', levels: [{ label: t('terminal.str.strongSupport'), price: '$61,200', strength: 92 }, { label: t('terminal.str.keyResistance'), price: '$72,400', strength: 85 }, { label: t('terminal.str.athZone'), price: '$73,800', strength: 78 }], summary: t('terminal.str.btcSummary') },
        ETHUSDT: { trendKey: 'neutral', trendColor: '#eab308', levels: [{ label: t('terminal.str.support'), price: '$3,200', strength: 75 }, { label: t('terminal.str.resistance'), price: '$3,800', strength: 80 }], summary: t('terminal.str.ethSummary') },
        XAUUSD:  { trendKey: 'bull', trendColor: '#10b981', levels: [{ label: t('terminal.str.support'), price: '$2,280', strength: 88 }, { label: t('terminal.str.resistance'), price: '$2,440', strength: 72 }], summary: t('terminal.str.xauSummary') },
        EURUSD:  { trendKey: 'bear', trendColor: '#ef4444', levels: [{ label: t('terminal.str.support'), price: '1.0640', strength: 70 }, { label: t('terminal.str.resistance'), price: '1.0890', strength: 82 }], summary: t('terminal.str.eurSummary') },
    };
    const getIntelData = (sym, type) => {
        const key = Object.keys(type === 'news' ? MOCK_NEWS : type === 'whale' ? MOCK_WHALES : MOCK_STRUCTURE)
            .find(k => sym?.includes(k.replace('USDT','')) || k === sym) || Object.keys(type === 'news' ? MOCK_NEWS : type === 'whale' ? MOCK_WHALES : MOCK_STRUCTURE)[0];
        return type === 'news' ? MOCK_NEWS[key] : type === 'whale' ? MOCK_WHALES[key] : MOCK_STRUCTURE[key];
    };

    // ���� AI Sentinel: Divergence Engine ������������������������������������������������������������������������
    const getSymKey = (sym, map) =>
        Object.keys(map).find(k => sym?.includes(k.replace('USDT', '')) || k === sym) || Object.keys(map)[0];

    const computeDivergence = (sym) => {
        const newsItems = MOCK_NEWS[getSymKey(sym, MOCK_NEWS)] || [];
        const struct    = MOCK_STRUCTURE[getSymKey(sym, MOCK_STRUCTURE)];
        const techDir = struct?.trendKey || 'neutral';
        const bullCount = newsItems.filter(n => n.dir === 'bull').length;
        const bearCount = newsItems.filter(n => n.dir === 'bear').length;
        const fundDir   = bullCount > bearCount ? 'bull' : bearCount > bullCount ? 'bear' : 'neutral';
        const hasDivergence = techDir !== 'neutral' && fundDir !== 'neutral' && techDir !== fundDir;
        return { techDir, fundDir, hasDivergence };
    };

    const divergence = computeDivergence(form.symbol);

    // Sentinel ba�xlamını localStorage'a yaz � AIChat tarafından okunur
    useEffect(() => {
        const techLabel = divergence.techDir === 'bull' ? t('terminal.str.bullish') : divergence.techDir === 'bear' ? t('terminal.str.bearish') : t('terminal.str.neutral');
        const fundLabel = divergence.fundDir === 'bull' ? t('terminal.str.bullish') : divergence.fundDir === 'bear' ? t('terminal.str.bearish') : t('terminal.str.neutral');
        try {
            localStorage.setItem('wt_sentinel_ctx', JSON.stringify({
                symbol:        form.symbol,
                techDir:       divergence.techDir,
                fundDir:       divergence.fundDir,
                hasDivergence: divergence.hasDivergence,
                techLabel,
                fundLabel,
                timestamp:     Date.now(),
            }));
        } catch {}
    }, [form.symbol, divergence.hasDivergence, divergence.techDir, divergence.fundDir]); // eslint-disable-line

    // ������������������������������������������������������������������������������������������������������������������������������������������
    
    const [activeDrawer, setActiveDrawer] = useState(null); // 'intel' | 'stress' | 'watchlist' | null
    const toggleDrawer = (key) => setActiveDrawer(prev => prev === key ? null : key);
    const [isTradePanelOpen, setIsTradePanelOpen] = useState(true);

    const cardStyle = {
        background: 'rgba(5, 8, 16, 0.72)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '14px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
    };

    const PanelHeader = ({ title, rightElement, onClose }) => (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '7px 14px', background: 'rgba(0,219,231,0.03)',
            borderBottom: '1px solid rgba(0,219,231,0.1)', flexShrink: 0
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#00dbe7', boxShadow: '0 0 6px #00dbe7', flexShrink: 0 }} />
                <span style={{ fontSize: '0.62rem', fontWeight: 900, color: 'rgba(0,219,231,0.85)', fontFamily: '"JetBrains Mono", "Fira Code", "Courier New", monospace', letterSpacing: '0.14em' }}>{title}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {rightElement}
                {onClose && (
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', padding: 2 }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
                    ><X size={14}/></button>
                )}
            </div>
        </div>
    );

    // ���� Drawer panel bile�xenleri ����������������������������������������������������������������������������������
    const IntelPanel = () => (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {divergence.hasDivergence && (
                <div style={{ padding: '10px 16px', background: 'linear-gradient(90deg, rgba(234,88,12,0.22) 0%, rgba(239,68,68,0.16) 100%)', borderBottom: '1px solid rgba(239,68,68,0.35)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>xa�</span>
                    <span style={{ flex: 1, fontSize: '0.72rem', fontWeight: 800, color: '#fbbf24', lineHeight: 1.45 }}>
                        {t('terminal.sentinelPrefix')} {divergence.techDir === 'bull' ? t('terminal.sentinelTechBull') : t('terminal.sentinelTechBear')}{t('terminal.sentinelSuffix')}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0, alignItems: 'flex-end' }}>
                        <span style={{ fontSize: '0.6rem', padding: '2px 8px', borderRadius: 4, fontWeight: 800, background: divergence.techDir === 'bull' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', color: divergence.techDir === 'bull' ? '#4edea3' : '#f87171', border: `1px solid ${divergence.techDir === 'bull' ? 'rgba(78,222,163,0.35)' : 'rgba(239,68,68,0.35)'}` }}>
                            {t('terminal.sentinelTechnical')} {divergence.techDir === 'bull' ? '��' : '��'}
                        </span>
                        <span style={{ fontSize: '0.6rem', padding: '2px 8px', borderRadius: 4, fontWeight: 800, background: divergence.fundDir === 'bull' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', color: divergence.fundDir === 'bull' ? '#4edea3' : '#f87171', border: `1px solid ${divergence.fundDir === 'bull' ? 'rgba(78,222,163,0.35)' : 'rgba(239,68,68,0.35)'}` }}>
                            {t('terminal.sentinelFundamental')} {divergence.fundDir === 'bull' ? '��' : '��'}
                        </span>
                    </div>
                </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981', display: 'inline-block' }} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>{t('terminal.contextualIntel')} � {form.symbol}</span>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                    {[{ key: 'news', label: t('terminal.newsTab') }, { key: 'whale', label: t('terminal.whaleTab') }, { key: 'structure', label: t('terminal.structureTab') }].map(tab => (
                        <button key={tab.key} onClick={() => setIntelTab(tab.key)} style={{ padding: '6px 14px', border: 'none', borderRadius: '6px 6px 0 0', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700, transition: '0.15s', background: intelTab === tab.key ? 'rgba(0,219,231,0.15)' : 'transparent', color: intelTab === tab.key ? '#00dbe7' : 'rgba(255,255,255,0.45)', borderBottom: intelTab === tab.key ? '2px solid #00dbe7' : '2px solid transparent' }}>{tab.label}</button>
                    ))}
                </div>
            </div>
            <div style={{ padding: 16, flex: 1, overflowY: 'auto' }}>
                {intelTab === 'news' && (() => {
                    const news = getIntelData(form.symbol, 'news') || [];
                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {news.map(item => (
                                <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div style={{ flexShrink: 0, width: 42, height: 42, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 900, background: item.score >= 75 ? 'rgba(16,185,129,0.18)' : item.score >= 50 ? 'rgba(234,179,8,0.18)' : 'rgba(239,68,68,0.18)', color: item.score >= 75 ? '#10b981' : item.score >= 50 ? '#eab308' : '#ef4444', border: `1.5px solid ${item.score >= 75 ? 'rgba(16,185,129,0.4)' : item.score >= 50 ? 'rgba(234,179,8,0.4)' : 'rgba(239,68,68,0.4)'}` }}>{item.score}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)', lineHeight: 1.4, marginBottom: 4 }}>{item.title}</div>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.64rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)' }}>{item.source}</span>
                                            <span style={{ fontSize: '0.64rem', color: 'rgba(255,255,255,0.25)' }}>·</span>
                                            <span style={{ fontSize: '0.64rem', color: 'rgba(255,255,255,0.35)' }}>{item.time}</span>
                                            <span style={{ marginLeft: 'auto', fontSize: '0.6rem', fontWeight: 800, padding: '1px 7px', borderRadius: 4, background: item.dir === 'bull' ? 'rgba(16,185,129,0.15)' : item.dir === 'bear' ? 'rgba(239,68,68,0.15)' : 'rgba(148,163,184,0.15)', color: item.dir === 'bull' ? '#10b981' : item.dir === 'bear' ? '#ef4444' : '#94a3b8' }}>
                                                {item.dir === 'bull' ? t('terminal.bullDir') : item.dir === 'bear' ? t('terminal.bearDir') : t('terminal.neutralDir')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                })()}
                {intelTab === 'whale' && (() => {
                    const whales = getIntelData(form.symbol, 'whale') || [];
                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {whales.map(w => (
                                <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div style={{ width: 52, textAlign: 'center', padding: '3px 0', borderRadius: 6, fontSize: '0.7rem', fontWeight: 900, background: w.side === 'BUY' ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)', color: w.side === 'BUY' ? '#10b981' : '#ef4444', boxShadow: `0 0 10px ${w.side === 'BUY' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}` }}>{w.side}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                                            <span style={{ fontSize: '0.82rem', fontWeight: 900, color: w.side === 'BUY' ? '#4edea3' : '#f87171' }}>{w.usd}</span>
                                            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>{w.amount}</span>
                                        </div>
                                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)' }}>{w.exchange}</div>
                                    </div>
                                    <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{w.time}</span>
                                </div>
                            ))}
                        </div>
                    );
                })()}
                {intelTab === 'structure' && (() => {
                    const st = getIntelData(form.symbol, 'structure');
                    if (!st) return null;
                    return (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{t('terminal.importantLevels')}</div>
                                {st.levels.map((lv, i) => (
                                    <div key={i} style={{ marginBottom: 10 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{lv.label}</span>
                                            <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#e2e8f0' }}>{lv.price}</span>
                                        </div>
                                        <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)' }}>
                                            <div style={{ height: '100%', borderRadius: 2, width: `${lv.strength}%`, background: 'linear-gradient(90deg, #00dbe7, #7c3aed)' }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div>
                                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{t('terminal.overallTrend')}</div>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 8, marginBottom: 12, background: `${st.trendColor}18`, border: `1px solid ${st.trendColor}50` }}>
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: st.trendColor, boxShadow: `0 0 6px ${st.trendColor}` }} />
                                    <span style={{ fontSize: '0.78rem', fontWeight: 900, color: st.trendColor }}>{st.trendKey === 'bull' ? t('terminal.str.bullish') : st.trendKey === 'bear' ? t('terminal.str.bearish') : t('terminal.str.neutral')}</span>
                                </div>
                                <p style={{ fontSize: '0.75rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.6)', margin: 0 }}>{st.summary}</p>
                            </div>
                        </div>
                    );
                })()}
            </div>
        </div>
    );

    const WatchlistPanel = () => (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>x� {t('terminal.watchlist')}</span>
                    <span style={{ fontSize: '0.62rem', background: 'rgba(0,219,231,0.18)', color: '#00dbe7', borderRadius: 10, padding: '1px 8px', fontWeight: 700 }}>{watchlistPairs.length}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input value={wlInput} onChange={e => setWlInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addToWl()} placeholder="AAPL, SOLUSDT⬦"
                        style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, padding: '5px 10px', fontSize: '0.72rem', color: 'white', outline: 'none', width: 130 }} />
                    <button onClick={addToWl} style={{ padding: '5px 12px', borderRadius: 7, border: 'none', background: 'rgba(0,219,231,0.18)', color: '#00dbe7', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer' }}>+ {t('terminal.addBtn')}</button>
                </div>
            </div>
            <div style={{ overflow: 'auto', flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            {[t('terminal.pairHeader'), t('terminal.priceHeader'), t('terminal.changeHeader'), 'Sparkline', ''].map((h, i) => (
                                <th key={i} style={{ padding: '7px 16px', textAlign: i === 0 ? 'left' : 'right', color: 'rgba(255,255,255,0.35)', fontWeight: 700, fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {watchlistPairs.map(sym => {
                            const ld = liveData[sym];
                            const isUp = ld?.isUp ?? true;
                            const price = ld?.price ? `$${Number(ld.price).toLocaleString(undefined, { maximumFractionDigits: 4 })}` : '�';
                            const change = ld?.change ? `${isUp ? '+' : ''}${ld.change}%` : '�';
                            const sparkH = 28, sparkW = 80;
                            const pts = Array.from({ length: 12 }, (_, i) => { const seed = (sym.charCodeAt(0) * 31 + i * 17 + i * i) % 100; return (seed / 100) * sparkH; });
                            const polyline = pts.map((y, i) => `${(i / 11) * sparkW},${sparkH - y}`).join(' ');
                            const sparkColor = isUp ? '#10b981' : '#ef4444';
                            return (
                                <tr key={sym} onClick={() => { setForm(f => ({ ...f, symbol: sym })); saveTvState({ ...loadTvState(), symbol: sym }); }}
                                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: '0.15s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <td style={{ padding: '10px 16px', fontWeight: 900, color: form.symbol === sym ? '#00dbe7' : 'rgba(255,255,255,0.85)', letterSpacing: '0.04em' }}>
                                        {form.symbol === sym && <span style={{ marginRight: 6, color: '#00dbe7', fontSize: '0.6rem' }}>��</span>}
                                        {sym}
                                    </td>
                                    <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: 'rgba(255,255,255,0.9)' }}>{price}</td>
                                    <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 800, color: isUp ? '#10b981' : '#ef4444' }}>{change}</td>
                                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                                        <svg width={sparkW} height={sparkH} style={{ display: 'block', marginLeft: 'auto' }}>
                                            <polyline points={polyline} fill="none" stroke={sparkColor} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
                                        </svg>
                                    </td>
                                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                        <button onClick={e => { e.stopPropagation(); removeFromWl(sym); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', fontSize: '0.9rem', padding: '2px 4px', borderRadius: 4, transition: '0.15s' }}
                                            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}
                                        >�S"</button>
                                    </td>
                                </tr>
                            );
                        })}
                        {watchlistPairs.length === 0 && <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '0.78rem' }}>{t('terminal.emptyWatchlist')}</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );

    // ���� Drawer config ����������������������������������������������������������������������������������������������������������
    const DRAWERS = {
        intel:     { title: t('terminal.drawerIntel'),     content: <IntelPanel />,            height: '42vh' },
        stress:    { title: t('terminal.drawerStress'), content: <AiStressTestWidget />,    height: '55vh' },
        watchlist: { title: t('terminal.drawerWatchlist'),     content: <WatchlistPanel />,        height: '44vh' },
    };

    return (
        <div className="fade-in" style={{ width: '100%', height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
            {/* Cyber Neon Grid Background */}
            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: -1, backgroundImage: 'linear-gradient(rgba(0,219,231,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,219,231,0.02) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

            {/* �"��"� TİLT KALKANI �"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"� */}
            {isTiltLocked && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 200, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', background: 'radial-gradient(ellipse at center top, rgba(239,68,68,0.18) 0%, rgba(10,10,20,0.88) 70%)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
                    <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'radial-gradient(circle, rgba(239,68,68,0.25) 0%, transparent 70%)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(239,68,68,0.55)', boxShadow: '0 0 40px rgba(239,68,68,0.35), inset 0 0 20px rgba(239,68,68,0.08)', animation: 'wt-tilt-pulse 2s ease-in-out infinite' }}>
                        <ShieldOff size={44} color="#ef4444" />
                    </div>
                    <div style={{ textAlign: 'center', maxWidth: 380 }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '0.04em', color: '#ef4444', textShadow: '0 0 30px rgba(239,68,68,0.6)', marginBottom: 10 }}>{t('tilt.title')}</div>
                        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>{triggerReason === 'consecutive_loss' ? t('tilt.reason.consecutiveLoss') : triggerReason === 'daily_drawdown' ? t('tilt.reason.drawdown') : t('tilt.subtitle')}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontSize: '3rem', fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: '#ffffff', textShadow: '0 0 20px rgba(239,68,68,0.5)' }}>
                            {String(Math.floor(countdown / 60)).padStart(2, '0')}<span style={{ opacity: 0.5, animation: 'wt-tilt-blink 1s step-start infinite' }}>:</span>{String(countdown % 60).padStart(2, '0')}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t('tilt.unlockIn')}</div>
                    </div>
                    <div style={{ padding: '12px 20px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.22)', fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', maxWidth: 340, textAlign: 'center', lineHeight: 1.6 }}>{t('tilt.cooldownMsg')}</div>
                    <button onClick={unlockNow} style={{ padding: '8px 20px', borderRadius: 8, cursor: 'pointer', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem', transition: '0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'; e.currentTarget.style.color = '#ef4444'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
                    >{t('tilt.testUnlock')}</button>
                </div>
            )}

            {/* �"��"� ANA LAYOUT: Sol Grafik + Sa�x Trade �"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"� */}
            <div style={{ display: 'flex', flex: 1, gap: 10, padding: 10, minHeight: 0 }}>

                {/* ������ Sol: X-RAY RADARI (75%) ���������������������������������������������������������� */}
                <div style={{ ...cardStyle, flex: 1, minWidth: 0, minHeight: 0, transition: 'flex 0.3s ease' }}>
                    <PanelHeader
                        title={t('terminal.xrayRadar')}
                        rightElement={
                            <button onClick={() => setIsXRayActive(!isXRayActive)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: '6px', background: isXRayActive ? 'rgba(0, 219, 231, 0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${isXRayActive ? 'rgba(0, 219, 231, 0.4)' : 'rgba(255,255,255,0.1)'}`, color: isXRayActive ? '#00dbe7' : 'rgba(255,255,255,0.5)', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s ease' }}>
                                <Scan size={12} /> {t('terminal.xrayMode')}
                            </button>
                        }
                    />
                    <div style={{ padding: '8px 8px 0', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--border)', padding: '7px 14px' }}>
                            <span style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '0.04em' }}>{form.symbol}</span>
                            {liveData[form.symbol] && (
                                <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700, background: liveData[form.symbol].isUp ? 'rgba(78,222,163,0.12)' : 'rgba(239,68,68,0.12)', color: liveData[form.symbol].isUp ? '#4edea3' : '#ef4444' }}>
                                    {liveData[form.symbol].isUp ? '��' : '��'} {liveData[form.symbol].change}%
                                </span>
                            )}
                        </div>
                    </div>
                    <div style={{ flex: 1, margin: 8, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-card)', minHeight: 0 }}>
                        {!form.symbol ? (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>{t('terminal.selectPair')}</div>
                        ) : isXRayActive ? (
                            <XRayChart symbol={form.symbol} />
                        ) : (
                            <TradingViewChart symbol={form.symbol} theme="dark" autosize onSymbolChange={(sym) => { setForm(f => ({ ...f, symbol: sym })); saveTvState({ ...loadTvState(), symbol: sym }); }} />
                        )}
                    </div>
                </div>

                {/* ������ Sa�x: İŞLEM TERMİNALİ (25%) �������������������������������������������������� */}
                <div style={{ ...cardStyle, width: isTradePanelOpen ? 320 : 0, minWidth: 0, flexShrink: 0, overflow: 'hidden', transition: 'width 0.3s ease, opacity 0.3s ease', opacity: isTradePanelOpen ? 1 : 0 }}>
                    <PanelHeader title={t('terminal.quickTradeTerminal')} />
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                        {/* HEADER: Y�N + MOD + SEMBOL */}
                        <div style={{ padding: '14px 14px 0' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
                                {[{ key: 'LONG', label: t('terminal.longBtn'), active: '#4edea3', shadow: 'rgba(78,222,163,0.3)' }, { key: 'SHORT', label: t('terminal.shortBtn'), active: '#ef4444', shadow: 'rgba(239,68,68,0.3)' }].map(d => (
                                    <button key={d.key} onClick={() => setDirection(d.key)} style={{ padding: '10px 0', border: 'none', fontWeight: 900, fontSize: '0.88rem', cursor: 'pointer', transition: '0.2s', letterSpacing: '0.04em', background: direction === d.key ? d.active : 'var(--bg-app)', color: direction === d.key ? '#fff' : 'var(--text-muted)', boxShadow: direction === d.key ? `0 3px 12px ${d.shadow}` : 'none' }}>{d.label}</button>
                                ))}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4, background: 'var(--bg-app)', padding: 4, borderRadius: 8, marginBottom: 10 }}>
                                {[{ key: 'MARGIN', icon: '�a�' }, { key: 'SPOT', icon: 'x�' }, { key: 'SCALP', icon: 'x��' }].map(m => (
                                    <button key={m.key} onClick={() => setTradeMode(m.key)} style={{ padding: '7px 0', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.7rem', fontWeight: 800, transition: '0.2s', background: tradeMode === m.key ? 'rgba(255,255,255,0.1)' : 'transparent', color: tradeMode === m.key ? 'white' : 'var(--text-muted)', boxShadow: tradeMode === m.key ? '0 1px 6px rgba(0,0,0,0.3)' : 'none' }}>{m.key}</button>
                                ))}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '7px 10px', marginBottom: 14 }}>
                                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', flexShrink: 0 }}>{t('terminal.symbol')}</span>
                                <input value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))} placeholder="BTCUSDT, XAUUSD..." style={{ flex: 1, background: 'none', border: 'none', color: 'white', fontWeight: 800, fontSize: '0.9rem', outline: 'none', minWidth: 0 }} />
                                <button onClick={fetchLivePrice} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 2 }}><Zap size={14} /></button>
                            </div>
                        </div>
                        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 14px' }} />
                        {/* FORM ALANLARI */}
                        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 9 }}>
                            {tradeMode === 'MARGIN' && (<>
                                <div><div style={labelStyle()}>{t('terminal.entryPrice')}</div><div style={inputRow()}><input value={form.entry} onChange={e => setForm(f => ({...f, entry: e.target.value}))} type="number" placeholder="0.00" style={inputField()} /><span style={inputSuffix()}>USD</span></div></div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4 }}>
                                    {[1, 2, 5, 10].map(v => (<button key={v} onClick={() => quickCalcValues(v)} style={{ padding: '6px 0', border: `1px solid ${Number(form.risk) === v ? dirColor : 'rgba(255,255,255,0.08)'}`, borderRadius: 6, cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700, transition: '0.15s', background: Number(form.risk) === v ? `${dirColor}18` : 'transparent', color: Number(form.risk) === v ? dirColor : 'var(--text-muted)' }}>%{v}</button>))}
                                </div>
                                <div><div style={labelStyle()}>{t('terminal.stopLoss')}</div><div style={inputRow('rgba(239,68,68,0.25)', 'rgba(239,68,68,0.05)')}><input value={form.stop} onChange={e => setForm(f => ({...f, stop: e.target.value}))} type="number" placeholder="0.00" style={inputField('#ef4444')} /><span style={inputSuffix('rgba(239,68,68,0.2)', 'rgba(239,68,68,0.5)')}>USD</span></div></div>
                                <div><div style={labelStyle('#4edea3')}>{t('terminal.takeProfit')}</div><div style={inputRow('rgba(78,222,163,0.25)', 'rgba(78,222,163,0.05)')}><input value={form.tp} onChange={e => setForm(f => ({...f, tp: e.target.value}))} type="number" placeholder="0.00" style={inputField('#4edea3')} /><span style={inputSuffix('rgba(78,222,163,0.2)', 'rgba(78,222,163,0.5)')}>USD</span></div></div>
                            </>)}
                            {tradeMode === 'SCALP' && (
                                <div style={{ background: 'rgba(234,179,8,0.05)', border: '1px solid rgba(234,179,8,0.18)', borderRadius: 10, padding: '12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#eab308', fontWeight: 800, fontSize: '0.75rem' }}><Zap size={12}/> {t('terminal.scalpMode')}</div>
                                    <div><div style={labelStyle()}>{t('terminal.entryPrice')}</div><div style={inputRow()}><input value={form.entry} onChange={e => setForm(f => ({...f, entry: e.target.value}))} type="number" placeholder="0.00" style={inputField()} /></div></div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                        <div><div style={labelStyle()}>{t('terminal.stopDistance')}</div><input value={form.scalpSlPerc} onChange={e => setForm(f => ({...f, scalpSlPerc: e.target.value}))} type="number" step="0.1" style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 6, color: 'white', fontWeight: 700, padding: '7px 10px', outline: 'none' }} /></div>
                                        <div><div style={labelStyle()}>{t('terminal.targetRR')}</div><input value={form.scalpRr} onChange={e => setForm(f => ({...f, scalpRr: e.target.value}))} type="number" step="0.5" style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 6, color: 'white', fontWeight: 700, padding: '7px 10px', outline: 'none' }} /></div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem', padding: '6px 10px', background: 'rgba(0,0,0,0.15)', borderRadius: 6 }}>
                                        <span style={{ color: 'var(--text-muted)' }}>{t('terminal.autoStop')}: <strong style={{ color: '#ef4444' }}>{actualStop ? actualStop.toFixed(4) : '�'}</strong></span>
                                        <span style={{ color: 'var(--text-muted)' }}>{t('terminal.autoTp')}: <strong style={{ color: '#4edea3' }}>{actualTp ? actualTp.toFixed(4) : '�'}</strong></span>
                                    </div>
                                </div>
                            )}
                            {tradeMode === 'SPOT' && (<>
                                <div><div style={labelStyle()}>{t('terminal.buyPrice')}</div><div style={inputRow()}><input value={form.entry} onChange={e => setForm(f => ({...f, entry: e.target.value}))} type="number" placeholder="0.00" style={inputField()} /><span style={inputSuffix()}>USD</span></div></div>
                                <div><div style={labelStyle()}>{t('terminal.lotSize')}</div><div style={inputRow()}><input value={form.posSize} onChange={e => setForm(f => ({...f, posSize: e.target.value}))} type="number" placeholder="0.00" style={inputField()} /><span style={inputSuffix()}>{form.symbol.replace(/USDT|USD/g, '') || 'BTC'}</span></div></div>
                            </>)}
                        </div>
                        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 14px' }} />
                        {/* SERMAYE & RİSK */}
                        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={labelStyle()}>{t('terminal.capitalRisk')}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: (tradeMode === 'MARGIN' || tradeMode === 'SCALP') ? '1fr 1fr' : '1fr', gap: 8 }}>
                                <div style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '8px 10px' }}>
                                    <div style={labelStyle()}>{t('terminal.balance')}</div>
                                    <input value={form.bal} onChange={e => setForm(f => ({...f, bal: e.target.value}))} type="number" style={{ width: '100%', background: 'none', border: 'none', color: 'white', fontWeight: 800, fontSize: '0.95rem', outline: 'none', padding: 0 }} />
                                </div>
                                {(tradeMode === 'MARGIN' || tradeMode === 'SCALP') && (
                                    <div style={{ background: `${dirColor}0d`, border: `1px solid ${dirColor}33`, borderRadius: 8, padding: '8px 10px' }}>
                                        <div style={labelStyle(dirColor)}>{t('terminal.riskPct')}</div>
                                        <input value={form.risk} onChange={e => setForm(f => ({...f, risk: e.target.value}))} type="number" style={{ width: '100%', background: 'none', border: 'none', color: dirColor, fontWeight: 800, fontSize: '0.95rem', outline: 'none', padding: 0 }} />
                                    </div>
                                )}
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '9px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem' }}><span style={{ color: 'var(--text-muted)' }}>{t('terminal.riskAmount')}</span><span style={{ fontWeight: 800, color: dirColor }}>${riskUsd.toFixed(2)}</span></div>
                                {(tradeMode === 'MARGIN' || tradeMode === 'SCALP') && calcPosSize > 0 && (<>
                                    <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem' }}><span style={{ color: 'var(--text-muted)' }}>{t('terminal.position')}</span><span style={{ fontWeight: 800, color: 'white' }}>{calcPosSize.toFixed(4)} {t('terminal.units')}</span></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem' }}><span style={{ color: 'var(--text-muted)' }}>{t('terminal.profit')}</span><span style={{ fontWeight: 800, color: calcRr >= 1.5 ? '#4edea3' : calcRr > 0 ? '#eab308' : '#ef4444' }}>${calcProfit.toFixed(2)} · 1:{calcRr.toFixed(2)}</span></div>
                                </>)}
                            </div>
                        </div>
                        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 14px' }} />
                        {/* JOURNALING */}
                        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={labelStyle()}>{t('terminal.tradeNotes')}</div>
                            <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder={t('terminal.titlePlaceholder')} style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, color: 'white', fontSize: '0.8rem', padding: '8px 10px', outline: 'none' }} />
                            <textarea value={journal.strat} onChange={e => setJournal(j => ({...j, strat: e.target.value}))} placeholder={t('terminal.stratPlaceholder')} style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, color: 'white', fontSize: '0.78rem', padding: '8px 10px', outline: 'none', minHeight: 54, resize: 'vertical', fontFamily: 'inherit' }} />
                            <div onPaste={handlePaste} style={{ border: `1px dashed ${journal.img ? 'var(--primary)' : 'rgba(255,255,255,0.12)'}`, padding: '8px', borderRadius: 8, textAlign: 'center', fontSize: '0.68rem', color: 'var(--text-muted)', background: journal.img ? 'rgba(99,102,241,0.07)' : 'transparent', cursor: 'pointer' }}>
                                {journal.img ? <><CheckCircle size={12} style={{ verticalAlign: 'middle', marginRight: 5 }} color="var(--primary)" />{t('terminal.screenshotAdded')}</> : t('terminal.pasteScreenshot')}
                            </div>
                        </div>
                        {/* BUTONLAR */}
                        <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
                            {aiAnalysis.data && (
                                <div className="fade-in" style={{ padding: '9px 12px', background: 'rgba(0,219,231,0.09)', border: '1px solid rgba(0,219,231,0.25)', borderRadius: 8, fontSize: '0.71rem', lineHeight: 1.55, color: 'rgba(255,255,255,0.8)' }}>
                                    <div style={{ color: '#00dbe7', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}><BrainCircuit size={12}/> {t('terminal.aiPreCheck')}</div>
                                    {aiAnalysis.data}
                                </div>
                            )}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
                                <button onClick={runPreCheck} disabled={aiAnalysis.loading || isTiltLocked} style={{ padding: '12px 0', borderRadius: 9, border: '1px solid rgba(0,219,231,0.4)', background: 'rgba(0,219,231,0.09)', color: '#00dbe7', fontWeight: 800, fontSize: '0.75rem', cursor: (aiAnalysis.loading || isTiltLocked) ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 5, transition: '0.2s', opacity: (aiAnalysis.loading || isTiltLocked) ? 0.38 : 1 }}>
                                    {aiAnalysis.loading ? '...' : <><ShieldAlert size={14}/> AI</>}
                                </button>
                                <button onClick={saveTrade} disabled={isTiltLocked} style={{ padding: '12px 0', borderRadius: 9, border: 'none', background: isTiltLocked ? 'rgba(239,68,68,0.25)' : dirColor, color: isTiltLocked ? 'rgba(255,255,255,0.4)' : 'white', fontWeight: 900, fontSize: '0.9rem', cursor: isTiltLocked ? 'not-allowed' : 'pointer', letterSpacing: '0.05em', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 7, boxShadow: isTiltLocked ? 'none' : `0 4px 18px ${dirShadow}`, transition: '0.2s', opacity: isTiltLocked ? 0.38 : 1 }}>
                                    {isTiltLocked ? <><ShieldOff size={15}/> {t('tilt.locked')}</> : <><Target size={15}/> {t('terminal.confirmTrade')}</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* �"��"� KOMUT DOCK �"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"� */}
            <div style={{
                position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)',
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 16px',
                background: 'rgba(5, 8, 20, 0.82)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: '1px solid rgba(0,219,231,0.2)',
                borderRadius: 40,
                boxShadow: '0 0 40px rgba(0,0,0,0.6), 0 0 20px rgba(0,219,231,0.08)',
                zIndex: 100,
            }}>
                {/* İşlem Paneli toggle */}
                <button onClick={() => setIsTradePanelOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 16px', borderRadius: 30, border: `1px solid ${isTradePanelOpen ? 'rgba(0,219,231,0.5)' : 'rgba(255,255,255,0.1)'}`, background: isTradePanelOpen ? 'rgba(0,219,231,0.15)' : 'transparent', color: isTradePanelOpen ? '#00dbe7' : 'rgba(255,255,255,0.5)', fontSize: '0.65rem', fontWeight: 900, cursor: 'pointer', letterSpacing: '0.1em', transition: 'all 0.2s ease', boxShadow: isTradePanelOpen ? '0 0 16px rgba(0,219,231,0.25)' : 'none' }}>
                    <Zap size={14} />{t('terminal.dockTrade')}
                </button>
                <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />
                {[
                    { key: 'intel',     icon: <Newspaper size={14}/>,    label: t('terminal.dockIntel'), color: '#10b981' },
                    { key: 'stress',    icon: <AlertTriangle size={14}/>, label: t('terminal.dockStress'),    color: '#f97316' },
                    { key: 'watchlist', icon: <BookMarked size={14}/>,    label: t('terminal.dockWatchlist'),     color: '#6366f1' },
                ].map(btn => {
                    const active = activeDrawer === btn.key;
                    return (
                        <button key={btn.key} onClick={() => toggleDrawer(btn.key)} style={{
                            display: 'flex', alignItems: 'center', gap: 7,
                            padding: '7px 16px', borderRadius: 30,
                            border: `1px solid ${active ? btn.color : 'rgba(255,255,255,0.1)'}`,
                            background: active ? `${btn.color}20` : 'transparent',
                            color: active ? btn.color : 'rgba(255,255,255,0.5)',
                            fontSize: '0.65rem', fontWeight: 900, cursor: 'pointer',
                            letterSpacing: '0.1em',
                            transition: 'all 0.2s ease',
                            boxShadow: active ? `0 0 16px ${btn.color}30` : 'none',
                        }}
                        onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = `${btn.color}80`; e.currentTarget.style.color = btn.color; } }}
                        onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; } }}
                        >
                            {btn.icon}{btn.label}
                        </button>
                    );
                })}
            </div>

            {/* �"��"� DRAWER OVERLAY �"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"� */}
            <AnimatePresence>
                {activeDrawer && DRAWERS[activeDrawer] && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            key="backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => setActiveDrawer(null)}
                            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 110, backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)' }}
                        />
                        {/* Drawer */}
                        <motion.div
                            key={`drawer-${activeDrawer}`}
                            initial={{ y: '100%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: '100%', opacity: 0 }}
                            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
                            style={{
                                position: 'absolute', bottom: 0, left: 0, right: 0,
                                height: DRAWERS[activeDrawer].height,
                                zIndex: 120,
                                background: 'rgba(6, 9, 20, 0.95)',
                                backdropFilter: 'blur(28px)',
                                WebkitBackdropFilter: 'blur(28px)',
                                borderTop: '1px solid rgba(0,219,231,0.25)',
                                borderLeft: '1px solid rgba(255,255,255,0.06)',
                                borderRight: '1px solid rgba(255,255,255,0.06)',
                                borderRadius: '20px 20px 0 0',
                                boxShadow: '0 -8px 60px rgba(0,0,0,0.6), 0 -1px 0 rgba(0,219,231,0.15)',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                            }}
                        >
                            <PanelHeader
                                title={DRAWERS[activeDrawer].title}
                                onClose={() => setActiveDrawer(null)}
                                rightElement={
                                    <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                                }
                            />
                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                {DRAWERS[activeDrawer].content}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <style>{`
                @keyframes wt-tilt-pulse { 0%, 100% { box-shadow: 0 0 40px rgba(239,68,68,0.35), inset 0 0 20px rgba(239,68,68,0.08); } 50% { box-shadow: 0 0 70px rgba(239,68,68,0.55), inset 0 0 30px rgba(239,68,68,0.15); } }
                @keyframes wt-tilt-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
                @keyframes sentinel-pulse { 0%, 100% { border-bottom-color: rgba(239,68,68,0.35); } 50% { border-bottom-color: rgba(239,68,68,0.65); } }
            `}</style>
        </div>
    );
};

export default TradeTerminal;
