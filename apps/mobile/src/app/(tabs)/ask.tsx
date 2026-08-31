import { useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { askOfficialQuestion } from '@/lib/official-info';
import { useAuth } from '@/providers/auth-provider';
import type { ChatAnswer } from '@/types/domain';
import { AppHeader, Button, Card, Field, Screen } from '@/ui/primitives';
import { colors } from '@/ui/theme';

const suggestions = ['아르바이트를 시작하려면?', '체류기간 연장 서류는?', '이사 후 주소 신고는?'];

export default function AskScreen() {
  const { profile } = useAuth();
  const [question, setQuestion] = useState('유학생이 아르바이트를 시작하려면 무엇을 준비해야 하나요?');
  const [answer, setAnswer] = useState<ChatAnswer | null>(null);
  const [loading, setLoading] = useState(false);
  async function submit() {
    if (question.trim().length < 4) return Alert.alert('질문을 조금 더 자세히 적어 주세요.');
    try { setLoading(true); setAnswer(await askOfficialQuestion(question.trim(), profile?.visaType ?? 'D-2', profile?.language ?? 'en')); }
    catch (error) { Alert.alert('답변을 불러올 수 없어요', error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.'); }
    finally { setLoading(false); }
  }
  return (
    <Screen>
      <AppHeader eyebrow="OFFICIAL SOURCES ONLY" title="공식정보에 물어보세요" />
      <Card style={styles.trust}><Text style={styles.shield}>✓</Text><View style={styles.flex}><Text style={styles.trustTitle}>출처가 없으면 답을 만들지 않아요</Text><Text style={styles.trustBody}>법률 상담이 아닌 정보 안내이며, 답변마다 기관·문서·링크를 표시합니다.</Text></View></Card>
      <Field label="질문" value={question} onChangeText={setQuestion} multiline maxLength={800} placeholder="예: D-2 학생이 방학에 일할 수 있나요?" />
      <View style={styles.suggestions}>{suggestions.map((item) => <Pressable key={item} onPress={() => setQuestion(item)} style={styles.suggestion}><Text style={styles.suggestionText}>{item}</Text></Pressable>)}</View>
      <Button loading={loading} onPress={submit}>공식 출처에서 찾기</Button>
      {answer ? <AnswerCard answer={answer} /> : null}
      <Text style={styles.footer}>긴급하거나 개인별 판단이 필요한 경우 외국인종합안내센터 1345 또는 관할 출입국·외국인청에 문의하세요.</Text>
    </Screen>
  );
}

function AnswerCard({ answer }: { answer: ChatAnswer }) {
  if (answer.status === 'no_official_source') return <Card><Text style={styles.answerTitle}>공식 출처에서 충분한 근거를 찾지 못했어요</Text><Text style={styles.answer}>질문을 더 구체적으로 바꾸거나 1345에 문의해 주세요.</Text></Card>;
  return (
    <Card style={styles.answerCard}>
      <Text style={styles.answerLabel}>ANSWER</Text><Text style={styles.answer}>{answer.answer}</Text>
      <Text style={styles.answerTitle}>준비 체크리스트</Text>{answer.checklist.map((item) => <Text key={item} style={styles.checklist}>✓  {item}</Text>)}
      <Text style={styles.answerTitle}>공식 출처</Text>{answer.citations.map((source) => <Pressable key={source.url} onPress={() => void Linking.openURL(source.url)} style={styles.source}><View style={styles.flex}><Text style={styles.sourceTitle}>{source.title}</Text><Text style={styles.sourceDate}>{source.updatedAt}</Text></View><Text style={styles.external}>↗</Text></Pressable>)}
    </Card>
  );
}

const styles = StyleSheet.create({
  trust: { flexDirection: 'row', gap: 12, backgroundColor: '#EAF7F5', shadowOpacity: 0 }, shield: { width: 28, height: 28, lineHeight: 28, textAlign: 'center', borderRadius: 14, overflow: 'hidden', backgroundColor: colors.mint, color: '#fff', fontWeight: '900' }, flex: { flex: 1 }, trustTitle: { color: colors.ink, fontWeight: '900' }, trustBody: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, suggestion: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8 }, suggestionText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  footer: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', paddingHorizontal: 8 }, answerCard: { gap: 12, borderColor: '#BDD1F9' }, answerLabel: { color: colors.primary, fontWeight: '900', fontSize: 11, letterSpacing: 1.2 }, answer: { color: colors.ink, lineHeight: 23, fontSize: 15 }, answerTitle: { color: colors.ink, fontWeight: '900', marginTop: 5 }, checklist: { color: '#38516F', lineHeight: 22, fontSize: 13 }, source: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.canvas, padding: 13, borderRadius: 13 }, sourceTitle: { color: colors.primaryDark, fontWeight: '800', fontSize: 13 }, sourceDate: { color: colors.muted, fontSize: 11, marginTop: 3 }, external: { color: colors.primary, fontSize: 18 },
});
