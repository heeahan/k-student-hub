import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/providers/auth-provider';
import { useTasks, type TaskDuePreset } from '@/providers/task-provider';
import type { TimelineTask } from '@/types/domain';
import { AppHeader, Button, Card, Chip, EmptyState, Field, Screen } from '@/ui/primitives';
import { colors } from '@/ui/theme';

const toneColor = { urgent: colors.danger, soon: colors.warning, normal: colors.primary };
const dueOptions: { key: TaskDuePreset; label: string }[] = [
  { key: 'today', label: '오늘' },
  { key: 'three_days', label: '3일 안' },
  { key: 'week', label: '이번 주' },
  { key: 'none', label: '날짜 없음' },
];

export default function TodayScreen() {
  const { profile } = useAuth();
  const { tasks, loading, error, addTask, toggleTask, snoozeTask, deleteTask } = useTasks();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duePreset, setDuePreset] = useState<TaskDuePreset>('today');
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<'open' | 'done'>('open');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const openCount = tasks.filter((task) => !task.completed).length;
  const completedCount = tasks.length - openCount;
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;
  const visibleTasks = useMemo(
    () => tasks.filter((task) => view === 'done' ? task.completed : !task.completed),
    [tasks, view],
  );

  async function submitTask() {
    if (!title.trim()) {
      Alert.alert('제목을 입력해 주세요');
      return;
    }
    setSaving(true);
    try {
      await addTask({ title, description, duePreset });
      setTitle('');
      setDescription('');
      setDuePreset('today');
      setShowForm(false);
      setView('open');
    } catch (submitError) {
      Alert.alert('할 일을 추가하지 못했어요', submitError instanceof Error ? submitError.message : '다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  }

  async function runAction(action: () => Promise<void>) {
    try {
      await action();
    } catch (actionError) {
      Alert.alert('처리하지 못했어요', actionError instanceof Error ? actionError.message : '다시 시도해 주세요.');
    }
  }

  return (
    <Screen>
      <AppHeader
        eyebrow={`${profile?.visaType} · ${profile?.universityName}`}
        title={`${profile?.nickname}님, 안녕하세요`}
        action={<View style={styles.avatar}><Text style={styles.avatarText}>{profile?.nickname.slice(0, 1).toUpperCase()}</Text></View>}
      />

      <View style={styles.summary}>
        <View style={styles.flex}>
          <Text style={styles.summaryEyebrow}>TODAY&apos;S CHECK</Text>
          <Text style={styles.summaryTitle}>{openCount ? `확인할 일 ${openCount}개` : '오늘 할 일을 마쳤어요'}</Text>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
          <Text style={styles.progressLabel}>전체 {tasks.length}개 중 {completedCount}개 완료</Text>
        </View>
        <Text style={styles.summaryMark}>{openCount === 0 ? '✓' : '↗'}</Text>
      </View>

      <View style={styles.sectionHeader}>
        <View><Text style={styles.sectionTitle}>내 체류 타임라인</Text><Text style={styles.sectionHint}>내 일정은 직접 추가하고 기기에서 보관할 수 있어요.</Text></View>
        <Pressable accessibilityRole="button" onPress={() => setShowForm((current) => !current)} style={styles.addButton}>
          <Text style={styles.addButtonText}>{showForm ? '닫기' : '+ 추가'}</Text>
        </Pressable>
      </View>

      {showForm ? (
        <Card style={styles.formCard}>
          <Text style={styles.formTitle}>새 할 일</Text>
          <Field label="제목" value={title} onChangeText={setTitle} placeholder="예: 학교 국제처에 문의하기" maxLength={80} />
          <Field label="메모 (선택)" value={description} onChangeText={setDescription} placeholder="준비할 내용이나 질문을 적어두세요" multiline maxLength={300} />
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>언제까지</Text>
            <View style={styles.chips}>{dueOptions.map((option) => <Chip key={option.key} label={option.label} selected={duePreset === option.key} onPress={() => setDuePreset(option.key)} />)}</View>
          </View>
          <Button onPress={() => void submitTask()} loading={saving}>할 일 저장</Button>
        </Card>
      ) : null}

      <View style={styles.tabs}>
        <Pressable onPress={() => setView('open')} style={[styles.tab, view === 'open' && styles.tabSelected]}><Text style={[styles.tabText, view === 'open' && styles.tabTextSelected]}>할 일 {openCount}</Text></Pressable>
        <Pressable onPress={() => setView('done')} style={[styles.tab, view === 'done' && styles.tabSelected]}><Text style={[styles.tabText, view === 'done' && styles.tabTextSelected]}>완료 {completedCount}</Text></Pressable>
      </View>

      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!loading && visibleTasks.length === 0 ? (
        <EmptyState icon={view === 'done' ? '○' : '✓'} title={view === 'done' ? '완료한 일이 아직 없어요' : '남은 할 일이 없어요'} body={view === 'done' ? '체크한 할 일이 여기에 모입니다.' : '필요한 일정을 직접 추가해 보세요.'} />
      ) : visibleTasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onToggle={() => void runAction(() => toggleTask(task.id))}
          onSnooze={() => void runAction(() => snoozeTask(task.id))}
          deletePending={pendingDeleteId === task.id}
          onDelete={() => {
            if (pendingDeleteId !== task.id) {
              setPendingDeleteId(task.id);
              return;
            }
            setPendingDeleteId(null);
            void runAction(() => deleteTask(task.id));
          }}
          onCancelDelete={() => setPendingDeleteId(null)}
        />
      ))}

      <Card style={styles.notice}>
        <Text style={styles.noticeIcon}>i</Text>
        <View style={styles.flex}><Text style={styles.noticeTitle}>일정은 준비를 돕는 용도예요</Text><Text style={styles.noticeBody}>정확한 기한과 서류는 개인 상황에 따라 달라질 수 있습니다. 공식정보 탭에서 최신 출처를 확인하세요.</Text></View>
      </Card>
    </Screen>
  );
}

