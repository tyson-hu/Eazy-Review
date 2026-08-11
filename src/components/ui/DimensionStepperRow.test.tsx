import { act, fireEvent, render } from '@testing-library/react-native';

import { DimensionStepperRow } from '@/src/components/ui/DimensionStepperRow';

jest.mock('@react-native-community/slider', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Jest mock factory
  const { View } = require('react-native');
  return { __esModule: true, default: View };
});

describe('DimensionStepperRow', () => {
  it('configures 0–10 half steps without turning unanswered into zero', async () => {
    const onChange = jest.fn();
    const rendered = await render(
      <DimensionStepperRow
        label="Appearance"
        description="How it looks"
        value={null}
        onChange={onChange}
        testID="dim"
      />,
    );

    const slider = rendered.getByTestId('dim-slider');
    expect(slider.props.minimumValue).toBe(0);
    expect(slider.props.maximumValue).toBe(10);
    expect(slider.props.step).toBe(0.5);
    expect(slider.props.tapToSeek).toBe(true);
    expect(slider.props.value).toBe(0);
    expect(slider.props.accessibilityRole).toBe('adjustable');
    expect(slider.props.accessibilityLabel).toBe('Appearance score');
    expect(slider.props.accessibilityValue).toEqual({ text: 'not rated' });
    expect(rendered.getByTestId('dim-value').props.children).toBe('—');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('forwards half-step changes and exposes the answered value', async () => {
    const onChange = jest.fn();
    const rendered = await render(
      <DimensionStepperRow
        label="Appearance"
        description="How it looks"
        value={7}
        onChange={onChange}
        testID="dim"
      />,
    );

    const slider = rendered.getByTestId('dim-slider');
    expect(slider.props.accessibilityValue).toEqual({
      min: 0,
      max: 10,
      now: 7,
      text: '7 of 10',
    });

    await act(async () => {
      fireEvent(slider, 'valueChange', 7.5);
    });
    expect(onChange).toHaveBeenLastCalledWith(7.5);
  });

  it('keeps zero as an answered value', async () => {
    const rendered = await render(
      <DimensionStepperRow
        label="Appearance"
        description="How it looks"
        value={0}
        onChange={jest.fn()}
        testID="dim"
      />,
    );

    expect(rendered.getByTestId('dim-value').props.children).toBe('0');
    expect(rendered.getByTestId('dim-slider').props.accessibilityValue).toEqual(
      {
        min: 0,
        max: 10,
        now: 0,
        text: '0 of 10',
      },
    );
  });

  it('nudges half steps with accessible 44-point controls and clears', async () => {
    const onChange = jest.fn();
    const rendered = await render(
      <DimensionStepperRow
        label="Appearance"
        description="How it looks"
        value={8}
        onChange={onChange}
        testID="dim"
      />,
    );

    const increment = rendered.getByTestId('dim-inc');
    const decrement = rendered.getByTestId('dim-dec');
    const clear = rendered.getByTestId('dim-clear');
    expect(increment.props.className).toContain('h-11');
    expect(decrement.props.className).toContain('h-11');
    expect(clear.props.className).toContain('h-11');

    await act(async () => {
      fireEvent.press(increment);
    });
    expect(onChange).toHaveBeenLastCalledWith(8.5);

    await act(async () => {
      fireEvent.press(decrement);
    });
    expect(onChange).toHaveBeenLastCalledWith(7.5);

    await act(async () => {
      fireEvent.press(clear);
    });
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
