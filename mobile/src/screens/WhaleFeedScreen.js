/**
 * src/screens/WhaleFeedScreen.js
 * Canlı balina akışı — WebSocket + filtreler + animasyon
 * Web WhaleFeed.jsx'in mobil versiyonu
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Animated, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useWebSocket } from '../hooks/useWebSocket';
import { Colors } from '../constants/colors';

const FILTERS = ['Tümü', '$10M+', '$100M+'];

function fmtUSD(val) {
  if (!val) return '?';
  const m = val / 1e6;
  if (m >= 1000) return `$${(m / 1000).toFixed(1)}B`;
  return `$${m.toFixed(1)}M`;
}

function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

// ── Alert kartı ───────────────────────────────────────────────────────────────
function AlertCard({ item, index }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1, duration: 400,
      delay: index * 30,
      useNativeDriver: true,
    }).start();
  }, []);

  const isLarge = (item.usd_value || 0) >= 1e8; // $100M+
  const accent  = isLarge ? Colors.purple : Colors.cyanPrimary;

  return (
    <Animated.View style={[
      ac.card,
      { borderLeftColor: accent, opacity: anim, transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] },
      isLarge && { backgroundColor: 'rgba(168,85,247,0.08)' },
    ]}>
      <View style={ac.top}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={ac.whale}>🐋</Text>
          <Text style={[ac.symbol, { color: accent }]}>{item.symbol ?? 'UNKNOWN'}</Text>
          {isLarge && (
            <View style={ac.largeBadge}>
              <Text style={ac.largeBadgeText}>MEGA</Text>
            </View>
          )}
        </View>
        <Text style={ac.amount}>{fmtUSD(item.usd_value)}</Text>
      </View>

      <View style={ac.bottom}>
        <View style={[ac.dirBadge, { backgroundColor: item.direction === 'BUY' ? Colors.profit + '22' : Colors.loss + '22' }]}>
          <Text style={[ac.dirText, { color: item.direction === 'BUY' ? Colors.profit : Colors.loss }]}>
            {item.direction ?? '?'}
          </Text>
        </View>
        {item.exchange && <Text style={ac.meta}>{item.exchange}</Text>}
        <Text style={ac.meta}>· {fmtTime(item.timestamp)}</Text>
      </View>
    </Animated.View>
  );
}

// ── Ana ekran ─────────────────────────────────────────────────────────────────
export default function WhaleFeedScreen() {
  const insets = useSafeAreaInsets();
  const { lastMessage, status } = useWebSocket('/ws/whale-alerts');
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('Tümü');
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Bağlantı durumu pulse
  useEffect(() => {
    if (status === 'open') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.4, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [status]);

  useEffect(() => {
    if (!lastMessage) return;
    setAlerts(prev => [{ ...lastMessage, _id: Date.now() }, ...prev].slice(0, 100));
  }, [lastMessage]);

  const filtered = alerts.filter(a => {
    if (filter === '$10M+')  return (a.usd_value || 0) >= 1e7;
    if (filter === '$100M+') return (a.usd_value || 0) >= 1e8;
    return true;
  });

  const statusColor = { open: Colors.profit, connecting: Colors.yellow, error: Colors.loss, closed: Colors.textMuted }[status] || Colors.textMuted;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.headerIcon}>
            <Text style={{ fontSize: 18 }}>🐋</Text>
          </View>
          <View>
            <Text style={s.headerTitle}>Whale Feed</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Animated.View style={[s.dot, { backgroundColor: statusColor, transform: [{ scale: pulseAnim }] }]} />
              <Text style={[s.statusText, { color: statusColor }]}>
                {{ open: 'Canlı', connecting: 'Bağlanıyor...', error: 'Bağlantı Hatası', closed: 'Bağlantı Kesildi' }[status] ?? status}
              </Text>
            </View>
          </View>
        </View>
        <Text style={s.countBadge}>{alerts.length} alert</Text>
      </View>

      {/* Filtreler */}
      <View style={s.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[s.filterBtn, filter === f && s.filterBtnActive]}
          >
            <Text style={[s.filterText, filter === f && s.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Liste */}
      {status === 'connecting' && alerts.length === 0 && (
        <View style={s.center}>
          <ActivityIndicator color={Colors.cyanPrimary} size="large" />
          <Text style={s.centerText}>Canlı balina akışına bağlanıyor...</Text>
        </View>
      )}

      {status !== 'connecting' && alerts.length === 0 && (
        <View style={s.center}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🌊</Text>
          <Text style={s.centerText}>
            {status === 'open' ? 'Henüz whale hareketi yok...' : 'Backend\'e bağlanılamadı'}
          </Text>
          <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 6 }}>
            {status === 'open' ? 'Büyük işlemler buraya düşecek' : 'Backend\'in çalıştığından emin ol'}
          </Text>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={i => String(i._id ?? Math.random())}
        renderItem={({ item, index }) => <AlertCard item={item} index={index} />}
        contentContainerStyle={{ padding: 14, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={null}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  centerText: { color: Colors.textSecondary, fontSize: 15, textAlign: 'center', marginTop: 12 },

  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: 'rgba(15,23,42,0.9)', borderBottomWidth: 1, borderColor: Colors.borderGlass },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: Colors.purpleDim, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.purpleBorder },
  headerTitle:{ fontSize: 16, fontWeight: '900', color: Colors.textPrimary },
  dot:        { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  countBadge: { backgroundColor: Colors.purpleDim, borderWidth: 1, borderColor: Colors.purpleBorder, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, color: Colors.purple, fontSize: 11, fontWeight: '800' },

  filterRow:  { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderColor: Colors.borderLight },
  filterBtn:  { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
  filterBtnActive: { backgroundColor: Colors.cyanDim, borderColor: Colors.cyanBorder },
  filterText: { fontSize: 12, fontWeight: '700', color: Colors.textMuted },
  filterTextActive: { color: Colors.cyanPrimary },
});

const ac = StyleSheet.create({
  card:   { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 3, borderRadius: 14, padding: 14, marginBottom: 10 },
  top:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  whale:  { fontSize: 18 },
  symbol: { fontSize: 16, fontWeight: '900' },
  amount: { fontSize: 20, fontWeight: '900', color: Colors.textPrimary },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dirBadge:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  dirText:    { fontSize: 11, fontWeight: '800' },
  meta:       { fontSize: 11, color: Colors.textMuted },
  largeBadge: { backgroundColor: Colors.purpleDim, borderWidth: 1, borderColor: Colors.purpleBorder, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  largeBadgeText: { fontSize: 9, fontWeight: '900', color: Colors.purple, letterSpacing: 1 },
});
