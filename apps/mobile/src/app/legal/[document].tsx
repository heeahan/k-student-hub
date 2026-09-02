import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { LEGAL_DOCUMENTS } from '@/lib/legal';
import type { LegalDocumentKey } from '@/types/domain';
import { AppHeader, Button, Card, Screen } from '@/ui/primitives';
import { colors } from '@/ui/theme';

export default function LegalDocumentScreen() {
  const params = useLocalSearchParams<{ document?: string }>();
  const key = params.document as LegalDocumentKey;
  const document = LEGAL_DOCUMENTS[key];
  if (!document) {
    return <Screen><AppHeader title="문서를 찾을 수 없어요" /><Button variant="ghost" onPress={() => router.back()}>돌아가기</Button></Screen>;
  }
  return (
    <Screen>
      <AppHeader eyebrow="SERVICE POLICY" title={document.shortTitle} />
      <Card style={styles.summary}>
        <Text style={styles.summaryText}>{document.summary}</Text>
        <View style={styles.meta}><Text style={styles.metaText}>버전 {document.version}</Text><Text style={styles.metaText}>시행일 {document.effectiveDate}</Text></View>
      </Card>
      {document.sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.paragraphs.map((paragraph) => <Text key={paragraph} style={styles.paragraph}>{paragraph}</Text>)}
        </View>
      ))}
      <Card style={styles.reviewNotice}>
        <Text style={styles.reviewTitle}>출시 전 확인</Text>
        <Text style={styles.reviewBody}>현재 문서는 제품 구현용 초안입니다. 실제 운영주체, 연락처, 보유기간, 처리위탁·국외이전 내용은 출시 전에 법률 검토를 거쳐 확정해야 합니다.</Text>
      </Card>
      <Button variant="ghost" onPress={() => router.back()}>확인하고 돌아가기</Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { backgroundColor: '#F0F6FF', shadowOpacity: 0, gap: 12 },
  summaryText: { color: colors.ink, fontWeight: '800', fontSize: 14, lineHeight: 21 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaText: { color: colors.primaryDark, fontSize: 11, fontWeight: '800' },
  section: { gap: 9 },
  sectionTitle: { color: colors.ink, fontWeight: '900', fontSize: 17 },
  paragraph: { color: '#45556D', fontSize: 14, lineHeight: 23 },
  reviewNotice: { backgroundColor: '#FFF9EA', shadowOpacity: 0 },
  reviewTitle: { color: colors.warning, fontWeight: '900' },
  reviewBody: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 6 },
});
