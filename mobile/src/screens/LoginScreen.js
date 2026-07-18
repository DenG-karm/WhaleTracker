/**
 * src/screens/LoginScreen.js
 * Web AuthPage.jsx'in tam mobil klonu
 * Adımlar: LOGIN → EMAIL → CODE → REGISTER → FORGOT → RESET_CODE → RESET_PW → BETA_FULL
 */

import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Animated, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { AuthAPI } from '../services/api';
import { Colors } from '../constants/colors';

// ── Google SVG (web'den alınan) ───────────────────────────────────────────────
const GoogleIcon = () => (
  <View style={{ width: 18, height: 18 }}>
    <Text style={{ fontSize: 14 }}>G</Text>
  </View>
);

// ── Logo bileşeni ─────────────────────────────────────────────────────────────
function WhaleLogo({ pulse }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.08, duration: 2000, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={s.logoWrap}>
      <Animated.Text style={[s.logoEmoji, { transform: [{ scale: scaleAnim }] }]}>🐋</Animated.Text>
      <View style={s.logoTextRow}>
        <Text style={s.logoWhale}>Whale</Text>
        <Text style={s.logoTracker}>Tracker</Text>
      </View>
      <View style={s.betaBadge}>
        <Text style={s.betaBadgeText}>BETA · 100 KİŞİLİK ERKEN ERİŞİM</Text>
      </View>
    </View>
  );
}

// ── OTP Input (6 kutu) ────────────────────────────────────────────────────────
function OtpInput({ value, onChange }) {
  const inputs = useRef([]);
  const digits = (value + '      ').slice(0, 6).split('');

  return (
    <View style={s.otpRow}>
      {digits.map((d, i) => (
        <TextInput
          key={i}
          ref={r => (inputs.current[i] = r)}
          style={[s.otpBox, d.trim() ? s.otpBoxFilled : null]}
          value={d.trim()}
          maxLength={1}
          keyboardType="number-pad"
          onChangeText={txt => {
            const arr = (value + '      ').slice(0, 6).split('');
            arr[i] = txt.slice(-1);
            onChange(arr.join('').trimEnd());
            if (txt && i < 5) inputs.current[i + 1]?.focus();
          }}
          onKeyPress={({ nativeEvent }) => {
            if (nativeEvent.key === 'Backspace' && !d.trim() && i > 0) {
              inputs.current[i - 1]?.focus();
            }
          }}
        />
      ))}
    </View>
  );
}

