import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { isDemoMode } from '@/lib/config';
import { LEGAL_DOCUMENTS, REQUIRED_LEGAL_KEYS } from '@/lib/legal';
import { useService } from '@/providers/service-provider';
import type { ServicePreferences } from '@/types/domain';
import { AppHeader, Card, Screen } from '@/ui/primitives';
import { colors } from '@/ui/theme';

type BooleanPreferenceKey = Exclude<keyof ServicePreferences, 'marketing'>;

export default function SettingsScreen() {
  const { preferences, updatePreferences, consents } = useService();
  async function toggle(key: BooleanPreferenceKey, value: boolean) {
    try { await updatePreferences({ [key]: value }); }
    catch (error) { Alert.alert('설정을 저장하지 못했어요', error instanceof Error ? error.message : '다시 시도해 주세요.'); }
  }
  return (
    <Screen>
      <AppHeader eyebrow="SERVICE SETTINGS" title="서비스 설정" />
      <Card style={styles.group}>
        <Text style={styles.groupTitle}>알림</Text>
        <SettingToggle label="개인 일정 알림" description="체류·학교생활 일정의 예정 알림을 받습니다." value={preferences.taskReminders} onChange={(value) => void toggle('taskReminders', value)} />
        <SettingToggle label="댓글과 답글 알림" description="내 글과 댓글에 새로운 반응이 생기면 알려드립니다." value={preferences.communityReplies} onChange={(value) => void toggle('communityReplies', value)} />
        <SettingToggle label="서비스 변경 알림" description="점검, 정책 변경과 중요한 안전 공지를 받습니다." value={preferences.serviceNotices} onChange={(value) => void toggle('serviceNotices', value)} last />
      </Card>

      <Card style={styles.group}>
        <Text style={styles.groupTitle}>커뮤니티 개인정보</Text>
        <SettingToggle label="새 글을 익명으로 시작" description="글쓰기 화면의 익명 옵션을 기본으로 켭니다. 게시 전 언제든 바꿀 수 있어요." value={preferences.defaultAnonymous} onChange={(value) => void toggle('defaultAnonymous', value)} last />
      </Card>

      <Card style={styles.group}>
        <Text style={styles.groupTitle}>정책 및 동의 기록</Text>
        {REQUIRED_LEGAL_KEYS.map((key, index) => {
          const document = LEGAL_DOCUMENTS[key];
          const agreed = consents.find((item) => item.documentKey === key && item.version === document.version);
          return (
            <Pressable key={key} accessibilityRole="link" onPress={() => router.push({ pathname: '/legal/[document]', params: { document: key } })} style={[styles.policyRow, index === REQUIRED_LEGAL_KEYS.length - 1 && styles.lastRow]}>
              <View style={styles.flex}><Text style={styles.policyTitle}>{document.shortTitle}</Text><Text style={styles.policyMeta}>버전 {document.version} · {agreed ? `${new Date(agreed.agreedAt).toLocaleDateString()} 동의` : '동의 필요'}</Text></View>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
          );
        })}
      </Card>

      {isDemoMode ? <Text style={styles.demoNote}>데모 모드에서는 설정만 기기에 저장되며 실제 푸시 알림은 발송되지 않습니다.</Text> : null}
      <Pressable accessibilityRole="button" onPress={() => router.replace('/(tabs)/profile')} style={styles.backButton}><Text style={styles.backText}>내 정보로 돌아가기</Text></Pressable>
    </Screen>
  );
}

function SettingToggle({ label, description, value, onChange, last = false }: { label: string; description: string; value: boolean; onChange: (value: boolean) => void; last?: boolean }) {
  return (
    <View style={[styles.toggleRow, last && styles.lastRow]}>
      <View style={styles.flex}><Text style={styles.toggleLabel}>{label}</Text><Text style={styles.toggleDescription}>{description}</Text></View>
      <Switch accessibilityLabel={label} value={value} onValueChange={onChange} trackColor={{ false: '#CBD5E1', true: '#8BB2FA' }} thumbColor={value ? colors.primary : '#fff'} />
    </View>
  );
}

const styles = StyleSheet.create({
  group: { paddingVertical: 7, gap: 0 },
  groupTitle: { color: colors.ink, fontWeight: '900', fontSize: 16, paddingHorizontal: 5, paddingVertical: 12 },
  toggleRow: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 5, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#EEF1F5' },
  flex: { flex: 1 },
  toggleLabel: { color: colors.ink, fontWeight: '800', fontSize: 14 },
  toggleDescription: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 4 },
  lastRow: { borderBottomWidth: 0 },
  policyRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 5, borderBottomWidth: 1, borderBottomColor: '#EEF1F5' },
  policyTitle: { color: colors.ink, fontWeight: '800', fontSize: 14 },
  policyMeta: { color: colors.muted, fontSize: 10, marginTop: 4 },
  arrow: { color: colors.primary, fontWeight: '900', fontSize: 24 },
  demoNote: { color: colors.primaryDark, backgroundColor: colors.primarySoft, borderRadius: 13, padding: 12, fontSize: 11, lineHeight: 17, textAlign: 'center' },
  backButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  backText: { color: colors.primaryDark, fontWeight: '800' },
});
