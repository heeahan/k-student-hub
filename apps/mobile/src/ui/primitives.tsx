import type { PropsWithChildren, ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type PressableProps, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, shadow } from '@/ui/theme';

export function Screen({ children, scroll = true }: PropsWithChildren<{ scroll?: boolean }>) {
  const content = scroll ? <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">{children}</ScrollView> : <View style={[styles.content, styles.flex]}>{children}</View>;
  return <SafeAreaView style={styles.safe} edges={['top']}><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>{content}</KeyboardAvoidingView></SafeAreaView>;
}

export function AppHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return <View style={styles.header}><View style={styles.flex}>{eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}<Text accessibilityRole="header" style={styles.title}>{title}</Text></View>{action}</View>;
}

export function Card({ children, style }: PropsWithChildren<{ style?: object }>) { return <View style={[styles.card, style]}>{children}</View>; }

export function Button({ children, variant = 'primary', loading, disabled, ...props }: PressableProps & { children: ReactNode; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; loading?: boolean }) {
  const isDisabled = disabled || loading;
  return <Pressable {...props} accessibilityRole={props.accessibilityRole ?? 'button'} accessibilityState={{ ...props.accessibilityState, disabled: isDisabled, busy: loading }} disabled={isDisabled} style={({ pressed }) => [styles.button, styles[`button_${variant}`], pressed && styles.pressed, isDisabled && styles.disabled]}>{loading ? <ActivityIndicator accessibilityLabel="처리 중" color={variant === 'primary' ? '#fff' : colors.primary} /> : <Text style={[styles.buttonText, styles[`buttonText_${variant}`]]}>{children}</Text>}</Pressable>;
}

export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  return <View style={styles.fieldWrap}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={props.accessibilityLabel ?? label} accessibilityHint={props.accessibilityHint ?? hint} placeholderTextColor="#94A3B8" {...props} style={[styles.input, props.multiline && styles.multiline, props.style]} />{hint ? <Text style={styles.hint}>{hint}</Text> : null}</View>;
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={label} onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}><Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text></Pressable>;
}

export function EmptyState({ icon, title, body }: { icon: string; title: string; body: string }) {
  return <View accessible accessibilityLabel={`${title}. ${body}`} style={styles.empty}><Text accessibilityElementsHidden style={styles.emptyIcon}>{icon}</Text><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyBody}>{body}</Text></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas }, flex: { flex: 1 }, content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 42, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 }, eyebrow: { color: colors.primary, fontWeight: '800', fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase' },
  title: { color: colors.ink, fontWeight: '900', fontSize: 28, letterSpacing: -0.6 }, card: { backgroundColor: colors.surface, borderRadius: 22, borderWidth: 1, borderColor: colors.border, padding: 18, ...shadow },
  button: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }, button_primary: { backgroundColor: colors.primary }, button_secondary: { backgroundColor: colors.primarySoft },
  button_ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border }, button_danger: { backgroundColor: '#FFF0F2' }, buttonText: { fontWeight: '800', fontSize: 16 },
  buttonText_primary: { color: '#fff' }, buttonText_secondary: { color: colors.primaryDark }, buttonText_ghost: { color: colors.ink }, buttonText_danger: { color: colors.danger }, pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] }, disabled: { opacity: 0.5 },
  fieldWrap: { gap: 8 }, label: { color: colors.ink, fontWeight: '800', fontSize: 14 }, input: { minHeight: 52, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 15, paddingHorizontal: 15, color: colors.ink, fontSize: 16 },
  multiline: { minHeight: 128, paddingTop: 14, textAlignVertical: 'top' }, hint: { color: colors.muted, fontSize: 12, lineHeight: 18 }, chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary }, chipText: { color: colors.muted, fontWeight: '700', fontSize: 13 }, chipTextSelected: { color: '#fff' },
  empty: { alignItems: 'center', paddingVertical: 50, paddingHorizontal: 30, gap: 8 }, emptyIcon: { fontSize: 38 }, emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: '900' }, emptyBody: { color: colors.muted, textAlign: 'center', lineHeight: 21 },
});
