import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/providers/auth-provider';
import { useCommunity } from '@/providers/community-provider';
import type { PostCategory } from '@/types/domain';
import { AppHeader, Chip, EmptyState, Screen } from '@/ui/primitives';
import { PostCard } from '@/ui/post-card';
import { colors } from '@/ui/theme';

const categories: { value: 'all' | PostCategory; label: string }[] = [{ value: 'all', label: '전체' }, { value: 'life', label: '생활' }, { value: 'visa', label: '비자' }, { value: 'housing', label: '주거' }, { value: 'campus', label: '학교' }, { value: 'work', label: '일자리' }, { value: 'friends', label: '친구' }];

export default function CommunityScreen() {
  const { profile } = useAuth();
  const { posts, toggleLike, toggleBookmark } = useCommunity();
  const [scope, setScope] = useState<'school' | 'all'>('school');
  const [category, setCategory] = useState<'all' | PostCategory>('all');
  const filtered = useMemo(() => posts.filter((post) => (scope === 'all' || post.universityId === profile?.universityId) && (category === 'all' || post.category === category)), [posts, scope, category, profile?.universityId]);
  return (
    <Screen>
      <AppHeader eyebrow="STUDENT COMMUNITY" title="같이 묻고, 같이 해결해요" action={<Pressable onPress={() => router.push('/post/new')} style={styles.write}><Text style={styles.writeText}>＋</Text></Pressable>} />
      <View style={styles.scope}><Pressable style={[styles.scopeItem, scope === 'school' && styles.scopeActive]} onPress={() => setScope('school')}><Text style={[styles.scopeText, scope === 'school' && styles.scopeTextActive]}>내 학교</Text></Pressable><Pressable style={[styles.scopeItem, scope === 'all' && styles.scopeActive]} onPress={() => setScope('all')}><Text style={[styles.scopeText, scope === 'all' && styles.scopeTextActive]}>전체</Text></Pressable></View>
      <View style={styles.chips}>{categories.map((item) => <Chip key={item.value} label={item.label} selected={category === item.value} onPress={() => setCategory(item.value)} />)}</View>
      {filtered.length ? filtered.map((post) => <PostCard key={post.id} post={post} onLike={() => toggleLike(post.id)} onBookmark={() => toggleBookmark(post.id)} />) : <EmptyState icon="💬" title="아직 글이 없어요" body="첫 번째로 경험이나 질문을 나눠 보세요." />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  write: { width: 44, height: 44, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, writeText: { color: '#fff', fontSize: 28, lineHeight: 30, fontWeight: '500' },
  scope: { flexDirection: 'row', backgroundColor: '#E9EDF4', padding: 4, borderRadius: 14 }, scopeItem: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 11 }, scopeActive: { backgroundColor: '#fff' }, scopeText: { color: colors.muted, fontWeight: '800' }, scopeTextActive: { color: colors.ink }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
