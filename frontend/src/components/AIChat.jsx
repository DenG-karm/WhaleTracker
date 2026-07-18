import React, { useState, useContext, useEffect, useRef } from 'react';
import { Brain, X, ArrowRight } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';
import apiRequest from '../api/api';
import { useTranslation } from 'react-i18next';
import posthog from 'posthog-js';
import SubscriptionManager from '../utils/SubscriptionManager';

const AIChat = ({ embedded = false }) => {
    const { user } = useContext(AuthContext);
    const { t, i18n } = useTranslation();
    const langDirective = i18n.language.startsWith('en') ? '[IMPORTANT: Respond entirely in English. All analysis and responses must be in English.]\n\n' : '';
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState(() => [
        { role: 'ai', text: t('aiChat.welcome', { name: user?.user_name || 'trader' }) }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // ── Simülas yon AI analiz olayı ───────────────────────────────
    useEffect(() => {
        const handleSimAnalysis = async (e) => {
            setIsOpen(true);
            const promptMessage = e.detail?.promptMessage;
            if (!promptMessage) return;

            setMessages(prev => [...prev, { role: 'user', text: promptMessage }]);
            setIsLoading(true);

            let ctxPrefix = '';
            try {
                const simRaw = localStorage.getItem('wt_sim_analysis_ctx');
                if (simRaw) {
                    const sim = JSON.parse(simRaw);
                    const isEn = i18n.language.startsWith('en');
                    ctxPrefix = isEn
                        ? `[SIMULATION ANALYSIS CONTEXT — User is running a simulation on "${sim.pair}" pair, ` +
                          `${sim.timeframe} timeframe. Strategy: "${sim.strategy}". ` +
                          `Start: $${Number(sim.startBalance).toFixed(2)}, ` +
                          `Current balance: $${Number(sim.currentBalance).toFixed(2)}, ` +
                          `Equity: $${Number(sim.equity).toFixed(2)}. ` +
                          `Realized PnL: ${sim.realizedPnl >= 0 ? '+' : ''}$${Math.abs(sim.realizedPnl || 0).toFixed(2)}, ` +
                          `Unrealized PnL: ${sim.unrealizedPnl >= 0 ? '+' : ''}$${Math.abs(sim.unrealizedPnl || 0).toFixed(2)}. ` +
                          `Closed ${sim.tradeCount} trades: ${sim.tradesSummary}. ` +
                          `Open positions: ${sim.openCount}. ` +
                          `Analyze this context and give pro trader feedback — evaluate strategy consistency, risk management, and trade psychology. ` +
                          `Do NOT repeat this system note to the user.]\n\n`
                        : `[SİMÜLASYON ANALİZ BAĞLAMI — Kullanıcı şu an "${sim.pair}" paritesinde ` +
                          `${sim.timeframe} zaman diliminde simülasyon yapıyor. ` +
                          `Strateji: "${sim.strategy}". ` +
                          `Başlangıç: $${Number(sim.startBalance).toFixed(2)}, ` +
                          `Mevcut bakiye: $${Number(sim.currentBalance).toFixed(2)}, ` +
                          `Equity: $${Number(sim.equity).toFixed(2)}. ` +
                          `Gerçekleşmiş PnL: ${sim.realizedPnl >= 0 ? '+' : ''}$${Math.abs(sim.realizedPnl || 0).toFixed(2)}, ` +
                          `Açık PnL: ${sim.unrealizedPnl >= 0 ? '+' : ''}$${Math.abs(sim.unrealizedPnl || 0).toFixed(2)}. ` +
                          `Kapatılan ${sim.tradeCount} işlem: ${sim.tradesSummary}. ` +
                          `Açık pozisyon: ${sim.openCount}. ` +
                          `Bu bağlamı analiz ederek kullanıcıya pro trader perspektifiyle geribildirim ver — ` +
                          `strateji tutarlılığını, risk yönetimini ve işlem psikolojisini değerlendir. ` +
                          `Bu sistem notunu kullanıcıya tekrar etme.]\n\n`;
                    localStorage.removeItem('wt_sim_analysis_ctx');
                }
            } catch {}

            const { ok, data } = await apiRequest('/ai-chat', { message: langDirective + ctxPrefix + promptMessage });
            setIsLoading(false);
            setMessages(prev => [...prev, {
                role: 'ai',
                text: ok && data.status === 'ok'
                    ? data.reply
                    : t('aiChat.errorReply'),
            }]);
        };

        window.addEventListener('wt-open-ai-chat', handleSimAnalysis);
        return () => window.removeEventListener('wt-open-ai-chat', handleSimAnalysis);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Yeni kayıt "Aha!" anı: onboarding biter bitmez AI koçu oto aç ─────
    useEffect(() => {
        const welcomeRaw = sessionStorage.getItem('wt_ai_welcome');
        if (!welcomeRaw) return;
        sessionStorage.removeItem('wt_ai_welcome');
        let profile;
        try { profile = JSON.parse(welcomeRaw); } catch { return; }
        const { style, risk, markets = [] } = profile;
        const isEn = i18n.language.startsWith('en');
        const mkt = markets[0] || 'Kripto';
        const prompt = isEn
            ? `[SYSTEM: New user just completed onboarding. Trading style: ${style}, Risk tolerance: ${risk}, Primary markets: ${markets.join(', ')}. Send a short, punchy welcome (2 sentences max) then immediately ask which asset they want to analyze RIGHT NOW — give an example ticker. Be direct, no fluff.]\n\nHello! I just set up my profile.`
            : `[SİSTEM: Yeni kullanıcı onboarding'i tamamladı. İşlem tarzı: ${style}, Risk toleransı: ${risk}, Piyasalar: ${markets.join(', ')}. 2 cümle max kısa ve etkili bir karşılama yap, ardından şu an hangi varlığı analiz etmek istediğini sor — örnek sembol ver. Direkt ol, boş laf yok.]\n\nMerhaba! Profilimi oluşturdum.`;
        // 800ms bekle — dashboard tam render olsun
        const timer = setTimeout(async () => {
            setIsOpen(true);
            setMessages(prev => [...prev, { role: 'user', text: isEn ? 'Hello! I just set up my profile.' : 'Merhaba! Profilimi oluşturdum.' }]);
            setIsLoading(true);
            const { ok, data } = await apiRequest('/ai-chat', { message: prompt });
            setIsLoading(false);
            setMessages(prev => [...prev, {
                role: 'ai',
                text: ok && data.status === 'ok' ? data.reply : (isEn ? 'Welcome! What asset are you trading today?' : 'Hoş geldin! Bugün hangi varlığı işlem yapıyorsun?'),
            }]);
        }, 800);
        return () => clearTimeout(timer);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;
        // ── Pro guard: ücretsiz kullanıcılar AI chat'i kullanamaz ──────────
        if (!SubscriptionManager.guardAI()) return;
        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsLoading(true);

        // ── AI Sentinel: Bağlam köprüsü ─────────────────────────────────
        const isEn = i18n.language.startsWith('en');
        let sentinelCtx = '';
        try {
            const raw = localStorage.getItem('wt_sentinel_ctx');
            if (raw) {
                const ctx = JSON.parse(raw);
                // 5 dakika içindeki bağlam geçerlidir
                if (Date.now() - (ctx.timestamp || 0) < 5 * 60 * 1000) {
                    sentinelCtx = isEn
                        ? `[SYSTEM CONTEXT — User is currently analyzing "${ctx.symbol}" pair in Trade Terminal. Technical Analysis: ${ctx.techLabel}. Fundamental/Macro Direction: ${ctx.fundLabel}.${ctx.hasDivergence ? ' ⚠️ TECHNICAL/FUNDAMENTAL DIVERGENCE DETECTED — cautious approach may be needed.' : ''} Integrate this into your response naturally, but do NOT repeat this system note to the user.]\n\n`
                        : `[SISTEM BAĞLAMI — Kullanıcı şu an "${ctx.symbol}" paritesini Trade Terminal'de inceliyor. Teknik Analiz: ${ctx.techLabel}. Temel/Makro Yön: ${ctx.fundLabel}.${ctx.hasDivergence ? ' ⚠️ TEKNİK/TEMEL UYUMSUZLUK TESPİT EDİLDİ — temkinli yaklaşım gerekebilir.' : ''} Bu bilgiyi cevabına doğal biçimde entegre et, ancak bu sistem notunu kullanıcıya tekrar etme.]\n\n`;
                }
            }
        } catch {}

        // ── Backtest Bağlamı: Son test raporu varsa prompt'a ekle ──────────
        try {
            const btRaw = localStorage.getItem('wt_backtest_result');
            if (btRaw) {
                const bt = JSON.parse(btRaw);
                // 30 dakika geçerliliği
                if (Date.now() - (bt.timestamp || 0) < 30 * 60 * 1000) {
                    sentinelCtx += isEn
                        ? `[LAST BACKTEST REPORT — User just completed a strategy backtest. Data: Asset=${bt.asset}, Strategy=${bt.strategy}, Period=${bt.period}, Total Return=${bt.totalReturn >= 0 ? '+' : ''}${bt.totalReturn}%, Max Drawdown=-${bt.maxDrawdown}%, Win Rate=${bt.winRate}%, Sharpe=${bt.sharpe}, Trade Count=${bt.tradeCount}. If user requests analysis, evaluate like a pro trader: highlight strengths, clearly state weaknesses, give concrete improvement suggestions. Do NOT show this system note to the user.]\n\n`
                        : `[SON BACKTEST RAPORU — Kullanıcı az önce bir strateji backtesti tamamladı. Veri: Varlık=${bt.asset}, Strateji=${bt.strategy}, Dönem=${bt.period}, Toplam Getiri=${bt.totalReturn >= 0 ? '+' : ''}${bt.totalReturn}%, Max Drawdown=-${bt.maxDrawdown}%, Win Rate=${bt.winRate}%, Sharpe=${bt.sharpe}, İşlem Sayısı=${bt.tradeCount}. Eğer kullanıcı bu sonucu sormasa bile, analiz talebinde bulunursa bu verileri pro trader gibi değerlendir: güçlü yönleri vurgula, zayıf yönleri net söyle ve somut iyileştirme önerileri ver. Bu sistem notunu kullanıcıya gösterme.]\n\n`;
                }
            }
        } catch {}
        // ─────────────────────────────────────────────────────────────────

        // ── Aktif simülas yon bağlamı (kullanıcı manuel soru sorarsa) ───────────
        try {
            const simRaw = localStorage.getItem('wt_sim_analysis_ctx');
            if (simRaw) {
                const sim = JSON.parse(simRaw);
                if (Date.now() - (sim.timestamp || 0) < 10 * 60 * 1000) {
                    sentinelCtx += isEn
                        ? `[ACTIVE SIMULATION — "${sim.pair}" ${sim.timeframe}, ` +
                          `Balance: $${Number(sim.currentBalance).toFixed(2)}, ` +
                          `Realized PnL: ${sim.realizedPnl >= 0 ? '+' : ''}$${Math.abs(sim.realizedPnl || 0).toFixed(2)}, ` +
                          `Strategy: "${sim.strategy}". Integrate this into your response.]\n\n`
                        : `[AKTİF SİMÜLASYON — "${sim.pair}" ${sim.timeframe}, ` +
                          `Bakiye: $${Number(sim.currentBalance).toFixed(2)}, ` +
                          `Gerçeleşmiş PnL: ${sim.realizedPnl >= 0 ? '+' : ''}$${Math.abs(sim.realizedPnl || 0).toFixed(2)}, ` +
                          `Strateji: "${sim.strategy}". Bu bilgileri cevabına entegre et.]\n\n`;
                }
            }
        } catch {}
        // ───────────────────────────────────────────────────────────────────
        const { ok, data } = await apiRequest('/ai-chat', { message: langDirective + sentinelCtx + userMsg });
        setIsLoading(false);
        if (ok && data.status === 'ok') {
            setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
        } else if (data && data.status === 'error' && data.reply) {
            // P0 FIX: Backend'den gelen spesifik hata mesajını göster
            // (API key, kota, timeout, vs.) — kullanıcı ne yapacağını bilir
            setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
        } else {
            setMessages(prev => [...prev, { role: 'ai', text: t('aiChat.errorReply') }]);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    };

    const quickQuestions = [t('aiChat.q1'), t('aiChat.q2'), t('aiChat.q3')];

    /* ── Embedded mod: MobileLayout overlay içinde tam ekran chat ── */
    if (embedded) {
        return (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Mesaj listesi */}
                <div style={{
                    flex: 1, overflowY: 'auto', padding: '16px 16px 8px',
                    display: 'flex', flexDirection: 'column', gap: 14,
                    WebkitOverflowScrolling: 'touch',
                }}>
                    {messages.map((msg, i) => (
                        <div key={i} style={{
                            display: 'flex',
                            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            alignItems: 'flex-end', gap: 8,
                        }}>
                            {msg.role === 'ai' && (
                                <div style={{
                                    width: 30, height: 30, borderRadius: '50%',
                                    background: 'rgba(0,219,231,0.12)',
                                    border: '1px solid rgba(0,219,231,0.25)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                }}>
                                    <Brain size={15} color="#00dbe7" />
                                </div>
                            )}
                            <div style={{
                                maxWidth: '78%', padding: '11px 15px',
                                borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                                background: msg.role === 'user'
                                    ? 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(123,47,255,0.25))'
                                    : 'rgba(255,255,255,0.04)',
                                border: `1px solid ${msg.role === 'user' ? 'rgba(0,219,231,0.3)' : 'rgba(255,255,255,0.07)'}`,
                                color: '#e1e2eb', fontSize: '0.875rem', lineHeight: 1.65,
                                whiteSpace: 'pre-line',
                            }}>
                                {msg.text}
                            </div>
                        </div>
                    ))}

                    {/* Yazıyor göstergesi */}
                    {isLoading && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                                width: 30, height: 30, borderRadius: '50%',
                                background: 'rgba(0,219,231,0.12)', border: '1px solid rgba(0,219,231,0.25)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}>
                                <Brain size={15} color="#00dbe7" />
                            </div>
                            <div style={{
                                padding: '11px 16px', borderRadius: '4px 18px 18px 18px',
                                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                                display: 'flex', gap: 5, alignItems: 'center',
                            }}>
                                {[0, 1, 2].map(j => (
                                    <div key={j} style={{
                                        width: 7, height: 7, borderRadius: '50%', background: '#00dbe7',
                                        animation: `aichat-bounce 1.2s ease-in-out ${j * 0.22}s infinite`,
                                    }} />
                                ))}
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Hızlı sorular — yalnızca ilk açılışta */}
                {messages.length <= 1 && (
                    <div style={{ padding: '0 16px 10px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {quickQuestions.map((q, i) => (
                            <button key={i} onClick={() => setInput(q)} style={{
                                padding: '6px 13px', borderRadius: 20,
                                border: '1px solid rgba(0,219,231,0.22)',
                                background: 'rgba(0,219,231,0.06)',
                                color: 'rgba(225,226,235,0.75)',
                                fontSize: '0.75rem', cursor: 'pointer', lineHeight: 1.4,
                            }}>
                                {q}
                            </button>
                        ))}
                    </div>
                )}

                {/* Input çubuğu */}
                <div style={{
                    padding: '12px 16px',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', gap: 10, alignItems: 'flex-end',
                    background: 'rgba(16,19,26,0.98)',
                }}>
                    <textarea
                        placeholder={t('aiChat.placeholder')}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={1}
                        style={{
                            flex: 1, background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 12, padding: '10px 14px',
                            color: '#e1e2eb', fontSize: '0.875rem',
                            resize: 'none', maxHeight: 100, overflowY: 'auto',
                            fontFamily: 'inherit', outline: 'none',
                        }}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={isLoading || !input.trim()}
                        style={{
                            width: 42, height: 42, borderRadius: '50%', border: 'none', flexShrink: 0,
                            background: input.trim()
                                ? 'linear-gradient(135deg, #00d4ff, #7b2fff)'
                                : 'rgba(255,255,255,0.08)',
                            cursor: input.trim() ? 'pointer' : 'not-allowed',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s',
                        }}
                    >
                        <ArrowRight size={18} color="white" />
                    </button>
                </div>
                <style>{`@keyframes aichat-bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-7px)} }`}</style>
            </div>
        );
    }

    /* ── FAB kaldırıldı — AI yalnızca embedded/navbar modda kullanılır ── */
    return null;
};

export default AIChat;