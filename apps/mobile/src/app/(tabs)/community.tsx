import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/providers/auth-provider';
import { useCommunity } from '@/providers/community-provider';
import type { PostCategory } from '@/types/domain';
import { AppHeader, Chip, EmptyState, Screen } from '@/ui/primitives';
import { PostCard } from '@/ui/post-card';
import { colors } from '@/ui/theme';

const categories: { value: 'all' | PostCategory; label: string }[] = [{ value: 'all', label: '전체' }, { value: 'life', label: '생활' }, { value: 'visa', label: '비자' }, { value: 'housing', label: '주거' }, { value: 'campus', label: '학교' }, { value: 'work', label: '일자리' }, { value: 'friends', label: '친구' }];
const scopes = [{ value: 'school', label: '내 학교' }, { value: 'all', label: '전체' }, { value: 'saved', label: '저장글' }, { value: 'mine', label: '내 글' }] as const;

export default function CommunityScreen() {
  const { profile } = useAuth();
  const { posts, loading, error, refresh, toggleLike, toggleBookmark } = useCommunity();
  const [scope, setScope] = useState<(typeof scopes)[number]['value']>('school');
  const [category, setCategory] = useState<'all' | PostCategory>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'latest' | 'popular'>('latest');
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return posts
      .filter((post) => {
        if (scope === 'school' && post.universityId !== profile?.universityId) return false;
        if (scope === 'saved' && !post.isBookmarked) return false;
        if (scope === 'mine' && post.authorId !== profile?.id) return false;
        if (category !== 'all' && post.category !== category) return false;
        return !normalized || `${post.title} ${post.body} ${post.authorName}`.toLocaleLowerCase().includes(normalized);
      })
      .sort((a, b) => sort === 'popular'
        ? (b.likes + b.comments * 2) - (a.likes + a.comments * 2)
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [posts, scope, category, query, sort, profile?.id, profile?.universityId]);

  function runAction(action: Promise<void>, label: string) {
    void action.catch((actionError) => Alert.alert(`${label}할 수 없어요`, actionError instanceof Error ? actionError.message : '잠시 후 다시 시도해 주세요.'));
  }

  return (
    <Screen>
      <AppHeader
        eyebrow="STUDENT COMMUNITY"
        title="같이 묻고, 같이 해결해요"
        action={<View style={styles.headerActions}><Pressable accessibilityRole="button" onPress={() => runAction(refresh(), '새로고침')} style={styles.refresh}>{loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.refreshText}>↻</Text>}</Pressable><Pressable accessibilityRole="button" accessibilityLabel="새 글 작성" onPress={() => router.push('/post/new')} style={styles.write}><Text style={styles.writeText}>＋</Text></Pressable></View>}
      />

      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput value={query} onChangeText={setQuery} placeholder="제목, 내용, 작성자 검색" placeholderTextColor="#94A3B8" style={styles.searchInput} />
        {query ? <Pressable accessibilityRole="button" accessibilityLabel="검색어 지우기" onPress={() => setQuery('')}><Text style={styles.clear}>×</Text></Pressable> : null}
      </View>

      <View style={styles.scope}>{scopes.map((item) => <Pressable key={item.value} style={[styles.scopeItem, scope === item.value && styles.scopeActive]} onPress={() => setScope(item.value)}><Text style={[styles.scopeText, scope === item.value && styles.scopeTextActive]}>{item.label}</Text></Pressable>)}</View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {categories.map((item) => <Chip key={item.value} label={item.label} selected={category === item.value} onPress={() => setCategory(item.value)} />)}
      </ScrollView>

      <View style={styles.resultRow}>
        <Text style={styles.resultCount}>{filtered.length}개의 이야기</Text>
        <View style={styles.sort}><Pressable onPress={() => setSort('latest')}><Text style={[styles.sortText, sort === 'latest' && styles.sortActive]}>최신순</Text></Pressable><Text style={styles.divider}>·</Text><Pressable onPress={() => setSort('popular')}><Text style={[styles.sortText, sort === 'popular' && styles.sortActive]}>인기순</Text></Pressable></View>
      </View>

      {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text><Pressable onPress={() => runAction(refresh(), '다시 불러오기')}><Text style={styles.retry}>다시 시도</Text></Pressable></View> : null}
      {loading && !posts.length ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={styles.loadingText}>커뮤니티를 불러오는 중이에요</Text></View> : null}
      {filtered.length ? filtered.map((post) => <PostCard key={post.id} post={post} onLike={() => runAction(toggleLike(post.id), '좋아요')} onBookmark={() => runAction(toggleBookmark(post.id), '저장')} />) : !loading ? <EmptyState icon={scope === 'saved' ? '☆' : scope === 'mine' ? '✎' : '💬'} title={query ? '검색 결과가 없어요' : scope === 'saved' ? '저장한 글이 없어요' : scope === 'mine' ? '작성한 글이 없어요' : '아직 글이 없어요'} body={query ? '검색어 또는 카테고리를 바꿔 보세요.' : scope === 'saved' ? '다시 보고 싶은 글의 별표를 눌러 보세요.' : '첫 번째로 경험이나 질문을 나눠 보세요.'} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row', gap: 8 }, refresh: { width: 42, height: 42, borderRadius: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, refreshText: { color: colors.primary, fontSize: 23, lineHeight: 25, fontWeight: '700' },
  write: { width: 42, height: 42, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, writeText: { color: '#fff', fontSize: 27, lineHeight: 29, fontWeight: '500' },
  searchWrap: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 14 }, searchIcon: { color: colors.muted, fontSize: 21 }, searchInput: { flex: 1, color: colors.ink, fontSize: 14, paddingVertical: 12 }, clear: { color: colors.muted, fontSize: 22, paddingHorizontal: 4 },
  scope: { flexDirection: 'row', backgroundColor: '#E9EDF4', padding: 4, borderRadius: 14 }, scopeItem: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 11 }, scopeActive: { backgroundColor: '#fff' }, scopeText: { color: colors.muted, fontWeight: '800', fontSize: 12 }, scopeTextActive: { color: colors.ink },
  chips: { gap: 8, paddingRight: 8 }, resultRow: { flexDirection: 'row', alignItems: 'center' }, resultCount: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: '900' }, sort: { flexDirection: 'row', alignItems: 'center', gap: 6 }, sortText: { color: colors.muted, fontSize: 12, fontWeight: '700' }, sortActive: { color: colors.primary, fontWeight: '900' }, divider: { color: '#CBD5E1' },
  error: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: '#FFF0F2', borderRadius: 14, padding: 13 }, errorText: { flex: 1, color: colors.danger, fontSize: 12, lineHeight: 18 }, retry: { color: colors.danger, fontWeight: '900', fontSize: 12 }, loading: { alignItems: 'center', gap: 10, paddingVertical: 30 }, loadingText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
});
