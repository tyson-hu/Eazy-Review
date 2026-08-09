import { Input } from '@/src/components/ui/Input';
import { render } from '@testing-library/react-native';

describe('auth field input props', () => {
  it('supports email and secure password configurations', async () => {
    const email = await render(
      <Input
        testID="email"
        autoCapitalize="none"
        keyboardType="email-address"
        accessibilityLabel="Email"
      />,
    );
    expect(email.getByTestId('email').props.keyboardType).toBe('email-address');
    expect(email.getByTestId('email').props.autoCapitalize).toBe('none');
    await email.unmount();

    const password = await render(
      <Input
        testID="password"
        secureTextEntry
        accessibilityLabel="Password"
      />,
    );
    expect(password.getByTestId('password').props.secureTextEntry).toBe(true);
    await password.unmount();
  });
});
