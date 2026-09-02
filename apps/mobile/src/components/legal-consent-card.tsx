import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LEGAL_DOCUMENTS, REQUIRED_LEGAL_KEYS } from '@/lib/legal';
import type { LegalDocumentKey } from '@/types/domain';
import { Card } from '@/ui/primitives';
import { colors } from '@/ui/theme';

export type ConsentSelection = Record<LegalDocumentKey, boolean>;

export const EMPTY_CONSENT_SELECTION: ConsentSelection = { terms: false, privacy: false, community: false };

export function LegalConsentCard({ selection, onChange }: { selection: ConsentSelection; onChange: (next: ConsentSelection) => void }) {
  const allSelected = REQUIRED_LEGAL_KEYS.every((key) => selection[key]);
  function toggleAll() {
    const next = !allSelected;
    onChange({ terms: next, privacy: next, community: next });
  }
  return (
    <Card style={styles.card}>
      <Text style={styles.title}>서비스 이용 동의</Text>
      <Text style={styles.body}>모두 필수 항목이며, 각 문서는 앱에서 언제든 다시 확인할 수 있습니다.</Text>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: allSelected }} accessibilityLabel="필수 약관 전체 동의" onPress={toggleAll} style={styles.allRow}>
        <Check checked={allSelected} />
        <Text style={styles.allText}>필수 약관 전체 동의</Text>
      </Pressable>
      <View style={styles.divider} />
      {REQUIRED_LEGAL_KEYS.map((key) => {
        const document = LEGAL_DOCUMENTS[key];
        return (
          <View key={key} style={styles.row}>
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selection[key] }} accessibilityLabel={`${document.shortTitle} 동의`} onPress={() => onChange({ ...selection, [key]: !selection[key] })} style={styles.consentAction}>
              <Check checked={selection[key]} />
              <View style={styles.flex}><Text style={styles.rowTitle}><Text style={styles.required}>[필수] </Text>{document.shortTitle}</Text><Text style={styles.version}>버전 {document.version}</Text></View>
            </Pressable>
            <Pressable accessibilityRole="link" accessibilityLabel={`${document.shortTitle} 전문 보기`} onPress={() => router.push({ pathname: '/legal/[document]', params: { document: key } })} style={styles.viewButton}>
              <Text style={styles.viewText}>보기</Text>
            </Pressable>
          </View>
        );
      })}
    </Card>
  );
}

function Check({ checked }: { checked: boolean }) {
  return <View style={[styles.check, checked && styles.checkOn]}><Text style={styles.checkText}>{checked ? '✓' : ''}</Text></View>;
}

const styles = StyleSheet.create({
  card: { gap: 13 },
  title: { color: colors.ink, fontWeight: '900', fontSize: 17 },
  body: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  allRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 8 },
  allText: { color: colors.ink, fontWeight: '900', fontSize: 15 },
  divider: { height: 1, backgroundColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  consentAction: { flex: 1, minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 11 },
  check: { width: 25, height: 25, borderRadius: 8, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkText: { color: '#fff', fontWeight: '900' },
  flex: { flex: 1 },
  rowTitle: { color: colors.ink, fontWeight: '800', fontSize: 13 },
  required: { color: colors.primary },
  version: { color: colors.muted, fontSize: 10, marginTop: 3 },
  viewButton: { minWidth: 48, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: colors.canvas },
  viewText: { color: colors.primaryDark, fontWeight: '800', fontSize: 12 },
});
