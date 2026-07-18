import React, { useRef, useEffect } from 'react';
import { Brain, X, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAiChat } from '../contexts/AiChatContext';

// ─── Typing animation ────────────────────────────────────────────────────────
const TypingIndicator = () => (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <div style={{
            width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(0,219,231,0.18), rgba(123,47,255,0.18))',
            border: '1px solid rgba(0,219,231,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <Brain size={11} color="#00dbe7" />
        </div>
        <div style={{
            padding: '9px 13px', borderRadius: '4px 14px 14px 14px',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', gap: 5, alignItems: 'center',
        }}>
            {[0, 0.18, 0.36].map((delay, i) => (
                <div key={i} style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: '#00dbe7', opacity: 0.5,
                    animation: `wt-ai-dot 1.2s ${delay}s ease-in-out infinite`,
                }} />
            ))}
        </div>
    </div>
);

// ─── Single message bubble ───────────────────────────────────────────────────
const MsgBubble = ({ msg }) => (
    <div style={{
        display: 'flex',
        gap: 8,
        alignItems: 'flex-start',
        flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
    }}>
        {msg.role === 'ai' && (
            <div style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, rgba(0,219,231,0.18), rgba(123,47,255,0.18))',
                border: '1px solid rgba(0,219,231,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginTop: 1,
            }}>
                <Brain size={11} color="#00dbe7" />
            </div>
        )}
        <div style={{
            maxWidth: '82%',
            padding: '9px 13px',
            fontSize: '0.82rem',
            lineHeight: 1.6,
            borderRadius: msg.role === 'user' ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            background: msg.role === 'user'
                ? 'rgba(0,219,231,0.12)'
                : 'rgba(255,255,255,0.05)',
            border: msg.role === 'user'
                ? '1px solid rgba(0,219,231,0.2)'
                : '1px solid rgba(255,255,255,0.08)',
            color: '#e1e2eb',
        }}>
            {msg.text}
        </div>
    </div>
);

