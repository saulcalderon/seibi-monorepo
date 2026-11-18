import { describe, expect, it } from 'vitest';

import { keyboardCover, sheetBottomOffset, sheetRoom } from './sheet-keyboard';

// A Pixel-sized phone in points: 24 of navigation bar, a 300-point number pad.
const inset = 24;

describe('keyboardCover', () => {
  it('is nothing while the keyboard is closed', () => {
    expect(keyboardCover({ keyboard: 0, room: 500, bottomInset: inset })).toBe(0);
    expect(keyboardCover({ keyboard: 0, room: 0, bottomInset: inset })).toBe(0);
  });

  it('is nothing when the sheet rises clear of the keyboard (a short sheet, the bug in SEI-76)', () => {
    expect(keyboardCover({ keyboard: 300, room: 500, bottomInset: inset })).toBe(0);
    expect(keyboardCover({ keyboard: 300, room: 300, bottomInset: inset })).toBe(0);
  });

  it('is the part the sheet could not rise above (a tall sheet)', () => {
    // The sheet rises 70 - 24 = 46; the keyboard covers 300 - 24 - 46 of its content.
    expect(keyboardCover({ keyboard: 300, room: 70, bottomInset: inset })).toBe(230);
  });

  it('is the keyboard less the bottom inset when the sheet cannot rise at all', () => {
    expect(keyboardCover({ keyboard: 300, room: 0, bottomInset: inset })).toBe(276);
    expect(keyboardCover({ keyboard: 300, room: 10, bottomInset: inset })).toBe(276);
  });

  it('follows the keyboard frame by frame without a jump', () => {
    const covers = [0, 10, 24, 70, 94, 300].map((keyboard) => keyboardCover({ keyboard, room: 70, bottomInset: inset }));
    expect(covers).toEqual([0, 0, 0, 0, 24, 230]);
  });
});

describe('sheetRoom', () => {
  it('is the space above the sheet, under the status bar', () => {
    expect(sheetRoom({ windowHeight: 900, topInset: 40, sheetHeight: 360 })).toBe(500);
  });

  it('is never below zero, and zero before the sheet is measured', () => {
    expect(sheetRoom({ windowHeight: 900, topInset: 40, sheetHeight: 880 })).toBe(0);
    expect(sheetRoom({ windowHeight: 900, topInset: 40, sheetHeight: 0 })).toBe(0);
  });
});

describe('sheetBottomOffset', () => {
  it('takes away what the sheet rises by itself', () => {
    expect(sheetBottomOffset({ clearance: 116, room: 500, bottomInset: inset })).toBe(-384);
    expect(sheetBottomOffset({ clearance: 116, room: 70, bottomInset: inset })).toBe(46);
  });

  it('takes away the bottom inset when the sheet cannot rise', () => {
    expect(sheetBottomOffset({ clearance: 116, room: 0, bottomInset: inset })).toBe(92);
  });
});
