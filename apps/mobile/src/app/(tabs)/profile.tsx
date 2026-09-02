import { router } from 'expo-router';
import Constants from 'expo-constants';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { UNIVERSITIES } from '@/data/seed';
import { isDemoMode } from '@/lib/config';
import { useAuth } from '@/providers/auth-provider';
import { useCommunity } from '@/providers/community-provider';
import { useTasks } from '@/providers/task-provider';
import type { LanguageCode } from '@/types/domain';
import { AppHeader, Button, Card, Chip, Field, Screen } from '@/ui/primitives';
import { colors } from '@/ui/theme';

const languages: { code: LanguageCode; label: string }[] = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'ja', label: '日本語' },
];

export default function ProfileScreen() {
  const { profile, updateProfile, signOut, deleteAccount } = useAuth();
  const { resetDemoCommunity } = useCommunity();
  const { resetDemoTasks } = useTasks();
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState(profile?.nickname ?? '');
  const [universityId, setUniversityId] = useState(profile?.universityId ?? '');
  const [visaType, setVisaType] = useState<'D-2' | 'D-4'>(profile?.visaType ?? 'D-2');
  const [language, setLanguage] = useState<LanguageCode>(profile?.language ?? 'en');
  const [saving, setSaving] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);

  function openEditor() {
    if (!profile) return;
    setNickname(profile.nickname);
    setUniversityId(profile.universityId);
    setVisaType(profile.visaType);
    setLanguage(profile.language);
    setEditing(true);
  }

  async function saveProfile() {
    setSaving(true);
    try {
      await updateProfile({ nickname, universityId, visaType, language });
      setEditing(false);
    } catch (saveError) {
      Alert.alert('내 정보를 저장하지 못했어요', saveError instanceof Error ? saveError.message : '다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await signOut();
    router.replace('/');
  }

  async function resetDemoData() {
    if (!resetArmed) {
      setResetArmed(true);
      setDeleteArmed(false);
      return;
    }
    try {
      await Promise.all([resetDemoCommunity(), resetDemoTasks()]);
      setResetArmed(false);
      Alert.alert('초기화했어요', '커뮤니티와 오늘 일정이 처음 상태로 돌아갔습니다.');
    } catch (resetError) {
      Alert.alert('초기화하지 못했어요', resetError instanceof Error ? resetError.message : '다시 시도해 주세요.');
    }
  }

  async function removeAccount() {
    try {
      if (isDemoMode) await Promise.all([resetDemoCommunity(), resetDemoTasks()]);
      await deleteAccount();
      router.replace('/');
    } catch (deleteError) {
      Alert.alert('삭제할 수 없어요', deleteError instanceof Error ? deleteError.message : '다시 시도해 주세요.');
    }
  }

  return (
    <Screen>
      <AppHeader eyebrow="MY K-STUDENT" title="내 정보" action={!editing ? <Pressable accessibilityRole="button" onPress={openEditor} style={styles.editButton}><Text style={styles.editButtonText}>편집</Text></Pressable> : null} />

      <Card style={styles.identity}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{profile?.nickname.slice(0, 1).toUpperCase()}</Text></View>
        <View style={styles.flex}><Text style={styles.name}>{profile?.nickname}</Text><Text style={styles.email}>{profile?.email}</Text></View>
        <Text style={styles.badge}>{isDemoMode ? 'DEMO' : 'LIVE'}</Text>
      </Card>

      {editing ? (
        <Card style={styles.editCard}>
          <Text style={styles.cardTitle}>기본 정보 편집</Text>
          <Field label="닉네임" value={nickname} onChangeText={setNickname} maxLength={30} placeholder="커뮤니티에서 사용할 이름" />
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>학교</Text>
            <View style={styles.chips}>{UNIVERSITIES.map((university) => <Chip key={university.id} label={university.nameKo} selected={universityId === university.id} onPress={() => setUniversityId(university.id)} />)}</View>
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>체류자격</Text>
            <View style={styles.chips}>{(['D-2', 'D-4'] as const).map((visa) => <Chip key={visa} label={visa} selected={visaType === visa} onPress={() => setVisaType(visa)} />)}</View>
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>답변 언어</Text>
            <View style={styles.chips}>{languages.map((item) => <Chip key={item.code} label={item.label} selected={language === item.code} onPress={() => setLanguage(item.code)} />)}</View>
          </View>
          <View style={styles.editActions}>
            <View style={styles.flex}><Button variant="ghost" onPress={() => setEditing(false)} disabled={saving}>취소</Button></View>
            <View style={styles.flex}><Button onPress={() => void saveProfile()} loading={saving}>저장</Button></View>
          </View>
        </Card>
      ) : (
        <Card style={styles.details}>
          <Row label="학교" value={profile?.universityName ?? '-'} />
          <Row label="체류자격" value={profile?.visaType ?? '-'} />
          <Row label="답변 언어" value={languages.find((item) => item.code === profile?.language)?.label ?? '-'} last />
        </Card>
      )}

      <Card style={styles.localCard}>
        <Text style={styles.localEyebrow}>{isDemoMode ? 'OFFLINE READY' : 'CLOUD CONNECTED'}</Text>
        <Text style={styles.cardTitle}>{isDemoMode ? '현재 이 기기에 저장하고 있어요' : '계정에 안전하게 동기화하고 있어요'}</Text>
        <Text style={styles.localBody}>{isDemoMode ? '작성한 글, 댓글, 좋아요, 북마크와 개인 일정은 브라우저 또는 앱의 로컬 저장소에 남습니다.' : '프로필과 활동 데이터가 Supabase 계정에 연결되어 있습니다.'}</Text>
      </Card>

      <Card style={styles.policy}>
        <Text style={styles.cardTitle}>커뮤니티 안전 원칙</Text>
        <Text style={styles.policyBody}>혐오·괴롭힘·불법거래·개인정보 노출은 허용하지 않습니다. 게시글 상세에서 신고와 작성자 차단을 바로 할 수 있어요.</Text>
      </Card>

      <Card style={styles.menuCard}>
        <Text style={styles.cardTitle}>서비스 및 지원</Text>
        <MenuRow label="서비스 설정" description="알림, 익명 기본값과 정책 동의 기록" onPress={() => router.push('/settings')} />
        <MenuRow label="고객지원" description="FAQ, 1:1 문의와 처리 상태" onPress={() => router.push('/support')} last />
      </Card>

      {isDemoMode ? (
        <View style={styles.dangerGroup}>
          <Button variant={resetArmed ? 'danger' : 'ghost'} onPress={() => void resetDemoData()}>{resetArmed ? '한 번 더 눌러 데모 데이터 초기화' : '데모 데이터 초기화'}</Button>
          {resetArmed ? <Pressable accessibilityRole="button" onPress={() => setResetArmed(false)}><Text style={styles.cancelText}>초기화 취소</Text></Pressable> : null}
          <Text style={styles.helper}>계정과 프로필은 유지하고 커뮤니티·오늘 일정만 처음 상태로 되돌립니다.</Text>
        </View>
      ) : null}

      <Button variant="ghost" onPress={() => void logout()}>로그아웃</Button>

      {!deleteArmed ? (
        <Button variant="danger" onPress={() => { setDeleteArmed(true); setResetArmed(false); }}>계정 및 데이터 삭제</Button>
      ) : (
        <Card style={styles.deleteCard}>
          <Text style={styles.deleteTitle}>정말 계정을 삭제할까요?</Text>
          <Text style={styles.helper}>작성한 콘텐츠와 계정 데이터가 삭제되며 되돌릴 수 없습니다.</Text>
          <View style={styles.editActions}>
            <View style={styles.flex}><Button variant="ghost" onPress={() => setDeleteArmed(false)}>취소</Button></View>
            <View style={styles.flex}><Button variant="danger" onPress={() => void removeAccount()}>영구 삭제</Button></View>
          </View>
        </Card>
      )}

      <Text style={styles.version}>K-Student Hub · {Constants.expoConfig?.version ?? 'development'}</Text>
    </Screen>
  );
}

function Row({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return <View style={[styles.row, last && styles.rowLast]}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue}>{value}</Text></View>;
}

function MenuRow({ label, description, onPress, last = false }: { label: string; description: string; onPress: () => void; last?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={[styles.menuRow, last && styles.rowLast]}><View style={styles.flex}><Text style={styles.menuLabel}>{label}</Text><Text style={styles.menuDescription}>{description}</Text></View><Text style={styles.menuArrow}>›</Text></Pressable>;
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  avatar: { width: 54, height: 54, borderRadius: 19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '900', fontSize: 23 },
  flex: { flex: 1 },
  name: { color: colors.ink, fontSize: 19, fontWeight: '900' },
  email: { color: colors.muted, marginTop: 3, fontSize: 12 },
  badge: { color: colors.primaryDark, backgroundColor: colors.primarySoft, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, overflow: 'hidden', fontWeight: '900', fontSize: 10 },
  editButton: { minHeight: 40, paddingHorizontal: 15, borderRadius: 13, backgroundColor: colors.primarySoft, justifyContent: 'center' },
  editButtonText: { color: colors.primaryDark, fontWeight: '900', fontSize: 13 },
  details: { gap: 0 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#EEF1F5' },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { color: colors.muted, fontWeight: '700' },
  rowValue: { color: colors.ink, fontWeight: '900', maxWidth: '62%', textAlign: 'right' },
  editCard: { gap: 16, borderColor: '#BFD3FA' },
  cardTitle: { color: colors.ink, fontWeight: '900', fontSize: 16 },
  fieldGroup: { gap: 9 },
  fieldLabel: { color: colors.ink, fontWeight: '800', fontSize: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  editActions: { flexDirection: 'row', gap: 10 },
  localCard: { backgroundColor: '#F0F6FF', shadowOpacity: 0 },
  localEyebrow: { color: colors.primary, fontWeight: '900', fontSize: 10, letterSpacing: 1, marginBottom: 7 },
  localBody: { color: colors.muted, lineHeight: 20, fontSize: 13, marginTop: 7 },
  policy: { backgroundColor: '#FFF9EA', shadowOpacity: 0 },
  policyBody: { color: colors.muted, lineHeight: 20, fontSize: 13, marginTop: 7 },
  menuCard: { paddingVertical: 8, gap: 0 },
  menuRow: { minHeight: 67, flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EEF1F5' },
  menuLabel: { color: colors.ink, fontWeight: '900', fontSize: 14 },
  menuDescription: { color: colors.muted, fontSize: 11, marginTop: 4 },
  menuArrow: { color: colors.primary, fontWeight: '900', fontSize: 25 },
  dangerGroup: { gap: 9 },
  helper: { color: colors.muted, lineHeight: 18, fontSize: 12, textAlign: 'center' },
  cancelText: { color: colors.primary, fontWeight: '800', fontSize: 13, textAlign: 'center', paddingVertical: 4 },
  deleteCard: { gap: 13, borderColor: '#FFD1D8', backgroundColor: '#FFF9FA' },
  deleteTitle: { color: colors.danger, fontWeight: '900', fontSize: 16, textAlign: 'center' },
  version: { color: '#94A3B8', textAlign: 'center', fontSize: 11 },
});
