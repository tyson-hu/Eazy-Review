import { Link, Stack } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { Screen } from '@/src/components/ui/Screen';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <Screen contentClassName="items-center justify-center">
        <AppText variant="title">This screen does not exist.</AppText>
        <View className="mt-6">
          <Link href="/feed" asChild>
            <Pressable className="min-h-12 items-center justify-center rounded-button border border-border bg-card px-6">
              <AppText className="font-semibold text-primary">Go to Feed</AppText>
            </Pressable>
          </Link>
        </View>
      </Screen>
    </>
  );
}
