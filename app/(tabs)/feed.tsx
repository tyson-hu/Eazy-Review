import { View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { Card } from '@/src/components/ui/Card';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { Screen } from '@/src/components/ui/Screen';

const FEED_SECTIONS = [
  "Today's Pick",
  'Trending Now',
  'Best Eazy Scores',
  'Best Community Scores',
  'Newly Added',
] as const;

export default function FeedScreen() {
  return (
    <Screen scroll>
      <View className="gap-3 pt-4">
        {FEED_SECTIONS.map((section) => (
          <Card key={section}>
            <AppText variant="subtitle">{section}</AppText>
            <EmptyState
              title="Coming soon"
              message={`${section} products will show here once mock data is wired up.`}
            />
          </Card>
        ))}
      </View>
    </Screen>
  );
}
