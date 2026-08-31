import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/providers/auth-provider';
import { AppHeader, Button, Card, Field, Screen } from '@/ui/primitives';
import { colors } from '@/ui/theme';

export default function AuthScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('student@yonsei.ac.kr');
  const [submitting, setSubmitting] = useState(false);
  async function submit() {
    if (!/^\S+@\S+\.\S+$/.test(email)) return Alert.alert('이메일을 확인해 주세요.');
    try {
      setSubmitting(true);
      const result = await signIn(email.trim().toLowerCase());
      if (result === 'link-sent') Alert.alert('로그인 링크를 보냈어요', '메일에서 링크를 누르면 앱으로 돌아옵니다.');
      else router.replace('/onboarding');
    } catch (error) {
      Alert.alert('로그인할 수 없어요', error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.');
    } finally { setSubmitting(false); }
  }
  return (
    <Screen>
      <AppHeader eyebrow="WELCOME" title="이메일로 시작하기" />
      <Text style={styles.lead}>학교 이메일이면 소속 인증에 활용할 수 있어요. 개인 이메일도 가입은 가능합니다.</Text>
      <Card><Field label="이메일" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" /><View style={styles.gap} /><Button loading={submitting} onPress={submit}>안전한 로그인 링크 받기</Button></Card>
      <View style={styles.security}><Text style={styles.securityIcon}>🔒</Text><View style={styles.flex}><Text style={styles.securityTitle}>비밀번호를 저장하지 않아요</Text><Text style={styles.securityBody}>운영 모드에서는 Supabase 일회용 로그인 링크를 사용합니다.</Text></View></View>
    </Screen>
  );
}

const styles = StyleSheet.create({ lead: { color: colors.muted, fontSize: 16, lineHeight: 24 }, gap: { height: 18 }, security: { flexDirection: 'row', gap: 12, padding: 14 }, securityIcon: { fontSize: 22 }, flex: { flex: 1 }, securityTitle: { color: colors.ink, fontWeight: '800' }, securityBody: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 3 } });
