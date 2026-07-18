/**
 * src/screens/AIChatScreen.js
 * AI Coach sohbet ekranı — streaming-like UX
 * Gemini backend'i çağırır; cevabı mesaj olarak gösterir.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AIAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../constants/colors';

let _convId = null; // oturum boyunca conversation_id sakla

function Message({ item }) {
  const isUser = item.role === 'user';
  return (
    <View style={[msg.wrap, isUser ? msg.userWrap : msg.aiWrap]}>
      {!isUser && <Text style={msg.avatar}>🐋</Text>}
      <View style={[msg.bubble, isUser ? msg.userBubble : msg.aiBubble]}>
        <Text style={[msg.text, isUser ? msg.userText : msg.aiText]}>
          {item.content}
        </Text>
      </View>
    </View>
  );
}

export default function AIChatScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [messages, setMessages] = useState([
    {
      id: '0',
      role: 'assistant',
      content: `Merhaba${user?.full_name ? ' ' + user.full_name.split(' ')[0] : ''}! 🐋\n\nBen WhaleTracker AI Coach'un — sana trade stratejisi, piyasa analizi ve psikoloji konularında yardım edebilirim. Ne öğrenmek istersin?`,
    },
  ]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const listRef               = useRef(null);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  useEffect(() => { scrollToEnd(); }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { id: Date.now().toString(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await AIAPI.chat(text, _convId);
      if (res?.conversation_id) _convId = res.conversation_id;

      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res?.reply ?? res?.response ?? res?.message ?? 'Yanıt alınamadı.',
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (e) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Üzgünüm, bir hata oluştu: ${e.message}`,
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Hızlı soru önerileri
  const SUGGESTIONS = [
    'Risk yönetimi nasıl yapmalıyım?',
    'BTCUSDT için günlük bias ne?',
    'Pozisyon boyutu hesapla',
    'Trade psikolojisi nedir?',
  ];

  return (
    <KeyboardAvoidingView
      style={[s.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Başlık */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.title}>AI Coach</Text>
          <View style={s.onlineDot} />
        </View>
        <Text style={s.powered}>Gemini 2.5 Flash</Text>
      </View>

      {/* Mesaj listesi */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <Message item={item} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToEnd}
      />

      {/* Yazıyor göstergesi */}
      {loading && (
        <View style={s.typingRow}>
          <Text style={s.typingEmoji}>🐋</Text>
          <View style={s.typingBubble}>
            <ActivityIndicator color={Colors.cyan} size="small" />
          </View>
        </View>
      )}

      {/* Öneri butonları (sadece başlangıçta) */}
      {messages.length <= 1 && (
        <View style={s.suggestions}>
          {SUGGESTIONS.map((sug, i) => (
            <TouchableOpacity
              key={i}
              style={s.sugBtn}
              onPress={() => { setInput(sug); }}
            >
              <Text style={s.sugText}>{sug}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Input alanı */}
      <View style={[s.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          style={s.input}
          value={input}
          onChangeText={setInput}
          placeholder="Bir şey sor..."
          placeholderTextColor={Colors.textMuted}
          multiline
          maxLength={1000}
          onSubmitEditing={send}
        />
        <TouchableOpacity
          style={[s.sendBtn, (!input.trim() || loading) && s.sendDisabled]}
          onPress={send}
          disabled={!input.trim() || loading}
          activeOpacity={0.8}
        >
          <Text style={s.sendIcon}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: Colors.bg },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: Colors.border },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title:      { fontSize: 18, fontWeight: '900', color: Colors.textPrimary },
  onlineDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.profit },
  powered:    { fontSize: 11, color: Colors.textMuted },

  typingRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  typingEmoji: { fontSize: 18 },
  typingBubble:{ backgroundColor: Colors.card, borderRadius: 12, padding: 10 },

  suggestions: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, paddingBottom: 8 },
  sugBtn:      { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  sugText:     { fontSize: 12, color: Colors.textSecondary },

  inputBar:  { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingTop: 8, borderTopWidth: 1, borderColor: Colors.border, gap: 8 },
  input:     { flex: 1, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, color: Colors.textPrimary, fontSize: 15, maxHeight: 120 },
  sendBtn:   { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.cyan, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.35 },
  sendIcon:  { color: Colors.bg, fontSize: 20, fontWeight: '900' },
});

const msg = StyleSheet.create({
  wrap:       { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end', gap: 8 },
  userWrap:   { justifyContent: 'flex-end' },
  aiWrap:     { justifyContent: 'flex-start' },
  avatar:     { fontSize: 20 },
  bubble:     { maxWidth: '78%', borderRadius: 18, padding: 12 },
  userBubble: { backgroundColor: Colors.cyan, borderBottomRightRadius: 4 },
  aiBubble:   { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderBottomLeftRadius: 4 },
  text:       { fontSize: 14, lineHeight: 21 },
  userText:   { color: Colors.bg, fontWeight: '600' },
  aiText:     { color: Colors.textPrimary },
});
