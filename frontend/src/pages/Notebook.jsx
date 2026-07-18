import React, { useState, useEffect, useContext } from 'react';
import { useOutletContext, useLocation } from 'react-router-dom';
import {
    Target, Book, Brain, Download, X,
    CalendarDays, TrendingUp, TrendingDown,
    Activity, ImageIcon,
    Crosshair, Zap, ShieldAlert,
    BarChart2, Search, Lock
} from 'lucide-react';
import { ToastContext } from '../contexts/AuthContext';
import { apiClient } from '../api/client';
import { useTranslation } from 'react-i18next';
import AiAutopsyModal from '../components/AiAutopsyModal';
import SubscriptionManager from '../utils/SubscriptionManager';

// --- Yardımcı Fonksiyonlar --- //

const safeData = (data) => Array.isArray(data) ? data : [];

const fmtUsd = (val) => {
    if (!val && val !== 0) return '—';
    return (val > 0 ? '+' : '') + '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ─── CloseTradeModal ──────────────────────────────────────────────────────
const CloseTradeModal = ({ trade, onClose, onSuccess }) => {
    const [exitPrice, setExitPrice] = useState('');
    const [closeNote, setCloseNote] = useState('');
    const [loading, setLoading] = useState(false);
    const showToast = useContext(ToastContext);
    const { t } = useTranslation();

    if (!trade) return null;

    const handleSubmit = async () => {
        if (!exitPrice || isNaN(Number(exitPrice))) {
            showToast(t('notebook.invalidPrice'), 'error');
            return;
        }
        setLoading(true);
        try {
            await apiClient('/close-trade', {
                method: 'POST',
                body: { trade_id: trade.id, exit_price: Number(exitPrice), close_note: closeNote }
            });
            showToast(t('notebook.closedSuccess'), 'success');
            // onSuccess'e kapanış verilerini ilet → AiAutopsyModal tetikleyicisi
            onSuccess({ exitPrice: Number(exitPrice), trade });
            onClose();
        } catch (err) {
            showToast(err.message || t('notebook.closeError'), 'error');
        }
        setLoading(false);
    };

    return (
        <div className="fade-in" style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(8,12,24,0.75)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{
                width: 420, borderRadius: 20,
                background: 'rgba(20,26,45,0.92)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 30px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
                padding: 32, display: 'flex', flexDirection: 'column', gap: 20
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            <div style={{ padding: 8, borderRadius: 10, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}>
                                <Lock size={16} />
                            </div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900 }}>{t('notebook.closeTitle')}</h3>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', paddingLeft: 46 }}>
                            <strong style={{ color: 'white' }}>{trade.symbol}</strong> — {trade.title || t('notebook.unnamed')}
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <X size={16} />
                    </button>
                </div>

                {/* Giriş Fiyatı referansı */}
                <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{t('notebook.entryPrice')}</span>
                    <strong>${trade.entry_price}</strong>
                </div>

                {/* Çıkış Fiyatı */}
                <div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{t('notebook.exitPrice')}</div>
                    <div style={{ display: 'flex', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, overflow: 'hidden' }}>
                        <input
                            autoFocus
                            type="number"
                            placeholder="0.00"
                            value={exitPrice}
                            onChange={e => setExitPrice(e.target.value)}
                            style={{ flex: 1, background: 'none', border: 'none', color: 'white', fontWeight: 800, fontSize: '1.1rem', padding: '12px 14px', outline: 'none' }}
                        />
                        <span style={{ display: 'flex', alignItems: 'center', padding: '0 14px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>USD</span>
                    </div>
                </div>

                {/* Kapanış Notu */}
                <div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{t('notebook.closeNote')}</div>
                    <textarea
                        placeholder={t('notebook.closeNotePlaceholder')}
                        value={closeNote}
                        onChange={e => setCloseNote(e.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', fontSize: '0.85rem', padding: '11px 14px', outline: 'none', minHeight: 72, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
                    />
                </div>

                {/* Aksiyon Butonları */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, marginTop: 4 }}>
                    <button onClick={onClose} style={{ padding: '13px 0', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: '0.2s' }}>
                        {t('common.cancel')}
                    </button>
                    <button onClick={handleSubmit} disabled={loading} style={{ padding: '13px 0', borderRadius: 10, border: 'none', background: loading ? 'rgba(239,68,68,0.4)' : '#ef4444', color: 'white', fontWeight: 900, fontSize: '0.9rem', cursor: loading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 18px rgba(239,68,68,0.25)', transition: '0.2s' }}>
                        <Lock size={15} />{loading ? t('notebook.closing') : t('notebook.closeBtn')}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── ImageModal ────────────────────────────────────────────────────────────
const ImageModal = ({ src, onClose }) => {
    if (!src) return null;
    return (
        <div className="fade-in" style={{
            position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.9)',
            backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={onClose}>
            <img src={src} alt="Trade Screenshot" style={{
                maxWidth: '90%', maxHeight: '90%', borderRadius: 16,
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)'
            }} onClick={e => e.stopPropagation()} />
            <button onClick={onClose} style={{
                position: 'absolute', top: 40, right: 40, background: 'rgba(255,255,255,0.1)', cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: 12, borderRadius: '50%',
                transition: '0.2s'
            }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
               onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
                <X size={24} />
            </button>
        </div>
    );
};

// --- Ana Bileşen --- //

const Notebook = () => {
    const { trades, isLoading, fetchTrades } = useOutletContext();
    const [selected, setSelected] = useState(null);
    const showToast = useContext(ToastContext);
    const { t: t2, i18n } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('ALL'); /* ALL, OPEN, WON, LOST */
    const [activeTab, setActiveTab] = useState('NOTES'); /* NOTES, AI_MACRO */
    const [modalImage, setModalImage] = useState(null);
    const [closingTrade, setClosingTrade] = useState(null); /* Modal için seçili işlem */
    const [autopsyTarget, setAutopsyTarget] = useState(null); /* { trade, exitPrice } */
    const location = useLocation();

    // P0 FIX: Journal sayfasına her gelindiğinde güncel veriyi çek.
    // Terminal'den işlem eklendikten sonra navigasyon timing'inden bağımsız olarak
    // güncel listeyi garanti altına alır.
    useEffect(() => {
        fetchTrades();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const q = params.get('search');
        if (q) setSearchTerm(q);
    }, [location]);

    // Veri Filtreleme
    let processedTrades = safeData(trades).filter(t => {
        const query = searchTerm.toLowerCase();
        const matchesSearch = (t.symbol || '').toLowerCase().includes(query) || (t.title || '').toLowerCase().includes(query);
        if (filter === 'OPEN') return matchesSearch && t.status === 'OPEN';
        if (filter === 'WON') return matchesSearch && t.status === 'CLOSED' && t.pnl > 0;
        if (filter === 'LOST') return matchesSearch && t.status === 'CLOSED' && t.pnl <= 0;
        return matchesSearch;
    });

    // Her zaman en yenisi en üstte
    processedTrades.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    // Mini İstatistikler
    const closedList = processedTrades.filter(t => t.status === 'CLOSED');
    const netPnl = closedList.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const wins = closedList.filter(t => t.pnl > 0).length;
    const winRate = closedList.length > 0 ? Math.round((wins / closedList.length) * 100) : 0;
    const grossWin  = closedList.filter(t => t.pnl > 0).reduce((s, t) => s + (t.pnl || 0), 0);
    const grossLoss = Math.abs(closedList.filter(t => t.pnl <= 0).reduce((s, t) => s + (t.pnl || 0), 0));
    const profitFactor = grossLoss > 0 ? (grossWin / grossLoss).toFixed(2) : grossWin > 0 ? '∞' : '—';

    const exportToCSV = () => {
        if (!processedTrades?.length) return showToast(t2('notebook.exportError'), 'error');
        const headers = t2('notebook.csvHeaders', { returnObjects: true });
        const rows = processedTrades.map(tr => [
            tr.date?.split('T')[0] || '', tr.status === 'OPEN' ? t2('notebook.statusOpen') : t2('notebook.statusClosed'),
            tr.symbol || '', `"${(tr.title || '').replace(/"/g, '""')}"`,
            tr.entry_price || 0, tr.exit_price || 0, tr.stop_loss || 0,
            tr.risk_percentage || 0, tr.pnl || 0
        ].join(','));
        const csv = [headers.join(','), ...rows].join('\n');
        const link = document.createElement('a');
        link.href = encodeURI('data:text/csv;charset=utf-8,\uFEFF' + csv);
        link.download = `Journal_Export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        showToast(t2('notebook.exportSuccess'), 'success');
    };

    const FilterBtn = ({ value, label, icon }) => (
        <button onClick={() => setFilter(value)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 20, border: '1px solid var(--border)', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem',
            background: filter === value ? 'var(--text-main)' : 'var(--bg-app)',
            color: filter === value ? 'var(--bg-app)' : 'var(--text-muted)', transition: 'all 0.2s',
            boxShadow: filter === value ? '0 4px 10px rgba(0,0,0,0.1)' : 'none'
        }}>
            {icon} {label}
        </button>
    );

    const handleCloseSuccess = ({ exitPrice, trade: closedTrade }) => {
        // CloseTradeModal kapandıktan hemen sonra AiAutopsyModal'ı tetikle (Pro guard)
        SubscriptionManager.guardAI(() => {
            setAutopsyTarget({ trade: closedTrade, exitPrice });
        });
    };

    const handleAutopsyAccept = () => {
        // localStorage kaydı AiAutopsyModal içinde zaten yapıldı
        fetchTrades();
        setSelected(prev => prev ? { ...prev, status: 'CLOSED' } : null);
        showToast(t2('autopsy.savedMsg'), 'success');
        setAutopsyTarget(null);
    };

    const handleAutopsySkip = () => {
        // Atla — işlem kapandı ama otopsi kaydedilmedi
        fetchTrades();
        setSelected(prev => prev ? { ...prev, status: 'CLOSED' } : null);
        setAutopsyTarget(null);
    };

    return (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24, height: '100%', paddingBottom: 20 }}>
            {/* Modaller */}
            <ImageModal src={modalImage} onClose={() => setModalImage(null)} />
            <CloseTradeModal trade={closingTrade} onClose={() => setClosingTrade(null)} onSuccess={handleCloseSuccess} />
            {autopsyTarget && (
                <AiAutopsyModal
                    trade={autopsyTarget.trade}
                    exitPrice={autopsyTarget.exitPrice}
                    onAccept={handleAutopsyAccept}
                    onClose={handleAutopsySkip}
                />
            )}

            {/* ── PAGE HEADER ── */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexShrink:0 }}>
                <div>
                    <h1 style={{ margin:0, fontSize:'2rem', fontWeight:600, color:'#e1e2eb', letterSpacing:'-0.01em' }}>{t2('notebook.title')}</h1>
                    <p style={{ margin:'6px 0 0', fontSize:'0.9rem', color:'#849495' }}>{t2('notebook.subtitle')}</p>
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <FilterBtn value="ALL"  label={t2('notebook.filterAll')}  icon={<BarChart2 size={14}/>} />
                    <FilterBtn value="OPEN" label={t2('notebook.filterOpen')} icon={<Activity size={14}/>} />
                    <FilterBtn value="WON"  label={t2('notebook.filterWon')}  icon={<TrendingUp size={14}/>} />
                    <FilterBtn value="LOST" label={t2('notebook.filterLost')} icon={<TrendingDown size={14}/>} />
                    <button onClick={exportToCSV} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:6, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.04)', color:'#849495', fontWeight:600, fontSize:'0.75rem', cursor:'pointer', marginLeft:8 }}>
                        <Download size={14}/> {t2('notebook.exportBtn')}
                    </button>
                </div>
            </div>

            {/* ── STAT CARDS ── */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, flexShrink:0 }}>
                {/* Win Rate */}
                <div className="glass-panel" style={{ borderRadius:12, padding:'24px', position:'relative', overflow:'hidden' }}>
                    <div style={{ position:'absolute', top:0, right:0, padding:16, opacity:0.06, fontSize:'4rem', lineHeight:1 }}>📈</div>
                    <div style={{ fontSize:'0.65rem', fontWeight:600, color:'#849495', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:16 }}>Win Rate</div>
                    <div style={{ fontSize:'2.8rem', fontWeight:700, color:'#e1e2eb', lineHeight:1, marginBottom:8 }}>{winRate}%</div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:'0.78rem' }}>
                        <span style={{ background:'rgba(78,222,163,0.1)', border:'1px solid rgba(78,222,163,0.2)', color:'#4edea3', padding:'2px 8px', borderRadius:999, display:'flex', alignItems:'center', gap:4 }}>
                            <TrendingUp size={12}/> +2.1%
                        </span>
                        <span style={{ color:'#849495' }}>{t2('notebook.vsLastMonth')}</span>
                    </div>
                </div>
                {/* Profit Factor */}
                <div className="glass-panel" style={{ borderRadius:12, padding:'24px', position:'relative', overflow:'hidden' }}>
                    <div style={{ position:'absolute', top:0, right:0, padding:16, opacity:0.06, fontSize:'4rem', lineHeight:1 }}>⚖️</div>
                    <div style={{ fontSize:'0.65rem', fontWeight:600, color:'#849495', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:16 }}>Profit Factor</div>
                    <div style={{ fontSize:'2.8rem', fontWeight:700, color:'#e1e2eb', lineHeight:1, marginBottom:8 }}>{profitFactor}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:'0.78rem' }}>
                        <span style={{ background:'rgba(0,219,231,0.08)', border:'1px solid rgba(0,219,231,0.2)', color:'#00dbe7', padding:'2px 8px', borderRadius:999, display:'flex', alignItems:'center', gap:4 }}>
                            ✓ {parseFloat(profitFactor) >= 2 ? t2('notebook.excellent') : parseFloat(profitFactor) >= 1.5 ? t2('notebook.good') : t2('notebook.developing')}
                        </span>
                        <span style={{ color:'#849495' }}>{t2('notebook.aiAssessment')}</span>
                    </div>
                </div>
                {/* Net Growth */}
                <div className="glass-panel" style={{ borderRadius:12, padding:'24px', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
                    <div>
                        <div style={{ fontSize:'0.65rem', fontWeight:600, color:'#849495', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:8 }}>Net Portfolio Growth</div>
                        <div style={{ fontSize:'1.8rem', fontWeight:600, color: netPnl >= 0 ? '#4edea3' : '#ffb4ab', lineHeight:1 }}>{fmtUsd(netPnl)}</div>
                    </div>
                    <svg viewBox="0 0 100 30" style={{ width:'100%', height:56, marginTop:12 }} preserveAspectRatio="none">
                        <defs>
                            <linearGradient id="nbGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#4edea3" stopOpacity="0.3"/>
                                <stop offset="100%" stopColor="#4edea3" stopOpacity="0"/>
                            </linearGradient>
                        </defs>
                        <path d="M0,25 C20,22 40,28 60,15 C80,2 100,5 100,5" fill="none" stroke="rgba(78,222,163,0.25)" strokeWidth="1.5" strokeDasharray="4,4"/>
                        <path d="M0,25 C20,20 40,25 60,10 C80,5 100,10 100,10" fill="none" stroke="#4edea3" strokeWidth="2"/>
                        <path d="M0,25 C20,20 40,25 60,10 C80,5 100,10 100,10 L100,30 L0,30 Z" fill="url(#nbGrad)"/>
                    </svg>
                </div>
            </div>

            {/* Search */}
            <div style={{ position:'relative', width:320, flexShrink:0 }}>
                <Search size={15} color="#849495" style={{ position:'absolute', top:'50%', left:14, transform:'translateY(-50%)', pointerEvents:'none' }}/>
                <input placeholder={t2('notebook.searchPlaceholder')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    style={{ width:'100%', boxSizing:'border-box', paddingLeft:40, padding:'10px 14px 10px 40px', background:'rgba(25,28,34,0.8)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, color:'#e1e2eb', fontSize:'0.88rem', outline:'none' }}/>
            </div>

            {/* ── SPLIT EKRAN: LİSTE VE DETAY ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 400px) 1fr', gap: 24, height: '700px' }}>
                
                {/* SOL PANEL: Timeline Feed */}
                <div className="aesthetic-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {t2('notebook.timeline')}
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1, padding: 8 }}>
                        {isLoading ? (
                            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>{t2('notebook.loading')}</div>
                        ) : processedTrades.length === 0 ? (
                            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <Target size={32} opacity={0.3} style={{ marginBottom: 12 }} />
                                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{t2('notebook.noResults')}</div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {processedTrades.map(t => {
                                    const isSelected = selected?.id === t.id;
                                    const isWon = t.pnl > 0;
                                    const isOpen = t.status === 'OPEN';
                                    return (
                                        <div key={t.id} onClick={() => setSelected(t)} style={{
                                            padding: '16px 18px', borderRadius: 12, cursor: 'pointer', transition: '0.2s',
                                            background: isSelected ? (isOpen ? 'rgba(0,219,231,0.15)' : (isWon ? 'rgba(78,222,163,0.1)' : 'rgba(239,68,68,0.1)')) : 'transparent',
                                            border: `1px solid ${isSelected ? (isOpen ? '#00dbe755' : (isWon ? '#4edea355' : '#ef444455')) : 'transparent'}`,
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                                    <div style={{ padding: 10, borderRadius: '50%', background: 'var(--bg-app)', display: 'flex', border: '1px solid var(--border)' }}>
                                                        {isOpen ? <Activity size={16} color="#00dbe7" /> : (isWon ? <TrendingUp size={16} color="#4edea3" /> : <TrendingDown size={16} color="#ef4444" />)}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>{t.symbol}</div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>{t.title || t2('notebook.unnamed')}</div>
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontWeight: 900, fontSize: '1rem', color: isOpen ? 'var(--text-main)' : (isWon ? '#4edea3' : '#ef4444') }}>
                                                        {isOpen ? t2('notebook.statusOpen') : fmtUsd(t.pnl)}
                                                    </div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                                        {t.date?.split('T')[0]}
                                                    </div>
                                                    {isOpen && (
                                                        <button
                                                            onClick={e => { e.stopPropagation(); setClosingTrade(t); }}
                                                            style={{
                                                                marginTop: 8,
                                                                padding: '4px 10px',
                                                                border: '1px solid rgba(239,68,68,0.4)',
                                                                borderRadius: 6, cursor: 'pointer',
                                                                background: 'rgba(239,68,68,0.08)',
                                                                color: '#ef4444', fontWeight: 700,
                                                                fontSize: '0.65rem', display: 'flex',
                                                                alignItems: 'center', gap: 4,
                                                                transition: '0.15s'
                                                            }}
                                                            onMouseOver={e => e.currentTarget.style.background = 'rgba(239,68,68,0.18)'}
                                                            onMouseOut={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                                                        >
                                                            <Lock size={10} /> {t2('common.close')}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* SAĞ PANEL: Rapor (Trade Report) */}
                <div className="aesthetic-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {selected ? (
                        <>
                            {/* Üst Kart (Hero) */}
                            <div className="fade-in" style={{ padding: '32px', borderBottom: '1px solid var(--border)', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                                <div style={{ position: 'absolute', inset: 0, opacity: 0.1, background: `linear-gradient(135deg, ${selected.status === 'OPEN' ? '#00dbe7' : (selected.pnl > 0 ? '#4edea3' : '#ef4444')}, transparent)` }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                            <span style={{ padding: '4px 10px', background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: 6, fontSize: '0.75rem', fontWeight: 800, color: selected.status === 'OPEN' ? '#00dbe7' : (selected.pnl > 0 ? '#4edea3' : '#ef4444') }}>
                                                {selected.status === 'OPEN' ? t2('notebook.activeTradeLabel') : t2('notebook.closedTradeLabel')}
                                            </span>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(selected.date).toLocaleString(i18n.language.startsWith('en') ? 'en-US' : 'tr-TR')}</span>
                                        </div>
                                        <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 900 }}>{selected.symbol}</h2>
                                        <p style={{ margin: '4px 0 0', fontSize: '0.95rem', color: 'var(--text-main)', opacity: 0.8 }}>{selected.title}</p>
                                        {selected.status === 'OPEN' && (
                                            <button
                                                onClick={() => setClosingTrade(selected)}
                                                style={{
                                                    marginTop: 14, padding: '9px 18px',
                                                    border: '1px solid rgba(239,68,68,0.4)',
                                                    borderRadius: 10, cursor: 'pointer',
                                                    background: 'rgba(239,68,68,0.1)',
                                                    color: '#ef4444', fontWeight: 800,
                                                    fontSize: '0.8rem', display: 'inline-flex',
                                                    alignItems: 'center', gap: 7, transition: '0.2s',
                                                    boxShadow: '0 2px 12px rgba(239,68,68,0.15)'
                                                }}
                                                onMouseOver={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                                                onMouseOut={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                                            >
                                                <Lock size={14} /> {t2('notebook.closeTradeAction')}
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{t2('notebook.netResult')}</div>
                                        <div style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1, color: selected.status === 'OPEN' ? 'var(--text-main)' : (selected.pnl > 0 ? '#4edea3' : '#ef4444') }}>
                                            {selected.status === 'OPEN' ? '...' : fmtUsd(selected.pnl)}
                                        </div>
                                    </div>
                                </div>
                                {/* İstatistik Paneli */}
                                <div style={{ display: 'flex', gap: 24, marginTop: 24, position: 'relative' }}>
                                    <div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>{t2('notebook.entryPrice')}</div>
                                        <div style={{ fontSize: '1rem', fontWeight: 900 }}>${selected.entry_price || '—'}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>{t2('notebook.exitPrice')}</div>
                                        <div style={{ fontSize: '1rem', fontWeight: 900 }}>${selected.exit_price || '—'}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Stop Loss</div>
                                        <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--danger)' }}>${selected.stop_loss || '—'}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>{t2('notebook.riskPctLabel')}</div>
                                        <div style={{ fontSize: '1rem', fontWeight: 900 }}>%{selected.risk_percentage || '—'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Sekmeler (Tabs) */}
                            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)' }}>
                                <button onClick={() => setActiveTab('NOTES')} style={{
                                    flex: 1, padding: '16px 0', border: 'none', background: 'transparent', cursor: 'pointer',
                                    fontWeight: 800, fontSize: '0.85rem', color: activeTab === 'NOTES' ? 'var(--text-main)' : 'var(--text-muted)',
                                    borderBottom: `2px solid ${activeTab === 'NOTES' ? '#00dbe7' : 'transparent'}`, transition: '0.2s'
                                }}>{t2('notebook.tabNotes')}</button>
                                <button onClick={() => setActiveTab('AI_MACRO')} style={{
                                    flex: 1, padding: '16px 0', border: 'none', background: 'transparent', cursor: 'pointer',
                                    fontWeight: 800, fontSize: '0.85rem', color: activeTab === 'AI_MACRO' ? 'var(--text-main)' : 'var(--text-muted)',
                                    borderBottom: `2px solid ${activeTab === 'AI_MACRO' ? '#8b5cf6' : 'transparent'}`, transition: '0.2s'
                                }}>{t2('notebook.tabAiMacro')}</button>
                            </div>

                            {/* Sekme İçerikleri */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
                                {activeTab === 'NOTES' && (
                                    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                        {/* ── AI OTOPSİ ROZET KARTI (localStorage'dan) ── */}
                                        {(() => {
                                            try {
                                                const rec = JSON.parse(localStorage.getItem(`wt_autopsy_${selected.id}`) || 'null');
                                                if (!rec) return null;
                                                return (
                                                    <div style={{
                                                        padding: '18px 22px', borderRadius: 16,
                                                        background: `linear-gradient(135deg, ${rec.color}12, rgba(0,0,0,0.3))`,
                                                        border: `1px solid ${rec.color}44`,
                                                        boxShadow: `0 0 24px ${rec.color}12`,
                                                        display: 'flex', flexDirection: 'column', gap: 10,
                                                    }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                                <Brain size={16} color={rec.color} />
                                                                <span style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: rec.color }}>
                                                                    {t2('autopsy.journalBadge')}
                                                                </span>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                <span style={{
                                                                    padding: '4px 12px', borderRadius: 20,
                                                                    background: `${rec.color}22`, border: `1px solid ${rec.color}55`,
                                                                    fontSize: '0.8rem', fontWeight: 900, color: rec.color,
                                                                }}>
                                                                    {rec.label}
                                                                </span>
                                                                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                                                    {new Date(rec.timestamp).toLocaleDateString(i18n.language.startsWith('en') ? 'en-US' : 'tr-TR')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.65, color: 'rgba(255,255,255,0.82)', fontWeight: 500 }}>
                                                            {rec.commentary}
                                                        </p>
                                                    </div>
                                                );
                                            } catch (_) { return null; }
                                        })()}

                                        {selected.screenshot && (
                                            <div style={{ position: 'relative', cursor: 'pointer', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }} onClick={() => setModalImage(selected.screenshot)}>
                                                <img src={selected.screenshot} alt="Trade Visual" style={{ width: '100%', display: 'block' }} />
                                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', opacity: 0, transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseOver={e => e.currentTarget.style.opacity = 1} onMouseOut={e => e.currentTarget.style.opacity = 0}>
                                                    <div style={{ padding: '10px 20px', background: 'rgba(0,0,0,0.7)', borderRadius: 20, fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 8 }}><ImageIcon size={16} /> Büyütmek için tıkla</div>
                                                </div>
                                            </div>
                                        )}
                                        
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                            <div style={{ padding: 20, background: 'var(--bg-app)', borderRadius: 16 }}>
                                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, color: 'var(--text-muted)' }}>
                                                    <Crosshair size={18} /> <span style={{ fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase' }}>{t2('notebook.strategyPref')}</span>
                                                </div>
                                                <div style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>{selected.strategy_note || <span style={{ opacity: 0.5 }}>{t2('notebook.noStrategyNote')}</span>}</div>
                                            </div>
                                            <div style={{ padding: 20, background: 'var(--bg-app)', borderRadius: 16 }}>
                                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, color: 'var(--danger)' }}>
                                                    <ShieldAlert size={18} /> <span style={{ fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase' }}>{t2('notebook.psychologyLabel')}</span>
                                                </div>
                                                <div style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>{selected.psychology_note || <span style={{ opacity: 0.5 }}>{t2('notebook.noPsychNote')}</span>}</div>
                                            </div>
                                        </div>

                                        {selected.close_note && (
                                            <div style={{ padding: 20, background: 'rgba(0,219,231,0.05)', border: '1px solid rgba(0,219,231,0.3)', borderRadius: 16 }}>
                                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, color: '#00dbe7' }}>
                                                    <Book size={18} /> <span style={{ fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase' }}>{t2('notebook.closeReport')}</span>
                                                </div>
                                                <div style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>{selected.close_note}</div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'AI_MACRO' && (
                                    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                        {/* AI Koç Geribildirimi */}
                                        <div style={{ padding: 24, background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(139,92,246,0.02))', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 16 }}>
                                            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, borderBottom: '1px solid rgba(139,92,246,0.2)', paddingBottom: 16 }}>
                                                <div style={{ padding: 10, background: 'rgba(139,92,246,0.2)', borderRadius: 12, color: '#8b5cf6' }}><Brain size={20} /></div>
                                                <div>
                                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#8b5cf6' }}>{t2('notebook.aiCoachAnalysis')}</h3>
                                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t2('notebook.aiCoachSubtitle')}</p>
                                                </div>
                                            </div>
                                            <div style={{ whiteSpace: 'pre-line', lineHeight: 1.7, fontSize: '0.9rem' }}>
                                                {selected.ai_feedback || <span style={{ opacity: 0.5, fontStyle: 'italic' }}>{t2('notebook.noAiReport')}</span>}
                                            </div>
                                        </div>

                                        {/* Makro Veriler */}
                                        <div style={{ padding: 24, background: 'var(--bg-app)', borderRadius: 16 }}>
                                            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
                                                <CalendarDays size={20} color="#eab308" />
                                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>{t2('notebook.macroEvents')}</h3>
                                            </div>
                                            {selected.macro_events && (typeof selected.macro_events === 'string' ? JSON.parse(selected.macro_events) : selected.macro_events).length > 0 ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                    {(typeof selected.macro_events === 'string' ? JSON.parse(selected.macro_events) : selected.macro_events).map((event, i) => (
                                                        <div key={i} style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderLeft: '3px solid #eab308', borderRadius: 8 }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                                                <strong style={{ fontSize: '0.85rem' }}>{event.event} <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>({event.currency})</span></strong>
                                                                <span style={{ fontSize: '0.7rem', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 10 }}>{event.time}</span>
                                                            </div>
                                                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{event.ai}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', opacity: 0.7 }}>{t2('notebook.noMacroEvents')}</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center' }}>
                            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, border: '1px solid var(--border)' }}>
                                <Book size={32} opacity={0.35} />
                            </div>
                            <h3 style={{ margin: 0, color: 'var(--text-main)', marginBottom: 8, fontSize: '1.2rem' }}>{t2('notebook.tradeDetails')}</h3>
                            <p style={{ margin: 0, fontSize: '0.85rem', maxWidth: 220 }}>{t2('notebook.detailsHelp')}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Notebook;
