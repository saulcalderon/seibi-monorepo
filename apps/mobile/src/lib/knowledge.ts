// The Knowledge level (CONTEXT.md): how much the person knows about vehicle
// maintenance. It changes wording, explanations and how much a form shows;
// never the data or the Reminders. Ported from the PWA's lib/knowledge.ts;
// the copy lives in es.json under `knowledge`.
import type { TFunction } from 'i18next';

import type { MaintenanceTask } from '@/data/task/catalog';

import type { Database } from './database.types';

export type KnowledgeLevel = Database['public']['Enums']['knowledge_level'];

/** In order, from beginner to expert. Titles and descriptions: `knowledge.levels.<level>`. */
export const KNOWLEDGE_LEVELS: readonly KnowledgeLevel[] = ['none', 'basic', 'intermediate', 'advanced'];

export function levelTitle(level: KnowledgeLevel | null | undefined, t: TFunction) {
  return level ? t(`knowledge.levels.${level}.title`) : t('knowledge.unset');
}

export function levelDescription(level: KnowledgeLevel, t: TFunction) {
  return t(`knowledge.levels.${level}.description`);
}

/** How the UI adapts to the Knowledge level. */
export function knowledgeProfile(level: KnowledgeLevel | null | undefined) {
  const l = level ?? 'basic';
  const guided = l === 'none' || l === 'basic';
  return {
    level: l,
    /** Show «¿Qué es esto?» explanations next to task names. */
    explain: guided,
    /** Prefer everyday names («Aceite de la caja») over technical ones. */
    plainNames: guided,
    /** Show part brand, part number, per-item cost, and schedule details. */
    detailed: l === 'intermediate' || l === 'advanced',
    /** Show severe-schedule notes and interval numbers everywhere. */
    technical: l === 'advanced',
  };
}

export type KnowledgeProfile = ReturnType<typeof knowledgeProfile>;

export function taskLabel(task: MaintenanceTask | undefined, code: string, k: KnowledgeProfile) {
  if (!task) return code;
  return k.plainNames ? task.plainName : task.name;
}

type CheckQuestion<Id extends string, Option extends string> = {
  id: Id;
  /** Shows the dashboard light next to the question. */
  mark?: 'coolant';
  options: { id: Option; correct: boolean }[];
};

/**
 * Check questions that calibrate the self-assessment (Onboarding). The
 * right answers are widely documented basics, not Seibi data. Copy:
 * `knowledge.check.<question>.question` and `….options.<option>.text|detail`.
 */
export const CHECK_QUESTIONS = [
  {
    id: 'preventive',
    options: [
      { id: 'prevent', correct: true },
      { id: 'repair', correct: false },
      { id: 'looks', correct: false },
      { id: 'dontKnow', correct: false },
    ],
  } satisfies CheckQuestion<'preventive', 'prevent' | 'repair' | 'looks' | 'dontKnow'>,
  {
    id: 'care_habits',
    options: [
      { id: 'checksAndDriving', correct: true },
      { id: 'noChecks', correct: false },
      { id: 'washing', correct: false },
      { id: 'dontKnow', correct: false },
    ],
  } satisfies CheckQuestion<'care_habits', 'checksAndDriving' | 'noChecks' | 'washing' | 'dontKnow'>,
  {
    id: 'coolant_light',
    mark: 'coolant',
    options: [
      { id: 'overheating', correct: true },
      { id: 'fuel', correct: false },
      { id: 'oil', correct: false },
      { id: 'dontKnow', correct: false },
    ],
  } satisfies CheckQuestion<'coolant_light', 'overheating' | 'fuel' | 'oil' | 'dontKnow'>,
];

/**
 * Final level: the average of the self-assessment and the check score.
 * Right answers scale onto none…advanced and round down, so Seibi explains
 * a little more rather than a little less.
 */
export function calibrateLevel(self: KnowledgeLevel, correct: number): KnowledgeLevel {
  const selfIndex = KNOWLEDGE_LEVELS.indexOf(self);
  const span = KNOWLEDGE_LEVELS.length - 1;
  const total = CHECK_QUESTIONS.length;
  const answered = Math.max(0, Math.min(total, correct));
  const checkIndex = total === 0 ? 0 : Math.floor((answered / total) * span);
  return KNOWLEDGE_LEVELS[Math.floor((selfIndex + checkIndex) / 2)];
}
