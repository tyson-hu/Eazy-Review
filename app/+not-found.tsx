import { Link, Stack } from 'expo-router';
import { View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <Screen contentClassName="items-center justify-center">
        <AppText variant="title">This screen does not exist.</AppText>
        <View className="mt-6">
          <Link href="/feed" asChild>
            <Button label="Go to Feed" variant="secondary" className="px-6" />
          </Link>
        </View>
      </Screen>
    </>
  );
}
