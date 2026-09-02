import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { isDemoMode } from '@/lib/config';
import { useAuth } from '@/providers/auth-provider';
import { useService } from '@/providers/service-provider';
import type { SupportCategory, SupportRequest } from '@/types/domain';
import { AppHeader, Button, Card, Chip, EmptyState, Field, Screen } from '@/ui/primitives';
import { colors } from '@/ui/theme';

const categories: { key: SupportCategory; label: string }[] = [
  { key: 'account', label: '계정' },
  { key: 'community', label: '커뮤니티' },
  { key: 'official_info', label: '공식정보' },
  { key: 'privacy', label: '개인정보' },
  { key: 'other', label: '기타' },
];

const statusLabel: Record<SupportRequest['status'], string> = { received: '접수', reviewing: '확인 중', resolved: '답변 완료', closed: '종료' };

const faqs = [
  { question: '공식정보 AI 답변이 실제 규정과 다른 것 같아요.', answer: '답변에 표시된 공식 원문과 확인일을 먼저 확인해 주세요. 문의 분류에서 공식정보를 선택하고 질문과 문제가 된 출처를 알려주시면 검토 기록을 남길 수 있습니다.' },
  { question: '게시글이나 댓글에서 피해를 입었어요.', answer: '게시글 상세의 신고와 작성자 차단을 먼저 사용해 주세요. 즉각적인 신체 위험이나 범죄 피해가 있다면 앱 문의보다 관할 긴급기관에 먼저 연락해야 합니다.' },
  { question: '계정과 데이터를 삭제하고 싶어요.', answer: '내 정보 화면 아래에서 계정 및 데이터 삭제를 선택할 수 있습니다. 운영 모드에서는 서버 계정 삭제 함수가 연결되어야 실제 삭제가 완료됩니다.' },
];

