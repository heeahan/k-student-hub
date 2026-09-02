import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { isDemoMode } from '@/lib/config';
import { REQUIRED_LEGAL_KEYS, LEGAL_DOCUMENTS } from '@/lib/legal';
import { containsSensitiveInfo } from '@/lib/pii';
import { storage } from '@/lib/storage';
import { STORAGE_KEYS } from '@/lib/storage-keys';
import { getSupabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import type { LegalConsent, ServicePreferences, SupportCategory, SupportRequest } from '@/types/domain';

type NewSupportRequest = {
  category: SupportCategory;
  subject: string;
  body: string;
};

type DemoServiceState = {
  consents: LegalConsent[];
  preferences: ServicePreferences;
  supportRequests: SupportRequest[];
};

type ServiceContextValue = {
  loading: boolean;
  error: string | null;
  consents: LegalConsent[];
  hasRequiredConsents: boolean;
  preferences: ServicePreferences;
  supportRequests: SupportRequest[];
  recordRequiredConsents: () => Promise<void>;
  updatePreferences: (next: Partial<ServicePreferences>) => Promise<void>;
  createSupportRequest: (input: NewSupportRequest) => Promise<SupportRequest>;
  refreshSupportRequests: () => Promise<void>;
};

export const DEFAULT_SERVICE_PREFERENCES: ServicePreferences = {
  taskReminders: true,
  communityReplies: true,
  serviceNotices: true,
  marketing: false,
  defaultAnonymous: false,
};

const ServiceContext = createContext<ServiceContextValue | null>(null);

function mapPreferences(row?: Record<string, unknown> | null): ServicePreferences {
  if (!row) return DEFAULT_SERVICE_PREFERENCES;
  return {
    taskReminders: Boolean(row.task_reminders),
    communityReplies: Boolean(row.community_replies),
    serviceNotices: Boolean(row.service_notices),
    marketing: Boolean(row.marketing),
    defaultAnonymous: Boolean(row.default_anonymous),
  };
}

function mapSupportRequest(row: Record<string, unknown>): SupportRequest {
  return {
    id: String(row.id),
    category: row.category as SupportCategory,
    subject: String(row.subject),
    body: String(row.body),
    status: row.status as SupportRequest['status'],
    createdAt: String(row.created_at),
  };
}

export function ServiceProvider({ children }: PropsWithChildren) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [consents, setConsents] = useState<LegalConsent[]>([]);
  const [preferences, setPreferences] = useState<ServicePreferences>(DEFAULT_SERVICE_PREFERENCES);
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);

  const persistDemoState = useCallback(async (next: Partial<DemoServiceState>) => {
    const saved = await storage.get(STORAGE_KEYS.service);
    let current: DemoServiceState = { consents: [], preferences: DEFAULT_SERVICE_PREFERENCES, supportRequests: [] };
    if (saved) {
      try { current = { ...current, ...(JSON.parse(saved) as Partial<DemoServiceState>) }; }
      catch (parseError) { console.warn('Unable to parse demo service state', parseError); }
    }
    await storage.set(STORAGE_KEYS.service, JSON.stringify({ ...current, ...next }));
  }, []);

  useEffect(() => {
    let mounted = true;
    async function restore() {
      setLoading(true);
      setError(null);
      if (!profile) {
        if (mounted) {
          setConsents([]);
          setPreferences(DEFAULT_SERVICE_PREFERENCES);
          setSupportRequests([]);
          setLoading(false);
        }
        return;
      }
      try {
        if (isDemoMode) {
          const saved = await storage.get(STORAGE_KEYS.service);
          if (saved) {
            const parsed = JSON.parse(saved) as Partial<DemoServiceState>;
            if (mounted) {
              if (Array.isArray(parsed.consents)) setConsents(parsed.consents);
              if (parsed.preferences) setPreferences({ ...DEFAULT_SERVICE_PREFERENCES, ...parsed.preferences });
              if (Array.isArray(parsed.supportRequests)) setSupportRequests(parsed.supportRequests);
            }
          }
        } else {
          const supabase = getSupabase()!;
          const [consentResult, preferenceResult, supportResult] = await Promise.all([
            supabase.from('legal_consents').select('document_key, document_version, agreed_at').eq('user_id', profile.id),
            supabase.from('user_preferences').select('*').eq('user_id', profile.id).maybeSingle(),
            supabase.from('support_requests').select('id, category, subject, body, status, created_at').eq('user_id', profile.id).order('created_at', { ascending: false }),
          ]);
          if (consentResult.error) throw consentResult.error;
          if (preferenceResult.error) throw preferenceResult.error;
          if (supportResult.error) throw supportResult.error;
          if (mounted) {
            setConsents((consentResult.data ?? []).map((row) => ({ documentKey: row.document_key, version: row.document_version, agreedAt: row.agreed_at })));
            setPreferences(mapPreferences(preferenceResult.data));
            setSupportRequests((supportResult.data ?? []).map(mapSupportRequest));
          }
        }
      } catch (restoreError) {
        if (mounted) setError(restoreError instanceof Error ? restoreError.message : '서비스 설정을 불러오지 못했습니다.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void restore();
    return () => { mounted = false; };
  }, [profile]);

  const recordRequiredConsents = useCallback(async () => {
    if (!profile) throw new Error('로그인이 필요합니다.');
    const agreedAt = new Date().toISOString();
    const next = REQUIRED_LEGAL_KEYS.map((key) => ({ documentKey: key, version: LEGAL_DOCUMENTS[key].version, agreedAt }));
    if (isDemoMode) {
      setConsents(next);
      await persistDemoState({ consents: next });
      return;
    }
    const rows = next.map((consent) => ({
      user_id: profile.id,
      document_key: consent.documentKey,
      document_version: consent.version,
      agreed_at: consent.agreedAt,
    }));
    const { error: consentError } = await getSupabase()!.from('legal_consents').upsert(rows, { onConflict: 'user_id,document_key,document_version', ignoreDuplicates: true });
    if (consentError) throw consentError;
    setConsents(next);
  }, [persistDemoState, profile]);

  const updatePreferences = useCallback(async (updates: Partial<ServicePreferences>) => {
    if (!profile) throw new Error('로그인이 필요합니다.');
    const next = { ...preferences, ...updates };
    setPreferences(next);
    try {
      if (isDemoMode) {
        await persistDemoState({ preferences: next });
      } else {
        const { error: preferenceError } = await getSupabase()!.from('user_preferences').upsert({
          user_id: profile.id,
          task_reminders: next.taskReminders,
          community_replies: next.communityReplies,
          service_notices: next.serviceNotices,
          marketing: next.marketing,
          default_anonymous: next.defaultAnonymous,
        });
        if (preferenceError) throw preferenceError;
      }
    } catch (preferenceError) {
      setPreferences(preferences);
      throw preferenceError;
    }
  }, [persistDemoState, preferences, profile]);

  const refreshSupportRequests = useCallback(async () => {
    if (isDemoMode || !profile) return;
    const { data, error: supportError } = await getSupabase()!
      .from('support_requests')
      .select('id, category, subject, body, status, created_at')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });
    if (supportError) throw supportError;
    setSupportRequests((data ?? []).map(mapSupportRequest));
  }, [profile]);

  const createSupportRequest = useCallback(async (input: NewSupportRequest) => {
    if (!profile) throw new Error('로그인이 필요합니다.');
    const subject = input.subject.trim();
    const body = input.body.trim();
    if (subject.length < 2 || body.length < 10) throw new Error('제목과 문의 내용을 조금 더 자세히 입력해 주세요.');
    if (containsSensitiveInfo(`${subject} ${body}`)) throw new Error('신분증 번호, 계좌번호 또는 전화번호로 보이는 내용을 삭제해 주세요.');
    let request: SupportRequest;
    if (isDemoMode) {
      request = { id: `demo-support-${Date.now()}`, category: input.category, subject, body, status: 'received', createdAt: new Date().toISOString() };
      const next = [request, ...supportRequests];
      setSupportRequests(next);
      await persistDemoState({ supportRequests: next });
    } else {
      const { data, error: supportError } = await getSupabase()!.from('support_requests').insert({ user_id: profile.id, category: input.category, subject, body }).select('id, category, subject, body, status, created_at').single();
      if (supportError) throw supportError;
      request = mapSupportRequest(data);
      setSupportRequests((current) => [request, ...current]);
    }
    return request;
  }, [persistDemoState, profile, supportRequests]);

  const hasRequiredConsents = useMemo(() => REQUIRED_LEGAL_KEYS.every((key) => consents.some((consent) => consent.documentKey === key && consent.version === LEGAL_DOCUMENTS[key].version)), [consents]);

  const value = useMemo<ServiceContextValue>(() => ({
    loading,
    error,
    consents,
    hasRequiredConsents,
    preferences,
    supportRequests,
    recordRequiredConsents,
    updatePreferences,
    createSupportRequest,
    refreshSupportRequests,
  }), [loading, error, consents, hasRequiredConsents, preferences, supportRequests, recordRequiredConsents, updatePreferences, createSupportRequest, refreshSupportRequests]);

  return <ServiceContext.Provider value={value}>{children}</ServiceContext.Provider>;
}

export function useService() {
  const value = useContext(ServiceContext);
  if (!value) throw new Error('useService must be used inside ServiceProvider');
  return value;
}
