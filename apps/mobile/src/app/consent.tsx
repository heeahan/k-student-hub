import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { EMPTY_CONSENT_SELECTION, LegalConsentCard, type ConsentSelection } from '@/components/legal-consent-card';
import { useAuth } from '@/providers/auth-provider';
import { useService } from '@/providers/service-provider';
import { AppHeader, Button, Screen } from '@/ui/primitives';
import { colors } from '@/ui/theme';

export default function ConsentScreen() {
  const { profile } = useAuth();
  const { loading, error, hasRequiredConsents, recordRequiredConsents } = useService();
  const [selection, setSelection] = useState<ConsentSelection>(EMPTY_CONSENT_SELECTION);
  const [submitting, setSubmitting] = useState(false);
  if (!profile) return <Redirect href="/" />;
  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /><Text style={styles.loadingText}>동의 기록을 확인하고 있어요</Text></View>;
  if (hasRequiredConsents) return <Redirect href="/(tabs)/today" />;
  const ready = Object.values(selection).every(Boolean);
  async function submit() {
    if (!ready) return;
    setSubmitting(true);
    try {
      await recordRequiredConsents();
      router.replace('/(tabs)/today');
    } catch (submitError) {
      Alert.alert('동의 기록을 저장하지 못했어요', submitError instanceof Error ? submitError.message : '다시 시도해 주세요.');
    } finally { setSubmitting(false); }
  }
  return (
    <Screen>
      <AppHeader eyebrow="REQUIRED CONSENT" title="서비스 정책을 확인해 주세요" />
      <Text style={styles.lead}>정책이 새 버전으로 변경되면 다시 안내하고 동의를 받습니다.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <LegalConsentCard selection={selection} onChange={setSelection} />
      <Button disabled={!ready} loading={submitting} onPress={() => void submit()}>동의하고 계속하기</Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.canvas },
  loadingText: { color: colors.muted, fontWeight: '700' },
  lead: { color: colors.muted, fontSize: 15, lineHeight: 23 },
  error: { color: colors.danger, fontSize: 12, lineHeight: 18, backgroundColor: '#FFF0F2', padding: 12, borderRadius: 12 },
});
