import { describe, expect, it } from 'vitest';

import { appleName } from './apple-name';

describe('appleName', () => {
  it('keeps the full name for Perfil and the first name for the greeting', () => {
    expect(appleName({ givenName: ' Saúl ', middleName: null, familyName: 'Calderón' })).toEqual({
      fullName: 'Saúl Calderón',
      givenName: 'Saúl',
      familyName: 'Calderón',
      displayName: 'Saúl',
    });
  });

  it('is null when Apple sends no name (every sign-in after the first)', () => {
    expect(appleName(null)).toBeNull();
    expect(appleName({ givenName: null, familyName: null })).toBeNull();
    expect(appleName({ givenName: '  ', familyName: '' })).toBeNull();
  });

  it('falls back to the family name when there is no given name', () => {
    expect(appleName({ givenName: null, familyName: 'Calderón' })?.displayName).toBe('Calderón');
  });

  it('fits display_name’s 60 characters', () => {
    expect(appleName({ givenName: 'A'.repeat(80) })?.displayName).toHaveLength(60);
  });
});
