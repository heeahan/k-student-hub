import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { INITIAL_TASKS } from '@/data/seed';
import { useAuth } from '@/providers/auth-provider';
import type { TimelineTask } from '@/types/domain';
import { AppHeader, Card, Screen } from '@/ui/primitives';
import { colors } from '@/ui/theme';

const toneColor = { urgent: colors.danger, soon: colors.warning, normal: colors.primary };

export default function TodayScreen() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const complete = (id: string) => setTasks((current) => current.map((task) => task.id === id ? { ...task, completed: !task.completed } : task));
  const open = tasks.filter((task) => !task.completed).length;
  return (
    <Screen>
      <AppHeader eyebrow={`${profile?.visaType} · ${profile?.universityName}`} title={`${profile?.nickname}님, 안녕하세요`} action={<View style={styles.avatar}><Text style={styles.avatarText}>{profile?.nickname.slice(0, 1).toUpperCase()}</Text></View>} />
      <View style={styles.summary}>
        <View><Text style={styles.summaryEyebrow}>{"TODAY'S CHECK"}</Text><Text style={styles.summaryTitle}>놓치면 안 될 일 {open}개</Text></View>
        <Text style={styles.summaryMark}>{open === 0 ? '🎉' : '↗'}</Text>
      </View>
      <Text style={styles.sectionTitle}>내 체류 타임라인</Text>
      {tasks.map((task) => <TaskCard key={task.id} task={task} onPress={() => complete(task.id)} />)}
      <Card style={styles.notice}>
        <Text style={styles.noticeIcon}>i</Text>
        <View style={styles.flex}><Text style={styles.noticeTitle}>알림은 준비를 돕는 용도예요</Text><Text style={styles.noticeBody}>정확한 기한과 서류는 개인 상황에 따라 달라질 수 있습니다. 공식정보 탭에서 최신 출처를 확인하세요.</Text></View>
      </Card>
    </Screen>
  );
}

function TaskCard({ task, onPress }: { task: TimelineTask; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.task, task.completed && styles.taskDone]}>
      <View style={[styles.check, task.completed && styles.checkDone]}><Text style={styles.checkText}>{task.completed ? '✓' : ''}</Text></View>
      <View style={styles.flex}><View style={styles.taskTop}><Text style={[styles.taskTitle, task.completed && styles.strike]}>{task.title}</Text><Text style={[styles.due, { color: toneColor[task.tone] }]}>{task.dueLabel}</Text></View><Text style={styles.taskBody}>{task.description}</Text></View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 42, height: 42, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: colors.primary, fontWeight: '900', fontSize: 18 },
  summary: { backgroundColor: '#132F59', borderRadius: 24, padding: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, summaryEyebrow: { color: '#9BC6FF', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  summaryTitle: { color: '#fff', fontSize: 21, fontWeight: '900', marginTop: 8 }, summaryMark: { color: '#fff', fontSize: 28, fontWeight: '700' }, sectionTitle: { color: colors.ink, fontWeight: '900', fontSize: 18, marginTop: 6 },
  task: { flexDirection: 'row', gap: 13, backgroundColor: '#fff', borderRadius: 19, borderWidth: 1, borderColor: colors.border, padding: 16 }, taskDone: { opacity: 0.62 }, check: { width: 26, height: 26, borderRadius: 9, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, checkDone: { backgroundColor: colors.success, borderColor: colors.success }, checkText: { color: '#fff', fontWeight: '900' },
  flex: { flex: 1 }, taskTop: { flexDirection: 'row', gap: 10, justifyContent: 'space-between' }, taskTitle: { color: colors.ink, fontWeight: '900', flex: 1, fontSize: 15 }, strike: { textDecorationLine: 'line-through' }, due: { fontSize: 12, fontWeight: '900' }, taskBody: { color: colors.muted, lineHeight: 19, fontSize: 13, marginTop: 6 },
  notice: { flexDirection: 'row', gap: 12, backgroundColor: '#F0F6FF', shadowOpacity: 0 }, noticeIcon: { width: 24, height: 24, borderRadius: 12, textAlign: 'center', lineHeight: 24, backgroundColor: colors.primary, color: '#fff', fontWeight: '900' }, noticeTitle: { color: colors.ink, fontWeight: '900' }, noticeBody: { color: colors.muted, lineHeight: 19, fontSize: 12, marginTop: 4 },
});
