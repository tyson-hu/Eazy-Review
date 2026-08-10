import { useWindowDimensions } from 'react-native';

/**
 * Prefer stacked adaptive layouts from this scale upward.
 * Keeps default (1.0) and modest increases on dense horizontal compositions.
 */
export const LARGE_CONTENT_SIZE_THRESHOLD = 1.3;

/**
 * Caps only large display scores (e.g. "82 / 100") so maximum Dynamic Type
 * cannot explode bordered score chips. Body copy and labels keep system
 * scaling unless a call site opts into a chrome limit.
 */
export const SCORE_DISPLAY_MAX_FONT_SIZE_MULTIPLIER = 1.6;

/**
 * Caps compact chrome (±, button labels) so sticky footers and steppers stay
 * operable. Still scales beyond default size; does not disable Dynamic Type.
 */
export const UI_CHROME_MAX_FONT_SIZE_MULTIPLIER = 1.4;

export function isLargeContentSize(fontScale: number): boolean {
  return fontScale >= LARGE_CONTENT_SIZE_THRESHOLD;
}

/**
 * Font scale that re-renders when the system content size changes.
 * Backed by `useWindowDimensions().fontScale` (React Native).
 */
export function useFontScale(): number {
  const { fontScale } = useWindowDimensions();
  return fontScale;
}

export function useIsLargeContentSize(): boolean {
  return isLargeContentSize(useFontScale());
}
