import { describe, expect, it, vi } from 'vitest';

import { createTextFitStore, textFits } from './text-fit';

const line = (text: string, width = 36, height = 20.2) => ({ text, width, height });

describe('textFits', () => {
  it('fits one line in a one-line box', () => {
    expect(textFits({ width: 37.7, height: 20.2 }, [line('Al día')])).toBe(true);
  });

  it('flags a second line drawn outside a one-line box (Android drew «Al» of «Al día»)', () => {
    expect(textFits({ width: 36.2, height: 20.2 }, [line('Al ', 16.4), line('día', 19.9)])).toBe(false);
  });

  it('accepts two lines in a two-line box', () => {
    expect(textFits({ width: 20, height: 40.4 }, [line('Al ', 16.4), line('día', 19.9)])).toBe(true);
  });

  it('flags a line wider than its box, and forgives a point of rounding', () => {
    expect(textFits({ width: 30, height: 20.2 }, [line('Ver todo', 32)])).toBe(false);
    expect(textFits({ width: 30, height: 20.2 }, [line('Ver todo', 30.9)])).toBe(true);
  });
});

describe('createTextFitStore', () => {
  it('lists what is cut now, and tells listeners only when that changes', () => {
    const store = createTextFitStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.report('a', 'Al día', true);
    expect(store.misfits()).toEqual([]);
    expect(listener).not.toHaveBeenCalled();

    store.report('a', 'Al', false);
    store.report('b', 'Ver todo', false);
    expect(store.misfits()).toEqual(['Al', 'Ver todo']);
    expect(listener).toHaveBeenCalledTimes(2);

    const before = store.misfits();
    store.report('a', 'Al', false);
    expect(store.misfits()).toBe(before);

    store.report('a', 'Al día', true);
    store.report('b', '', null);
    expect(store.misfits()).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(4);
  });
});
