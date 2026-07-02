import { generateId, isValidId } from '../uuid';

describe('generateId', () => {
  it('returns a string', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
  });

  it('returns a valid UUID v4 format', () => {
    const id = generateId();
    expect(isValidId(id)).toBe(true);
  });

  it('returns unique values on successive calls', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });

  it('produces a UUID with the correct v4 version nibble', () => {
    const id = generateId();
    // The 13th character (index 14) should be '4' for v4 UUIDs
    expect(id[14]).toBe('4');
  });

  it('produces a UUID with correct variant bits', () => {
    const id = generateId();
    // The 17th character (index 19) should be 8, 9, a, or b
    expect(id[19]).toMatch(/^[89ab]$/);
  });
});

describe('isValidId', () => {
  it('returns true for a valid UUID v4', () => {
    const id = generateId();
    expect(isValidId(id)).toBe(true);
  });

  it('returns true for a known valid UUID v4', () => {
    const id = '550e8400-e29b-4d14-a716-446655440000';
    expect(isValidId(id)).toBe(true);
  });

  it('returns false for an empty string', () => {
    expect(isValidId('')).toBe(false);
  });

  it('returns false for a non-UUID string', () => {
    expect(isValidId('not-a-uuid')).toBe(false);
  });

  it('returns false for a UUID v1 format', () => {
    // UUID v1 has a different version nibble
    expect(isValidId('550e8400-e29b-1d14-a716-446655440000')).toBe(false);
  });

  it('returns false for a UUID v5 format', () => {
    expect(isValidId('550e8400-e29b-5d14-a716-446655440000')).toBe(false);
  });
});
