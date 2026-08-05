/**
 * Harness smoke test outside `app/`. Proves jest-expo + RNTL run.
 */
import { Text } from 'react-native';

import { renderWithProviders } from '@/src/test/renderWithProviders';

describe('frontend test harness', () => {
  it('renders through application providers', async () => {
    const rendered = await renderWithProviders(<Text>harness-smoke</Text>);
    expect(rendered.getByText('harness-smoke')).toBeTruthy();
    expect(rendered.queryClient).toBeDefined();
    await rendered.cleanup();
  });
});
