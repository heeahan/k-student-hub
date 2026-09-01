import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { INITIAL_COMMENTS, INITIAL_POSTS } from '@/data/seed';
import { isDemoMode } from '@/lib/config';
import { storage } from '@/lib/storage';
import { getSupabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import type { CommunityComment, CommunityPost, LanguageCode, PostCategory } from '@/types/domain';

const DEMO_COMMUNITY_KEY = 'kstudenthub.community.v2';

type NewPost = {
  title: string;
  body: string;
  category: PostCategory;
  scope: 'all' | 'school';
  isAnonymous: boolean;
  language: LanguageCode;
};

type ReportReason = 'spam' | 'harassment' | 'hate' | 'sexual' | 'scam' | 'privacy' | 'misinformation' | 'other';

type DemoCommunityState = {
  posts: CommunityPost[];
  commentsByPost: Record<string, CommunityComment[]>;
  blockedAuthors: string[];
  reportedPostIds: string[];
  reportedCommentIds: string[];
};

type CommunityContextValue = {
  posts: CommunityPost[];
  commentsByPost: Record<string, CommunityComment[]>;
  loading: boolean;
  loadingComments: string[];
  error: string | null;
  reportedPostIds: string[];
  reportedCommentIds: string[];
  refresh: () => Promise<void>;
  loadComments: (postId: string) => Promise<void>;
  createPost: (input: NewPost) => Promise<CommunityPost>;
  deletePost: (postId: string) => Promise<void>;
  addComment: (postId: string, content: string, isAnonymous: boolean) => Promise<CommunityComment>;
  deleteComment: (postId: string, commentId: string) => Promise<void>;
  reportPost: (postId: string, reason: ReportReason) => Promise<void>;
  reportComment: (commentId: string, reason: ReportReason) => Promise<void>;
  blockAuthor: (authorId: string) => Promise<void>;
  toggleLike: (postId: string) => Promise<void>;
  toggleBookmark: (postId: string) => Promise<void>;
};

const CommunityContext = createContext<CommunityContextValue | null>(null);

function mapPost(
  row: Record<string, unknown>,
  interactions: { likes?: number; comments?: number; isLiked?: boolean; isBookmarked?: boolean } = {},
): CommunityPost {
  const university = row.universities as Record<string, string> | null;
  return {
    id: String(row.id),
    authorId: String(row.author_id),
    authorName: String(row.author_display_name ?? 'Student'),
    universityId: row.university_id ? String(row.university_id) : null,
    universityName: university?.name_ko ?? null,
    category: row.category as PostCategory,
    title: String(row.title),
    body: String(row.content),
    language: row.language as LanguageCode,
    likes: interactions.likes ?? 0,
    comments: interactions.comments ?? 0,
    createdAt: String(row.created_at),
    isAnonymous: Boolean(row.is_anonymous),
    visibility: row.visibility === 'university' ? 'university' : 'public',
    isLiked: interactions.isLiked ?? false,
    isBookmarked: interactions.isBookmarked ?? false,
  };
}

function mapComment(row: Record<string, unknown>): CommunityComment {
  return {
    id: String(row.id),
    postId: String(row.post_id),
    authorId: String(row.author_id),
    authorName: String(row.author_display_name ?? 'Student'),
    body: String(row.content),
    language: row.language as LanguageCode,
    createdAt: String(row.created_at),
    isAnonymous: Boolean(row.is_anonymous),
  };
}

function countByPost(rows: { post_id: string }[] | null) {
  const counts = new Map<string, number>();
  for (const row of rows ?? []) counts.set(row.post_id, (counts.get(row.post_id) ?? 0) + 1);
  return counts;
}

export function CommunityProvider({ children }: PropsWithChildren) {
  const { profile } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>(INITIAL_POSTS);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, CommunityComment[]>>(INITIAL_COMMENTS);
  const [blockedAuthors, setBlockedAuthors] = useState<string[]>([]);
  const [reportedPostIds, setReportedPostIds] = useState<string[]>([]);
  const [reportedCommentIds, setReportedCommentIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingComments, setLoadingComments] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [demoHydrated, setDemoHydrated] = useState(false);

  useEffect(() => {
    if (!isDemoMode) return;
    let mounted = true;
    async function restoreDemoState() {
      try {
        const saved = await storage.get(DEMO_COMMUNITY_KEY);
        if (!mounted || !saved) return;
        const parsed = JSON.parse(saved) as Partial<DemoCommunityState>;
        if (Array.isArray(parsed.posts)) setPosts(parsed.posts);
        if (parsed.commentsByPost && typeof parsed.commentsByPost === 'object') setCommentsByPost(parsed.commentsByPost);
        if (Array.isArray(parsed.blockedAuthors)) setBlockedAuthors(parsed.blockedAuthors);
        if (Array.isArray(parsed.reportedPostIds)) setReportedPostIds(parsed.reportedPostIds);
        if (Array.isArray(parsed.reportedCommentIds)) setReportedCommentIds(parsed.reportedCommentIds);
      } catch (restoreError) {
        console.warn('Unable to restore demo community state', restoreError);
      } finally {
        if (mounted) setDemoHydrated(true);
      }
    }
    void restoreDemoState();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!isDemoMode || !demoHydrated) return;
    const state: DemoCommunityState = { posts, commentsByPost, blockedAuthors, reportedPostIds, reportedCommentIds };
    void storage.set(DEMO_COMMUNITY_KEY, JSON.stringify(state)).catch((persistError) => {
      console.warn('Unable to persist demo community state', persistError);
    });
  }, [posts, commentsByPost, blockedAuthors, reportedPostIds, reportedCommentIds, demoHydrated]);

  const refresh = useCallback(async () => {
    if (isDemoMode || !profile?.onboardingComplete) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabase()!;
      const { data: postRows, error: postError } = await supabase
        .from('posts')
        .select('*, universities(name_ko)')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(100);
      if (postError) throw postError;
      const ids = (postRows ?? []).map((row) => String(row.id));
      if (!ids.length) {
        setPosts([]);
        return;
      }

      const [reactionResult, commentResult, bookmarkResult, blockResult] = await Promise.all([
        supabase.from('post_reactions').select('post_id, user_id').in('post_id', ids),
        supabase.from('comments').select('post_id').eq('status', 'published').in('post_id', ids),
        supabase.from('bookmarks').select('post_id').eq('user_id', profile.id).in('post_id', ids),
        supabase.from('user_blocks').select('blocked_id').eq('blocker_id', profile.id),
      ]);
      if (reactionResult.error) throw reactionResult.error;
      if (commentResult.error) throw commentResult.error;
      if (bookmarkResult.error) throw bookmarkResult.error;
      if (blockResult.error) throw blockResult.error;

      const likes = countByPost(reactionResult.data);
      const comments = countByPost(commentResult.data);
      const liked = new Set((reactionResult.data ?? []).filter((row) => row.user_id === profile.id).map((row) => row.post_id));
      const bookmarked = new Set((bookmarkResult.data ?? []).map((row) => row.post_id));
      setBlockedAuthors((blockResult.data ?? []).map((row) => row.blocked_id));
      setPosts((postRows ?? []).map((row) => mapPost(row, {
        likes: likes.get(row.id) ?? 0,
        comments: comments.get(row.id) ?? 0,
        isLiked: liked.has(row.id),
        isBookmarked: bookmarked.has(row.id),
      })));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '커뮤니티를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    const refreshTimer = setTimeout(() => { void refresh(); }, 0);
    return () => clearTimeout(refreshTimer);
  }, [refresh]);

  const loadComments = useCallback(async (postId: string) => {
    if (isDemoMode) return;
    setLoadingComments((current) => [...new Set([...current, postId])]);
    try {
      const { data, error: commentsError } = await getSupabase()!
        .from('comments')
        .select('id, post_id, author_id, author_display_name, is_anonymous, content, language, created_at')
        .eq('post_id', postId)
        .eq('status', 'published')
        .order('created_at', { ascending: true });
      if (commentsError) throw commentsError;
      const comments = (data ?? []).map(mapComment);
      setCommentsByPost((current) => ({ ...current, [postId]: comments }));
      setPosts((current) => current.map((post) => post.id === postId ? { ...post, comments: comments.length } : post));
    } finally {
      setLoadingComments((current) => current.filter((id) => id !== postId));
    }
  }, []);

  const createPost = useCallback(async (input: NewPost) => {
    if (!profile) throw new Error('로그인이 필요합니다.');
    if (isDemoMode) {
      const post: CommunityPost = {
        id: `demo-post-${Date.now()}`,
        authorId: profile.id,
        authorName: input.isAnonymous ? '익명 유학생' : profile.nickname,
        universityId: input.scope === 'school' ? profile.universityId : null,
        universityName: input.scope === 'school' ? profile.universityName : null,
        category: input.category,
        title: input.title.trim(),
        body: input.body.trim(),
        language: input.language,
        likes: 0,
        comments: 0,
        createdAt: new Date().toISOString(),
        isAnonymous: input.isAnonymous,
        visibility: input.scope === 'school' ? 'university' : 'public',
        isLiked: false,
        isBookmarked: false,
      };
      setPosts((current) => [post, ...current]);
      setCommentsByPost((current) => ({ ...current, [post.id]: [] }));
      return post;
    }

    const { data: moderation, error: moderationError } = await getSupabase()!.functions.invoke<{ allowed: boolean }>('moderate-content', { body: { content: `${input.title}\n${input.body}` } });
    if (moderationError) throw moderationError;
    if (!moderation?.allowed) throw new Error('커뮤니티 안전 기준에 맞지 않는 내용이 포함되어 있습니다.');
    const { data, error: insertError } = await getSupabase()!.from('posts').insert({
      author_id: profile.id,
      author_display_name: input.isAnonymous ? '익명 유학생' : profile.nickname,
      is_anonymous: input.isAnonymous,
      university_id: input.scope === 'school' ? profile.universityId : null,
      category: input.category,
      title: input.title.trim(),
      content: input.body.trim(),
      language: input.language,
      visibility: input.scope === 'school' ? 'university' : 'public',
      status: 'published',
    }).select('*').single();
    if (insertError) throw insertError;
    const post = {
      ...mapPost(data),
      authorName: input.isAnonymous ? '익명 유학생' : profile.nickname,
      universityName: input.scope === 'school' ? profile.universityName : null,
    };
    setPosts((current) => [post, ...current]);
    return post;
  }, [profile]);

  const deletePost = useCallback(async (postId: string) => {
    const target = posts.find((post) => post.id === postId);
    if (!profile || !target || target.authorId !== profile.id) throw new Error('본인이 작성한 글만 삭제할 수 있습니다.');
    if (!isDemoMode) {
      const { error: deleteError } = await getSupabase()!.from('posts').update({ status: 'deleted' }).eq('id', postId).eq('author_id', profile.id);
      if (deleteError) throw deleteError;
    }
    setPosts((current) => current.filter((post) => post.id !== postId));
    setCommentsByPost((current) => {
      const next = { ...current };
      delete next[postId];
      return next;
    });
  }, [posts, profile]);

  const addComment = useCallback(async (postId: string, content: string, isAnonymous: boolean) => {
    if (!profile) throw new Error('로그인이 필요합니다.');
    const trimmed = content.trim();
    if (!trimmed) throw new Error('댓글 내용을 입력해 주세요.');
    let comment: CommunityComment;
    if (isDemoMode) {
      comment = {
        id: `demo-comment-${Date.now()}`,
        postId,
        authorId: profile.id,
        authorName: isAnonymous ? '익명 유학생' : profile.nickname,
        body: trimmed,
        language: profile.language,
        createdAt: new Date().toISOString(),
        isAnonymous,
      };
    } else {
      const { data: moderation, error: moderationError } = await getSupabase()!.functions.invoke<{ allowed: boolean }>('moderate-content', { body: { content: trimmed } });
      if (moderationError) throw moderationError;
      if (!moderation?.allowed) throw new Error('커뮤니티 안전 기준에 맞지 않는 내용이 포함되어 있습니다.');
      const { data, error: insertError } = await getSupabase()!.from('comments').insert({
        post_id: postId,
        author_id: profile.id,
        author_display_name: isAnonymous ? '익명 유학생' : profile.nickname,
        is_anonymous: isAnonymous,
        content: trimmed,
        language: profile.language,
        status: 'published',
      }).select('*').single();
      if (insertError) throw insertError;
      comment = mapComment(data);
    }
    setCommentsByPost((current) => ({ ...current, [postId]: [...(current[postId] ?? []), comment] }));
    setPosts((current) => current.map((post) => post.id === postId ? { ...post, comments: post.comments + 1 } : post));
    return comment;
  }, [profile]);

  const deleteComment = useCallback(async (postId: string, commentId: string) => {
    const target = commentsByPost[postId]?.find((comment) => comment.id === commentId);
    if (!profile || !target || target.authorId !== profile.id) throw new Error('본인이 작성한 댓글만 삭제할 수 있습니다.');
    if (!isDemoMode) {
      const { error: deleteError } = await getSupabase()!.from('comments').update({ status: 'deleted' }).eq('id', commentId).eq('author_id', profile.id);
      if (deleteError) throw deleteError;
    }
    setCommentsByPost((current) => ({ ...current, [postId]: (current[postId] ?? []).filter((comment) => comment.id !== commentId) }));
    setPosts((current) => current.map((post) => post.id === postId ? { ...post, comments: Math.max(0, post.comments - 1) } : post));
  }, [commentsByPost, profile]);

  const reportPost = useCallback(async (postId: string, reason: ReportReason) => {
    if (!profile) throw new Error('로그인이 필요합니다.');
    if (!isDemoMode) {
      const { error: reportError } = await getSupabase()!.from('reports').insert({ reporter_id: profile.id, post_id: postId, reason });
      if (reportError) throw reportError;
    }
    setReportedPostIds((current) => [...new Set([...current, postId])]);
  }, [profile]);

  const reportComment = useCallback(async (commentId: string, reason: ReportReason) => {
    if (!profile) throw new Error('로그인이 필요합니다.');
    if (!isDemoMode) {
      const { error: reportError } = await getSupabase()!.from('reports').insert({ reporter_id: profile.id, comment_id: commentId, reason });
      if (reportError) throw reportError;
    }
    setReportedCommentIds((current) => [...new Set([...current, commentId])]);
  }, [profile]);

  const blockAuthor = useCallback(async (authorId: string) => {
    if (!profile) throw new Error('로그인이 필요합니다.');
    if (authorId === profile.id) throw new Error('본인을 차단할 수 없습니다.');
    if (!isDemoMode) {
      const { error: blockError } = await getSupabase()!.from('user_blocks').upsert({ blocker_id: profile.id, blocked_id: authorId });
      if (blockError) throw blockError;
    }
    setBlockedAuthors((current) => [...new Set([...current, authorId])]);
  }, [profile]);

  const toggleLike = useCallback(async (postId: string) => {
    const target = posts.find((post) => post.id === postId);
    if (!profile || !target) return;
    const nextLiked = !target.isLiked;
    setPosts((current) => current.map((post) => post.id === postId ? {
      ...post,
      isLiked: nextLiked,
      likes: Math.max(0, post.likes + (nextLiked ? 1 : -1)),
    } : post));
    if (isDemoMode) return;
    const query = nextLiked
      ? getSupabase()!.from('post_reactions').insert({ post_id: postId, user_id: profile.id, reaction: 'like' })
      : getSupabase()!.from('post_reactions').delete().eq('post_id', postId).eq('user_id', profile.id);
    const { error: reactionError } = await query;
    if (reactionError) {
      setPosts((current) => current.map((post) => post.id === postId ? { ...post, isLiked: target.isLiked, likes: target.likes } : post));
      throw reactionError;
    }
  }, [posts, profile]);

  const toggleBookmark = useCallback(async (postId: string) => {
    const target = posts.find((post) => post.id === postId);
    if (!profile || !target) return;
    const nextBookmarked = !target.isBookmarked;
    setPosts((current) => current.map((post) => post.id === postId ? { ...post, isBookmarked: nextBookmarked } : post));
    if (isDemoMode) return;
    const query = nextBookmarked
      ? getSupabase()!.from('bookmarks').insert({ post_id: postId, user_id: profile.id })
      : getSupabase()!.from('bookmarks').delete().eq('post_id', postId).eq('user_id', profile.id);
    const { error: bookmarkError } = await query;
    if (bookmarkError) {
      setPosts((current) => current.map((post) => post.id === postId ? { ...post, isBookmarked: target.isBookmarked } : post));
      throw bookmarkError;
    }
  }, [posts, profile]);

  const visiblePosts = useMemo(
    () => posts
      .filter((post) => !blockedAuthors.includes(post.authorId))
      .map((post) => commentsByPost[post.id]
        ? { ...post, comments: commentsByPost[post.id].filter((comment) => !blockedAuthors.includes(comment.authorId)).length }
        : post),
    [posts, commentsByPost, blockedAuthors],
  );
  const visibleCommentsByPost = useMemo(() => Object.fromEntries(
    Object.entries(commentsByPost).map(([postId, comments]) => [postId, comments.filter((comment) => !blockedAuthors.includes(comment.authorId))]),
  ), [commentsByPost, blockedAuthors]);

  const value = useMemo<CommunityContextValue>(() => ({
    posts: visiblePosts,
    commentsByPost: visibleCommentsByPost,
    loading,
    loadingComments,
    error,
    reportedPostIds,
    reportedCommentIds,
    refresh,
    loadComments,
    createPost,
    deletePost,
    addComment,
    deleteComment,
    reportPost,
    reportComment,
    blockAuthor,
    toggleLike,
    toggleBookmark,
  }), [visiblePosts, visibleCommentsByPost, loading, loadingComments, error, reportedPostIds, reportedCommentIds, refresh, loadComments, createPost, deletePost, addComment, deleteComment, reportPost, reportComment, blockAuthor, toggleLike, toggleBookmark]);

  return <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>;
}

export function useCommunity() {
  const value = useContext(CommunityContext);
  if (!value) throw new Error('useCommunity must be used inside CommunityProvider');
  return value;
}
