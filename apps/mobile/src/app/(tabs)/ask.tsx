import { useRef, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { askOfficialQuestion } from '@/lib/official-info';
import { useAuth } from '@/providers/auth-provider';
import type { ChatAnswer, OfficialChatMessage, OfficialChatTurn } from '@/types/domain';
import { colors, shadow } from '@/ui/theme';

const openingSuggestions = ['D-2 시간제취업 절차는?', '체류기간 연장 방법은?', '이사 후 주소 신고는?'];

function createOpeningMessage(): OfficialChatMessage {
  return {
    id: `welcome-${Date.now()}`,
    role: 'assistant',
    text: '안녕하세요! 대한민국 정부의 공식 자료를 바탕으로 유학생의 비자·체류·생활 행정 정보를 찾아드려요. 궁금한 상황을 구체적으로 적어 주세요.',
    createdAt: new Date().toISOString(),
  };
}

export default function AskScreen() {
  const { profile } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<OfficialChatMessage[]>(() => [createOpeningMessage()]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(suggestedQuestion?: string) {
    const nextQuestion = (suggestedQuestion ?? question).trim();
    if (loading) return;
    if (nextQuestion.length < 4) return Alert.alert('질문을 조금 더 자세히 적어 주세요.');

    const now = Date.now();
    const userMessage: OfficialChatMessage = {
      id: `user-${now}`,
      role: 'user',
      text: nextQuestion,
      createdAt: new Date().toISOString(),
    };
    const pendingId = `assistant-${now}`;
    const pendingMessage: OfficialChatMessage = {
      id: pendingId,
      role: 'assistant',
      text: '',
      createdAt: new Date().toISOString(),
      pending: true,
    };
    const history: OfficialChatTurn[] = messages
      .filter((message) => !message.pending)
      .map((message) => ({ role: message.role, text: message.text }));

    setQuestion('');
    setLoading(true);
    setMessages((current) => [...current, userMessage, pendingMessage]);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));

    try {
      const answer = await askOfficialQuestion(
        nextQuestion,
        profile?.visaType ?? 'D-2',
        profile?.language ?? 'en',
        history,
      );
      setMessages((current) => current.map((message) => message.id === pendingId
        ? { ...message, text: answer.answer, answer, pending: false }
        : message));
    } catch (error) {
      setMessages((current) => current.filter((message) => message.id !== pendingId));
      Alert.alert('답변을 불러올 수 없어요', error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }

  function resetConversation() {
    if (loading) return;
    setMessages([createOpeningMessage()]);
    setQuestion('');
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: true }));
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <View style={styles.botMark}><Text style={styles.botMarkText}>K</Text></View>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>공식정보 AI</Text>
            <View style={styles.statusRow}><View style={styles.statusDot} /><Text style={styles.statusText}>정부 출처만 검색</Text></View>
          </View>
          <Pressable accessibilityRole="button" onPress={resetConversation} style={styles.resetButton}>
            <Text style={styles.resetButtonText}>새 대화</Text>
          </Pressable>
        </View>

        <View style={styles.trustBar}>
          <Text style={styles.trustIcon}>✓</Text>
          <Text style={styles.trustText}>근거를 찾지 못하면 답을 만들지 않고, 사용한 공식 원문을 함께 보여드려요.</Text>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messageContent}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              suggestions={index === 0 ? openingSuggestions : message.answer?.followUpQuestions}
              onSuggestion={(item) => void submit(item)}
            />
          ))}
          <Text style={styles.disclaimer}>정보 안내용 서비스이며 법률 상담이 아닙니다. 긴급하거나 개인별 판단이 필요하면 1345 또는 관할 출입국·외국인청에 문의하세요.</Text>
        </ScrollView>

        <View style={styles.composerWrap}>
          <View style={styles.composer}>
            <TextInput
              accessibilityLabel="공식정보 질문"
              value={question}
              onChangeText={setQuestion}
              multiline
              maxLength={800}
              placeholder="예: D-2 학생이 아르바이트하려면?"
              placeholderTextColor="#94A3B8"
              style={styles.input}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="질문 보내기"
              disabled={loading || question.trim().length < 4}
              onPress={() => void submit()}
              style={({ pressed }) => [styles.sendButton, pressed && styles.pressed, (loading || question.trim().length < 4) && styles.sendDisabled]}
            >
              <Text style={styles.sendIcon}>↑</Text>
            </Pressable>
          </View>
          <Text style={styles.composerHint}>개인정보·여권번호·외국인등록번호는 입력하지 마세요.</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBubble({
  message,
  suggestions,
  onSuggestion,
}: {
  message: OfficialChatMessage;
  suggestions?: string[];
  onSuggestion: (question: string) => void;
}) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.messageRow, isUser && styles.userRow]}>
      {!isUser ? <View style={styles.avatar}><Text style={styles.avatarText}>K</Text></View> : null}
      <View style={[styles.messageColumn, isUser && styles.userColumn]}>
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
          {message.pending ? (
            <View style={styles.typing}><ActivityIndicator size="small" color={colors.primary} /><Text style={styles.typingText}>공식 문서에서 근거를 찾고 있어요</Text></View>
          ) : (
            <>
              {message.answer?.status === 'no_official_source' ? <Text style={styles.noSourceTitle}>충분한 공식 근거를 찾지 못했어요</Text> : null}
              <Text style={[styles.messageText, isUser && styles.userMessageText]}>{message.text}</Text>
              {message.answer ? <AnswerDetails answer={message.answer} /> : null}
            </>
          )}
        </View>
        {!message.pending && suggestions?.length ? (
          <View style={styles.suggestions}>
            {suggestions.map((item) => (
              <Pressable key={item} accessibilityRole="button" onPress={() => onSuggestion(item)} style={styles.suggestion}>
                <Text style={styles.suggestionText}>{item}</Text><Text style={styles.suggestionArrow}>›</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function AnswerDetails({ answer }: { answer: ChatAnswer }) {
  function reportAnswer() {
    const sourceList = answer.citations.map((source) => `${source.issuer ?? '공식기관'}: ${source.title}`).join('\n');
    const body = `검토가 필요한 AI 답변:\n\n${answer.answer}\n\n표시된 출처:\n${sourceList || '출처 없음'}`.slice(0, 2800);
    router.push({ pathname: '/support', params: { category: 'official_info', subject: '공식정보 AI 답변 검토 요청', body } });
  }
  return (
    <View style={styles.answerDetails}>
      {answer.checklist.length ? (
        <View style={styles.detailSection}>
          <Text style={styles.detailTitle}>준비 체크리스트</Text>
          {answer.checklist.map((item) => <Text key={item} style={styles.checklist}>✓  {item}</Text>)}
        </View>
      ) : null}
      {answer.citations.length ? (
        <View style={styles.detailSection}>
          <Text style={styles.detailTitle}>확인한 공식 출처</Text>
          {answer.citations.map((source) => (
            <Pressable key={`${source.url}-${source.title}`} accessibilityRole="link" onPress={() => void Linking.openURL(source.url)} style={styles.source}>
              <View style={styles.sourceBadge}><Text style={styles.sourceBadgeText}>공식</Text></View>
              <View style={styles.flex}>
                {source.issuer ? <Text style={styles.sourceIssuer}>{source.issuer}</Text> : null}
                <Text style={styles.sourceTitle}>{source.title}</Text>
                <Text style={styles.sourceDate}>{source.updatedAt}</Text>
              </View>
              <Text style={styles.external}>↗</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {answer.notice ? <Text style={styles.notice}>{answer.notice}</Text> : null}
      {answer.model === 'demo-sample' ? <Text style={styles.demoLabel}>DEMO SAMPLE · LLM 미연결</Text> : null}
      <Pressable accessibilityRole="button" onPress={reportAnswer} style={styles.reportAnswer}><Text style={styles.reportAnswerText}>답변이 잘못되었거나 오래됐나요? 검토 요청</Text><Text style={styles.reportAnswerArrow}>›</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  header: { minHeight: 70, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  botMark: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  botMarkText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  headerCopy: { flex: 1 },
  headerTitle: { color: colors.ink, fontWeight: '900', fontSize: 18 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  statusText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  resetButton: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  resetButtonText: { color: colors.primaryDark, fontSize: 12, fontWeight: '800' },
  trustBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: '#EAF7F5', borderBottomWidth: 1, borderBottomColor: '#CEEBE7' },
  trustIcon: { width: 20, height: 20, borderRadius: 10, overflow: 'hidden', textAlign: 'center', lineHeight: 20, color: '#fff', backgroundColor: colors.mint, fontWeight: '900', fontSize: 11 },
  trustText: { flex: 1, color: '#2F645E', fontSize: 11, lineHeight: 16, fontWeight: '700' },
  messages: { flex: 1 },
  messageContent: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 22, gap: 18 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  userRow: { justifyContent: 'flex-end' },
  avatar: { width: 30, height: 30, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  avatarText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  messageColumn: { maxWidth: '86%', gap: 8 },
  userColumn: { alignItems: 'flex-end' },
  bubble: { borderRadius: 19, paddingHorizontal: 15, paddingVertical: 13 },
  botBubble: { backgroundColor: colors.surface, borderTopLeftRadius: 6, borderWidth: 1, borderColor: colors.border, ...shadow },
  userBubble: { backgroundColor: colors.primary, borderTopRightRadius: 6 },
  messageText: { color: colors.ink, fontSize: 14, lineHeight: 22 },
  userMessageText: { color: '#fff', fontWeight: '600' },
  typing: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 26 },
  typingText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  noSourceTitle: { color: colors.ink, fontWeight: '900', marginBottom: 6 },
  answerDetails: { gap: 12, marginTop: 13 },
  detailSection: { gap: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  detailTitle: { color: colors.ink, fontWeight: '900', fontSize: 13 },
  checklist: { color: '#38516F', fontSize: 12, lineHeight: 19 },
  source: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: colors.canvas, borderRadius: 13, padding: 11, borderWidth: 1, borderColor: colors.border },
  sourceBadge: { backgroundColor: '#DDF5EE', paddingHorizontal: 7, paddingVertical: 5, borderRadius: 8 },
  sourceBadgeText: { color: colors.success, fontWeight: '900', fontSize: 10 },
  sourceIssuer: { color: colors.muted, fontSize: 10, fontWeight: '700', marginBottom: 2 },
  sourceTitle: { color: colors.primaryDark, fontSize: 12, fontWeight: '900', lineHeight: 17 },
  sourceDate: { color: colors.muted, fontSize: 10, marginTop: 3 },
  external: { color: colors.primary, fontSize: 17 },
  notice: { color: colors.muted, backgroundColor: '#FFF8E8', borderRadius: 10, padding: 10, fontSize: 10, lineHeight: 15 },
  demoLabel: { color: colors.warning, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  reportAnswer: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  reportAnswerText: { flex: 1, color: colors.primaryDark, fontSize: 10, fontWeight: '800', lineHeight: 15 },
  reportAnswerArrow: { color: colors.primary, fontSize: 18, fontWeight: '900' },
  suggestions: { gap: 6 },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#BDD1F9', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 13 },
  suggestionText: { flex: 1, color: colors.primaryDark, fontSize: 11, fontWeight: '800' },
  suggestionArrow: { color: colors.primary, fontSize: 16, fontWeight: '900' },
  disclaimer: { color: colors.muted, textAlign: 'center', fontSize: 10, lineHeight: 15, paddingHorizontal: 18 },
  composerWrap: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, borderWidth: 1, borderColor: '#C9D5E7', backgroundColor: colors.canvas, borderRadius: 18, paddingLeft: 13, paddingRight: 6, paddingVertical: 6 },
  input: { flex: 1, maxHeight: 100, minHeight: 38, paddingVertical: 8, color: colors.ink, fontSize: 14, textAlignVertical: 'top' },
  sendButton: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  sendIcon: { color: '#fff', fontSize: 22, lineHeight: 23, fontWeight: '900' },
  sendDisabled: { backgroundColor: '#A7B7D3' },
  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
  composerHint: { color: colors.muted, textAlign: 'center', fontSize: 9, marginTop: 6 },
});
