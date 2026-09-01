import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { containsSensitiveInfo } from '@/lib/pii';
import { useAuth } from '@/providers/auth-provider';
import { useCommunity } from '@/providers/community-provider';
import type { CommunityComment } from '@/types/domain';
import { AppHeader, Button, Card, EmptyState, Field, Screen } from '@/ui/primitives';
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
  return days < 7 ? `${days}일 전` : new Date(createdAt).toLocaleDateString();
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const {
    posts,
    commentsByPost,
    loadingComments,
    reportedPostIds,
    reportedCommentIds,
    loadComments,
    addComment,
    deleteComment,
    deletePost,
    reportPost,
    reportComment,
    blockAuthor,
    toggleLike,
    toggleBookmark,
  } = useCommunity();
  const [comment, setComment] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const post = posts.find((item) => item.id === id);
  const postId = post?.id ?? String(id ?? '');
  const comments = commentsByPost[postId] ?? [];
  const commentsLoading = loadingComments.includes(postId);

  useEffect(() => {
    if (!postId) return;
    void loadComments(postId).catch((loadError) => {
      Alert.alert('댓글을 불러올 수 없어요', loadError instanceof Error ? loadError.message : '잠시 후 다시 시도해 주세요.');
    });
  }, [postId, loadComments]);

  if (!post) return <Screen><AppHeader title="게시글" /><EmptyState icon="🫥" title="게시글을 찾을 수 없어요" body="삭제되었거나 차단한 사용자의 글일 수 있습니다." /><Button onPress={() => router.back()}>돌아가기</Button></Screen>;
  const authorId = post.authorId;

  function runAction(action: Promise<void>, failureTitle: string) {
    void action.catch((actionError) => Alert.alert(failureTitle, actionError instanceof Error ? actionError.message : '잠시 후 다시 시도해 주세요.'));
  }

  async function submitComment() {
    const trimmed = comment.trim();
    if (!trimmed) return Alert.alert('댓글 내용을 입력해 주세요.');
    if (containsSensitiveInfo(trimmed)) return Alert.alert('개인정보를 지워 주세요', '연락처, 신분증 번호 또는 계좌번호로 보이는 정보는 댓글에 올릴 수 없습니다.');
    try {
      setSubmitting(true);
      await addComment(postId, trimmed, anonymous);
      setComment('');
      setAnonymous(false);
    } catch (submitError) {
      Alert.alert('댓글을 등록할 수 없어요', submitError instanceof Error ? submitError.message : '잠시 후 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  function confirmDeletePost() {
    Alert.alert('게시글을 삭제할까요?', '삭제한 글은 피드에서 사라집니다.', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => runAction(deletePost(postId).then(() => router.back()), '게시글을 삭제할 수 없어요') },
    ]);
  }

  function confirmDeleteComment(target: CommunityComment) {
    Alert.alert('댓글을 삭제할까요?', undefined, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => runAction(deleteComment(postId, target.id), '댓글을 삭제할 수 없어요') },
    ]);
  }

  async function submitPostReport() {
    try {
      await reportPost(postId, 'other');
      Alert.alert('신고가 접수되었어요', '운영팀이 커뮤니티 가이드라인에 따라 검토합니다.');
    } catch (reportError) {
      Alert.alert('신고할 수 없어요', reportError instanceof Error ? reportError.message : '잠시 후 다시 시도해 주세요.');
    }
  }

  function confirmBlock() {
    Alert.alert('이 사용자를 차단할까요?', '이 사용자의 게시글과 댓글이 모두 숨겨집니다.', [
      { text: '취소', style: 'cancel' },
      { text: '차단', style: 'destructive', onPress: () => runAction(blockAuthor(authorId).then(() => router.back()), '사용자를 차단할 수 없어요') },
    ]);
  }

  return (
    <Screen>
      <AppHeader eyebrow={post.universityName ?? '전체 커뮤니티'} title="게시글" action={<Pressable accessibilityRole="button" onPress={() => router.back()}><Text style={styles.back}>닫기</Text></Pressable>} />

      <Card style={styles.post}>
        <View style={styles.meta}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{post.authorName.slice(0, 1)}</Text></View>
          <View style={styles.metaCopy}><Text style={styles.author}>{post.authorName}</Text><Text style={styles.time}>{categoryLabel[post.category]} · {relativeTime(post.createdAt)}</Text></View>
          {post.authorId === profile?.id ? <View style={styles.mineBadge}><Text style={styles.mineBadgeText}>내 글</Text></View> : null}
        </View>
        <Text style={styles.title}>{post.title}</Text>
        <Text style={styles.body}>{post.body}</Text>
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" onPress={() => runAction(toggleLike(post.id), '좋아요를 반영할 수 없어요')}><Text style={[styles.action, post.isLiked && styles.active]}>♥ 좋아요 {post.likes}</Text></Pressable>
          <Text style={styles.action}>💬 댓글 {post.comments}</Text>
          <View style={styles.spacer} />
          <Pressable accessibilityRole="button" onPress={() => runAction(toggleBookmark(post.id), '저장할 수 없어요')}><Text style={[styles.action, post.isBookmarked && styles.active]}>{post.isBookmarked ? '★ 저장됨' : '☆ 저장'}</Text></Pressable>
        </View>
      </Card>

      <Card style={styles.composerCard}>
        <Text style={styles.sectionTitle}>댓글 남기기</Text>
        <Field label="댓글" value={comment} onChangeText={setComment} multiline maxLength={2000} placeholder="경험이나 도움이 되는 답변을 나눠 주세요." hint={`${comment.length}/2000 · 개인정보와 연락처는 입력하지 마세요.`} />
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: anonymous }} style={styles.anonymousRow} onPress={() => setAnonymous((value) => !value)}>
          <View style={[styles.checkbox, anonymous && styles.checkboxOn]}><Text style={styles.check}>{anonymous ? '✓' : ''}</Text></View>
          <View><Text style={styles.anonymousTitle}>익명으로 댓글 작성</Text><Text style={styles.anonymousHint}>다른 학생에게는 이름이 표시되지 않습니다.</Text></View>
        </Pressable>
        <Button loading={submitting} disabled={!comment.trim()} onPress={() => void submitComment()}>댓글 등록</Button>
      </Card>

      <View style={styles.commentHeader}><Text style={styles.sectionTitle}>댓글 {comments.length}</Text>{commentsLoading ? <ActivityIndicator size="small" color={colors.primary} /> : null}</View>
      {!commentsLoading && !comments.length ? <View style={styles.noComments}><Text style={styles.noCommentsIcon}>💬</Text><Text style={styles.noCommentsTitle}>아직 댓글이 없어요</Text><Text style={styles.noCommentsBody}>첫 번째로 도움을 나눠 보세요.</Text></View> : null}
      {comments.map((item) => (
        <Card key={item.id} style={styles.commentCard}>
          <View style={styles.commentMeta}>
            <View style={styles.commentAvatar}><Text style={styles.commentAvatarText}>{item.authorName.slice(0, 1)}</Text></View>
            <View style={styles.metaCopy}><Text style={styles.commentAuthor}>{item.authorName}</Text><Text style={styles.commentTime}>{relativeTime(item.createdAt)}{item.authorId === post.authorId ? ' · 작성자' : ''}</Text></View>
          </View>
          <Text style={styles.commentBody}>{item.body}</Text>
          <View style={styles.commentActions}>
            {item.authorId === profile?.id
              ? <Pressable onPress={() => confirmDeleteComment(item)}><Text style={styles.deleteText}>삭제</Text></Pressable>
              : <Pressable disabled={reportedCommentIds.includes(item.id)} onPress={() => runAction(reportComment(item.id, 'other').then(() => Alert.alert('댓글 신고가 접수되었어요.')), '댓글을 신고할 수 없어요')}><Text style={[styles.reportText, reportedCommentIds.includes(item.id) && styles.reported]}>{reportedCommentIds.includes(item.id) ? '신고됨' : '신고'}</Text></Pressable>}
          </View>
        </Card>
      ))}

      {post.authorId === profile?.id ? (
        <Button variant="danger" onPress={confirmDeletePost}>게시글 삭제</Button>
      ) : (
        <View style={styles.safety}>
          <Text style={styles.safetyTitle}>안전한 커뮤니티를 함께 만들어요</Text>
          <Text style={styles.safetyBody}>스팸, 사기, 괴롭힘, 개인정보 노출이 있다면 신고하거나 작성자를 차단할 수 있습니다.</Text>
          <Button variant="ghost" disabled={reportedPostIds.includes(postId)} onPress={() => void submitPostReport()}>{reportedPostIds.includes(postId) ? '신고 접수됨' : '게시글 신고'}</Button>
          <Button variant="danger" onPress={confirmBlock}>작성자 차단</Button>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.primary, fontWeight: '900' }, post: { gap: 18 }, meta: { flexDirection: 'row', alignItems: 'center', gap: 11 }, metaCopy: { flex: 1 }, avatar: { width: 42, height: 42, borderRadius: 15, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: colors.primary, fontWeight: '900' }, author: { color: colors.ink, fontWeight: '900' }, time: { color: colors.muted, fontSize: 11, marginTop: 3 }, mineBadge: { backgroundColor: '#DDF5EE', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 }, mineBadgeText: { color: colors.success, fontSize: 10, fontWeight: '900' },
  title: { color: colors.ink, fontWeight: '900', fontSize: 23, lineHeight: 30 }, body: { color: '#344863', fontSize: 16, lineHeight: 26 }, actions: { flexDirection: 'row', alignItems: 'center', gap: 18, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14 }, action: { color: colors.muted, fontWeight: '800', fontSize: 12 }, active: { color: colors.primary }, spacer: { flex: 1 },
  composerCard: { gap: 14, shadowOpacity: 0 }, sectionTitle: { color: colors.ink, fontWeight: '900', fontSize: 16 }, anonymousRow: { flexDirection: 'row', alignItems: 'center', gap: 11 }, checkbox: { width: 25, height: 25, borderRadius: 8, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary }, check: { color: '#fff', fontWeight: '900' }, anonymousTitle: { color: colors.ink, fontWeight: '800', fontSize: 13 }, anonymousHint: { color: colors.muted, fontSize: 10, marginTop: 2 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }, noComments: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 28, gap: 5 }, noCommentsIcon: { fontSize: 24 }, noCommentsTitle: { color: colors.ink, fontWeight: '900' }, noCommentsBody: { color: colors.muted, fontSize: 12 },
  commentCard: { gap: 12, shadowOpacity: 0, padding: 15 }, commentMeta: { flexDirection: 'row', alignItems: 'center', gap: 9 }, commentAvatar: { width: 32, height: 32, borderRadius: 11, backgroundColor: '#EEF2F8', alignItems: 'center', justifyContent: 'center' }, commentAvatarText: { color: colors.primaryDark, fontSize: 12, fontWeight: '900' }, commentAuthor: { color: colors.ink, fontWeight: '900', fontSize: 13 }, commentTime: { color: colors.muted, fontSize: 10, marginTop: 2 }, commentBody: { color: '#344863', fontSize: 14, lineHeight: 22 }, commentActions: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: '#F0F2F6', paddingTop: 9 }, deleteText: { color: colors.danger, fontSize: 11, fontWeight: '800' }, reportText: { color: colors.muted, fontSize: 11, fontWeight: '800' }, reported: { color: colors.success },
  safety: { gap: 10, backgroundColor: '#FFF8E8', borderRadius: 20, padding: 16 }, safetyTitle: { color: colors.ink, fontWeight: '900' }, safetyBody: { color: colors.muted, fontSize: 12, lineHeight: 18, marginBottom: 2 },
});
