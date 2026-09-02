import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { containsSensitiveInfo } from '@/lib/pii';
import { useAuth } from '@/providers/auth-provider';
import { useCommunity } from '@/providers/community-provider';
import { useService } from '@/providers/service-provider';
import type { PostCategory } from '@/types/domain';
import { AppHeader, Button, Card, Chip, Field, Screen } from '@/ui/primitives';
import { colors } from '@/ui/theme';

const categories: { value: PostCategory; label: string }[] = [{ value: 'life', label: '생활' }, { value: 'visa', label: '비자' }, { value: 'housing', label: '주거' }, { value: 'campus', label: '학교' }, { value: 'work', label: '일자리' }, { value: 'friends', label: '친구' }];

export default function NewPostScreen() {
  const { profile } = useAuth(); const { createPost } = useCommunity();
  const { preferences } = useService();
  const [title, setTitle] = useState(''); const [body, setBody] = useState(''); const [category, setCategory] = useState<PostCategory>('life');
  const [scope, setScope] = useState<'school' | 'all'>('school'); const [anonymous, setAnonymous] = useState(preferences.defaultAnonymous); const [submitting, setSubmitting] = useState(false);
  async function submit() {
    if (title.trim().length < 2 || body.trim().length < 2) return Alert.alert('제목과 내용을 입력해 주세요.');
    if (containsSensitiveInfo(`${title} ${body}`)) return Alert.alert('개인정보를 지워 주세요', '전화번호, 주민등록번호, 외국인등록번호 또는 계좌번호로 보이는 정보는 게시할 수 없습니다.');
    try {
      setSubmitting(true);
      const post = await createPost({ title, body, category, scope, isAnonymous: anonymous, language: profile?.language ?? 'en' });
      router.replace({ pathname: '/post/[id]', params: { id: post.id } });
    }
    catch (error) { Alert.alert('게시할 수 없어요', error instanceof Error ? error.message : '다시 시도해 주세요.'); }
    finally { setSubmitting(false); }
  }
  return (
    <Screen>
      <AppHeader eyebrow="NEW POST" title="경험을 나눠 주세요" action={<Pressable accessibilityRole="button" accessibilityLabel="글쓰기 닫기" onPress={() => router.back()}><Text style={styles.close}>닫기</Text></Pressable>} />
      <View style={styles.chips}>{categories.map((item) => <Chip key={item.value} label={item.label} selected={category === item.value} onPress={() => setCategory(item.value)} />)}</View>
      <Field label="제목" value={title} onChangeText={setTitle} maxLength={120} placeholder="무엇을 이야기하고 싶나요?" />
      <Field label="내용" value={body} onChangeText={setBody} multiline maxLength={5000} placeholder="상황을 자세히 적으면 더 좋은 답을 받을 수 있어요." hint={`${body.length}/5000 · 연락처와 신분증 번호는 올리지 마세요.`} />
      <Card style={styles.options}>
        <Text style={styles.label}>공개 범위</Text><View style={styles.chips}><Chip label={profile?.universityName ?? '내 학교'} selected={scope === 'school'} onPress={() => setScope('school')} /><Chip label="전체 유학생" selected={scope === 'all'} onPress={() => setScope('all')} /></View>
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: anonymous }} accessibilityLabel="익명으로 게시" style={styles.switchRow} onPress={() => setAnonymous((value) => !value)}><View style={[styles.checkbox, anonymous && styles.checkboxOn]}><Text style={styles.check}>{anonymous ? '✓' : ''}</Text></View><View><Text style={styles.anonymousTitle}>익명으로 게시</Text><Text style={styles.anonymousBody}>운영자에게는 안전 관리를 위해 계정 정보가 보입니다.</Text></View></Pressable>
      </Card>
      <Button loading={submitting} onPress={submit}>게시하기</Button>
    </Screen>
  );
}

const styles = StyleSheet.create({ close: { color: colors.primary, fontWeight: '900' }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, options: { gap: 13 }, label: { color: colors.ink, fontWeight: '900' }, switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 7 }, checkbox: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary }, check: { color: '#fff', fontWeight: '900' }, anonymousTitle: { color: colors.ink, fontWeight: '800' }, anonymousBody: { color: colors.muted, fontSize: 11, marginTop: 2 } });
