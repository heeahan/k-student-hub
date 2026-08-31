import { router } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { isDemoMode } from '@/lib/config';
import { useAuth } from '@/providers/auth-provider';
import { AppHeader, Button, Card, Screen } from '@/ui/primitives';
import { colors } from '@/ui/theme';

export default function ProfileScreen() {
  const { profile, signOut, deleteAccount } = useAuth();
  async function logout() { await signOut(); router.replace('/'); }
  function confirmDelete() {
    Alert.alert('계정을 삭제할까요?', '작성한 콘텐츠와 계정 데이터가 삭제되며 되돌릴 수 없습니다.', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => { try { await deleteAccount(); router.replace('/'); } catch (error) { Alert.alert('삭제할 수 없어요', error instanceof Error ? error.message : '다시 시도해 주세요.'); } } },
    ]);
  }
  return (
    <Screen>
      <AppHeader eyebrow="MY K-STUDENT" title="내 정보" />
      <Card style={styles.identity}><View style={styles.avatar}><Text style={styles.avatarText}>{profile?.nickname.slice(0, 1).toUpperCase()}</Text></View><View style={styles.flex}><Text style={styles.name}>{profile?.nickname}</Text><Text style={styles.email}>{profile?.email}</Text></View><Text style={styles.badge}>{isDemoMode ? 'DEMO' : 'LIVE'}</Text></Card>
      <Card style={styles.details}><Row label="학교" value={profile?.universityName ?? '-'} /><Row label="체류자격" value={profile?.visaType ?? '-'} /><Row label="답변 언어" value={profile?.language.toUpperCase() ?? '-'} /></Card>
      <Card style={styles.policy}><Text style={styles.policyTitle}>커뮤니티 안전 원칙</Text><Text style={styles.policyBody}>혐오·괴롭힘·불법거래·개인정보 노출은 허용하지 않습니다. 게시글 상세에서 신고와 작성자 차단을 바로 할 수 있어요.</Text></Card>
      <Button variant="ghost" onPress={() => void logout()}>로그아웃</Button>
      <Button variant="danger" onPress={confirmDelete}>계정 및 데이터 삭제</Button>
      <Text style={styles.version}>K-Student Hub MVP · 1.0.0</Text>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) { return <View style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue}>{value}</Text></View>; }

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: 13 }, avatar: { width: 54, height: 54, borderRadius: 19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: '#fff', fontWeight: '900', fontSize: 23 }, flex: { flex: 1 }, name: { color: colors.ink, fontSize: 19, fontWeight: '900' }, email: { color: colors.muted, marginTop: 3, fontSize: 12 }, badge: { color: colors.primaryDark, backgroundColor: colors.primarySoft, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, overflow: 'hidden', fontWeight: '900', fontSize: 10 },
  details: { gap: 0 }, row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#EEF1F5' }, rowLabel: { color: colors.muted, fontWeight: '700' }, rowValue: { color: colors.ink, fontWeight: '900', maxWidth: '62%', textAlign: 'right' },
  policy: { backgroundColor: '#FFF9EA', shadowOpacity: 0 }, policyTitle: { color: colors.ink, fontWeight: '900' }, policyBody: { color: colors.muted, lineHeight: 20, fontSize: 13, marginTop: 7 }, version: { color: '#94A3B8', textAlign: 'center', fontSize: 11 },
});
