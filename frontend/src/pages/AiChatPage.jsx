import React, { useRef, useState } from 'react';
import { Brain, Plus, MessageSquare, ArrowRight, Menu, X, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAiChat } from '../contexts/AiChatContext';

// ─── Typing animation ────────────────────────────────────────────────────────
const TypingIndicator = () => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(0,219,231,0.22), rgba(123,47,255,0.22))',
            border: '1px solid rgba(0,219,231,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <Brain size={13} color="#00dbe7" />
        </div>
        <div style={{
            padding: '12px 16px', borderRadius: '4px 18px 18px 18px',
            background: 'rgba(22,28,42,0.85)', border: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', gap: 5, alignItems: 'center',
        }}>
            {[0, 0.18, 0.36].map((delay, i) => (
                <div key={i} style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: '#00dbe7', opacity: 0.5,
                    animation: `wt-dot 1.2s ${delay}s ease-in-out infinite`,
                }} />
            ))}
        </div>
    </div>
);

// ─── Page ────────────────────────────────────────────────────────────────────
export default function AiChatPage() {
    const { t } = useTranslation();
    const {
        messages, input, setInput, isLoading,
        sendMessage, handleKeyDown,
        messagesEndRef, quickQuestions,
        sessions, currentSessionId, sessionsLoading,
        switchSession, newChat, deleteSession, renameSession,
    } = useAiChat();

    const textareaRef = useRef(null);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    // Sidebar rename state
    const [renamingId, setRenamingId] = useState(null);
    const [renameValue, setRenameValue] = useState('');
    const [hoveredId, setHoveredId] = useState(null);

    const handleNewChat = () => {
        newChat();
        setMobileSidebarOpen(false);
    };

    const startRename = (s, e) => {
        e.stopPropagation();
        setRenamingId(s.id);
        setRenameValue(s.title);
    };

    const submitRename = async (sessionId) => {
        if (renameValue.trim()) await renameSession(sessionId, renameValue.trim());
        setRenamingId(null);
    };

    // ── Sidebar session item (reused in desktop + mobile) ─────────────────
    const SessionItem = ({ s, onClose }) => (
        <div
            key={s.id}
            className="wt-si"
            onMouseEnter={() => setHoveredId(s.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => { if (renamingId !== s.id) { switchSession(s.id); onClose?.(); } }}
            style={{
                padding: '9px 12px', borderRadius: 10, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                background: s.id === currentSessionId ? 'rgba(0,219,231,0.08)' : 'transparent',
                border: s.id === currentSessionId ? '1px solid rgba(0,219,231,0.15)' : '1px solid transparent',
                color: s.id === currentSessionId ? '#e1e2eb' : '#6b7280',
                fontSize: '0.8rem', marginBottom: 2, transition: 'all 0.15s', overflow: 'hidden',
            }}
        >
            <MessageSquare size={13} style={{ flexShrink: 0, color: s.id === currentSessionId ? '#00dbe7' : '#6b7280' }} />

            {renamingId === s.id ? (
                <input
                    autoFocus
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={() => submitRename(s.id)}
                    onKeyDown={e => { if (e.key === 'Enter') submitRename(s.id); if (e.key === 'Escape') setRenamingId(null); }}
                    onClick={e => e.stopPropagation()}
                    style={{
                        flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(0,219,231,0.35)',
                        borderRadius: 6, padding: '2px 7px', color: '#e1e2eb',
                        fontSize: '0.8rem', fontFamily: 'inherit', outline: 'none',
                    }}
                />
            ) : (
                <>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.title}
                    </span>
                    {(hoveredId === s.id || s.id === currentSessionId) && renamingId !== s.id && (
                        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                            <button
                                title={t('aiChat.rename', 'Yeniden Adlandır')}
                                onClick={e => startRename(s, e)}
                                style={{
                                    width: 20, height: 20, borderRadius: 4, border: 'none',
                                    background: 'rgba(255,255,255,0.08)', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8',
                                }}
                            >
                                <Pencil size={10} />
                            </button>
                            <button
                                title={t('common.delete', 'Sil')}
                                onClick={e => { e.stopPropagation(); deleteSession(s.id); }}
                                style={{
                                    width: 20, height: 20, borderRadius: 4, border: 'none',
                                    background: 'rgba(255,255,255,0.08)', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171',
                                }}
                            >
                                <Trash2 size={10} />
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );

    return (
        <div style={{
            height: '100%', display: 'flex', flexDirection: 'row',
            overflow: 'hidden', minHeight: 0,
            borderRadius: 16,
            background: 'rgba(10,12,20,0.65)',
            border: '1px solid rgba(255,255,255,0.07)',
            position: 'relative',
        }}>
            <style>{`
                .wt-msgs::-webkit-scrollbar { width: 3px; }
                .wt-msgs::-webkit-scrollbar-track { background: transparent; }
                .wt-msgs::-webkit-scrollbar-thumb { background: rgba(0,219,231,0.18); border-radius: 4px; }
                .wt-msgs::-webkit-scrollbar-thumb:hover { background: rgba(0,219,231,0.4); }
                .wt-ta:focus { outline: none !important; box-shadow: none !important; }
                .wt-ibox:focus-within { border-color: rgba(0,219,231,0.4) !important; box-shadow: 0 0 0 3px rgba(0,219,231,0.07) !important; }
                .wt-nc:hover { background: rgba(0,219,231,0.18) !important; border-color: rgba(0,219,231,0.45) !important; transform: translateY(-1px); }
                .wt-si:hover { background: rgba(255,255,255,0.05) !important; color: #c8cad8 !important; }
                .wt-qb:hover { border-color: rgba(0,219,231,0.5) !important; color: #00dbe7 !important; background: rgba(0,219,231,0.1) !important; }
                .wt-sb:hover:not(:disabled) { transform: scale(1.06); filter: brightness(1.15); }
                @keyframes wt-live { 0%,100%{opacity:1} 50%{opacity:0.3} }
                @keyframes wt-dot { 0%,100%{transform:translateY(0);opacity:.5} 50%{transform:translateY(-5px);opacity:1} }
                @keyframes wt-slidein { from{transform:translateX(-100%)} to{transform:translateX(0)} }
                @media (min-width: 769px) {
                    .wt-sidebar { display: flex !important; }
                    .wt-mob-bar { display: none !important; }
                    .wt-desk-hdr { display: flex !important; }
                }
                @media (max-width: 768px) {
                    .wt-sidebar { display: none !important; }
                    .wt-mob-bar { display: flex !important; }
                    .wt-desk-hdr { display: none !important; }
                    .wt-input-area { padding: 8px 12px 14px !important; }
                    .wt-ibox { max-width: 100% !important; }
                    .wt-msgs-inner { padding: 16px 0 12px !important; }
                }
            `}</style>

            {/* ═══════════════════════════════════════
                DESKTOP SIDEBAR
            ═══════════════════════════════════════ */}
            <div className="wt-sidebar" style={{
                width: 240, flexShrink: 0, flexDirection: 'column',
                borderRight: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(8,10,18,0.75)',
            }}>
                <div style={{ padding: '14px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <button
                        className="wt-nc"
                        onClick={handleNewChat}
                        style={{
                            width: '100%', padding: '10px 14px', borderRadius: 12,
                            background: 'rgba(0,219,231,0.08)', border: '1px solid rgba(0,219,231,0.22)',
                            color: '#00dbe7', fontWeight: 700, fontSize: '0.82rem',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                            transition: 'all 0.18s', fontFamily: 'inherit',
                        }}
                    >
                        <Plus size={14} />
                        {t('new_chat')}
                    </button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                    {sessionsLoading && (
                        <div style={{ padding: '12px', textAlign: 'center', color: '#546268', fontSize: '0.75rem' }}>
                            {t('common.loading', 'Yükleniyor...')}
                        </div>
                    )}
                    {!sessionsLoading && sessions.length === 0 && (
                        <div style={{ padding: '12px', textAlign: 'center', color: '#546268', fontSize: '0.75rem' }}>
                            {t('no_chats')}
                        </div>
                    )}
                    {sessions.map(s => (
                        <SessionItem key={s.id} s={s} />
                    ))}
                </div>
            </div>

            {/* ═══════════════════════════════════════
                CHAT COLUMN
            ═══════════════════════════════════════ */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

                {/* Mobile top bar */}
                <div className="wt-mob-bar" style={{
                    padding: '10px 16px', flexShrink: 0,
                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                    background: 'rgba(8,10,18,0.9)', backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    alignItems: 'center', justifyContent: 'space-between', gap: 10,
                }}>
                    <button
                        onClick={() => setMobileSidebarOpen(true)}
                        style={{
                            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 8, width: 34, height: 34, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8',
                        }}
                    >
                        <Menu size={16} />
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                            width: 28, height: 28, borderRadius: '50%',
                            background: 'linear-gradient(135deg, rgba(0,219,231,0.22), rgba(123,47,255,0.22))',
                            border: '1px solid rgba(0,219,231,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Brain size={13} color="#00dbe7" />
                        </div>
                        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#e1e2eb' }}>
                            {t('aiChat.title', 'AI Asistan')}
                        </span>
                    </div>
                    <button
                        onClick={handleNewChat}
                        style={{
                            background: 'rgba(0,219,231,0.08)', border: '1px solid rgba(0,219,231,0.22)',
                            borderRadius: 8, width: 34, height: 34, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00dbe7',
                        }}
                    >
                        <Plus size={16} />
                    </button>
                </div>

                {/* Desktop header */}
                <div className="wt-desk-hdr" style={{
                    padding: '14px 28px', flexShrink: 0,
                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                    alignItems: 'center', gap: 12,
                    background: 'linear-gradient(135deg, rgba(0,219,231,0.03), transparent)',
                }}>
                    <div style={{
                        width: 38, height: 38, borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(0,219,231,0.22), rgba(123,47,255,0.22))',
                        border: '1px solid rgba(0,219,231,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Brain size={18} color="#00dbe7" />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#e1e2eb' }}>
                            {currentSessionId
                                ? (sessions.find(s => s.id === currentSessionId)?.title || t('aiChat.title', 'AI Asistan'))
                                : t('aiChat.title', 'AI Asistan')}
                        </h2>
                        <div style={{ fontSize: '0.65rem', color: '#4edea3', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4edea3', animation: 'wt-live 2s infinite' }} />
                            {t('aiChat.subtitle', 'Finansal analiz · Strateji · Risk')}
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="wt-msgs" style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
                    <div className="wt-msgs-inner" style={{
                        maxWidth: 780, margin: '0 auto',
                        display: 'flex', flexDirection: 'column', gap: 18,
                        padding: '28px 0 16px',
                    }}>
                        {messages.map((msg, i) => (
                            <div key={i} style={{
                                display: 'flex', gap: 10, alignItems: 'flex-start',
                                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                            }}>
                                {msg.role === 'ai' && (
                                    <div style={{
                                        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                                        background: 'linear-gradient(135deg, rgba(0,219,231,0.22), rgba(123,47,255,0.22))',
                                        border: '1px solid rgba(0,219,231,0.3)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2,
                                    }}>
                                        <Brain size={13} color="#00dbe7" />
                                    </div>
                                )}
                                <div style={{
                                    maxWidth: '75%',
                                    padding: '11px 16px',
                                    fontSize: '0.88rem',
                                    lineHeight: 1.72,
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    ...(msg.role === 'user' ? {
                                        borderRadius: '18px 4px 18px 18px',
                                        background: 'linear-gradient(135deg, #0cb8cc 0%, #0891b2 100%)',
                                        color: 'rgba(255,255,255,0.97)',
                                        boxShadow: '0 3px 14px rgba(0,219,231,0.22)',
                                    } : {
                                        borderRadius: '4px 18px 18px 18px',
                                        background: 'rgba(22,28,42,0.85)',
                                        border: '1px solid rgba(255,255,255,0.07)',
                                        color: '#cfd2df',
                                    }),
                                }}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}

                        {isLoading && <TypingIndicator />}

                        {messages.length <= 1 && !isLoading && (
                            <div style={{
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', gap: 14, marginTop: 16,
                            }}>
                                <p style={{ margin: 0, fontSize: '0.77rem', color: '#6b7280', letterSpacing: '0.02em' }}>
                                    {t('aiChat.quickQuestionsHint', 'Hızlı sorular ile başla')}
                                </p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 540 }}>
                                    {quickQuestions.map(q => (
                                        <button
                                            key={q}
                                            className="wt-qb"
                                            onClick={() => sendMessage(q)}
                                            style={{
                                                padding: '7px 14px',
                                                border: '1px solid rgba(0,219,231,0.2)',
                                                borderRadius: 20,
                                                background: 'rgba(0,219,231,0.04)',
                                                color: '#94a3b8',
                                                fontSize: '0.75rem', fontWeight: 600,
                                                cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
                                            }}
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Input — Glassmorphism */}
                <div className="wt-input-area" style={{
                    borderTop: '1px solid rgba(255,255,255,0.07)',
                    background: 'rgba(8,10,18,0.88)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    padding: '12px 16px 18px',
                    flexShrink: 0,
                }}>
                    <div className="wt-ibox" style={{
                        maxWidth: 780, margin: '0 auto',
                        display: 'flex', gap: 10, alignItems: 'flex-end',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 14, padding: '10px 14px',
                        transition: 'all 0.18s',
                    }}>
                        <textarea
                            ref={textareaRef}
                            className="wt-ta"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={t('aiChat.placeholder', 'Sormak istediğin bir şey var mı...')}
                            disabled={isLoading}
                            rows={1}
                            style={{
                                flex: 1, resize: 'none',
                                background: 'transparent', border: 'none',
                                outline: 'none', color: '#e1e2eb',
                                fontSize: '0.88rem', lineHeight: 1.55,
                                fontFamily: 'inherit',
                                maxHeight: 160, overflowY: 'auto',
                            }}
                        />
                        <button
                            className="wt-sb"
                            onClick={() => sendMessage()}
                            disabled={!input.trim() || isLoading}
                            style={{
                                width: 38, height: 38, flexShrink: 0, borderRadius: 10,
                                background: input.trim() && !isLoading
                                    ? 'linear-gradient(135deg, #00dbe7, #7b2fff)'
                                    : 'rgba(255,255,255,0.07)',
                                border: 'none',
                                cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: input.trim() && !isLoading ? 'white' : '#4a5568',
                                transition: 'all 0.15s',
                                boxShadow: input.trim() && !isLoading ? '0 2px 14px rgba(0,219,231,0.3)' : 'none',
                            }}
                        >
                            <ArrowRight size={17} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════
                MOBILE SIDEBAR OVERLAY
            ═══════════════════════════════════════ */}
            {mobileSidebarOpen && (
                <div
                    onClick={() => setMobileSidebarOpen(false)}
                    style={{
                        position: 'absolute', inset: 0, zIndex: 100,
                        background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(4px)',
                        WebkitBackdropFilter: 'blur(4px)',
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            position: 'absolute', top: 0, left: 0, bottom: 0,
                            width: 260,
                            background: 'rgba(10,12,22,0.98)',
                            border: '1px solid rgba(255,255,255,0.09)',
                            borderRadius: '0 16px 16px 0',
                            display: 'flex', flexDirection: 'column',
                            animation: 'wt-slidein 0.22s ease',
                        }}
                    >
                        <div style={{
                            padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e1e2eb' }}>
                                {t('active_chat')}
                            </span>
                            <button
                                onClick={() => setMobileSidebarOpen(false)}
                                style={{
                                    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 8, width: 30, height: 30, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8',
                                }}
                            >
                                <X size={14} />
                            </button>
                        </div>
                        <div style={{ padding: '12px' }}>
                            <button
                                className="wt-nc"
                                onClick={handleNewChat}
                                style={{
                                    width: '100%', padding: '10px 14px', borderRadius: 12,
                                    background: 'rgba(0,219,231,0.08)', border: '1px solid rgba(0,219,231,0.22)',
                                    color: '#00dbe7', fontWeight: 700, fontSize: '0.82rem',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                                    transition: 'all 0.18s', fontFamily: 'inherit',
                                }}
                            >
                                <Plus size={14} /> {t('new_chat')}
                            </button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
                            {sessionsLoading && (
                                <div style={{ padding: '12px', textAlign: 'center', color: '#546268', fontSize: '0.75rem' }}>
                                    {t('common.loading', 'Yükleniyor...')}
                                </div>
                            )}
                            {!sessionsLoading && sessions.length === 0 && (
                                <div style={{ padding: '12px', textAlign: 'center', color: '#546268', fontSize: '0.75rem' }}>
                                    {t('no_chats')}
                                </div>
                            )}
                            {sessions.map(s => (
                                <SessionItem key={s.id} s={s} onClose={() => setMobileSidebarOpen(false)} />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
