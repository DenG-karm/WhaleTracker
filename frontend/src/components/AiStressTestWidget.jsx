import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Zap, Activity, ShieldAlert, Cpu } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import ProBlurWrapper from './common/ProBlurWrapper';

const AiStressTestWidget = () => {
    const [scenario, setScenario] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, result
    const [codeLines, setCodeLines] = useState([]);
    const { t } = useTranslation();

    // Simülasyon başlattığında çalışacak matrix/code flow
    useEffect(() => {
        if (status === 'loading') {
            const lines = [
                "INITIALIZING NEURAL ENGINE...",
                "LOADING PORTFOLIO SNAPSHOT...",
                "APPLYING MACRO SHOCK VECTORS...",
                "CALCULATING LIQUIDATION CASCADES...",
                "ESTIMATING MARGIN CALL PROBABILITIES...",
                "SYNTHESIZING IMPACT ANALYSIS...",
            ];
            let currentLine = 0;
            const interval = setInterval(() => {
                setCodeLines(prev => [...prev, lines[currentLine]]);
                currentLine++;
                if (currentLine >= lines.length) clearInterval(interval);
            }, 300);

            const timeout = setTimeout(() => {
                setStatus('result');
            }, 2800);

            return () => {
                clearInterval(interval);
                clearTimeout(timeout);
            };
        } else {
            setCodeLines([]);
        }
    }, [status]);

    const handleSimulate = () => {
        if (!scenario.trim()) return;
        setStatus('loading');
    };

    const handleReset = () => {
        setStatus('idle');
        setScenario('');
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px', position: 'relative', overflowY: 'auto', overflowX: 'hidden' }}>
            
            {/* Arka plan siber grid (kırmızı tonlu) */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
                backgroundImage: 'linear-gradient(rgba(239, 68, 68, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(239, 68, 68, 0.03) 1px, transparent 1px)',
                backgroundSize: '30px 30px',
            }} />

            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                
                {/* 1. KULLANICI GİRİŞİ (Senaryo Motoru) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ position: 'relative' }}>
                        <Zap size={14} color="#f97316" style={{ position: 'absolute', left: '12px', top: '14px', opacity: 0.8 }} />
                        <input
                            value={scenario}
                            onChange={(e) => setScenario(e.target.value)}
                            disabled={status !== 'idle'}
                            placeholder={t('stress.placeholder')}
                            style={{
                                width: '100%', padding: '12px 12px 12px 36px',
                                background: 'rgba(0,0,0,0.4)',
                                border: '1px solid rgba(249, 115, 22, 0.3)',
                                borderRadius: '8px', color: '#fff', fontSize: '0.8rem',
                                outline: 'none', transition: 'all 0.2s ease',
                                boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)',
                                opacity: status !== 'idle' ? 0.5 : 1
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'rgba(249, 115, 22, 0.8)'}
                            onBlur={(e) => e.target.style.borderColor = 'rgba(249, 115, 22, 0.3)'}
                            onKeyDown={(e) => e.key === 'Enter' && handleSimulate()}
                        />
                    </div>
                    
                    {status === 'idle' && (
                        <button
                            onClick={handleSimulate}
                            style={{
                                width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
                                background: 'linear-gradient(90deg, rgba(220, 38, 38, 0.8) 0%, rgba(249, 115, 22, 0.8) 100%)',
                                color: '#fff', fontWeight: 900, fontSize: '0.85rem', letterSpacing: '0.05em',
                                cursor: 'pointer', transition: 'all 0.2s',
                                boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4), inset 0 0 10px rgba(255,255,255,0.2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                textTransform: 'uppercase'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 6px 25px rgba(239, 68, 68, 0.6), inset 0 0 10px rgba(255,255,255,0.4)'}
                            onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 4px 20px rgba(239, 68, 68, 0.4), inset 0 0 10px rgba(255,255,255,0.2)'}
                        >
                            <AlertTriangle size={16} /> {t('stress.simulateBtn')}
                        </button>
                    )}
                </div>

                <AnimatePresence mode="wait">
                    {/* 2. SİMÜLASYON ANİMASYONU (Loading) */}
                    {status === 'loading' && (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '20px' }}
                        >
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px dashed #f97316', borderTopColor: 'transparent', borderBottomColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <Cpu size={24} color="#f97316" />
                            </motion.div>
                            
                            <div style={{ width: '100%', background: 'rgba(0,0,0,0.5)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(249, 115, 22, 0.2)', minHeight: '140px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ fontSize: '0.7rem', color: '#f97316', fontWeight: 800, marginBottom: '8px', letterSpacing: '0.1em' }}>{t('stress.synthesizing')}</div>
                                {codeLines.map((line, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)' }}
                                    >
                                        > {line}
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* 3. SONUÇ PANELİ (Hasar Raporu) */}
                    {status === 'result' && (
                        <motion.div
                            key="result"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}
                        >
                            <div style={{ textAlign: 'center', padding: '16px', background: 'radial-gradient(ellipse at center, rgba(239, 68, 68, 0.15) 0%, transparent 80%)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>{t('stress.portfolioImpact')}</div>
                                <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#ef4444', textShadow: '0 0 20px rgba(239, 68, 68, 0.6)' }}>
                                    -$4,500 <span style={{ fontSize: '1.2rem', opacity: 0.8 }}>(%-18)</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ fontSize: '0.7rem', color: '#f97316', fontWeight: 800, letterSpacing: '0.1em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Activity size={12} /> {t('stress.riskRadar')}
                                </div>
                                
                                {/* Progress Bar 1 */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>
                                        <span>{t('stress.liquidationRisk')}</span>
                                        <span style={{ color: '#ef4444', fontWeight: 800 }}>{t('stress.critical')}</span>
                                    </div>
                                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                        <motion.div initial={{ width: 0 }} animate={{ width: '92%' }} transition={{ duration: 1, delay: 0.1 }} style={{ height: '100%', background: '#ef4444', boxShadow: '0 0 10px #ef4444' }} />
                                    </div>
                                </div>

                                {/* Progress Bar 2 */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>
                                        <span>{t('stress.marginCallProbability')}</span>
                                        <span style={{ color: '#f97316', fontWeight: 800 }}>85%</span>
                                    </div>
                                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                        <motion.div initial={{ width: 0 }} animate={{ width: '85%' }} transition={{ duration: 1, delay: 0.3 }} style={{ height: '100%', background: '#f97316', boxShadow: '0 0 10px #f97316' }} />
                                    </div>
                                </div>

                                {/* Progress Bar 3 */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>
                                        <span>{t('stress.sentimentScore')}</span>
                                        <span style={{ color: '#f43f5e', fontWeight: 800 }}>{t('stress.extremeBearish')}</span>
                                    </div>
                                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                        <motion.div initial={{ width: 0 }} animate={{ width: '95%' }} transition={{ duration: 1, delay: 0.5 }} style={{ height: '100%', background: 'linear-gradient(90deg, #ef4444, #f43f5e)', boxShadow: '0 0 10px #f43f5e' }} />
                                    </div>
                                </div>
                            </div>

                            {/* AI Tavsiyesi */}
                            <div style={{ padding: '14px', background: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.3)', borderRadius: '12px', display: 'flex', gap: '12px' }}>
                                <ShieldAlert size={20} color="#f97316" style={{ flexShrink: 0, marginTop: '2px' }} />
                                <div>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#f97316', letterSpacing: '0.05em', marginBottom: '6px' }}>{t('stress.autonomousAdvice')}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
                                        <Trans i18nKey="stress.adviceText" components={{ highlight: <span style={{ color: '#4edea3', fontWeight: 800 }} /> }} />
                                    </div>
                                </div>
                            </div>

                            <button onClick={handleReset} style={{ marginTop: 'auto', background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', padding: '8px', borderRadius: '6px', fontSize: '0.7rem', cursor: 'pointer', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}>
                                {t('stress.newScenario')}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

const WrappedAiStressTestWidget = () => (
    <ProBlurWrapper label="Unlock AI Insights">
        <AiStressTestWidget />
    </ProBlurWrapper>
);

export default WrappedAiStressTestWidget;
