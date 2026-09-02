import '@/lib/i18n';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/providers/auth-provider';
import { CommunityProvider } from '@/providers/community-provider';
import { TaskProvider } from '@/providers/task-provider';
import { colors } from '@/ui/theme';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CommunityProvider>
            <TaskProvider>
              <StatusBar style="dark" />
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
                <Stack.Screen name="onboarding" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="post/new" options={{ presentation: 'modal' }} />
                <Stack.Screen name="post/[id]" />
              </Stack>
            </TaskProvider>
          </CommunityProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
