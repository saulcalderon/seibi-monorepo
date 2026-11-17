import { describe, expect, it, vi } from 'vitest';

import { awaitPick, deliverPick, forgetPick } from './picker-channel';

describe('picker-channel', () => {
  it('delivers a pick to the callback that asked for it', () => {
    const onPick = vi.fn();
    awaitPick('brand', onPick);
    deliverPick('brand', 'Kia');
    expect(onPick).toHaveBeenCalledWith('Kia');
  });

  it('a pick delivered after forget calls nobody', () => {
    const onPick = vi.fn();
    awaitPick('model', onPick);
    forgetPick('model', onPick);
    deliverPick('model', 'Rio');
    expect(onPick).not.toHaveBeenCalled();
  });

  it('forgetting with a different callback keeps the waiting one', () => {
    const onPick = vi.fn();
    awaitPick('year', onPick);
    forgetPick('year', vi.fn());
    deliverPick('year', '2020');
    expect(onPick).toHaveBeenCalledWith('2020');
  });

  it('the latest ask replaces an earlier one for the same kind', () => {
    const first = vi.fn();
    const second = vi.fn();
    awaitPick('brand', first);
    awaitPick('brand', second);
    deliverPick('brand', 'Mazda');
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith('Mazda');
  });
});