function TaskCard({ task, onToggle, onSnooze, deletePending, onDelete, onCancelDelete }: { task: TimelineTask; onToggle: () => void; onSnooze: () => void; deletePending: boolean; onDelete: () => void; onCancelDelete: () => void }) {
  return (
    <Card style={[styles.task, task.completed && styles.taskDone]}>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: task.completed }} onPress={onToggle} style={[styles.check, task.completed && styles.checkDone]}>
        <Text style={styles.checkText}>{task.completed ? '✓' : ''}</Text>
      </Pressable>
      <View style={styles.flex}>
        <View style={styles.taskTop}>
          <Text style={[styles.taskTitle, task.completed && styles.strike]}>{task.title}</Text>
          <Text style={[styles.due, { color: toneColor[task.tone] }]}>{task.dueLabel}</Text>
        </View>
        {task.description ? <Text style={styles.taskBody}>{task.description}</Text> : null}
        <View style={styles.metaRow}>
          <Text style={styles.sourceBadge}>{task.source === 'suggested' ? '추천 일정' : '내 일정'}</Text>
          {task.snoozedUntil ? <Text style={styles.snoozedBadge}>내일 다시 보기</Text> : null}
        </View>
        <View style={styles.taskActions}>
          {!task.completed ? <Pressable onPress={onSnooze} style={styles.smallAction}><Text style={styles.smallActionText}>내일 보기</Text></Pressable> : null}
          {deletePending ? <Pressable onPress={onCancelDelete} style={styles.smallAction}><Text style={styles.smallActionText}>취소</Text></Pressable> : null}
          <Pressable onPress={onDelete} style={[styles.smallAction, deletePending && styles.deleteAction]}><Text style={styles.deleteText}>{deletePending ? '정말 삭제' : '삭제'}</Text></Pressable>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 42, height: 42, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: '900', fontSize: 18 },
  flex: { flex: 1 },
  summary: { backgroundColor: '#132F59', borderRadius: 24, padding: 22, flexDirection: 'row', alignItems: 'center', gap: 16 },
  summaryEyebrow: { color: '#9BC6FF', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  summaryTitle: { color: '#fff', fontSize: 21, fontWeight: '900', marginTop: 8 },
  summaryMark: { color: '#fff', fontSize: 28, fontWeight: '700' },
  progressTrack: { height: 6, borderRadius: 999, backgroundColor: '#345174', marginTop: 16, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: '#76D7C4' },
  progressLabel: { color: '#C8D6E8', fontSize: 11, fontWeight: '700', marginTop: 7 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 6 },
  sectionTitle: { color: colors.ink, fontWeight: '900', fontSize: 18 },
  sectionHint: { color: colors.muted, fontSize: 12, marginTop: 4 },
  addButton: { minHeight: 38, paddingHorizontal: 13, borderRadius: 12, backgroundColor: colors.primarySoft, justifyContent: 'center' },
  addButtonText: { color: colors.primaryDark, fontWeight: '900', fontSize: 13 },
  formCard: { gap: 15, borderColor: '#BFD3FA' },
  formTitle: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  fieldGroup: { gap: 9 },
  fieldLabel: { color: colors.ink, fontWeight: '800', fontSize: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tabs: { flexDirection: 'row', backgroundColor: '#E9EEF6', padding: 4, borderRadius: 14 },
  tab: { flex: 1, minHeight: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  tabSelected: { backgroundColor: '#fff' },
  tabText: { color: colors.muted, fontWeight: '800', fontSize: 13 },
  tabTextSelected: { color: colors.ink },
  task: { flexDirection: 'row', gap: 13, borderRadius: 19, padding: 16 },
  taskDone: { opacity: 0.68 },
  check: { width: 26, height: 26, borderRadius: 9, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: colors.success, borderColor: colors.success },
  checkText: { color: '#fff', fontWeight: '900' },
  taskTop: { flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  taskTitle: { color: colors.ink, fontWeight: '900', flex: 1, fontSize: 15 },
  strike: { textDecorationLine: 'line-through' },
  due: { fontSize: 12, fontWeight: '900' },
  taskBody: { color: colors.muted, lineHeight: 19, fontSize: 13, marginTop: 6 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  sourceBadge: { color: colors.primaryDark, backgroundColor: colors.primarySoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, overflow: 'hidden', fontSize: 10, fontWeight: '800' },
  snoozedBadge: { color: '#8A4A10', backgroundColor: '#FFF1DC', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, overflow: 'hidden', fontSize: 10, fontWeight: '800' },
  taskActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  smallAction: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 11, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  deleteAction: { borderColor: '#FFC3CC', backgroundColor: '#FFF0F2' },
  smallActionText: { color: colors.ink, fontWeight: '800', fontSize: 12 },
  deleteText: { color: colors.danger, fontWeight: '800', fontSize: 12 },
  errorText: { color: colors.danger, textAlign: 'center', fontSize: 13 },
  notice: { flexDirection: 'row', gap: 12, backgroundColor: '#F0F6FF', shadowOpacity: 0 },
  noticeIcon: { width: 24, height: 24, borderRadius: 12, textAlign: 'center', lineHeight: 24, backgroundColor: colors.primary, color: '#fff', fontWeight: '900' },
  noticeTitle: { color: colors.ink, fontWeight: '900' },
  noticeBody: { color: colors.muted, lineHeight: 19, fontSize: 12, marginTop: 4 },
});
