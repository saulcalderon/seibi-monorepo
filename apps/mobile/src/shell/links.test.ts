import { describe, expect, it } from 'vitest';

import { vehicleLinkTarget } from './links';

const ID = '0b6f3c1e-8a52-4d4b-9f0e-2a7d5c9e1b34';
const FLEET = `/(app)/(tabs)/(fleet)/vehicle/${ID}`;

describe('vehicleLinkTarget', () => {
  it('opens a Vehicle link in Mi flota, whatever the scheme', () => {
    expect(vehicleLinkTarget(`seibi-dev://vehicle/${ID}`)).toBe(FLEET);
    expect(vehicleLinkTarget(`seibi://vehicle/${ID}`)).toBe(FLEET);
    expect(vehicleLinkTarget(`/vehicle/${ID}`)).toBe(FLEET);
    expect(vehicleLinkTarget(`vehicle/${ID}`)).toBe(FLEET);
  });

  it('ignores a trailing slash, a query and a fragment', () => {
    expect(vehicleLinkTarget(`seibi-dev://vehicle/${ID}/`)).toBe(FLEET);
    expect(vehicleLinkTarget(`seibi-dev://vehicle/${ID}?from=push`)).toBe(FLEET);
    expect(vehicleLinkTarget(`seibi-dev://vehicle/${ID}#top`)).toBe(FLEET);
  });

  it('leaves every other link alone', () => {
    expect(vehicleLinkTarget('seibi-dev://ui-kit')).toBeNull();
    expect(vehicleLinkTarget('seibi-dev://profile')).toBeNull();
    expect(vehicleLinkTarget('seibi-dev://vehicle/')).toBeNull();
    expect(vehicleLinkTarget(`seibi-dev://vehicle/${ID}/services`)).toBeNull();
    expect(vehicleLinkTarget('exp+seibi://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081')).toBeNull();
    expect(vehicleLinkTarget('/')).toBeNull();
  });

  it('leaves the Vehicle form’s routes to the form', () => {
    expect(vehicleLinkTarget('seibi-dev://vehicle/new')).toBeNull();
    expect(vehicleLinkTarget('/vehicle/pick?kind=brand')).toBeNull();
    expect(vehicleLinkTarget(`seibi-dev://vehicle/${ID}/edit`)).toBeNull();
  });
});
