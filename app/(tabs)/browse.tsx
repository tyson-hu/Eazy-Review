import { View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { Card } from '@/src/components/ui/Card';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { Screen } from '@/src/components/ui/Screen';

export default function BrowseScreen() {
  return (
    <Screen scroll>
      <View className="pt-4">
        <AppText variant="title">Browse</AppText>
        <AppText variant="caption" className="mt-1">
          Search, filter, and sort products before opening product detail.
        </AppText>
      </View>

      <Card className="mt-6">
        <AppText variant="subtitle">Product list</AppText>
        <EmptyState
          title="No products yet"
          message="Mock product cards will appear here in the next milestone."
        />
      </Card>
    </Screen>
  );
}
