/**
 * ZenContext.js — Zen Modu (Kör Uçuş) Global State
 * =================================================
 * isZenMode: true iken tüm dolar tutarları gizlenir, yüzdelik ve R değerleri görünür kalır.
 * Tercih localStorage'a yazılır → sayfa yenilemede korunur.
 */

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

export const ZenContext = createContext(null);

/** Hook — herhangi bir bileşenden çağırın */
export const useZen = () => {
    const ctx = useContext(ZenContext);
    if (!ctx) throw new Error('useZen must be used inside ZenProvider');
    return ctx;
};

export const ZenProvider = ({ children }) => {
    const [isZenMode, setIsZenMode] = useState(() => {
        try {
            return localStorage.getItem('wt_zen_mode') === 'true';
        } catch {
            return false;
        }
    });

    const toggleZenMode = useCallback(() => {
        setIsZenMode(prev => {
            const next = !prev;
            try { localStorage.setItem('wt_zen_mode', String(next)); } catch {}
            return next;
        });
    }, []);

    return (
        <ZenContext.Provider value={{ isZenMode, toggleZenMode }}>
            {children}
        </ZenContext.Provider>
    );
};

/**
 * ZenValue — Dolar tutarlarını zen moduna göre gösteren/saklayan bileşen.
 * Geçiş sırasında blur+fade animasyonu uygular.
 *
 * Kullanım:
 *   <ZenValue value={`$${pnl.toFixed(2)}`} />
 *   <ZenValue value={`-$${drawdown}`} />
 *
 * Props:
 *   value   — Gösterilecek tam string (örn: "$10,500.00" veya "-$234.50")
 *   style   — Ek stil (opsiyonel)
 *   className — Ek class (opsiyonel)
 *   as      — HTML element türü, default "span"
 */
export const ZenValue = ({ value, style, className, as: Tag = 'span' }) => {
    const { isZenMode } = useZen();
    const [displayZen, setDisplayZen] = useState(isZenMode);
    const [blurred, setBlurred] = useState(false);
    const prevZenRef = useRef(isZenMode);

    useEffect(() => {
        if (prevZenRef.current === isZenMode) return;
        prevZenRef.current = isZenMode;
        // Faz 1: blur + fade out
        setBlurred(true);
        const t1 = setTimeout(() => {
            // Faz 2: içeriği değiştir
            setDisplayZen(isZenMode);
            // Faz 3: blur + fade in
            const t2 = setTimeout(() => setBlurred(false), 20);
            return () => clearTimeout(t2);
        }, 220);
        return () => clearTimeout(t1);
    }, [isZenMode]);

    return (
        <Tag
            className={`zen-value${className ? ' ' + className : ''}`}
            style={{
                ...style,
                display: 'inline-block',
                filter: blurred ? 'blur(7px)' : 'blur(0px)',
                opacity: blurred ? 0 : 1,
                transition: 'filter 0.22s ease, opacity 0.22s ease',
            }}
        >
            {displayZen ? '$***' : value}
        </Tag>
    );
};
