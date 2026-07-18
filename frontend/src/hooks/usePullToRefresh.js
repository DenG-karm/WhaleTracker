import { useState, useEffect, useCallback } from 'react';

/**
 * Pull-to-refresh hook.
 * @param {Function} onRefresh - async callback to run on refresh
 * @param {number}   threshold - px to pull before triggering (default 70)
 */
export function usePullToRefresh(onRefresh, threshold = 70) {
  const [isPulling, setIsPulling]   = useState(false);
  const [pullY, setPullY]           = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleTouchStart = useCallback((e) => {
    if (window.scrollY > 0) return;
    const touch = e.touches[0];
    window._ptStartY = touch.clientY;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!window._ptStartY) return;
    if (window.scrollY > 0) { window._ptStartY = null; return; }
    const delta = e.touches[0].clientY - window._ptStartY;
    if (delta > 0) {
      setIsPulling(true);
      setPullY(Math.min(delta, threshold * 1.5));
    }
  }, [threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;
    if (pullY >= threshold && onRefresh) {
      setIsRefreshing(true);
      try { await onRefresh(); } finally { setIsRefreshing(false); }
    }
    setIsPulling(false);
    setPullY(0);
    window._ptStartY = null;
  }, [isPulling, pullY, threshold, onRefresh]);

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove',  handleTouchMove,  { passive: true });
    document.addEventListener('touchend',   handleTouchEnd,   { passive: true });
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove',  handleTouchMove);
      document.removeEventListener('touchend',   handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { isPulling, pullY, isRefreshing };
}
