import { Redirect, router } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { isDemoMode } from '@/lib/config';
import { useAuth } from '@/providers/auth-provider';
import { Button, Card, Screen } from '@/ui/primitives';
import { colors } from '@/ui/theme';

export default function WelcomeScreen() {
  const { loading, profile } = useAuth();
  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (profile?.onboardingComplete) return <Redirect href="/(tabs)/today" />;
  if (profile) return <Redirect href="/onboarding" />;
  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.logo}><Text style={styles.logoText}>K</Text></View>
        <Text style={styles.kicker}>K-STUDENT HUB</Text>
        <Text style={styles.headline}>한국 생활, 혼자 찾지 마세요.</Text>
        <Text style={styles.subhead}>유학생끼리 연결되고, 출입국 정보는 공식 출처로 확인하는 생활 동반자예요.</Text>
      </View>
      <Card style={styles.preview}>
        <View style={styles.previewTop}><Text style={styles.previewBadge}>TODAY</Text><Text style={styles.previewDue}>D-21</Text></View>
        <Text style={styles.previewTitle}>체류기간 연장 준비</Text>
        <Text style={styles.previewBody}>내 상황에 맞춘 할 일과 공식 체크리스트를 한눈에 확인하세요.</Text>
      </Card>
      <View style={styles.features}>
        <Text style={styles.feature}>💬  같은 학교 유학생 커뮤니티</Text>
        <Text style={styles.feature}>✓  출처가 보이는 공식정보 답변</Text>
        <Text style={styles.feature}>🔔  놓치기 쉬운 체류 일정 알림</Text>
      </View>
      {isDemoMode ? <Text style={styles.demo}>DEMO MODE · 백엔드 설정 없이 모든 핵심 흐름을 체험할 수 있어요.</Text> : null}
      <Button onPress={() => router.push('/auth')}>시작하기</Button>
      <Text style={styles.legal}>계속하면 이용약관과 개인정보 처리방침에 동의하게 됩니다.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas },
  hero: { alignItems: 'center', paddingTop: 30, gap: 10 }, logo: { width: 72, height: 72, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  logoText: { color: '#fff', fontWeight: '900', fontSize: 38 }, kicker: { color: colors.primary, fontWeight: '900', letterSpacing: 1.8, fontSize: 12 },
  headline: { color: colors.ink, fontWeight: '900', fontSize: 30, letterSpacing: -1, textAlign: 'center' }, subhead: { color: colors.muted, textAlign: 'center', fontSize: 16, lineHeight: 24, paddingHorizontal: 12 },
  preview: { marginTop: 10, backgroundColor: '#102B56', borderColor: '#102B56' }, previewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewBadge: { color: '#9AC8FF', fontWeight: '900', letterSpacing: 1 }, previewDue: { color: '#fff', fontWeight: '900', backgroundColor: '#E8596A', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  previewTitle: { color: '#fff', fontWeight: '900', fontSize: 21, marginTop: 20 }, previewBody: { color: '#C9D7EC', fontSize: 14, lineHeight: 21, marginTop: 7 },
  features: { gap: 12, paddingHorizontal: 6 }, feature: { color: colors.ink, fontWeight: '700', fontSize: 15 }, demo: { color: colors.primaryDark, fontSize: 11, lineHeight: 17, textAlign: 'center', fontWeight: '700', backgroundColor: colors.primarySoft, padding: 10, borderRadius: 12 },
  legal: { color: colors.muted, textAlign: 'center', fontSize: 11, lineHeight: 16 },
});
