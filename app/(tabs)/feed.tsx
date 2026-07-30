import { View } from 'react-native';

import { Card } from '@/src/components/ui/Card';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { Screen } from '@/src/components/ui/Screen';

export default function FeedScreen() {
  return (
    <Screen scroll>
      <View className="gap-5 pt-4">
        <Card>
          <EmptyState
            title="Feed comes after connected data"
            message="Use Browse for the current product journey. Feed will return with a small set of real, useful sections."
          />
        </Card>
      </View>
    </Screen>
  );
}
