/**
 * src/screens/StatsScreen.js
 * İstatistiksel analiz — 7d / 30d / 90d / all periyotları
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MobileAPI } from '../services/api';
import { Colors } from '../constants/colors';

const PERIODS = [
  { label: '7G',  value: '7d' },
  { label: '30G', value: '30d' },
  { label: '90G', value: '90d' },
  { label: 'Tüm', value: 'all' },
];

function MetricRow({ label, value, color }) {
  return (
    <View style={m.row}>
      <Text style={m.label}>{label}</Text>
      <Text style={[m.value, color ? { color } : null]}>{value ?? '—'}</Text>
    </View>
  );
}

function FlowBar({ day, value, max }) {
  const ratio  = max > 0 ? Math.abs(value) / max : 0;
  const height = Math.max(4, ratio * 80);
  const color  = value >= 0 ? Colors.profit : Colors.loss;
  return (
    <View style={fb.wrap}>
      <View style={{ height: 80, justifyContent: 'flex-end' }}>
        <View style={{ height, width: 20, backgroundColor: color, borderRadius: 4 }} />
      </View>
      <Text style={fb.label}>{day?.slice(5) ?? ''}</Text>
      <Text style={[fb.val, { color }]}>{value >= 0 ? '+' : ''}{value.toFixed(0)}</Text>
    </View>
  );
}

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const [period, setPeriod]       = useState('30d');
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await MobileAPI.stats(period);
      setData(res);
    } catch {
      // sessiz
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const stats = data?.stats ?? {};
  const flow  = data?.money_flow ?? [];
  const maxFlow = Math.max(...flow.map(f => Math.abs(f.pnl ?? 0)), 1);

  const totalPnl  = stats.total_pnl ?? 0;
  const winRate   = stats.win_rate  ?? 0;
  const pf        = stats.profit_factor ?? 0;
  const avgWin    = stats.avg_win  ?? 0;
  const avgLoss   = stats.avg_loss ?? 0;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.title}>İstatistikler</Text>

        {/* Periyot seçici */}
        <View style={s.periodRow}>
          {PERIODS.map(p => (
            <TouchableOpacity
              key={p.value}
              style={[s.periodBtn, period === p.value && s.periodActive]}
              onPress={() => setPeriod(p.value)}
            >
              <Text style={[s.periodText, period === p.value && { color: Colors.cyan }]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading && !refreshing
        ? <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator color={Colors.cyan} size="large" />
          </View>
        : (
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.cyan} />}
            showsVerticalScrollIndicator={false}
          >
            {/* Ana PnL kartı */}
            <View style={s.pnlCard}>
              <Text style={s.pnlLabel}>Toplam PnL ({PERIODS.find(p => p.value === period)?.label})</Text>
              <Text style={[s.pnlValue, { color: totalPnl >= 0 ? Colors.profit : Colors.loss }]}>
                {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)}$
              </Text>
            </View>

            {/* Metrikler */}
            <View style={s.metricsCard}>
              <MetricRow label="Win Rate"        value={`%${winRate.toFixed(1)}`}   color={winRate >= 50 ? Colors.profit : Colors.loss} />
              <MetricRow label="Profit Factor"   value={pf.toFixed(2)}              color={pf >= 1 ? Colors.profit : Colors.loss} />
              <MetricRow label="Ort. Kazanç"     value={`+${avgWin.toFixed(2)}$`}   color={Colors.profit} />
              <MetricRow label="Ort. Kayıp"      value={`-${Math.abs(avgLoss).toFixed(2)}$`} color={Colors.loss} />
              <MetricRow label="Toplam İşlem"    value={stats.total_trades ?? 0} />
              <MetricRow label="Kapalı İşlem"    value={stats.closed_trades ?? 0} />
              <MetricRow label="Açık Pozisyon"   value={stats.open_trades ?? 0} />
              <MetricRow label="En İyi İşlem"    value={stats.best_trade  ? `+${Number(stats.best_trade).toFixed(2)}$`  : '—'} color={Colors.profit} />
              <MetricRow label="En Kötü İşlem"   value={stats.worst_trade ? `${Number(stats.worst_trade).toFixed(2)}$` : '—'} color={Colors.loss} />
              <MetricRow label="Mevcut Seri"     value={stats.current_streak ?? 0} />
            </View>

            {/* Para akışı grafiği */}
            {flow.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Günlük Para Akışı</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={s.flowChart}>
                    {flow.map((f, i) => (
                      <FlowBar key={i} day={f.day} value={f.pnl ?? 0} max={maxFlow} />
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}
          </ScrollView>
        )
      }
    </View>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: Colors.bg },
  header:     { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  title:      { fontSize: 20, fontWeight: '900', color: Colors.textPrimary, marginBottom: 12 },

  periodRow:  { flexDirection: 'row', gap: 8 },
  periodBtn:  { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  periodActive:{ borderColor: Colors.cyanBorder, backgroundColor: Colors.cyanDim },
  periodText: { fontSize: 12, fontWeight: '700', color: Colors.textMuted },

  pnlCard:   { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 12 },
  pnlLabel:  { fontSize: 12, color: Colors.textMuted, marginBottom: 6 },
  pnlValue:  { fontSize: 36, fontWeight: '900' },

  metricsCard:{ backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 16, padding: 4, marginBottom: 20 },

  section:      { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary, marginBottom: 12 },
  flowChart:    { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingVertical: 8 },
});

const m = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: 1, borderColor: Colors.borderLight },
  label: { fontSize: 13, color: Colors.textSecondary },
  value: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
});

const fb = StyleSheet.create({
  wrap:  { alignItems: 'center', width: 36 },
  label: { fontSize: 9, color: Colors.textMuted, marginTop: 4 },
  val:   { fontSize: 9, fontWeight: '700', marginTop: 1 },
});
