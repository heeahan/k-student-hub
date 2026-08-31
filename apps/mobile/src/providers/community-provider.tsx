import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { INITIAL_POSTS } from '@/data/seed';
import { isDemoMode } from '@/lib/config';
import { getSupabase } from '@/lib/supabase';
import type { CommunityPost, LanguageCode, PostCategory } from '@/types/domain';
import { useAuth } from '@/providers/auth-provider';

type NewPost = {
  title: string;
  body: string;
  category: PostCategory;
  scope: 'all' | 'school';
  isAnonymous: boolean;
  language: LanguageCode;
};

type CommunityContextValue = {
  posts: CommunityPost[];
  loading: boolean;
  createPost: (input: NewPost) => Promise<CommunityPost>;
  reportPost: (postId: string, reason: string) => Promise<void>;
  blockAuthor: (authorId: string) => Promise<void>;
  toggleLike: (postId: string) => void;
  toggleBookmark: (postId: string) => void;
};

const CommunityContext = createContext<CommunityContextValue | null>(null);

function mapPost(row: Record<string, unknown>): CommunityPost {
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
    likes: 0,
    comments: 0,
    createdAt: String(row.created_at),
    isAnonymous: Boolean(row.is_anonymous),
  };
}

export function CommunityProvider({ children }: PropsWithChildren) {
  const { profile } = useAuth();
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [blockedAuthors, setBlockedAuthors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isDemoMode || !profile?.onboardingComplete) return;
    let mounted = true;
    async function load() {
      setLoading(true);
      const { data } = await getSupabase()!
        .from('posts')
        .select('*, universities(name_ko)')
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      if (mounted && data) setPosts(data.map(mapPost));
      if (mounted) setLoading(false);
    }
    void load();
    return () => { mounted = false; };
  }, [profile?.onboardingComplete]);

  const createPost = useCallback(async (input: NewPost) => {
    if (!profile) throw new Error('로그인이 필요합니다.');
    if (isDemoMode) {
      const post: CommunityPost = {
        id: `demo-${Date.now()}`,
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
      };
      setPosts((current) => [post, ...current]);
      return post;
    }
    const { data: moderation, error: moderationError } = await getSupabase()!.functions.invoke<{ allowed: boolean }>('moderate-content', { body: { content: `${input.title}\n${input.body}` } });
    if (moderationError) throw moderationError;
    if (!moderation?.allowed) throw new Error('커뮤니티 안전 기준에 맞지 않는 내용이 포함되어 있습니다.');
    const { data, error } = await getSupabase()!.from('posts').insert({
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
    if (error) throw error;
    const post = { ...mapPost(data), authorName: input.isAnonymous ? '익명 유학생' : profile.nickname };
    setPosts((current) => [post, ...current]);
    return post;
  }, [profile]);

  const reportPost = useCallback(async (postId: string, reason: string) => {
    if (isDemoMode) return;
    const { error } = await getSupabase()!.from('reports').insert({
      reporter_id: profile!.id,
      post_id: postId,
      reason: reason === 'inappropriate' ? 'other' : reason,
    });
    if (error) throw error;
  }, [profile]);

  const blockAuthor = useCallback(async (authorId: string) => {
    if (!isDemoMode) {
      const { error } = await getSupabase()!.from('user_blocks').insert({ blocker_id: profile!.id, blocked_id: authorId });
      if (error) throw error;
    }
    setBlockedAuthors((current) => [...new Set([...current, authorId])]);
  }, [profile]);

  const toggleLike = useCallback((postId: string) => {
    setPosts((current) => current.map((post) => post.id === postId
      ? { ...post, isLiked: !post.isLiked, likes: post.likes + (post.isLiked ? -1 : 1) }
      : post));
  }, []);

  const toggleBookmark = useCallback((postId: string) => {
    setPosts((current) => current.map((post) => post.id === postId ? { ...post, isBookmarked: !post.isBookmarked } : post));
  }, []);

  const visiblePosts = useMemo(
    () => posts.filter((post) => !blockedAuthors.includes(post.authorId)),
    [posts, blockedAuthors],
  );
  const value = useMemo(
    () => ({ posts: visiblePosts, loading, createPost, reportPost, blockAuthor, toggleLike, toggleBookmark }),
    [visiblePosts, loading, createPost, reportPost, blockAuthor, toggleLike, toggleBookmark],
  );
  return <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>;
}

export function useCommunity() {
  const value = useContext(CommunityContext);
  if (!value) throw new Error('useCommunity must be used inside CommunityProvider');
  return value;
}
