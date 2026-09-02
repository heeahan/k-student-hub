import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { UNIVERSITIES } from '@/data/seed';
import { isDemoMode } from '@/lib/config';
import { getSupabase } from '@/lib/supabase';
import { storage } from '@/lib/storage';
import { STORAGE_KEYS } from '@/lib/storage-keys';
import type { LanguageCode, UserProfile } from '@/types/domain';

type OnboardingInput = {
  nickname: string;
  universityId: string;
  visaType: 'D-2' | 'D-4';
  language: LanguageCode;
};

type AuthContextValue = {
  loading: boolean;
  profile: UserProfile | null;
  signIn: (email: string) => Promise<'signed-in' | 'link-sent'>;
  completeOnboarding: (input: OnboardingInput) => Promise<void>;
  updateProfile: (input: OnboardingInput) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function mapProfile(row: Record<string, unknown>, email: string): UserProfile {
  const university = row.universities as Record<string, string> | null;
  return {
    id: String(row.id),
    nickname: String(row.display_name ?? 'Student'),
    email,
    universityId: String(row.university_id ?? ''),
    universityName: university?.name_ko ?? university?.name_en ?? '학교 미설정',
    visaType: row.visa_type === 'D-4' ? 'D-4' : 'D-2',
    language: (row.preferred_language as LanguageCode) ?? 'en',
    onboardingComplete: Boolean(row.onboarding_completed),
  };
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const loadRealProfile = useCallback(async (session: Session | null) => {
    if (!session) {
      setProfile(null);
      return;
    }
    const supabase = getSupabase();
    if (!supabase) return;
    const { data } = await supabase
      .from('profiles')
      .select('*, universities(name_ko, name_en)')
      .eq('id', session.user.id)
      .maybeSingle();
    if (data) setProfile(mapProfile(data, session.user.email ?? ''));
  }, []);

  useEffect(() => {
    let mounted = true;
    async function restore() {
      if (isDemoMode) {
        const saved = await storage.get(STORAGE_KEYS.profile);
        if (mounted && saved) setProfile(JSON.parse(saved) as UserProfile);
      } else {
        const supabase = getSupabase();
        const { data } = await supabase!.auth.getSession();
        if (mounted) await loadRealProfile(data.session);
      }
      if (mounted) setLoading(false);
    }
    void restore();

    const supabase = isDemoMode ? null : getSupabase();
    const subscription = supabase?.auth.onAuthStateChange((_event, session) => {
      void loadRealProfile(session);
    }).data.subscription;
    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [loadRealProfile]);

  const signIn = useCallback(async (email: string) => {
    if (isDemoMode) {
      const demo: UserProfile = {
        id: 'demo-user',
        nickname: 'New Student',
        email,
        universityId: '',
        universityName: '',
        visaType: 'D-2',
        language: 'en',
        onboardingComplete: false,
      };
      setProfile(demo);
      await storage.set(STORAGE_KEYS.profile, JSON.stringify(demo));
      return 'signed-in' as const;
    }
    const supabase = getSupabase()!;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: 'kstudenthub://onboarding' },
    });
    if (error) throw error;
    return 'link-sent' as const;
  }, []);

  const completeOnboarding = useCallback(async (input: OnboardingInput) => {
    const university = UNIVERSITIES.find((item) => item.id === input.universityId);
    if (!profile || !university) throw new Error('학교를 선택해 주세요.');
    if (!input.nickname.trim()) throw new Error('닉네임을 입력해 주세요.');
    const updated: UserProfile = {
      ...profile,
      nickname: input.nickname.trim(),
      universityId: university.id,
      universityName: university.nameKo,
      visaType: input.visaType,
      language: input.language,
      onboardingComplete: true,
    };
    if (isDemoMode) {
      await storage.set(STORAGE_KEYS.profile, JSON.stringify(updated));
    } else {
      const { error } = await getSupabase()!.from('profiles').upsert({
        id: profile.id,
        display_name: updated.nickname,
        university_id: updated.universityId,
        visa_type: updated.visaType,
        preferred_language: updated.language,
        onboarding_completed: true,
      });
      if (error) throw error;
    }
    setProfile(updated);
  }, [profile]);

  const signOut = useCallback(async () => {
    if (isDemoMode) await storage.remove(STORAGE_KEYS.profile);
    else await getSupabase()!.auth.signOut();
    setProfile(null);
  }, []);

  const deleteAccount = useCallback(async () => {
    if (isDemoMode) {
      await Promise.all([
        storage.remove(STORAGE_KEYS.profile),
        storage.remove(STORAGE_KEYS.community),
        storage.remove(STORAGE_KEYS.tasks),
        storage.remove(STORAGE_KEYS.service),
      ]);
    } else {
      const { error } = await getSupabase()!.functions.invoke('delete-account');
      if (error) throw error;
      await getSupabase()!.auth.signOut();
    }
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({ loading, profile, signIn, completeOnboarding, updateProfile: completeOnboarding, signOut, deleteAccount }),
    [loading, profile, signIn, completeOnboarding, signOut, deleteAccount],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
