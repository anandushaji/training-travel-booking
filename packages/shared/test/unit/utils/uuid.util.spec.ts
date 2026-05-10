import { generateUuid, isValidUuid } from '../../../src/utils/uuid.util';

describe('generateUuid', () => {
  it('produces a valid UUID v4', () => {
    expect(isValidUuid(generateUuid())).toBe(true);
  });

  it('each call returns a unique value', () => {
    const a = generateUuid();
    const b = generateUuid();
    expect(a).not.toBe(b);
  });
});

describe('isValidUuid', () => {
  it('returns false for invalid inputs', () => {
    expect(isValidUuid('')).toBe(false);
    expect(isValidUuid('not-a-uuid')).toBe(false);
    expect(isValidUuid('123')).toBe(false);
  });
});
