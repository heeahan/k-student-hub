import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/providers/auth-provider';
import { useService } from '@/providers/service-provider';
import { colors } from '@/ui/theme';

const icons: Record<string, string> = { today: '✓', community: '◉', ask: '?', profile: '☺' };

export default function TabsLayout() {
  const { profile } = useAuth();
  const { loading, hasRequiredConsents } = useService();
  const { t } = useTranslation();
  if (!profile) return <Redirect href="/" />;
  if (!profile.onboardingComplete) return <Redirect href="/onboarding" />;
  if (loading) return <View style={styles.loading}><ActivityIndicator color={colors.primary} size="large" /></View>;
  if (!hasRequiredConsents) return <Redirect href="/consent" />;
  return (
    <Tabs screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: '#8A98AC',
      tabBarStyle: styles.tabBar,
      tabBarLabelStyle: styles.label,
      tabBarIcon: ({ color }) => <Text style={[styles.icon, { color }]}>{icons[route.name] ?? '•'}</Text>,
    })}>
      <Tabs.Screen name="today" options={{ title: t('today') }} />
      <Tabs.Screen name="community" options={{ title: t('community') }} />
      <Tabs.Screen name="ask" options={{ title: t('ask') }} />
      <Tabs.Screen name="profile" options={{ title: t('profile') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas },
  tabBar: { height: 72, paddingTop: 7, paddingBottom: 8, borderTopColor: colors.border, backgroundColor: '#fff' },
  label: { fontWeight: '800', fontSize: 11 }, icon: { fontSize: 20, fontWeight: '900', height: 24 },
});
