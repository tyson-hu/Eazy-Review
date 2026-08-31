import { fireEvent, render } from '@testing-library/react-native';

import { Button } from '@/src/components/ui/Button';

describe('Button', () => {
  it('renders the destructive variant with a negative background and white label', async () => {
    const rendered = await render(
      <Button label="Delete account" variant="destructive" />,
    );

    expect(rendered.getByRole('button').props.className).toContain('bg-negative');
    expect(rendered.getByText('Delete account').props.className).toContain('text-white');
  });

  it('exposes the destructive label as its accessible button name', async () => {
    const rendered = await render(
      <Button label="Delete account" variant="destructive" />,
    );

    expect(rendered.getByRole('button', { name: 'Delete account' })).toBeTruthy();
  });

  it('uses a white loading indicator for the destructive variant', async () => {
    const rendered = await render(
      <Button label="Deleting account" variant="destructive" loading />,
    );

    const spinner = rendered.root?.children[0];
    expect(spinner).toBeTruthy();
    expect(typeof spinner).not.toBe('string');
    if (typeof spinner === 'string' || spinner == null) {
      throw new Error('Expected the loading indicator host element');
    }
    expect(spinner.props.color).toBe('#ffffff');
  });

  it.each([
    ['disabled', { disabled: true }],
    ['loading', { loading: true }],
  ] as const)('suppresses presses while the destructive action is %s', async (_state, stateProps) => {
    const onPress = jest.fn();
    const rendered = await render(
      <Button
        label="Delete account"
        variant="destructive"
        onPress={onPress}
        testID="destructive-action"
        {...stateProps}
      />,
    );
    const button = rendered.getByTestId('destructive-action');

    expect(button.props.accessibilityRole).toBe('button');
    expect(button).toBeDisabled();
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it.each([
    ['primary', 'bg-accent', 'text-white'],
    ['secondary', 'border border-border bg-card', 'text-primary'],
    ['ghost', 'bg-transparent', 'text-accent'],
  ] as const)(
    'preserves the %s variant classes',
    async (variant, buttonClassName, labelClassName) => {
      const rendered = await render(<Button label={`${variant} action`} variant={variant} />);

      expect(rendered.getByRole('button').props.className).toContain(buttonClassName);
      expect(rendered.getByText(`${variant} action`).props.className).toContain(
        labelClassName,
      );
    },
  );
});
