/**
 * Harness smoke test outside `app/`. Proves jest-expo + RNTL run.
 */
import { Text } from 'react-native';

import { renderWithProviders } from '@/src/test/renderWithProviders';

describe('frontend test harness', () => {
  it('renders through application providers', async () => {
    const { getByText, queryClient } = await renderWithProviders(
      <Text>harness-smoke</Text>,
    );
    expect(getByText('harness-smoke')).toBeTruthy();
    expect(queryClient).toBeDefined();
  });
});
