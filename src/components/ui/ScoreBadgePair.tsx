import type { ReactElement } from 'react';
import { View } from 'react-native';

import type { ScoreBadge } from '@/src/components/ui/ScoreBadge';
import { useIsLargeContentSize } from '@/src/lib/accessibility/fontScale';

type ScoreBadgeElement = ReactElement<Parameters<typeof ScoreBadge>[0]>;

type ScoreBadgePairProps = {
  eazy: ScoreBadgeElement;
  community: ScoreBadgeElement;
  className?: string;
  testID?: string;
};

/**
 * Side-by-side score overview at default content sizes; stacks vertically when
 * Dynamic Type reaches the large-content threshold so chips are not clipped.
 */
export function ScoreBadgePair({
  eazy,
  community,
  className,
  testID,
}: ScoreBadgePairProps) {
  const largeContent = useIsLargeContentSize();

  return (
    <View
      testID={testID}
      className={`${largeContent ? 'gap-3' : 'flex-row gap-5'} ${className ?? ''}`}>
      <View className={largeContent ? undefined : 'min-w-0 flex-1'}>{eazy}</View>
      <View className={largeContent ? undefined : 'min-w-0 flex-1'}>
        {community}
      </View>
    </View>
  );
}
