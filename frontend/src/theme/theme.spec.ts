import { describe, it, expect } from 'vitest';
import { theme } from './theme';

describe('theme', () => {
  it('should apply primary colour to Button', () => {
    expect(theme.palette.primary.main).toBe('#1E3A5F');
  });

  it('should have 4px border radius override on MuiButton', () => {
    const buttonOverride = theme.components?.MuiButton?.styleOverrides?.root as
      | Record<string, unknown>
      | undefined;
    expect(buttonOverride?.borderRadius).toBe(4);
  });
});
