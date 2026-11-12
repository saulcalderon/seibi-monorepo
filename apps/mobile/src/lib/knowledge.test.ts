import { describe, expect, it } from 'vitest';

import { t } from '@/data/test-i18n';

import { calibrateLevel, CHECK_QUESTIONS, KNOWLEDGE_LEVELS, knowledgeProfile, levelTitle, taskLabel } from './knowledge';

// Expected levels are what the PWA's apps/app/src/lib/knowledge.ts gives.

describe('calibrateLevel', () => {
  it('averages the self-assessment and the check answers, rounding down', () => {
    const table = {
      none: ['none', 'none', 'basic', 'basic'],
      basic: ['none', 'basic', 'basic', 'intermediate'],
      intermediate: ['basic', 'basic', 'intermediate', 'intermediate'],
      advanced: ['basic', 'intermediate', 'intermediate', 'advanced'],
    } as const;
    for (const [self, byCorrect] of Object.entries(table)) {
      byCorrect.forEach((level, correct) => {
        expect(calibrateLevel(self as keyof typeof table, correct), `${self}/${correct}`).toBe(level);
      });
    }
  });

  it('clamps an impossible count of right answers', () => {
    expect(calibrateLevel('advanced', 9)).toBe('advanced');
    expect(calibrateLevel('none', -2)).toBe('none');
  });
});

describe('knowledgeProfile', () => {
  it('explains more for beginners and shows detail to the experienced', () => {
    expect(knowledgeProfile('none')).toEqual({ level: 'none', explain: true, plainNames: true, detailed: false, technical: false });
    expect(knowledgeProfile('intermediate')).toEqual({
      level: 'intermediate',
      explain: false,
      plainNames: false,
      detailed: true,
      technical: false,
    });
    expect(knowledgeProfile('advanced').technical).toBe(true);
  });

  it('treats an unset level as basic', () => {
    expect(knowledgeProfile(null).level).toBe('basic');
  });

  it('uses everyday task names for guided levels', () => {
    const oil = {
      code: 'transmission_fluid',
      name: 'Aceite de transmisión',
      plainName: 'Aceite de la caja',
      description: '',
      sortOrder: 1,
      generalDistanceKm: null,
      generalMonths: null,
    };
    expect(taskLabel(oil, oil.code, knowledgeProfile('basic'))).toBe('Aceite de la caja');
    expect(taskLabel(oil, oil.code, knowledgeProfile('advanced'))).toBe('Aceite de transmisión');
    expect(taskLabel(undefined, 'mystery', knowledgeProfile('basic'))).toBe('mystery');
  });
});

describe('copy', () => {
  it('names every level, and says so when it is unset', () => {
    expect(KNOWLEDGE_LEVELS.map((l) => levelTitle(l, t))).toEqual([
      'Estoy empezando',
      'Conozco lo básico',
      'Tengo experiencia',
      'Tengo bastante conocimiento',
    ]);
    expect(levelTitle(null, t)).toBe('Sin definir');
  });

  it('has three check questions with exactly one right answer each', () => {
    expect(CHECK_QUESTIONS).toHaveLength(3);
    for (const q of CHECK_QUESTIONS) expect(q.options.filter((o) => o.correct)).toHaveLength(1);
  });
});