// ─── Widget ──────────────────────────────────────────────────────────────────
export default function AiChatWidget() {
    const { t } = useTranslation();
    const {
        messages, input, setInput, isLoading,
        sendMessage, handleKeyDown,
        isDrawerOpen, setIsDrawerOpen,
        isWidgetVisible, setIsWidgetVisible,
        messagesEndRef, quickQuestions,
    } = useAiChat();

    const textareaRef = useRef(null);

    useEffect(() => {
        if (isDrawerOpen) textareaRef.current?.focus();
    }, [isDrawerOpen]);

    if (!isWidgetVisible) return null;

    return (
        <>
            {/* ── FAB bubble ── */}
            <AnimatePresence>
                {!isDrawerOpen && (
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        style={{
                            position: 'fixed', bottom: 24, right: 24,
                            zIndex: 998, display: 'flex', flexDirection: 'column',
                            alignItems: 'flex-end', gap: 6,
                        }}
                    >
                        {/* Dismiss */}
                        <button
                            onClick={() => setIsWidgetVisible(false)}
                            title={t('aiChat.hide', 'Gizle')}
                            style={{
                                width: 20, height: 20, borderRadius: '50%',
                                background: 'rgba(30,35,50,0.9)',
                                border: '1px solid rgba(255,255,255,0.12)',
                                color: '#849495', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(60,65,80,0.95)'; e.currentTarget.style.color = '#e1e2eb'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(30,35,50,0.9)'; e.currentTarget.style.color = '#849495'; }}
                        >
                            <X size={9} />
                        </button>

                        {/* Main bubble */}
                        <button
                            onClick={() => setIsDrawerOpen(true)}
                            title={t('aiChat.title', 'AI Asistan')}
                            style={{
                                width: 50, height: 50, borderRadius: '50%',
                                background: 'linear-gradient(135deg, #00dbe7, #7b2fff)',
                                border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 24px rgba(0,219,231,0.4), 0 0 0 1px rgba(0,219,231,0.15)',
                                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 6px 32px rgba(0,219,231,0.55), 0 0 0 1px rgba(0,219,231,0.25)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,219,231,0.4), 0 0 0 1px rgba(0,219,231,0.15)'; }}
                        >
                            <Brain size={22} color="white" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Drawer ── */}
            <AnimatePresence>
                {isDrawerOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            onClick={() => setIsDrawerOpen(false)}
                            style={{
                                position: 'fixed', inset: 0, zIndex: 1000,
                                background: 'rgba(0,0,0,0.3)',
                                backdropFilter: 'blur(3px)',
                                WebkitBackdropFilter: 'blur(3px)',
                            }}
                        />

                        {/* Panel */}
                        <motion.div
                            initial={{ x: 420, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 420, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                            style={{
                                position: 'fixed', top: 0, right: 0, bottom: 0, width: 400,
                                zIndex: 1001, display: 'flex', flexDirection: 'column',
                                background: 'rgba(11,14,20,0.98)',
                                backdropFilter: 'blur(24px)',
                                WebkitBackdropFilter: 'blur(24px)',
                                borderLeft: '1px solid rgba(0,219,231,0.18)',
                                boxShadow: '-8px 0 48px rgba(0,0,0,0.5)',
                            }}
                        >
                            {/* Header */}
                            <div style={{
                                padding: '14px 18px',
                                borderBottom: '1px solid rgba(255,255,255,0.07)',
                                display: 'flex', alignItems: 'center', gap: 10,
                                flexShrink: 0,
                                background: 'linear-gradient(135deg, rgba(0,219,231,0.05), transparent)',
                            }}>
                                <div style={{
                                    width: 34, height: 34, borderRadius: '50%',
                                    background: 'linear-gradient(135deg, rgba(0,219,231,0.18), rgba(123,47,255,0.18))',
                                    border: '1px solid rgba(0,219,231,0.3)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Brain size={16} color="#00dbe7" />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#e1e2eb' }}>
                                        {t('aiChat.title', 'AI Asistan')}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: '#4edea3', display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4edea3', animation: 'wt-ai-live 2s infinite' }} />
                                        {t('aiChat.subtitle', 'Finansal analiz · Strateji · Risk')}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsDrawerOpen(false)}
                                    style={{
                                        marginLeft: 'auto',
                                        background: 'rgba(255,255,255,0.06)',
                                        border: '1px solid rgba(255,255,255,0.09)',
                                        color: '#849495', width: 30, height: 30,
                                        borderRadius: 8, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        transition: 'all 0.15s',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#e1e2eb'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#849495'; }}
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            {/* Messages */}
                            <div style={{
                                flex: 1, overflowY: 'auto',
                                padding: '14px 14px 8px',
                                display: 'flex', flexDirection: 'column', gap: 12,
                            }}>
                                {messages.map((msg, i) => <MsgBubble key={i} msg={msg} />)}
                                {isLoading && <TypingIndicator />}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Quick questions */}
                            {messages.length <= 1 && !isLoading && (
                                <div style={{
                                    padding: '6px 14px 8px',
                                    display: 'flex', gap: 6, flexWrap: 'wrap',
                                    borderTop: '1px solid rgba(255,255,255,0.05)',
                                }}>
                                    {quickQuestions.map(q => (
                                        <button
                                            key={q}
                                            onClick={() => sendMessage(q)}
                                            style={{
                                                padding: '4px 10px',
                                                border: '1px solid rgba(0,219,231,0.18)',
                                                borderRadius: 10,
                                                background: 'rgba(0,219,231,0.05)',
                                                color: '#94a3b8',
                                                fontSize: '0.65rem', fontWeight: 600,
                                                cursor: 'pointer', transition: 'all 0.15s',
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,219,231,0.4)'; e.currentTarget.style.color = '#00dbe7'; }}
                                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,219,231,0.18)'; e.currentTarget.style.color = '#94a3b8'; }}
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Input area */}
                            <div style={{
                                padding: '10px 14px 14px',
                                borderTop: '1px solid rgba(255,255,255,0.07)',
                                display: 'flex', gap: 10, alignItems: 'flex-end',
                                flexShrink: 0,
                            }}>
                                <textarea
                                    ref={textareaRef}
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={t('aiChat.placeholder', 'Bir şey sor...')}
                                    disabled={isLoading}
                                    rows={1}
                                    style={{
                                        flex: 1, resize: 'none',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.09)',
                                        borderRadius: 12, padding: '9px 12px',
                                        color: '#e1e2eb', fontSize: '0.83rem',
                                        lineHeight: 1.5, outline: 'none',
                                        fontFamily: 'inherit',
                                        maxHeight: 120, overflowY: 'auto',
                                        transition: 'border-color 0.15s',
                                    }}
                                    onFocus={e => { e.target.style.borderColor = 'rgba(0,219,231,0.4)'; }}
                                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; }}
                                />
                                <button
                                    onClick={() => sendMessage()}
                                    disabled={!input.trim() || isLoading}
                                    style={{
                                        width: 38, height: 38, flexShrink: 0,
                                        borderRadius: 10,
                                        background: input.trim() && !isLoading
                                            ? 'linear-gradient(135deg, #00dbe7, #7b2fff)'
                                            : 'rgba(255,255,255,0.07)',
                                        border: 'none',
                                        cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: input.trim() && !isLoading ? 'white' : '#556',
                                        transition: 'all 0.15s',
                                        boxShadow: input.trim() && !isLoading
                                            ? '0 2px 12px rgba(0,219,231,0.3)' : 'none',
                                    }}
                                >
                                    <ArrowRight size={17} />
                                </button>
                            </div>

                            <style>{`
                                @keyframes wt-ai-live { 0%,100%{opacity:1} 50%{opacity:0.3} }
                                @keyframes wt-ai-dot  { 0%,100%{transform:translateY(0);opacity:.5} 50%{transform:translateY(-5px);opacity:1} }
                            `}</style>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
