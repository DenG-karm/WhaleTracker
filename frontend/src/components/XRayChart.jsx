import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const XRayChart = React.memo(function XRayChart({ symbol }) {
    const containerRef = useRef(null);
    const [hoveredCell, setHoveredCell] = React.useState(null);

    // Simulate Footprint Data
    const generateFootprintData = () => {
        const columns = [];
        const numCols = 35; // 35 candles
        let currentPrice = symbol.includes('BTC') ? 64000 : symbol.includes('ETH') ? 3500 : 150;

        for (let i = 0; i < numCols; i++) {
            const numLevels = Math.floor(Math.random() * 8) + 12; // 12-20 price levels per candle
            const isBullishCandle = Math.random() > 0.45;
            
            const levels = [];
            for (let j = 0; j < numLevels; j++) {
                const bid = Math.floor(Math.random() * 800) + 10;
                const ask = Math.floor(Math.random() * 800) + 10;
                
                let isImbalance = false;
                let dominant = 'neutral';
                if (bid > ask * 3 && bid > 100) { isImbalance = true; dominant = 'bear'; }
                else if (ask > bid * 3 && ask > 100) { isImbalance = true; dominant = 'bull'; }

                const totalVol = bid + ask;
                const priceLevel = currentPrice + (j * 10);
                
                levels.push({
                    price: priceLevel,
                    bid,
                    ask,
                    totalVol,
                    isImbalance,
                    dominant,
                    delta: ask - bid
                });
            }

            // Adjust price for next candle to make a pseudo trend
            currentPrice = currentPrice + (isBullishCandle ? 60 : -60) + (Math.random() * 40 - 20);

            columns.push({
                id: `col-${i}`,
                isBullish: isBullishCandle,
                levels: levels.sort((a, b) => b.price - a.price), // highest price on top
                totalDelta: levels.reduce((acc, curr) => acc + curr.delta, 0),
            });
        }
        return columns;
    };

    // Heavy data computation memoized — only re-runs when symbol changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const data = useMemo(() => generateFootprintData(), [symbol]);

    // Auto-scroll only — isolated from data computation
    useEffect(() => {
        if (containerRef.current) {
            setTimeout(() => {
                containerRef.current.scrollLeft = containerRef.current.scrollWidth;
            }, 100);
        }
    }, [symbol]);

    const handleCellEnter = useCallback((lvl, e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setHoveredCell({ ...lvl, x: rect.left, y: rect.top });
    }, []);

    const handleCellLeave = useCallback(() => setHoveredCell(null), []);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#050810', borderRadius: '0 0 12px 12px' }}>
            
            {/* Scanline Animation */}
            <motion.div
                initial={{ top: '-10%' }}
                animate={{ top: '110%' }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                style={{
                    position: 'absolute', left: 0, right: 0, height: '3px',
                    background: 'linear-gradient(90deg, transparent, rgba(0, 219, 231, 0.8), transparent)',
                    boxShadow: '0 0 20px rgba(0, 219, 231, 0.6), 0 0 40px rgba(0, 219, 231, 0.3)',
                    zIndex: 10,
                    pointerEvents: 'none'
                }}
            />

            {/* Grid Background */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
            }} />

            {/* Main Scrollable Chart Area */}
            <div ref={containerRef} style={{
                width: '100%', height: '100%', overflowX: 'auto', overflowY: 'auto',
                display: 'flex', alignItems: 'center', padding: '20px 40px', gap: '6px',
                scrollbarWidth: 'thin', scrollbarColor: '#00dbe7 rgba(255,255,255,0.05)',
                position: 'relative', zIndex: 1
            }}>
                {data.map((col) => (
                    <div key={col.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0, minWidth: '70px', marginTop: col.isBullish ? '0' : '20px' }}>
                        {/* Candle Shadow Top/Bottom */}
                        <div style={{ width: '2px', height: '20px', background: col.isBullish ? 'rgba(78,222,163,0.3)' : 'rgba(239,68,68,0.3)', margin: '0 auto' }} />
                        
                        {col.levels.map((lvl, lIdx) => {
                            // Calculate opacity based on volume
                            const maxVol = 1600;
                            const opacity = Math.min(0.15 + (lvl.totalVol / maxVol) * 0.85, 0.95);
                            
                            // Colors
                            let bgColor = 'rgba(255,255,255,0.04)';
                            let borderColor = 'transparent';
                            
                            if (lvl.dominant === 'bull') {
                                bgColor = `rgba(0, 219, 231, ${opacity})`;
                                if (lvl.isImbalance) borderColor = '#00dbe7';
                            } else if (lvl.dominant === 'bear') {
                                bgColor = `rgba(239, 68, 68, ${opacity})`;
                                if (lvl.isImbalance) borderColor = '#ef4444';
                            }

                            return (
                                <div
                                    key={lIdx}
                                    onMouseEnter={(e) => handleCellEnter(lvl, e)}
                                    onMouseLeave={handleCellLeave}
                                    style={{
                                        background: bgColor,
                                        border: lvl.isImbalance ? `1px solid ${borderColor}` : '1px solid rgba(255,255,255,0.03)',
                                        boxShadow: lvl.isImbalance ? `0 0 10px ${borderColor}` : 'none',
                                        borderRadius: '3px',
                                        padding: '4px 3px',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        cursor: 'crosshair',
                                        transition: '0.15s ease',
                                        position: 'relative'
                                    }}
                                >
                                    <span style={{
                                        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                                        fontSize: '0.55rem',
                                        color: lvl.isImbalance ? '#fff' : 'rgba(255,255,255,0.7)',
                                        fontWeight: lvl.isImbalance ? 900 : 600,
                                        whiteSpace: 'nowrap',
                                        letterSpacing: '-0.02em'
                                    }}>
                                        {lvl.bid} x {lvl.ask}
                                    </span>
                                </div>
                            );
                        })}
                        
                        <div style={{ width: '2px', height: '20px', background: col.isBullish ? 'rgba(78,222,163,0.3)' : 'rgba(239,68,68,0.3)', margin: '0 auto' }} />

                        {/* Delta Header/Footer */}
                        <div style={{
                            textAlign: 'center', fontSize: '0.65rem', fontWeight: 800, paddingTop: '4px',
                            color: col.totalDelta > 0 ? '#00dbe7' : '#ef4444',
                            fontFamily: '"JetBrains Mono", "Fira Code", monospace'
                        }}>
                            Δ {col.totalDelta > 0 ? '+' : ''}{col.totalDelta}
                        </div>
                    </div>
                ))}
            </div>

            {/* Tooltip */}
            <AnimatePresence>
                {hoveredCell && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        style={{
                            position: 'fixed',
                            top: hoveredCell.y > window.innerHeight / 2 ? hoveredCell.y - 150 : hoveredCell.y + 30,
                            left: hoveredCell.x > window.innerWidth / 2 ? hoveredCell.x - 220 : hoveredCell.x + 80,
                            background: 'rgba(5, 8, 16, 0.95)',
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            border: `1px solid ${hoveredCell.isImbalance ? (hoveredCell.dominant === 'bull' ? '#00dbe7' : '#ef4444') : 'rgba(0, 219, 231, 0.3)'}`,
                            borderRadius: '10px',
                            padding: '14px',
                            pointerEvents: 'none',
                            zIndex: 100,
                            minWidth: '200px',
                            boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 20px ${hoveredCell.isImbalance ? (hoveredCell.dominant === 'bull' ? 'rgba(0,219,231,0.2)' : 'rgba(239,68,68,0.2)') : 'transparent'}`
                        }}
                    >
                        <div style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 800, marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                            <span>PRICE</span>
                            <span style={{ color: '#00dbe7', fontFamily: '"JetBrains Mono", monospace' }}>{hoveredCell.price.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', margin: '6px 0', fontFamily: '"JetBrains Mono", monospace' }}>
                            <span style={{ color: 'rgba(255,255,255,0.6)' }}>Alıcı (Ask):</span>
                            <span style={{ color: '#00dbe7', fontWeight: 800 }}>{hoveredCell.ask}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', margin: '6px 0', fontFamily: '"JetBrains Mono", monospace' }}>
                            <span style={{ color: 'rgba(255,255,255,0.6)' }}>Satıcı (Bid):</span>
                            <span style={{ color: '#ef4444', fontWeight: 800 }}>{hoveredCell.bid}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', margin: '6px 0', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px', fontFamily: '"JetBrains Mono", monospace' }}>
                            <span style={{ color: 'rgba(255,255,255,0.6)' }}>Delta:</span>
                            <span style={{ color: hoveredCell.delta > 0 ? '#00dbe7' : '#ef4444', fontWeight: 800 }}>
                                {hoveredCell.delta > 0 ? '+' : ''}{hoveredCell.delta}
                            </span>
                        </div>
                        {hoveredCell.isImbalance && (
                            <div style={{
                                marginTop: '10px', padding: '6px',
                                background: hoveredCell.dominant === 'bull' ? 'rgba(0, 219, 231, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                borderRadius: '6px', textAlign: 'center', fontSize: '0.65rem',
                                color: hoveredCell.dominant === 'bull' ? '#00dbe7' : '#ef4444',
                                fontWeight: 900, letterSpacing: '0.05em',
                                boxShadow: `inset 0 0 10px ${hoveredCell.dominant === 'bull' ? 'rgba(0,219,231,0.2)' : 'rgba(239,68,68,0.2)'}`
                            }}>
                                ⚠️ LİKİDİTE BOŞLUĞU (IMBALANCE)
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

export default XRayChart;
