/**
 * src/screens/DashboardScreen.js
 * Web Dashboard.jsx'in mobil klonu
 * MetricCard, WinRate radial SVG, equity mini chart, AI bias, son işlemler
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, RefreshControl, StyleSheet,
  TouchableOpacity, Animated, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Line } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { MobileAPI } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../constants/colors';

// ── Metrik Kart (web MetricCard klonu) ────────────────────────────────────────
function MetricCard({ label, value, sub, color, icon }) {
  return (
    <View style={[mc.card, { borderTopColor: color }]}>
      <View style={[mc.orb, { backgroundColor: color + '20' }]} />
      <View style={mc.row}>
        <Text style={mc.label}>{label}</Text>
        {icon && <Ionicons name={icon} size={16} color={color} />}
      </View>
      <Text style={[mc.value, { color }]}>{value ?? '—'}</Text>
      {sub ? <Text style={mc.sub}>{sub}</Text> : null}
    </View>
  );
}

// ── Win Rate Radial SVG (web WinRateCard klonu) ───────────────────────────────
function WinRateCard({ winRate = 0, wins = 0, losses = 0 }) {
  const wr  = Math.min(100, Math.max(0, winRate || 0));
  const r   = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (wr / 100) * circ;
  const c   = wr >= 50 ? Colors.profit : Colors.warning;

  return (
    <View style={[mc.card, { borderTopColor: c }]}>
      <View style={[mc.orb, { backgroundColor: c + '20' }]} />
      <Text style={mc.label}>WIN RATE</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={[mc.value, { color: c }]}>%{wr}</Text>
          <Text style={mc.sub}>{wins}W / {losses}L</Text>
        </View>
        <Svg width={64} height={64}>
          <Circle cx={32} cy={32} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={5} />
          <Circle
            cx={32} cy={32} r={r} fill="none"
            stroke={c} strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray={`${circ}`}
            strokeDashoffset={`${offset}`}
            transform={`rotate(-90 32 32)`}
          />
        </Svg>
      </View>
    </View>
  );
}

// ── Mini Equity Curve ─────────────────────────────────────────────────────────
function MiniEquityChart({ data = [] }) {
  if (data.length < 2) return null;
  const W = 280, H = 60;
  const vals = data.map(d => d.balance || 0);
  const min  = Math.min(...vals);
  const max  = Math.max(...vals);
  const range = (max - min) || 1;
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 8) - 4;
    return `${x},${y}`;
  });
  const pathD = 'M ' + pts.join(' L ');
  const areaD = `M 0,${H} L ${pathD.slice(2)} L ${W},${H} Z`;
  const isProfit = vals[vals.length - 1] >= vals[0];
  const color = isProfit ? Colors.profit : Colors.loss;

  return (
    <Svg width={W} height={H} style={{ marginTop: 8 }}>
      <Path d={areaD} fill={color} fillOpacity={0.12} />
      <Path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// ── PnL Bar (7 günlük) ────────────────────────────────────────────────────────
function PnlBars({ flow = [] }) {
  if (!flow.length) return null;
  const maxV = Math.max(...flow.map(f => Math.abs(f.pnl ?? 0)), 1);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 52, gap: 4, marginTop: 8 }}>
      {flow.map((f, i) => {
        const ratio = Math.abs(f.pnl ?? 0) / maxV;
        const h = Math.max(4, ratio * 44);
        const color = (f.pnl ?? 0) >= 0 ? Colors.profit : Colors.loss;
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
            <View style={{ height: h, width: '80%', backgroundColor: color, borderRadius: 3, opacity: 0.85 }} />
            <Text style={{ fontSize: 8, color: Colors.textMuted, marginTop: 2 }}>
              {(f.day || '').slice(5)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ── İşlem satırı ─────────────────────────────────────────────────────────────
function TradeRow({ trade }) {
  const pnl   = trade.pnl ?? 0;
  const color = pnl >= 0 ? Colors.profit : Colors.loss;
  return (
    <View style={tr.row}>
      <View style={tr.left}>
        <Text style={tr.symbol}>{trade.symbol}</Text>
        <Text style={tr.dir}>{trade.direction ?? trade.status}</Text>
      </View>
      <Text style={[tr.pnl, { color }]}>
        {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}$
      </Text>
    </View>
  );
}

// ── Ana Ekran ─────────────────────────────────────────────────────────────────
export default function DashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState(null);

  // Canlı whale alert bandı
  const { lastMessage: whaleMsg } = useWebSocket('/ws/whale-alerts');
  const [alertBand, setAlertBand] = useState(null);
  const bandAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!whaleMsg) return;
    setAlertBand(whaleMsg);
    Animated.sequence([
      Animated.timing(bandAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(4000),
      Animated.timing(bandAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [whaleMsg]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const d = await MobileAPI.dashboard();
      setData(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <View style={[s.root, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ fontSize: 40 }}>🐋</Text>
        <ActivityIndicator color={Colors.cyanPrimary} size="large" style={{ marginTop: 16 }} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[s.root, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>⚠️</Text>
        <Text style={{ color: Colors.loss, marginBottom: 16, textAlign: 'center', fontSize: 14 }}>{error}</Text>
        <TouchableOpacity onPress={() => load()} style={s.retryBtn}>
          <Text style={{ color: Colors.cyanPrimary, fontWeight: '800' }}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const stats  = data?.stats ?? {};
  const flow   = data?.money_flow ?? [];
  const trades = data?.recent_trades ?? [];
  const news   = data?.news ?? [];
  const bias   = data?.ai_bias;
  const ec     = data?.equity_curve ?? [];

  const totalPnl    = stats.total_pnl    ?? 0;
  const winRate     = stats.win_rate     ?? 0;
  const totalTrades = stats.total_trades ?? 0;
  const openCount   = stats.open_trades  ?? 0;
  const wins        = Math.round((winRate / 100) * totalTrades);
  const losses      = totalTrades - wins;
  const pf          = stats.profit_factor ?? 0;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* Whale alert bandı */}
      {alertBand && (
        <Animated.View style={[s.alertBand, { opacity: bandAnim }]}>
          <Text style={s.alertText}>
            🐋 {alertBand.symbol ?? ''} · {alertBand.usd_value ? `$${(alertBand.usd_value / 1e6).toFixed(1)}M` : ''} whale hareketi
          </Text>
        </Animated.View>
      )}

      {/* Sticky header (web dashboard sticky header klonu) */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.headerIcon}>
            <Ionicons name="bar-chart" size={20} color={Colors.blue} />
          </View>
          <View>
            <Text style={s.headerTitle}>Dashboard</Text>
            <Text style={s.headerSub}>
              Merhaba {user?.full_name?.split(' ')[0] ?? 'Balina'} 👋
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={logout} style={s.logoutBtn}>
          <Ionicons name="log-out-outline" size={20} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.cyanPrimary} />}
        showsVerticalScrollIndicator={false}
      >

        {/* ── 4 Metrik Kartı (2x2 grid, web klonu) ─────────────────────── */}
        <View style={s.metricsGrid}>
          <MetricCard
            label="TOPLAM PNL"
            value={`${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(0)}`}
            color={totalPnl >= 0 ? Colors.profit : Colors.loss}
            icon={totalPnl >= 0 ? 'trending-up' : 'trending-down'}
          />
          <WinRateCard winRate={winRate} wins={wins} losses={losses} />
          <MetricCard
            label="PROFIT FACTOR"
            value={pf.toFixed(2)}
            sub={pf >= 1.5 ? '✓ İyi' : 'Geliştir'}
            color={pf >= 1.5 ? Colors.profit : Colors.warning}
            icon="shield-checkmark"
          />
          <MetricCard
            label="AÇIK POZİSYON"
            value={openCount}
            sub={`${totalTrades} toplam`}
            color={Colors.blue}
            icon="flash"
          />
        </View>

        {/* ── Equity Curve ─────────────────────────────────────────────── */}
        {ec.length >= 2 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Ionicons name="trending-up" size={16} color={Colors.blue} />
              <Text style={s.sectionTitle}>Sermaye Eğrisi</Text>
            </View>
            <View style={s.chartCard}>
              <MiniEquityChart data={ec} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                <Text style={{ color: Colors.textMuted, fontSize: 11 }}>
                  ${(ec[0]?.balance ?? 0).toFixed(0)}
                </Text>
                <Text style={{ color: ec[ec.length-1]?.balance >= ec[0]?.balance ? Colors.profit : Colors.loss, fontSize: 11, fontWeight: '800' }}>
                  ${(ec[ec.length-1]?.balance ?? 0).toFixed(0)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ── 7 Günlük Para Akışı ──────────────────────────────────────── */}
        {flow.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Ionicons name="calendar" size={16} color={Colors.yellow} />
              <Text style={s.sectionTitle}>7 Günlük Para Akışı</Text>
            </View>
            <View style={s.chartCard}>
              <PnlBars flow={flow} />
            </View>
          </View>
        )}

        {/* ── AI Günlük Bias (web biasCard klonu) ─────────────────────── */}
        {bias && (
          <View style={s.biasCard}>
            <Text style={s.biasLabel}>AI GÜNLÜK BİAS</Text>
            <View style={s.biasRow}>
              <Text style={[s.biasDir, {
                color: bias.direction === 'LONG'  ? Colors.profit :
                       bias.direction === 'SHORT' ? Colors.loss   : Colors.warning
              }]}>
                {bias.direction ?? 'NÖTR'}
              </Text>
              {bias.confidence && (
                <View style={s.biasConfBadge}>
                  <Text style={s.biasConfText}>%{(bias.confidence * 100).toFixed(0)} güven</Text>
                </View>
              )}
            </View>
            {bias.summary && <Text style={s.biasSummary}>{bias.summary}</Text>}
          </View>
        )}

        {/* ── Son İşlemler ─────────────────────────────────────────────── */}
        {trades.length > 0 && (
          <View style={s.section}>
            <View style={[s.sectionHeader, { justifyContent: 'space-between' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="document-text" size={16} color={Colors.cyanPrimary} />
                <Text style={s.sectionTitle}>Son İşlemler</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Journal')}>
                <Text style={s.seeAll}>Tümü →</Text>
              </TouchableOpacity>
            </View>
            <View style={s.card}>
              {trades.map((t) => <TradeRow key={t.id} trade={t} />)}
            </View>
          </View>
        )}

        {/* ── Kritik Haberler ──────────────────────────────────────────── */}
        {news.length > 0 && (
          <View style={s.section}>
            <View style={[s.sectionHeader, { justifyContent: 'space-between' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="newspaper" size={16} color={Colors.warning} />
                <Text style={s.sectionTitle}>Kritik Haberler</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Haberler')}>
                <Text style={s.seeAll}>Tümü →</Text>
              </TouchableOpacity>
            </View>
            <View style={s.card}>
              {news.slice(0, 4).map((n, i) => (
                <View key={i} style={s.newsRow}>
                  <View style={[s.impactDot, {
                    backgroundColor: n.impact === 'HIGH' ? Colors.loss :
                                     n.impact === 'MEDIUM' ? Colors.warning : Colors.textMuted
                  }]} />
                  <Text style={s.newsTitle} numberOfLines={2}>{n.title}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Veri yok durumu */}
        {!data && (
          <View style={s.empty}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>📊</Text>
            <Text style={{ color: Colors.textMuted, fontSize: 14, textAlign: 'center' }}>
              Henüz işlem verisi yok.{'\n'}Trade ekleyerek başla.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ── Stiller ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.bg },
  retryBtn:{ borderWidth: 1, borderColor: Colors.cyanBorder, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },

  alertBand:{ backgroundColor: 'rgba(168,85,247,0.15)', borderBottomWidth: 1, borderColor: Colors.purpleBorder, paddingVertical: 8, paddingHorizontal: 16 },
  alertText:{ color: Colors.purple, fontSize: 13, fontWeight: '800' },

  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: 'rgba(15,23,42,0.9)', borderBottomWidth: 1, borderColor: Colors.borderGlass },
  headerLeft:{ flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon:{ width: 38, height: 38, borderRadius: 10, backgroundColor: Colors.blue + '22', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.blue + '44' },
  headerTitle:{ fontSize: 16, fontWeight: '900', color: Colors.textPrimary },
  headerSub: { fontSize: 12, color: Colors.textSecondary },
  logoutBtn: { padding: 8 },

  metricsGrid:{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },

  section:      { marginBottom: 20 },
  sectionHeader:{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary, letterSpacing: 0.3 },
  seeAll:       { fontSize: 12, color: Colors.cyanPrimary },

  chartCard:{ backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 16, padding: 16 },
  card:     { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 16, overflow: 'hidden' },

  // AI Bias (web klonu)
  biasCard:    { backgroundColor: Colors.cyanDim, borderWidth: 1, borderColor: Colors.cyanBorder, borderRadius: 16, padding: 16, marginBottom: 20 },
  biasLabel:   { fontSize: 10, fontWeight: '900', color: Colors.cyanPrimary, letterSpacing: 1.5, marginBottom: 10, textTransform: 'uppercase' },
  biasRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  biasDir:     { fontSize: 24, fontWeight: '900' },
  biasConfBadge: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  biasConfText:  { color: Colors.textSecondary, fontSize: 12 },
  biasSummary: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },

  newsRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderColor: Colors.borderLight, gap: 10 },
  impactDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  newsTitle: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },

  empty: { alignItems: 'center', justifyContent: 'center', padding: 40, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: 16, borderStyle: 'dashed', marginTop: 20 },
});

const mc = StyleSheet.create({
  card:  { width: '47.5%', backgroundColor: Colors.card, borderTopWidth: 3, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, padding: 14, overflow: 'hidden' },
  orb:   { position: 'absolute', top: -20, right: -20, width: 70, height: 70, borderRadius: 35 },
  row:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  label: { fontSize: 9, color: Colors.textMuted, fontWeight: '800', letterSpacing: 1 },
  value: { fontSize: 22, fontWeight: '900', lineHeight: 26 },
  sub:   { fontSize: 11, color: Colors.textMuted, marginTop: 3 },
});

const tr = StyleSheet.create({
  row:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderColor: Colors.borderLight },
  left:   { gap: 2 },
  symbol: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  dir:    { fontSize: 11, color: Colors.textMuted },
  pnl:    { fontSize: 15, fontWeight: '800' },
});
