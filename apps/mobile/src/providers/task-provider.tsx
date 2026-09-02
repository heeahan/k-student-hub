import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { INITIAL_TASKS } from '@/data/seed';
import { isDemoMode } from '@/lib/config';
import { storage } from '@/lib/storage';
import { STORAGE_KEYS } from '@/lib/storage-keys';
import { getSupabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import type { TimelineTask } from '@/types/domain';

export type TaskDuePreset = 'today' | 'three_days' | 'week' | 'none';

type NewTaskInput = {
  title: string;
  description: string;
  duePreset: TaskDuePreset;
};

type TaskContextValue = {
  tasks: TimelineTask[];
  loading: boolean;
  error: string | null;
  addTask: (input: NewTaskInput) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  snoozeTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  resetDemoTasks: () => Promise<void>;
  refresh: () => Promise<void>;
};

const TaskContext = createContext<TaskContextValue | null>(null);

const duePresetDays: Record<TaskDuePreset, number | null> = {
  today: 0,
  three_days: 3,
  week: 7,
  none: null,
};

function dateAfter(days: number) {
  const value = new Date();
  value.setHours(12, 0, 0, 0);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

function duePresentation(dueOn: string | null): Pick<TimelineTask, 'dueLabel' | 'tone'> {
  if (!dueOn) return { dueLabel: '날짜 없음', tone: 'normal' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueOn}T00:00:00`);
  const days = Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return { dueLabel: `${Math.abs(days)}일 지남`, tone: 'urgent' };
  if (days === 0) return { dueLabel: '오늘', tone: 'urgent' };
  if (days === 1) return { dueLabel: '내일', tone: 'soon' };
  if (days <= 7) return { dueLabel: `${days}일 뒤`, tone: 'soon' };
  return { dueLabel: dueOn.replaceAll('-', '.'), tone: 'normal' };
}

function mapTask(row: Record<string, unknown>): TimelineTask {
  const dueOn = row.due_on ? String(row.due_on) : null;
  const status = String(row.status ?? 'todo');
  return {
    id: String(row.id),
    title: String(row.title),
    description: String(row.description ?? ''),
    ...duePresentation(dueOn),
    completed: status === 'done',
    source: row.rule_id ? 'suggested' : 'custom',
    dueOn,
    snoozedUntil: status === 'snoozed' && row.remind_at ? String(row.remind_at) : null,
  };
}

function normalizeDemoTask(task: Partial<TimelineTask> & Pick<TimelineTask, 'id' | 'title' | 'description' | 'dueLabel' | 'tone' | 'completed'>): TimelineTask {
  return {
    ...task,
    source: task.source ?? 'suggested',
    dueOn: task.dueOn ?? null,
    snoozedUntil: task.snoozedUntil ?? null,
  };
}

export function TaskProvider({ children }: PropsWithChildren) {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<TimelineTask[]>(INITIAL_TASKS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoHydrated, setDemoHydrated] = useState(false);

  useEffect(() => {
    if (!isDemoMode) return;
    let mounted = true;
    async function restore() {
      try {
        const saved = await storage.get(STORAGE_KEYS.tasks);
        if (mounted && saved) {
          const parsed = JSON.parse(saved) as TimelineTask[];
          if (Array.isArray(parsed)) setTasks(parsed.map(normalizeDemoTask));
        }
      } catch (restoreError) {
        console.warn('Unable to restore demo tasks', restoreError);
      } finally {
        if (mounted) setDemoHydrated(true);
      }
    }
    void restore();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!isDemoMode || !demoHydrated) return;
    void storage.set(STORAGE_KEYS.tasks, JSON.stringify(tasks)).catch((persistError) => {
      console.warn('Unable to persist demo tasks', persistError);
    });
  }, [tasks, demoHydrated]);

  const refresh = useCallback(async () => {
    if (isDemoMode || !profile?.onboardingComplete) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: loadError } = await getSupabase()!
        .from('user_tasks')
        .select('id, rule_id, title, description, due_on, status, remind_at, created_at')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });
      if (loadError) throw loadError;
      setTasks((data ?? []).map(mapTask));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '할 일을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    const timer = setTimeout(() => { void refresh(); }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  const addTask = useCallback(async (input: NewTaskInput) => {
    if (!profile) throw new Error('로그인이 필요합니다.');
    const title = input.title.trim();
    const description = input.description.trim();
    if (!title) throw new Error('할 일 제목을 입력해 주세요.');
    const days = duePresetDays[input.duePreset];
    const dueOn = days === null ? null : dateAfter(days);
    if (isDemoMode) {
      setTasks((current) => [{
        id: `demo-task-${Date.now()}`,
        title,
        description,
        ...duePresentation(dueOn),
        completed: false,
        source: 'custom',
        dueOn,
        snoozedUntil: null,
      }, ...current]);
      return;
    }
    const { data, error: insertError } = await getSupabase()!.from('user_tasks').insert({
      user_id: profile.id,
      title,
      description,
      due_on: dueOn,
      status: 'todo',
    }).select('id, rule_id, title, description, due_on, status, remind_at, created_at').single();
    if (insertError) throw insertError;
    setTasks((current) => [mapTask(data), ...current]);
  }, [profile]);

  const toggleTask = useCallback(async (id: string) => {
    const target = tasks.find((task) => task.id === id);
    if (!target) return;
    const completed = !target.completed;
    setTasks((current) => current.map((task) => task.id === id ? { ...task, completed, snoozedUntil: null } : task));
    if (isDemoMode) return;
    const { error: updateError } = await getSupabase()!.from('user_tasks').update({ status: completed ? 'done' : 'todo', remind_at: null }).eq('id', id);
    if (updateError) {
      setTasks((current) => current.map((task) => task.id === id ? target : task));
      throw updateError;
    }
  }, [tasks]);

  const snoozeTask = useCallback(async (id: string) => {
    const target = tasks.find((task) => task.id === id);
    if (!target) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const snoozedUntil = tomorrow.toISOString();
    setTasks((current) => current.map((task) => task.id === id ? { ...task, completed: false, snoozedUntil } : task));
    if (isDemoMode) return;
    const { error: updateError } = await getSupabase()!.from('user_tasks').update({ status: 'snoozed', remind_at: snoozedUntil }).eq('id', id);
    if (updateError) {
      setTasks((current) => current.map((task) => task.id === id ? target : task));
      throw updateError;
    }
  }, [tasks]);

  const deleteTask = useCallback(async (id: string) => {
    const target = tasks.find((task) => task.id === id);
    if (!target) return;
    setTasks((current) => current.filter((task) => task.id !== id));
    if (isDemoMode) return;
    const { error: deleteError } = await getSupabase()!.from('user_tasks').delete().eq('id', id);
    if (deleteError) {
      setTasks((current) => [target, ...current]);
      throw deleteError;
    }
  }, [tasks]);

  const resetDemoTasks = useCallback(async () => {
    if (!isDemoMode) return;
    setTasks(INITIAL_TASKS);
    await storage.remove(STORAGE_KEYS.tasks);
  }, []);

  const value = useMemo<TaskContextValue>(() => ({
    tasks,
    loading,
    error,
    addTask,
    toggleTask,
    snoozeTask,
    deleteTask,
    resetDemoTasks,
    refresh,
  }), [tasks, loading, error, addTask, toggleTask, snoozeTask, deleteTask, resetDemoTasks, refresh]);

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTasks() {
  const value = useContext(TaskContext);
  if (!value) throw new Error('useTasks must be used inside TaskProvider');
  return value;
}
