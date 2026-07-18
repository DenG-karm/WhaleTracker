import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../api/client';
import { AuthContext } from './AuthContext';

const AiChatContext = createContext(null);

const QUICK_TR = [
    'Portföyümdeki en büyük riski analiz et',
    'BTC dominansı ne anlama geliyor?',
    'Risk yönetimimi nasıl iyileştirebilirim?',
];

const QUICK_EN = [
    'Analyze the biggest risk in my portfolio',
    'What does BTC dominance mean?',
    'How can I improve my risk management?',
];

export const AiChatProvider = ({ children }) => {
    const { t, i18n } = useTranslation();
    const { user } = useContext(AuthContext);

    // ── Session state ────────────────────────────────────────────────────────
    const [sessions, setSessions] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [sessionsLoading, setSessionsLoading] = useState(false);

    // ── Message state ────────────────────────────────────────────────────────
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // ── Widget state ─────────────────────────────────────────────────────────
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isWidgetVisible, setIsWidgetVisible] = useState(true);

    const messagesEndRef = useRef(null);

    // ── Welcome message helper ───────────────────────────────────────────────
    const getWelcomeMsg = useCallback(() => {
        const name = user?.full_name?.split(' ')[0] || user?.user_name || 'Trader';
        const isEn = i18n.language.startsWith('en');
        return {
            role: 'ai',
            text: isEn
                ? t('aiChat.welcome', { name, defaultValue: `Hi ${name}! I'm your AI coach. Ask me anything about your trading strategy, market psychology, or risk management.` })
                : t('aiChat.welcome', { name, defaultValue: `Merhaba ${name}! Ben senin AI koçunum. Trade stratejin, piyasa psikolojin veya risk yönetimin hakkında bana her şeyi sorabilirsin.` }),
        };
    }, [user, i18n, t]);

    // ── Load sessions from backend ───────────────────────────────────────────
    const loadSessions = useCallback(async () => {
        if (!user) return;
        setSessionsLoading(true);
        try {
            const data = await apiClient('/chat/sessions');
            setSessions(Array.isArray(data) ? data : []);
        } catch { /* sessiz */ }
        finally { setSessionsLoading(false); }
    }, [user]);

    useEffect(() => {
        if (user) loadSessions();
    }, [user, loadSessions]);

    // ── Initialize with welcome msg ──────────────────────────────────────────
    useEffect(() => {
        if (user && messages.length === 0) {
            setMessages([getWelcomeMsg()]);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // Dil değiştiğinde welcome mesajını güncelle (henüz sadece welcome varsa)
    useEffect(() => {
        setMessages(prev => {
            if (prev.length === 1 && prev[0].role === 'ai') {
                return [getWelcomeMsg()];
            }
            return prev;
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [i18n.language]);

    // ── Auto-scroll ──────────────────────────────────────────────────────────
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // ── Switch to existing session ───────────────────────────────────────────
    const switchSession = useCallback(async (sessionId) => {
        if (sessionId === currentSessionId) return;
        setCurrentSessionId(sessionId);
        setMessages([]);
        try {
            const data = await apiClient(`/chat/sessions/${sessionId}/messages`);
            if (Array.isArray(data) && data.length > 0) {
                setMessages(data.map(m => ({ role: m.role === 'user' ? 'user' : 'ai', text: m.content })));
            } else {
                setMessages([getWelcomeMsg()]);
            }
        } catch { setMessages([getWelcomeMsg()]); }
    }, [currentSessionId, getWelcomeMsg]);

    // ── New chat (clear state) ───────────────────────────────────────────────
    const newChat = useCallback(() => {
        setCurrentSessionId(null);
        setMessages([getWelcomeMsg()]);
        setInput('');
    }, [getWelcomeMsg]);

    const resetChat = newChat;

    // ── Delete session ───────────────────────────────────────────────────────
    const deleteSession = useCallback(async (sessionId) => {
        try {
            await apiClient(`/chat/sessions/${sessionId}`, { method: 'DELETE' });
        } catch { /* sessiz */ }
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        if (currentSessionId === sessionId) newChat();
    }, [currentSessionId, newChat]);

    // ── Rename session ───────────────────────────────────────────────────────
    const renameSession = useCallback(async (sessionId, title) => {
        try {
            await apiClient(`/chat/sessions/${sessionId}/rename`, {
                method: 'PUT',
                body: { title },
            });
        } catch { /* sessiz */ }
        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title } : s));
    }, []);

    // ── Send message (core logic) ────────────────────────────────────────────
    const sendMessage = useCallback(async (msgText) => {
        const text = (msgText ?? input).trim();
        if (!text || isLoading) return;

        const isEn = i18n.language.startsWith('en');

        // Bağlam köprüsü (sentinel, backtest, simulasyon)
        let ctxPrefix = '';
        try {
            const raw = localStorage.getItem('wt_sentinel_ctx');
            if (raw) {
                const p = JSON.parse(raw);
                if (p && Date.now() - (p.ts || 0) < 5 * 60 * 1000)
                    ctxPrefix += `\n[Aktif pozisyon bağlamı]: ${p.text}\n`;
            }
        } catch { }
        try {
            const raw = localStorage.getItem('wt_backtest_result');
            if (raw) {
                const p = JSON.parse(raw);
                if (p && Date.now() - (p.ts || 0) < 30 * 60 * 1000)
                    ctxPrefix += `\n[Son Backtest Sonucu]: ${p.summary}\n`;
            }
        } catch { }
        try {
            const raw = localStorage.getItem('wt_sim_analysis_ctx');
            if (raw) {
                const p = JSON.parse(raw);
                if (p && Date.now() - (p.ts || 0) < 10 * 60 * 1000)
                    ctxPrefix += `\n[Simülasyon Analizi]: ${p.text}\n`;
            }
        } catch { }

        setInput('');
        setMessages(prev => [...prev, { role: 'user', text }]);
        setIsLoading(true);

        try {
            let sessionId = currentSessionId;

            // Aktif session yoksa yeni oluştur
            if (!sessionId) {
                const newSession = await apiClient('/chat/sessions', {
                    method: 'POST',
                    body: { title: 'Yeni Sohbet' },
                });
                sessionId = newSession.id;
                setCurrentSessionId(sessionId);
                setSessions(prev => [{
                    id: newSession.id,
                    title: newSession.title,
                    created_at: newSession.created_at,
                    updated_at: newSession.created_at,
                }, ...prev]);
            }

            const msgToSend = (isEn ? '[RESPOND IN ENGLISH] ' : '') + ctxPrefix + text;

            const data = await apiClient(`/chat/sessions/${sessionId}/messages`, {
                method: 'POST',
                body: { message: msgToSend, lang: isEn ? 'en' : 'tr' },
            });

            setMessages(prev => [...prev, { role: 'ai', text: data.content || '...' }]);

            // Auto-titling: backend'den yeni başlık geldiyse güncelle
            if (data.session_title) {
                setSessions(prev => prev.map(s =>
                    s.id === sessionId ? { ...s, title: data.session_title } : s
                ));
            }

            // Oturumu en üste taşı (updated_at güncelle)
            setSessions(prev => {
                const idx = prev.findIndex(s => s.id === sessionId);
                if (idx < 0) return prev;
                const updated = { ...prev[idx], updated_at: new Date().toISOString() };
                return [updated, ...prev.filter(s => s.id !== sessionId)];
            });

        } catch {
            setMessages(prev => [...prev, { role: 'ai', text: t('aiChat.errorReply', 'Bir hata oluştu, lütfen tekrar deneyin.') }]);
        }

        setIsLoading(false);
    }, [input, isLoading, currentSessionId, i18n, t]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }, [sendMessage]);

    const quickQuestions = i18n.language.startsWith('en') ? QUICK_EN : QUICK_TR;

    return (
        <AiChatContext.Provider value={{
            // Session
            sessions,
            currentSessionId,
            sessionsLoading,
            loadSessions,
            switchSession,
            newChat,
            resetChat,
            deleteSession,
            renameSession,
            // Messages
            messages,
            input,
            setInput,
            isLoading,
            sendMessage,
            handleKeyDown,
            messagesEndRef,
            quickQuestions,
            // Widget drawer
            isDrawerOpen,
            setIsDrawerOpen,
            isWidgetVisible,
            setIsWidgetVisible,
        }}>
            {children}
        </AiChatContext.Provider>
    );
};

export const useAiChat = () => {
    const ctx = useContext(AiChatContext);
    if (!ctx) throw new Error('useAiChat must be used within AiChatProvider');
    return ctx;
};

export default AiChatContext;
