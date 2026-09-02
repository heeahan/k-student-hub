import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { EMPTY_CONSENT_SELECTION, LegalConsentCard, type ConsentSelection } from '@/components/legal-consent-card';
import { UNIVERSITIES } from '@/data/seed';
import { useAuth } from '@/providers/auth-provider';
import { useService } from '@/providers/service-provider';
import type { LanguageCode } from '@/types/domain';
import { AppHeader, Button, Card, Chip, Field, Screen } from '@/ui/primitives';
import { colors } from '@/ui/theme';

const languages: { code: LanguageCode; label: string }[] = [{ code: 'en', label: 'English' }, { code: 'ko', label: '한국어' }, { code: 'zh', label: '中文' }, { code: 'vi', label: 'Tiếng Việt' }, { code: 'ja', label: '日本語' }];

export default function OnboardingScreen() {
  const { profile, completeOnboarding } = useAuth();
  const { recordRequiredConsents } = useService();
  const [nickname, setNickname] = useState('Mina');
  const [universityId, setUniversityId] = useState(UNIVERSITIES[1].id);
  const [visaType, setVisaType] = useState<'D-2' | 'D-4'>('D-2');
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [submitting, setSubmitting] = useState(false);
  const [consents, setConsents] = useState<ConsentSelection>(EMPTY_CONSENT_SELECTION);
  async function submit() {
    if (nickname.trim().length < 2) return Alert.alert('닉네임을 2자 이상 입력해 주세요.');
    if (!Object.values(consents).every(Boolean)) return Alert.alert('필수 정책에 모두 동의해 주세요.');
    try { setSubmitting(true); await recordRequiredConsents(); await completeOnboarding({ nickname, universityId, visaType, language }); router.replace('/(tabs)/today'); }
    catch (error) { Alert.alert('저장할 수 없어요', error instanceof Error ? error.message : '다시 시도해 주세요.'); }
    finally { setSubmitting(false); }
  }
  if (!profile) return null;
  return (
    <Screen>
      <AppHeader eyebrow="STEP 1 OF 1" title="나에게 맞게 설정해요" />
      <Text style={styles.lead}>학교 피드와 체류 일정 안내에 필요한 최소 정보만 받습니다.</Text>
      <Card style={styles.form}>
        <Field label="닉네임" value={nickname} onChangeText={setNickname} maxLength={30} />
        <View style={styles.group}><Text style={styles.label}>학교</Text><View style={styles.chips}>{UNIVERSITIES.map((item) => <Chip key={item.id} label={item.nameKo} selected={universityId === item.id} onPress={() => setUniversityId(item.id)} />)}</View></View>
        <View style={styles.group}><Text style={styles.label}>체류자격</Text><View style={styles.chips}><Chip label="D-2 유학" selected={visaType === 'D-2'} onPress={() => setVisaType('D-2')} /><Chip label="D-4 연수" selected={visaType === 'D-4'} onPress={() => setVisaType('D-4')} /></View></View>
        <View style={styles.group}><Text style={styles.label}>답변 언어</Text><View style={styles.chips}>{languages.map((item) => <Chip key={item.code} label={item.label} selected={language === item.code} onPress={() => setLanguage(item.code)} />)}</View></View>
      </Card>
      <LegalConsentCard selection={consents} onChange={setConsents} />
      <Button disabled={!Object.values(consents).every(Boolean)} loading={submitting} onPress={submit}>동의하고 맞춤 홈 시작하기</Button>
      <Text style={styles.note}>체류자격 안내는 참고용입니다. 중요한 결정 전에는 표시된 공식 출처 또는 1345에서 확인해 주세요.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({ lead: { color: colors.muted, fontSize: 15, lineHeight: 23 }, form: { gap: 22 }, group: { gap: 10 }, label: { color: colors.ink, fontWeight: '800', fontSize: 14 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, note: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', paddingHorizontal: 8 } });
