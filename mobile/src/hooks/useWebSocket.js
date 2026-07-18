/**
 * src/hooks/useWebSocket.js
 * Canlı fiyat / whale alert / radar WebSocket hook'u
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { WS_BASE } from '../services/api';

/**
 * @param {string} path  — örn: "/ws/live-prices" | "/ws/whale-alerts" | "/ws/radar"
 * @param {boolean} enabled
 */
export function useWebSocket(path, enabled = true) {
  const { token } = useAuth();
  const ws        = useRef(null);
  const retryRef  = useRef(null);

  const [lastMessage, setLastMessage] = useState(null);
  const [status, setStatus]           = useState('disconnected'); // connecting | open | closed | error

  const connect = useCallback(() => {
    if (!token || !enabled) return;
    if (ws.current?.readyState === WebSocket.OPEN) return;

    const url = `${WS_BASE}${path}?token=${token}`;
    setStatus('connecting');

    const socket = new WebSocket(url);

    socket.onopen = () => setStatus('open');

    socket.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        setLastMessage(parsed);
      } catch {
        setLastMessage(e.data);
      }
    };

    socket.onerror = () => setStatus('error');

    socket.onclose = () => {
      setStatus('closed');
      // 5 saniye sonra yeniden bağlan
      retryRef.current = setTimeout(connect, 5000);
    };

    ws.current = socket;
  }, [path, token, enabled]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(retryRef.current);
      ws.current?.close();
    };
  }, [connect]);

  const send = useCallback((data) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    }
  }, []);

  return { lastMessage, status, send };
}
