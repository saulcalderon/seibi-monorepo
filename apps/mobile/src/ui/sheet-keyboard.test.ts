import { describe, expect, it } from 'vitest';

import { keyboardCover, sheetBottomOffset, sheetRoom } from './sheet-keyboard';

// A phone in points: a 24-point navigation bar (Android) or a 34-point home
// indicator (iOS), a 300-point number pad.
const android = { bottomInset: 24, platform: 'android' } as const;
const ios = { bottomInset: 34, platform: 'ios' } as const;

describe('keyboardCover', () => {
  it('is nothing while the keyboard is closed', () => {
    expect(keyboardCover({ keyboard: 0, room: 500, ...android })).toBe(0);
    expect(keyboardCover({ keyboard: 0, room: 0, ...ios })).toBe(0);
  });

  it('is nothing when the sheet rises clear of the keyboard (a short sheet, the bug in SEI-76)', () => {
    expect(keyboardCover({ keyboard: 300, room: 500, ...android })).toBe(0);
    expect(keyboardCover({ keyboard: 300, room: 300, ...android })).toBe(0);
    expect(keyboardCover({ keyboard: 300, room: 500, ...ios })).toBe(0);
  });

  it('is the part the sheet could not rise above (a tall sheet)', () => {
    // Android: the sheet rises 70 - 24 = 46; the keyboard covers 300 - 24 - 46 of its content.
    expect(keyboardCover({ keyboard: 300, room: 70, ...android })).toBe(230);
    // iOS: the sheet grows by its 70 points of room; the inset stays above the keyboard.
    expect(keyboardCover({ keyboard: 300, room: 70, ...ios })).toBe(196);
  });

  it('is the keyboard less the bottom inset when the sheet cannot rise at all', () => {
    expect(keyboardCover({ keyboard: 300, room: 0, ...android })).toBe(276);
    expect(keyboardCover({ keyboard: 300, room: 10, ...android })).toBe(276);
    expect(keyboardCover({ keyboard: 300, room: 0, ...ios })).toBe(266);
  });

  it('follows the keyboard frame by frame without a jump', () => {
    const covers = [0, 10, 24, 70, 94, 300].map((keyboard) => keyboardCover({ keyboard, room: 70, ...android }));
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
    expect(sheetBottomOffset({ clearance: 116, room: 500, ...android })).toBe(-384);
    expect(sheetBottomOffset({ clearance: 116, room: 70, ...android })).toBe(46);
    expect(sheetBottomOffset({ clearance: 116, room: 70, ...ios })).toBe(12);
  });

  it('takes away the bottom inset when the sheet cannot rise', () => {
    expect(sheetBottomOffset({ clearance: 116, room: 0, ...android })).toBe(92);
    expect(sheetBottomOffset({ clearance: 116, room: 0, ...ios })).toBe(82);
  });
});
