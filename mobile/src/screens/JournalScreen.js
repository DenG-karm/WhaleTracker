/**
 * src/screens/JournalScreen.js
 * Sayfalı trade günlüğü — filtreli arama, OPEN/CLOSED toggle
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, TextInput, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MobileAPI } from '../services/api';
import { Colors } from '../constants/colors';

function TradeCard({ item }) {
  const pnl   = item.pnl ?? 0;
  const color = pnl >= 0 ? Colors.profit : Colors.loss;
  const isOpen= item.status === 'OPEN';

  return (
    <View style={c.card}>
      <View style={c.cardHeader}>
        <Text style={c.symbol}>{item.symbol}</Text>
        <View style={[c.statusBadge, isOpen ? c.badgeOpen : c.badgeClosed]}>
          <Text style={[c.statusText, { color: isOpen ? Colors.warning : Colors.neutral }]}>
            {isOpen ? 'AÇIK' : 'KAPALI'}
          </Text>
        </View>
      </View>

      <View style={c.cardBody}>
        <View>
          <Text style={c.metaLabel}>Yön</Text>
          <Text style={c.metaValue}>{item.direction ?? '—'}</Text>
        </View>
        <View>
          <Text style={c.metaLabel}>Giriş</Text>
          <Text style={c.metaValue}>{item.entry_price ?? '—'}</Text>
        </View>
        <View>
          <Text style={c.metaLabel}>Çıkış</Text>
          <Text style={c.metaValue}>{item.exit_price ?? '—'}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={c.metaLabel}>PnL</Text>
          <Text style={[c.pnlValue, { color }]}>
            {isOpen ? '—' : `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}$`}
          </Text>
        </View>
      </View>

      {item.ai_feedback && (
        <View style={c.aiBadge}>
          <Text style={c.aiText} numberOfLines={1}>🤖 {item.ai_feedback}</Text>
        </View>
      )}
    </View>
  );
}

export default function JournalScreen() {
  const insets = useSafeAreaInsets();

  const [trades, setTrades]       = useState([]);
  const [page, setPage]           = useState(1);
  const [hasMore, setHasMore]     = useState(true);
  const [loading, setLoading]     = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState(null); // null | 'OPEN' | 'CLOSED'
  const [symbolSearch, setSymbolSearch] = useState('');

  const load = useCallback(async (reset = false) => {
    if (loading && !reset) return;
    const currentPage = reset ? 1 : page;
    if (reset) setRefreshing(true); else setLoading(true);

    try {
      const res = await MobileAPI.journal(
        currentPage, 20,
        statusFilter,
        symbolSearch.trim() || null,
      );
      const items = res?.trades ?? [];
      if (reset) {
        setTrades(items);
        setPage(2);
      } else {
        setTrades(prev => [...prev, ...items]);
        setPage(p => p + 1);
      }
      setHasMore(items.length === 20);
    } catch {
      // sessiz hata
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, loading, statusFilter, symbolSearch]);

  // Filtre değişince sıfırla
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    setTrades([]);
    load(true);
  }, [statusFilter, symbolSearch]);

  const renderFooter = () => {
    if (!loading || refreshing) return null;
    return <ActivityIndicator color={Colors.cyan} style={{ marginVertical: 16 }} />;
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Başlık */}
      <View style={s.header}>
        <Text style={s.title}>Trade Günlüğü</Text>
      </View>

      {/* Arama + filtre */}
      <View style={s.filterRow}>
        <TextInput
          style={s.search}
          placeholder="Sembol ara... (BTCUSDT)"
          placeholderTextColor={Colors.textMuted}
          value={symbolSearch}
          onChangeText={setSymbolSearch}
          autoCapitalize="characters"
        />
        {['OPEN', 'CLOSED', null].map((f) => (
          <TouchableOpacity
            key={String(f)}
            style={[s.filterBtn, statusFilter === f && s.filterActive]}
            onPress={() => setStatusFilter(statusFilter === f ? null : f)}
          >
            <Text style={[s.filterText, statusFilter === f && { color: Colors.cyan }]}>
              {f ?? 'Tümü'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={trades}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <TradeCard item={item} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        onEndReached={() => hasMore && load()}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={Colors.cyan}
          />
        }
        ListEmptyComponent={
          !loading && (
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Text style={{ color: Colors.textMuted, fontSize: 14 }}>İşlem bulunamadı</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: Colors.bg },
  header:     { paddingHorizontal: 16, paddingVertical: 12 },
  title:      { fontSize: 20, fontWeight: '900', color: Colors.textPrimary },
  filterRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  search:     { flex: 1, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, color: Colors.textPrimary, fontSize: 13 },
  filterBtn:  { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  filterActive:{ borderColor: Colors.cyanBorder, backgroundColor: Colors.cyanDim },
  filterText: { fontSize: 11, fontWeight: '700', color: Colors.textMuted },
});

const c = StyleSheet.create({
  card:        { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 16, padding: 16, marginBottom: 10 },
  cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  symbol:      { fontSize: 16, fontWeight: '900', color: Colors.textPrimary },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  badgeOpen:   { borderColor: 'rgba(245,158,11,0.3)', backgroundColor: 'rgba(245,158,11,0.08)' },
  badgeClosed: { borderColor: Colors.borderLight, backgroundColor: 'transparent' },
  statusText:  { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  cardBody:    { flexDirection: 'row', justifyContent: 'space-between' },
  metaLabel:   { fontSize: 10, color: Colors.textMuted, marginBottom: 3 },
  metaValue:   { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  pnlValue:    { fontSize: 15, fontWeight: '900' },
  aiBadge:     { marginTop: 12, backgroundColor: 'rgba(168,85,247,0.08)', borderRadius: 8, padding: 8 },
  aiText:      { fontSize: 12, color: Colors.purple },
});