// ── Ana ekran ─────────────────────────────────────────────────────────────────
export default function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { login, loginWithGoogle, register } = useAuth();

  const [step, setStep] = useState('LOGIN'); // LOGIN | EMAIL | CODE | REGISTER | FORGOT | RESET_CODE | RESET_PW | BETA_FULL
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: '', password: '', fullName: '', code: '', newPassword: '',
  });

  const setF = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const showErr = (msg) => Alert.alert('Hata', msg);

  const handle = async (action) => {
    setLoading(true);
    try {
      let data;
      if (action === 'login') {
        const res = await login(form.email.trim().toLowerCase(), form.password);
        if (res?.betaFull) setStep('BETA_FULL');
        return;
      }
      if (action === 'send') {
        data = await AuthAPI.sendCode(form.email.trim().toLowerCase());
        if (data?.status === 'error') throw new Error(data.msg);
        setStep('CODE');
        return;
      }
      if (action === 'verify') {
        data = await AuthAPI.verifyCode(form.email.trim().toLowerCase(), form.code.trim());
        if (data?.status === 'error') throw new Error(data.msg);
        setStep('REGISTER');
        return;
      }
      if (action === 'register') {
        if (form.password.length < 8) throw new Error('Şifre en az 8 karakter olmalı');
        if (!/[A-Z]/.test(form.password)) throw new Error('Şifre en az bir büyük harf içermeli');
        if (!/\d/.test(form.password)) throw new Error('Şifre en az bir rakam içermeli');
        const res = await register({
          email: form.email.trim().toLowerCase(),
          full_name: form.fullName.trim(),
          password: form.password,
          code: form.code.trim(),
        });
        if (res?.betaFull) setStep('BETA_FULL');
        return;
      }
      if (action === 'forgot') {
        data = await AuthAPI.forgotPassword(form.email.trim().toLowerCase());
        setStep('RESET_CODE');
        return;
      }
      if (action === 'reset') {
        if (form.newPassword.length < 8) throw new Error('Şifre en az 8 karakter olmalı');
        if (!/[A-Z]/.test(form.newPassword)) throw new Error('En az bir büyük harf gerekli');
        if (!/\d/.test(form.newPassword)) throw new Error('En az bir rakam gerekli');
        data = await AuthAPI.resetPassword({
          email: form.email.trim().toLowerCase(),
          code: form.code.trim(),
          new_password: form.newPassword,
        });
        if (data?.status === 'error') throw new Error(data.msg);
        Alert.alert('Başarılı', 'Şifreniz sıfırlandı. Giriş yapabilirsiniz.');
        setStep('LOGIN');
        setForm({ email: '', password: '', fullName: '', code: '', newPassword: '' });
        return;
      }
    } catch (err) {
      showErr(err.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleGooglePress = () => {
    Alert.alert(
      'Google ile Giriş',
      'Google OAuth entegrasyonu native uygulama build\'inde aktif olacak.',
      [{ text: 'Tamam' }]
    );
  };

  // ── BETA FULL ─────────────────────────────────────────────────────────────
  if (step === 'BETA_FULL') {
    return (
      <View style={[s.root, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center', padding: 28 }]}>
        <View style={s.glowCircle} />
        <Text style={{ fontSize: 56, marginBottom: 20 }}>🐋</Text>
        <View style={s.purpleBadge}><Text style={s.purpleBadgeText}>BETA · KONTENJAN DOLU</Text></View>
        <Text style={s.betaTitle}>100 Balina{'\n'}<Text style={{ color: Colors.purple }}>Aramıza Katıldı</Text></Text>
        <Text style={s.betaBody}>Beta kontenjanımız doldu. Erken erişim listesine adını ekle — tam sürüm çıktığında seni öncelikli içeri alıyoruz.</Text>
        <View style={s.betaPerks}>
          <Text style={s.betaPerksTitle}>BETA KULLANICILARINA ÖZEL</Text>
          <Text style={s.betaPerk}>✦ Tam sürümde %30 indirimli fiyatlandırma</Text>
          <Text style={s.betaPerk}>✦ Pro özellikler 3 ay ücretsiz</Text>
          <Text style={s.betaPerk}>✦ Öncelikli erişim ve özel rozet</Text>
        </View>
        <TouchableOpacity style={s.purpleBtn} onPress={() => setStep('LOGIN')} activeOpacity={0.8}>
          <Text style={s.purpleBtnText}>Zaten hesabım var — Giriş Yap</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── FORM EKRANI ──────────────────────────────────────────────────────────
  const stepTitle = {
    LOGIN: 'Giriş Yap',
    EMAIL: 'Hesap Oluştur',
    CODE: 'Kodu Doğrula',
    REGISTER: 'Profilini Tamamla',
    FORGOT: 'Şifremi Unuttum',
    RESET_CODE: 'Sıfırlama Kodu',
    RESET_PW: 'Yeni Şifre',
  }[step] || 'WhaleTracker';

  const stepSub = {
    LOGIN: 'Hesabına giriş yap',
    EMAIL: 'E-postanı doğrula, başla',
    CODE: `${form.email} adresine kod gönderdik`,
    REGISTER: 'Ad ve şifrenle hesabını oluştur',
    FORGOT: 'E-postanı gir, sıfırlama kodu gönderelim',
    RESET_CODE: 'E-postana gelen 6 haneli kodu gir',
    RESET_PW: 'Yeni şifreni belirle',
  }[step] || '';

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[s.inner, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Glow bg */}
        <View style={s.glowBg} />

        {/* Logo */}
        <WhaleLogo />

        {/* Glassmorphic kart */}
        <View style={s.card}>
          {/* BETA rozeti (kayıt adımlarında) */}
          {(step === 'EMAIL' || step === 'CODE' || step === 'REGISTER') && (
            <View style={s.cyanBadge}>
              <Text style={s.cyanBadgeText}>BETA · 100 Kişilik Erken Erişim</Text>
            </View>
          )}

          <Text style={s.cardTitle}>{stepTitle}</Text>
          <Text style={s.cardSub}>{stepSub}</Text>

          {/* Google ile Giriş — sadece LOGIN ve EMAIL adımında */}
          {(step === 'LOGIN' || step === 'EMAIL') && (
            <>
              <TouchableOpacity style={s.googleBtn} onPress={handleGooglePress} activeOpacity={0.85}>
                <Text style={{ fontSize: 16, marginRight: 8 }}>
                  <Text style={{ color: '#4285F4' }}>G</Text>
                  <Text style={{ color: '#34A853' }}>o</Text>
                  <Text style={{ color: '#FBBC05' }}>o</Text>
                  <Text style={{ color: '#EA4335' }}>g</Text>
                  <Text style={{ color: '#4285F4' }}>l</Text>
                  <Text style={{ color: '#34A853' }}>e</Text>
                </Text>
                <Text style={s.googleBtnText}>Google ile Devam Et</Text>
              </TouchableOpacity>
              <View style={s.divider}>
                <View style={s.dividerLine} />
                <Text style={s.dividerText}>VEYA E-POSTA İLE</Text>
                <View style={s.dividerLine} />
              </View>
            </>
          )}

          {/* E-posta alanı */}
          {(step === 'LOGIN' || step === 'EMAIL' || step === 'FORGOT' || step === 'RESET_CODE') && (
            <View style={s.field}>
              <Text style={s.label}>E-POSTA</Text>
              <View style={s.inputWrap}>
                <Ionicons name="mail-outline" size={18} color={Colors.textMuted} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  value={form.email}
                  onChangeText={v => setF('email', v)}
                  placeholder="ornek@email.com"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={step !== 'RESET_CODE'}
                />
              </View>
            </View>
          )}

          {/* Şifre alanı */}
          {step === 'LOGIN' && (
            <View style={s.field}>
              <Text style={s.label}>ŞİFRE</Text>
              <View style={s.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  value={form.password}
                  onChangeText={v => setF('password', v)}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry
                />
              </View>
              <TouchableOpacity onPress={() => { setF('email', form.email); setStep('FORGOT'); }} style={{ marginTop: 8 }}>
                <Text style={s.forgotLink}>Şifremi unuttum</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* OTP kutuları */}
          {(step === 'CODE' || step === 'RESET_CODE') && (
            <View style={s.field}>
              <Text style={s.label}>DOĞRULAMA KODU</Text>
              <OtpInput value={form.code} onChange={v => setF('code', v)} />
              <Text style={s.hint}>E-postana gelen 6 haneli kodu gir (5 dk geçerli)</Text>
            </View>
          )}

          {/* Ad Soyad */}
          {step === 'REGISTER' && (
            <View style={s.field}>
              <Text style={s.label}>AD SOYAD</Text>
              <View style={s.inputWrap}>
                <Ionicons name="person-outline" size={18} color={Colors.textMuted} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  value={form.fullName}
                  onChangeText={v => setF('fullName', v)}
                  placeholder="John Doe"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>
          )}

          {/* Şifre belirle (REGISTER) */}
          {step === 'REGISTER' && (
            <View style={s.field}>
              <Text style={s.label}>ŞİFRE OLUŞTUR</Text>
              <View style={s.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  value={form.password}
                  onChangeText={v => setF('password', v)}
                  placeholder="Min. 8 karakter, büyük harf, rakam"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry
                />
              </View>
              <Text style={s.hint}>En az 8 karakter · 1 büyük harf · 1 rakam</Text>
            </View>
          )}

          {/* Yeni şifre (RESET) */}
          {step === 'RESET_PW' && (
            <View style={s.field}>
              <Text style={s.label}>YENİ ŞİFRE</Text>
              <View style={s.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  value={form.newPassword}
                  onChangeText={v => setF('newPassword', v)}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry
                />
              </View>
              <Text style={s.hint}>En az 8 karakter · 1 büyük harf · 1 rakam</Text>
            </View>
          )}

          {/* Submit butonu — web'deki gradient border efekti */}
          <TouchableOpacity
            style={[s.submitBtn, loading && { opacity: 0.6 }]}
            onPress={() => {
              if (step === 'LOGIN') handle('login');
              else if (step === 'EMAIL') handle('send');
              else if (step === 'CODE') handle('verify');
              else if (step === 'REGISTER') handle('register');
              else if (step === 'FORGOT') handle('forgot');
              else if (step === 'RESET_CODE') setStep('RESET_PW');
              else if (step === 'RESET_PW') handle('reset');
            }}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Text style={s.submitText}>
                    {{ LOGIN: 'GİRİŞ YAP', EMAIL: 'KOD GÖNDER', CODE: 'DOĞRULA', REGISTER: 'HESAP OLUŞTUR', FORGOT: 'KOD GÖNDER', RESET_CODE: 'DEVAM', RESET_PW: 'ŞİFREYİ KAYDET' }[step]}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={Colors.cyanPrimary} />
                </>
            }
          </TouchableOpacity>

          {/* Alt link */}
          <View style={s.footer}>
            <Text style={s.footerText}>
              {step === 'LOGIN' ? 'Hesabın yok mu? ' :
               ['FORGOT', 'RESET_CODE', 'RESET_PW'].includes(step) ? 'Geri dön? ' :
               'Zaten hesabın var mı? '}
            </Text>
            <TouchableOpacity onPress={() => {
              if (['FORGOT', 'RESET_CODE', 'RESET_PW'].includes(step)) {
                setStep('LOGIN');
                setForm({ email: '', password: '', fullName: '', code: '', newPassword: '' });
              } else {
                setStep(step === 'LOGIN' ? 'EMAIL' : 'LOGIN');
                setForm({ email: '', password: '', fullName: '', code: '', newPassword: '' });
              }
            }}>
              <Text style={s.footerLink}>
                {step === 'LOGIN' ? 'Kayıt Ol' :
                 ['FORGOT', 'RESET_CODE', 'RESET_PW'].includes(step) ? 'Giriş Yap' : 'Giriş Yap'}
              </Text>
            </TouchableOpacity>
          </View>

          {step === 'CODE' && (
            <TouchableOpacity onPress={() => setStep('EMAIL')} style={{ marginTop: 8, alignSelf: 'center' }}>
              <Text style={s.changeEmail}>E-posta adresini değiştir</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: Colors.bg },
  inner: { paddingHorizontal: 20, alignItems: 'stretch' },

  // Glow arka plan
  glowBg: {
    position: 'absolute', top: '30%', left: '50%',
    width: 300, height: 300,
    borderRadius: 150,
    backgroundColor: 'transparent',
    shadowColor: Colors.cyanPrimary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 120,
    marginLeft: -150,
  },

  // Logo
  logoWrap:    { alignItems: 'center', marginBottom: 28 },
  logoEmoji:   { fontSize: 56, marginBottom: 8 },
  logoTextRow: { flexDirection: 'row', alignItems: 'baseline' },
  logoWhale:   { fontSize: 26, fontWeight: '900', color: Colors.cyanPrimary, letterSpacing: 0.5 },
  logoTracker: { fontSize: 26, fontWeight: '400', color: 'rgba(255,255,255,0.9)', letterSpacing: 0.5 },
  betaBadge:   { marginTop: 8, backgroundColor: Colors.cyanDimAlt, borderWidth: 1, borderColor: Colors.cyanBorder, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 3 },
  betaBadgeText: { fontSize: 9, fontWeight: '900', color: Colors.cyanPrimary, letterSpacing: 2 },

  // Glassmorphic kart (web'deki bg-slate-900/60 backdrop-blur)
  card: {
    backgroundColor: 'rgba(15,23,42,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(51,65,85,0.6)',
    borderRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.6,
    shadowRadius: 40,
  },

  cyanBadge:     { alignSelf: 'flex-start', backgroundColor: Colors.cyanDimAlt, borderWidth: 1, borderColor: Colors.cyanBorder, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 12 },
  cyanBadgeText: { fontSize: 9, fontWeight: '900', color: Colors.cyanPrimary, letterSpacing: 1.5 },

  cardTitle: { fontSize: 26, fontWeight: '900', color: Colors.textPrimary, marginBottom: 4 },
  cardSub:   { fontSize: 13, color: Colors.textSecondary, marginBottom: 24 },

  // Google butonu (web'deki glassmorphic stil)
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20,
    gap: 10,
  },
  googleBtnText: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },

  divider:     { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5 },

  // Form alanları
  field:     { marginBottom: 16 },
  label:     { fontSize: 10, fontWeight: '800', color: Colors.textMuted, letterSpacing: 2, marginBottom: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(2,6,23,0.7)', borderWidth: 1, borderColor: Colors.border, borderRadius: 14 },
  inputIcon: { marginLeft: 14 },
  input:     { flex: 1, paddingVertical: 14, paddingHorizontal: 12, color: Colors.textPrimary, fontSize: 15 },

  // OTP
  otpRow:      { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  otpBox:      { width: 44, height: 52, backgroundColor: 'rgba(2,6,23,0.7)', borderWidth: 1, borderColor: Colors.border, borderRadius: 12, textAlign: 'center', color: Colors.textPrimary, fontSize: 20, fontWeight: '800' },
  otpBoxFilled:{ borderColor: Colors.cyanPrimary },

  forgotLink: { color: Colors.cyanPrimary, fontSize: 12, marginTop: 4 },
  hint:       { color: Colors.textMuted, fontSize: 11, marginTop: 6, lineHeight: 16 },

  // Submit — web'deki gradient border efekti (native'de shadow ile taklit)
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.cyanBorder,
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: Colors.cyanPrimary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  submitText: { color: Colors.textPrimary, fontWeight: '900', fontSize: 14, letterSpacing: 1.5 },

  footer:     { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderColor: Colors.border },
  footerText: { color: Colors.textSecondary, fontSize: 13 },
  footerLink: { color: Colors.cyanPrimary, fontWeight: '800', fontSize: 13, marginLeft: 4 },
  changeEmail:{ color: Colors.textMuted, fontSize: 12, textDecorationLine: 'underline' },

  // Beta Full ekranı
  glowCircle: { position: 'absolute', top: '30%', left: '25%', width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(168,85,247,0.08)' },
  purpleBadge:    { backgroundColor: Colors.purpleDim, borderWidth: 1, borderColor: Colors.purpleBorder, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 20 },
  purpleBadgeText:{ fontSize: 10, fontWeight: '900', color: Colors.purple, letterSpacing: 2 },
  betaTitle:  { fontSize: 28, fontWeight: '900', color: Colors.textPrimary, textAlign: 'center', lineHeight: 36, marginBottom: 16 },
  betaBody:   { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  betaPerks:  { backgroundColor: Colors.purpleDim, borderWidth: 1, borderColor: Colors.purpleBorder, borderRadius: 16, padding: 20, width: '100%', marginBottom: 28 },
  betaPerksTitle: { fontSize: 10, fontWeight: '800', color: Colors.purple, letterSpacing: 1, marginBottom: 10 },
  betaPerk:   { fontSize: 13, color: Colors.textSecondary, lineHeight: 24 },
  purpleBtn:  { width: '100%', borderWidth: 1, borderColor: Colors.purpleBorder, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  purpleBtnText: { color: Colors.purple, fontWeight: '900', fontSize: 15 },
});
