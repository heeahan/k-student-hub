import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/providers/auth-provider';
import { useCommunity } from '@/providers/community-provider';
import { AppHeader, Button, Card, EmptyState, Screen } from '@/ui/primitives';
import { colors } from '@/ui/theme';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const { profile } = useAuth(); const { posts, reportPost, blockAuthor, toggleLike, toggleBookmark } = useCommunity();
  const post = posts.find((item) => item.id === id);
  if (!post) return <Screen><AppHeader title="게시글" /><EmptyState icon="🫥" title="게시글을 찾을 수 없어요" body="삭제되었거나 차단한 사용자의 글일 수 있습니다." /><Button onPress={() => router.back()}>돌아가기</Button></Screen>;
  const postId = post.id;
  const authorId = post.authorId;
  async function report() { try { await reportPost(postId, 'inappropriate'); Alert.alert('신고가 접수되었어요', '운영팀이 커뮤니티 가이드라인에 따라 검토합니다.'); } catch (error) { Alert.alert('신고할 수 없어요', error instanceof Error ? error.message : '다시 시도해 주세요.'); } }
  function confirmBlock() { Alert.alert('이 사용자를 차단할까요?', '이 사용자의 게시글이 피드에서 숨겨집니다.', [{ text: '취소', style: 'cancel' }, { text: '차단', style: 'destructive', onPress: async () => { await blockAuthor(authorId); router.back(); } }]); }
  return (
    <Screen>
      <AppHeader eyebrow={post.universityName ?? '전체 커뮤니티'} title="게시글" action={<Pressable onPress={() => router.back()}><Text style={styles.back}>닫기</Text></Pressable>} />
      <Card style={styles.post}><View style={styles.meta}><View style={styles.avatar}><Text style={styles.avatarText}>{post.authorName.slice(0, 1)}</Text></View><View><Text style={styles.author}>{post.authorName}</Text><Text style={styles.time}>{post.category.toUpperCase()} · 최근 게시</Text></View></View><Text style={styles.title}>{post.title}</Text><Text style={styles.body}>{post.body}</Text><View style={styles.actions}><Pressable onPress={() => toggleLike(post.id)}><Text style={[styles.action, post.isLiked && styles.active]}>♥ 좋아요 {post.likes}</Text></Pressable><Pressable onPress={() => toggleBookmark(post.id)}><Text style={[styles.action, post.isBookmarked && styles.active]}>☆ 저장</Text></Pressable></View></Card>
      <Card><Text style={styles.commentTitle}>댓글 {post.comments}</Text><Text style={styles.commentHint}>댓글 입력과 실시간 알림은 다음 구현 단계에서 연결합니다.</Text></Card>
      {post.authorId !== profile?.id ? <View style={styles.safety}><Button variant="ghost" onPress={() => void report()}>게시글 신고</Button><Button variant="danger" onPress={confirmBlock}>작성자 차단</Button></View> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({ back: { color: colors.primary, fontWeight: '900' }, post: { gap: 18 }, meta: { flexDirection: 'row', alignItems: 'center', gap: 11 }, avatar: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: colors.primary, fontWeight: '900' }, author: { color: colors.ink, fontWeight: '900' }, time: { color: colors.muted, fontSize: 11, marginTop: 3 }, title: { color: colors.ink, fontWeight: '900', fontSize: 23, lineHeight: 30 }, body: { color: '#344863', fontSize: 16, lineHeight: 26 }, actions: { flexDirection: 'row', gap: 22, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14 }, action: { color: colors.muted, fontWeight: '800' }, active: { color: colors.primary }, commentTitle: { color: colors.ink, fontWeight: '900' }, commentHint: { color: colors.muted, fontSize: 13, marginTop: 7, lineHeight: 19 }, safety: { gap: 10 } });