export default function SupportScreen() {
  const params = useLocalSearchParams<{ category?: string; subject?: string; body?: string }>();
  const { profile } = useAuth();
  const { supportRequests, createSupportRequest } = useService();
  const initialCategory = categories.some((item) => item.key === params.category) ? params.category as SupportCategory : 'other';
  const [showForm, setShowForm] = useState(Boolean(params.subject || params.body));
  const [category, setCategory] = useState<SupportCategory>(initialCategory);
  const [subject, setSubject] = useState(params.subject ?? '');
  const [body, setBody] = useState(params.body ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  async function submit() {
    setSubmitting(true);
    try {
      await createSupportRequest({ category, subject, body });
      setSubject('');
      setBody('');
      setCategory('other');
      setShowForm(false);
      Alert.alert('문의가 접수됐어요', isDemoMode ? '데모 모드이므로 이 기기에만 저장됩니다.' : '내 문의내역에서 처리 상태를 확인할 수 있습니다.');
    } catch (error) {
      Alert.alert('문의를 접수하지 못했어요', error instanceof Error ? error.message : '다시 시도해 주세요.');
    } finally { setSubmitting(false); }
  }

  return (
    <Screen>
      <AppHeader eyebrow="HELP CENTER" title="고객지원" />
      <Card style={styles.safetyCard}>
        <Text style={styles.safetyTitle}>긴급 신고·법률 상담 서비스가 아닙니다</Text>
        <Text style={styles.safetyBody}>즉각적인 신체 위험은 관할 긴급기관에, 체류·출입국의 개인별 판단은 외국인종합안내센터 1345 또는 관할 출입국·외국인청에 확인해 주세요.</Text>
      </Card>

      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>자주 묻는 질문</Text></View>
      <Card style={styles.faqCard}>
        {faqs.map((faq, index) => (
          <Pressable key={faq.question} accessibilityRole="button" accessibilityState={{ expanded: openFaq === index }} onPress={() => setOpenFaq(openFaq === index ? null : index)} style={[styles.faqRow, index === faqs.length - 1 && styles.lastRow]}>
            <View style={styles.flex}><Text style={styles.faqQuestion}>{faq.question}</Text>{openFaq === index ? <Text style={styles.faqAnswer}>{faq.answer}</Text> : null}</View>
            <Text style={styles.arrow}>{openFaq === index ? '−' : '+'}</Text>
          </Pressable>
        ))}
      </Card>

      <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>1:1 문의</Text><Text style={styles.sectionHint}>{profile?.email} 계정으로 접수됩니다.</Text></View><Pressable accessibilityRole="button" onPress={() => setShowForm((current) => !current)} style={styles.newButton}><Text style={styles.newButtonText}>{showForm ? '닫기' : '문의하기'}</Text></Pressable></View>
      {showForm ? (
        <Card style={styles.formCard}>
          <Text style={styles.formTitle}>문의 작성</Text>
          <View style={styles.chips}>{categories.map((item) => <Chip key={item.key} label={item.label} selected={category === item.key} onPress={() => setCategory(item.key)} />)}</View>
          <Field label="제목" value={subject} onChangeText={setSubject} maxLength={120} placeholder="문의 제목" />
          <Field label="내용" value={body} onChangeText={setBody} multiline maxLength={3000} placeholder="발생한 상황과 확인이 필요한 내용을 적어 주세요." hint={`${body.length}/3000 · 신분증 번호, 계좌번호, 전화번호는 입력하지 마세요.`} />
          <Button loading={submitting} onPress={() => void submit()}>문의 접수</Button>
        </Card>
      ) : null}

      <Text style={styles.sectionTitle}>내 문의내역</Text>
      {supportRequests.length ? supportRequests.map((request) => <SupportRequestCard key={request.id} request={request} />) : <EmptyState icon="?" title="접수한 문의가 없어요" body="FAQ로 해결되지 않는 문제를 1:1 문의로 남겨 주세요." />}

      {isDemoMode ? <Text style={styles.demoNote}>출시 전 실제 운영 담당자, 고객지원 연락처와 문의 처리 목표시간을 확정해야 합니다.</Text> : null}
      <Button variant="ghost" onPress={() => router.replace('/(tabs)/profile')}>내 정보로 돌아가기</Button>
    </Screen>
  );
}

function SupportRequestCard({ request }: { request: SupportRequest }) {
  const category = categories.find((item) => item.key === request.category)?.label ?? '기타';
  return (
    <Card style={styles.requestCard}>
      <View style={styles.requestTop}><Text style={styles.categoryBadge}>{category}</Text><Text style={styles.statusBadge}>{statusLabel[request.status]}</Text></View>
      <Text style={styles.requestTitle}>{request.subject}</Text>
      <Text style={styles.requestBody} numberOfLines={3}>{request.body}</Text>
      <Text style={styles.requestDate}>{new Date(request.createdAt).toLocaleString()}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  safetyCard: { backgroundColor: '#FFF3E7', borderColor: '#FFD9B8', shadowOpacity: 0 },
  safetyTitle: { color: '#8A4A10', fontWeight: '900', fontSize: 15 },
  safetyBody: { color: '#735336', fontSize: 12, lineHeight: 19, marginTop: 7 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { color: colors.ink, fontWeight: '900', fontSize: 18 },
  sectionHint: { color: colors.muted, fontSize: 11, marginTop: 4 },
  faqCard: { paddingVertical: 4 },
  faqRow: { minHeight: 62, flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 2, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#EEF1F5' },
  flex: { flex: 1 },
  faqQuestion: { color: colors.ink, fontWeight: '800', fontSize: 13, lineHeight: 19 },
  faqAnswer: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 8 },
  arrow: { color: colors.primary, fontSize: 20, fontWeight: '900' },
  lastRow: { borderBottomWidth: 0 },
  newButton: { minHeight: 38, paddingHorizontal: 13, borderRadius: 12, backgroundColor: colors.primarySoft, justifyContent: 'center' },
  newButtonText: { color: colors.primaryDark, fontWeight: '900', fontSize: 13 },
  formCard: { gap: 15, borderColor: '#BFD3FA' },
  formTitle: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  requestCard: { gap: 8 },
  requestTop: { flexDirection: 'row', justifyContent: 'space-between' },
  categoryBadge: { color: colors.primaryDark, fontWeight: '800', fontSize: 10, backgroundColor: colors.primarySoft, borderRadius: 999, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 4 },
  statusBadge: { color: colors.success, fontWeight: '900', fontSize: 10, backgroundColor: '#DDF5EE', borderRadius: 999, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 4 },
  requestTitle: { color: colors.ink, fontWeight: '900', fontSize: 15 },
  requestBody: { color: colors.muted, fontSize: 12, lineHeight: 19 },
  requestDate: { color: '#94A3B8', fontSize: 10 },
  demoNote: { color: colors.warning, fontSize: 11, lineHeight: 17, textAlign: 'center', backgroundColor: '#FFF9EA', padding: 12, borderRadius: 12 },
});
