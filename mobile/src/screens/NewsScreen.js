/**
 * src/screens/NewsScreen.js
 * Haberler + AI günlük market özeti
 * Web News.jsx'in mobil versiyonu
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Modal, ScrollView, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NewsAPI, AIAPI } from '../services/api';
import { Colors } from '../constants/colors';

const IMPACT_CONFIG = {
  HIGH:   { color: Colors.loss,    bg: Colors.loss    + '18', label: 'KRİTİK' },
  MEDIUM: { color: Colors.warning, bg: Colors.warning + '18', label: 'ORTA'   },
  LOW:    { color: Colors.textMuted, bg: Colors.borderLight,  label: 'DÜŞÜK' },
};

// ── Haber satırı ──────────────────────────────────────────────────────────────
function NewsItem({ item, onPress }) {
  const cfg = IMPACT_CONFIG[item.impact] ?? IMPACT_CONFIG.LOW;
  const relTime = item.published_at
    ? (() => {
        const diff = (Date.now() - new Date(item.published_at)) / 60000;
        if (diff < 60)   return `${Math.floor(diff)}dk önce`;
        if (diff < 1440) return `${Math.floor(diff / 60)}sa önce`;
        return `${Math.floor(diff / 1440)}g önce`;
      })()
    : '';

  return (
    <TouchableOpacity onPress={() => onPress(item)} activeOpacity={0.75}>
      <View style={ni.card}>
        <View style={ni.top}>
          <View style={[ni.badge, { backgroundColor: cfg.bg }]}>
            <Text style={[ni.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          {item.source && <Text style={ni.source}>{item.source}</Text>}
          <Text style={ni.time}>{relTime}</Text>
        </View>
        <Text style={ni.title} numberOfLines={3}>{item.title}</Text>
        {item.impact === 'HIGH' && (
          <View style={ni.aiHint}>
            <Ionicons name="sparkles" size={12} color={Colors.purple} />
            <Text style={ni.aiHintText}>AI yorumu için dokun</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── AI Yorum Modal ────────────────────────────────────────────────────────────
function AICommentModal({ news, visible, onClose }) {
  const [aiText, setAiText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !news) return;
    setAiText('');
    setLoading(true);
    AIAPI.chat(`Bu haberi analiz et ve trade'e etkisini değerlendir: "${news.title}"`)
      .then(d => setAiText(d?.response || d?.message || JSON.stringify(d)))
      .catch(e => setAiText('AI analizi alınamadı: ' + e.message))
      .finally(() => setLoading(false));
  }, [visible, news]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={mo.overlay}>
        <View style={mo.sheet}>
          <View style={mo.handle} />
          <View style={mo.header}>
            <View style={mo.headerIcon}>
              <Ionicons name="sparkles" size={18} color={Colors.purple} />
            </View>
            <Text style={mo.headerTitle}>AI Analizi</Text>
            <TouchableOpacity onPress={onClose} style={mo.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={mo.newsTitle} numberOfLines={3}>{news?.title}</Text>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {loading
              ? <View style={{ alignItems: 'center', paddingTop: 40 }}>
                  <ActivityIndicator color={Colors.purple} size="large" />
                  <Text style={{ color: Colors.textMuted, marginTop: 12, fontSize: 13 }}>AI analiz ediyor...</Text>
                </View>
              : <View style={mo.aiBox}>
                  <Text style={mo.aiText}>{aiText}</Text>
                </View>
            }
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Ana Ekran ─────────────────────────────────────────────────────────────────
export default function NewsScreen() {
  const insets = useSafeAreaInsets();
  const [news, setNews]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter]     = useState('Tümü'); // Tümü | KRİTİK | ORTA

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await NewsAPI.latest(40);
      setNews(Array.isArray(data) ? data : (data?.items ?? []));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = news.filter(n => {
    if (filter === 'KRİTİK') return n.impact === 'HIGH';
    if (filter === 'ORTA')   return n.impact === 'MEDIUM';
    return true;
  });

  const criticalCount = news.filter(n => n.impact === 'HIGH').length;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.headerIcon}>
            <Ionicons name="newspaper" size={18} color={Colors.warning} />
          </View>
          <View>
            <Text style={s.headerTitle}>Haberler</Text>
            <Text style={s.headerSub}>{criticalCount} kritik haber</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => load(true)} style={s.refreshBtn}>
          <Ionicons name="refresh" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* AI Günlük Banner — web News.jsx'teki büyük AI banner'ı */}
      {news.length > 0 && (
        <TouchableOpacity
          style={s.aiBanner}
          onPress={() => setSelected({ title: 'Bugünkü piyasa yapısını, whale hareketlerini ve macro durumu analiz et. Trader\'a bugün için önemli noktaları özetle.', impact: 'HIGH' })}
          activeOpacity={0.85}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="sparkles" size={20} color={Colors.purple} />
            <View style={{ flex: 1 }}>
              <Text style={s.aiBannerTitle}>AI Günlük Market Özeti</Text>
              <Text style={s.aiBannerSub}>Piyasa yapısı · Macro risk · Trade fırsatları</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.purple} />
          </View>
        </TouchableOpacity>
      )}

      {/* Filtreler */}
      <View style={s.filterRow}>
        {['Tümü', 'KRİTİK', 'ORTA'].map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[s.filterBtn, filter === f && s.filterBtnActive]}
          >
            <Text style={[s.filterText, filter === f && s.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && (
        <View style={s.center}>
          <ActivityIndicator color={Colors.cyanPrimary} size="large" />
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => <NewsItem item={item} onPress={setSelected} />}
        contentContainerStyle={{ padding: 14, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.cyanPrimary} />}
        ListEmptyComponent={!loading && (
          <View style={s.empty}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>📰</Text>
            <Text style={{ color: Colors.textMuted, fontSize: 14, textAlign: 'center' }}>Haber bulunamadı</Text>
          </View>
        )}
      />

      <AICommentModal
        news={selected}
        visible={!!selected}
        onClose={() => setSelected(null)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  empty:  { alignItems: 'center', paddingTop: 60 },

  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: 'rgba(15,23,42,0.9)', borderBottomWidth: 1, borderColor: Colors.borderGlass },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: Colors.warning + '18', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.warning + '33' },
  headerTitle:{ fontSize: 16, fontWeight: '900', color: Colors.textPrimary },
  headerSub:  { fontSize: 12, color: Colors.textSecondary },
  refreshBtn: { padding: 8 },

  aiBanner: {
    margin: 14, marginBottom: 0,
    backgroundColor: Colors.purpleDim,
    borderWidth: 1, borderColor: Colors.purpleBorder,
    borderRadius: 14, padding: 14,
  },
  aiBannerTitle: { fontSize: 14, fontWeight: '900', color: Colors.purple },
  aiBannerSub:   { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },

  filterRow:  { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderColor: Colors.borderLight },
  filterBtn:  { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
  filterBtnActive: { backgroundColor: Colors.cyanDim, borderColor: Colors.cyanBorder },
  filterText: { fontSize: 12, fontWeight: '700', color: Colors.textMuted },
  filterTextActive: { color: Colors.cyanPrimary },
});

const ni = StyleSheet.create({
  card:  { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, padding: 14, marginBottom: 10 },
  top:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 },
  badgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  source:{ fontSize: 11, color: Colors.textMuted, flex: 1 },
  time:  { fontSize: 11, color: Colors.textMuted },
  title: { fontSize: 14, color: Colors.textPrimary, lineHeight: 20, fontWeight: '500' },
  aiHint:{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  aiHintText: { fontSize: 11, color: Colors.purple },
});

const mo = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet:   { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', padding: 20 },
  handle:  { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  header:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  headerIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.purpleDim, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.purpleBorder },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '900', color: Colors.textPrimary },
  closeBtn:{ padding: 4 },
  newsTitle: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderColor: Colors.border },
  aiBox:   { backgroundColor: Colors.purpleDim, borderWidth: 1, borderColor: Colors.purpleBorder, borderRadius: 14, padding: 16, marginBottom: 20 },
  aiText:  { color: Colors.textPrimary, fontSize: 14, lineHeight: 22 },
});
