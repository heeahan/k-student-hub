import '@/lib/i18n';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/providers/auth-provider';
import { CommunityProvider } from '@/providers/community-provider';
import { ServiceProvider } from '@/providers/service-provider';
import { TaskProvider } from '@/providers/task-provider';
import { colors } from '@/ui/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 30_000 },
    mutations: { retry: 0 },
  },
});

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <View accessible accessibilityLabel="앱을 불러오는 중 문제가 발생했습니다" style={styles.errorScreen}>
      <View style={styles.errorMark}><Text style={styles.errorMarkText}>!</Text></View>
      <Text accessibilityRole="header" style={styles.errorTitle}>앱을 불러오지 못했어요</Text>
      <Text style={styles.errorBody}>입력한 내용은 그대로 두고 화면만 다시 불러옵니다. 문제가 계속되면 내 정보의 고객지원에서 알려 주세요.</Text>
      <Pressable accessibilityRole="button" onPress={retry} style={styles.retryButton}><Text style={styles.retryText}>다시 시도</Text></Pressable>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ServiceProvider>
            <CommunityProvider>
              <TaskProvider>
                <StatusBar style="dark" />
                <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
                  <Stack.Screen name="onboarding" />
                  <Stack.Screen name="consent" />
                  <Stack.Screen name="legal/[document]" />
                  <Stack.Screen name="settings" />
                  <Stack.Screen name="support" />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="post/new" options={{ presentation: 'modal' }} />
                  <Stack.Screen name="post/[id]" />
                </Stack>
              </TaskProvider>
            </CommunityProvider>
          </ServiceProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  errorScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas, paddingHorizontal: 30 },
  errorMark: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF0F2', marginBottom: 18 },
  errorMarkText: { color: colors.danger, fontWeight: '900', fontSize: 30 },
  errorTitle: { color: colors.ink, fontWeight: '900', fontSize: 23, textAlign: 'center' },
  errorBody: { color: colors.muted, fontSize: 14, lineHeight: 22, textAlign: 'center', marginTop: 10, maxWidth: 430 },
  retryButton: { minWidth: 180, minHeight: 52, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  retryText: { color: '#fff', fontWeight: '900', fontSize: 16 },
});
