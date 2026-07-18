/**
 * src/screens/BetaFullScreen.js
 * 100 kişilik beta kontenjanı dolunca gösterilen ekran
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Colors } from '../constants/colors';

export default function BetaFullScreen({ navigation }) {
  const openWaitlist = () =>
    Linking.openURL('mailto:info@whaletracker.app?subject=Beta%20Bekleme%20Listesi&body=Tam%20s%C3%BCr%C3%BCm%20%C3%A7%C4%B1k%C4%B1nca%20haberdar%20edilmek%20istiyorum.');

  return (
    <View style={s.root}>
      <Text style={s.emoji}>🐋</Text>

      <View style={s.badge}>
        <Text style={s.badgeText}>BETA · KONTENJAN DOLU</Text>
      </View>

      <Text style={s.title}>100 Balina{'\n'}
        <Text style={s.titleAccent}>Aramıza Katıldı</Text>
      </Text>

      <Text style={s.body}>
        Beta kontenjanımız doldu. Erken erişim listesine adını ekle — tam sürüm çıktığında seni öncelikli olarak içeri alıyoruz.
      </Text>

      <View style={s.perks}>
        <Text style={s.perkTitle}>Beta Kullanıcılarına Özel</Text>
        <Text style={s.perk}>✦ Tam sürümde %30 indirimli fiyatlandırma</Text>
        <Text style={s.perk}>✦ Pro özellikler 3 ay ücretsiz</Text>
        <Text style={s.perk}>✦ Öncelikli erişim ve özel rozet</Text>
      </View>

      <TouchableOpacity style={s.btn} onPress={openWaitlist} activeOpacity={0.8}>
        <Text style={s.btnText}>Bekleme Listesine Katıl →</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.replace('Login')}>
        <Text style={s.link}>Zaten hesabım var — giriş yap</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center', padding: 28 },

  emoji: { fontSize: 56, marginBottom: 20 },

  badge:     { backgroundColor: Colors.purpleDim, borderWidth: 1, borderColor: Colors.purpleBorder, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 20 },
  badgeText: { fontSize: 10, fontWeight: '900', color: Colors.purple, letterSpacing: 2 },

  title:       { fontSize: 28, fontWeight: '900', color: Colors.textPrimary, textAlign: 'center', lineHeight: 36, marginBottom: 16 },
  titleAccent: { color: Colors.purple },

  body: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },

  perks:     { backgroundColor: Colors.purpleDim, borderWidth: 1, borderColor: Colors.purpleBorder, borderRadius: 16, padding: 20, width: '100%', marginBottom: 28 },
  perkTitle: { fontSize: 11, fontWeight: '800', color: Colors.purple, letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' },
  perk:      { fontSize: 13, color: Colors.textSecondary, lineHeight: 22 },

  btn:    { width: '100%', backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.purpleBorder, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 14 },
  btnText:{ color: Colors.purple, fontWeight: '900', fontSize: 15 },

  link: { color: Colors.textMuted, fontSize: 13, textDecorationLine: 'underline' },
});
