import { View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { Screen } from '@/src/components/ui/Screen';

export default function AccountScreen() {
  return (
    <Screen scroll>
      <View className="items-center pt-8">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-border">
          <AppText variant="subtitle">ER</AppText>
        </View>
        <AppText variant="title" className="mt-4">
          Eazy Review
        </AppText>
        <AppText variant="caption" className="mt-2 max-w-xs text-center">
          Sign in to rate products and track your personal rating history.
        </AppText>
      </View>

      <Card className="mt-8 gap-3">
        <Button label="Sign In" disabled />
        <Button label="Create Account" variant="secondary" disabled />
        <AppText variant="caption" className="text-center">
          Auth flows are not connected yet. You can keep browsing without signing in.
        </AppText>
      </Card>
    </Screen>
  );
}
