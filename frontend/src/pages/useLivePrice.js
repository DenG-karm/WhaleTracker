import { useState, useEffect, useRef } from 'react';

export const useLivePrice = (symbols) => {
    const [prices, setPrices] = useState({});
    const [wsConnected, setWsConnected] = useState(false);
    const wsRef = useRef(null);
    const symbolKey = Array.isArray(symbols) ? symbols.join('|') : '';
    const reconnectAttemptRef = useRef(0);
    const reconnectTimerRef = useRef(null);
    const isMountedRef = useRef(true);
    const maxReconnectAttempts = 5;

    useEffect(() => {
        isMountedRef.current = true;
        const symbolList = symbolKey ? symbolKey.split('|').filter(Boolean) : [];
        if (symbolList.length === 0) {
            setWsConnected(false);
            return;
        }

        const connectWebSocket = () => {
            if (!isMountedRef.current) return;
            try {
                const ws = new WebSocket('ws://127.0.0.1:8000/ws/live-prices');
                wsRef.current = ws;

                ws.onopen = () => {
                    if (!isMountedRef.current) { ws.close(); return; }
                    setWsConnected(true);
                    reconnectAttemptRef.current = 0;
                    ws.send(JSON.stringify({ symbols: symbolList }));
                };

                ws.onmessage = (event) => {
                    if (!isMountedRef.current) return;
                    try {
                        const data = JSON.parse(event.data);
                        if (data.symbol) {
                            setPrices(prev => ({ ...prev, [data.symbol]: data }));
                        }
                    } catch (e) {
                        console.error('[WebSocket] Parse error:', e);
                    }
                };

                ws.onerror = () => {
                    if (!isMountedRef.current) return;
                    setWsConnected(false);
                };

                ws.onclose = () => {
                    if (!isMountedRef.current) return;
                    setWsConnected(false);

                    if (reconnectAttemptRef.current < maxReconnectAttempts) {
                        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 10000);
                        reconnectAttemptRef.current++;
                        reconnectTimerRef.current = setTimeout(connectWebSocket, delay);
                    } else {
                        console.error('[WebSocket] Max reconnect attempts reached');
                    }
                };
            } catch (e) {
                console.error('[WebSocket] Connection error:', e);
                if (isMountedRef.current) setWsConnected(false);
            }
        };

        connectWebSocket();

        return () => {
            isMountedRef.current = false;
            clearTimeout(reconnectTimerRef.current);
            if (wsRef.current) {
                wsRef.current.onclose = null;
                wsRef.current.onerror = null;
                wsRef.current.onopen = null;
                wsRef.current.onmessage = null;
                if (wsRef.current.readyState === WebSocket.OPEN ||
                    wsRef.current.readyState === WebSocket.CONNECTING) {
                    wsRef.current.close();
                }
                wsRef.current = null;
            }
        };
        
    }, [symbolKey]);

    return prices;
};