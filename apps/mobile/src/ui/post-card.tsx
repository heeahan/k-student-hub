import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CommunityPost } from '@/types/domain';
import { colors } from '@/ui/theme';

const categoryLabel = { campus: '학교', visa: '비자', housing: '주거', work: '일자리', life: '생활', friends: '친구' };

function relativeTime(createdAt: string) {
  const elapsed = Math.max(0, Date.now() - new Date(createdAt).getTime());
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return '방금';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(createdAt).toLocaleDateString();
}

export function PostCard({ post, onLike, onBookmark }: { post: CommunityPost; onLike: () => void; onBookmark: () => void }) {
  return (
    <Pressable onPress={() => router.push({ pathname: '/post/[id]', params: { id: post.id } })} style={styles.card}>
      <View style={styles.meta}><Text style={styles.category}>{categoryLabel[post.category]}</Text><Text style={styles.metaText}>{post.universityName ?? '전체'} · {post.authorName}</Text><Text style={styles.time}>{relativeTime(post.createdAt)}</Text></View>
      <Text style={styles.title}>{post.title}</Text>
      <Text style={styles.body} numberOfLines={3}>{post.body}</Text>
      <View style={styles.footer}>
        <Pressable hitSlop={8} onPress={(event) => { event.stopPropagation(); onLike(); }}><Text style={[styles.action, post.isLiked && styles.active]}>♥ {post.likes}</Text></Pressable>
        <Text style={styles.action}>💬 {post.comments}</Text>
        <View style={styles.spacer} />
        <Pressable hitSlop={8} onPress={(event) => { event.stopPropagation(); onBookmark(); }}><Text style={[styles.action, post.isBookmarked && styles.active]}>{post.isBookmarked ? '★ 저장됨' : '☆ 저장'}</Text></Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 17, gap: 9 }, meta: { flexDirection: 'row', alignItems: 'center', gap: 7 }, category: { color: colors.primaryDark, backgroundColor: colors.primarySoft, borderRadius: 999, overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5, fontWeight: '800', fontSize: 11 },
  metaText: { color: colors.muted, fontSize: 12, flex: 1 }, time: { color: '#94A3B8', fontSize: 11 }, title: { color: colors.ink, fontWeight: '900', fontSize: 17, letterSpacing: -0.2 }, body: { color: '#45556D', lineHeight: 21, fontSize: 14 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 18, borderTopWidth: 1, borderTopColor: '#F0F2F6', paddingTop: 11, marginTop: 2 }, action: { color: colors.muted, fontWeight: '800', fontSize: 13 }, active: { color: colors.primary }, spacer: { flex: 1 },
});
