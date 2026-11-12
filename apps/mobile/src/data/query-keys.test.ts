import { describe, expect, it } from 'vitest';

import { estimateKeys } from './estimate/keys';
import { garageKeys } from './garage/keys';
import { profileKeys } from './profile/keys';
import { taskKeys } from './task/keys';
import { vpicKeys } from './vpic/keys';

/** TanStack Query matches a filter key as a prefix of the query's key. */
function startsWith(key: readonly unknown[], prefix: readonly unknown[]) {
  return prefix.every((part, i) => Object.is(key[i], part));
}

const ANA = 'ea096333-b4af-4a0d-b145-aafe29b19b24';
const BETO = '12f6ed83-6ba6-418e-b0bc-df0ba6be6363';

describe('query keys', () => {
  it('keep each person’s data apart, so two people on one phone never share a cached answer', () => {
    for (const keys of [garageKeys, profileKeys, estimateKeys]) {
      expect(keys.user(ANA)).not.toEqual(keys.user(BETO));
      expect(keys.user(ANA)).toContain(ANA);
    }
  });

  it('nest under their domain, so invalidating the domain reaches every person’s entry', () => {
    for (const keys of [garageKeys, profileKeys, estimateKeys]) {
      expect(startsWith(keys.user(ANA), keys.all)).toBe(true);
    }
    expect(startsWith(vpicKeys.models('Toyota', 2015), vpicKeys.all)).toBe(true);
    expect(startsWith(vpicKeys.makes(), vpicKeys.all)).toBe(true);
  });

  it('keep the PWA’s key for the garage, the one query every screen reads', () => {
    expect(garageKeys.user(ANA)).toEqual(['garage', ANA]);
  });

  it('never collide across domains', () => {
    const roots = [garageKeys.all, profileKeys.all, estimateKeys.all, taskKeys.catalog, vpicKeys.all].map((k) => k[0]);
    expect(new Set(roots).size).toBe(roots.length);
  });

  it('share the vPIC models entry however the brand is typed', () => {
    expect(vpicKeys.models(' Toyota ', 2015)).toEqual(vpicKeys.models('toyota', 2015));
    expect(vpicKeys.models('toyota', 2015)).not.toEqual(vpicKeys.models('toyota', 2016));
    expect(vpicKeys.models('toyota', 2015)).not.toEqual(vpicKeys.makes());
  });
});
