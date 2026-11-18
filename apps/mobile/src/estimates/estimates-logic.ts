// Estimados' decisions as plain functions, ported from the PWA's
// screens/Estimados.tsx as of 6e3b818, so they run in the unit tests.
import type { Reminder } from '@seibi/maintenance-engine/reminders';

import type { TFunction } from 'i18next';

import type { Estimate } from '@/data/estimate/queries';
import type { EstimateResult } from '@/data/estimate/schemas';
import { countryName, type Country } from '@/data/profile/countries';
import { formatDay, formatUsdRange, isoDate } from '@/lib/format';

/** The tasks people price most, after the Vehicle's own pending ones (the PWA's POPULAR). */
const POPULAR = ['engine_oil', 'brake_pads_front', 'battery', 'tires', 'wheel_alignment', 'ac_service', 'coolant', 'spark_plugs'];

/** How many task chips Estimados offers. */
const MAX_SUGGESTIONS = 8;

export type SuggestedTask = { code: string; due: 'overdue' | 'soon' | null };

/**
 * The task chips by the question: the Vehicle's overdue and «Por vencer»
 * tasks first (with that status, for the chip's dot), then the popular ones,
 * each once, only codes the catalog has, eight at most.
 */
export function suggestedTasks(reminders: readonly Pick<Reminder, 'taskCode' | 'status'>[], catalog: readonly string[]): SuggestedTask[] {
  const due = new Map<string, 'overdue' | 'soon'>();
  for (const r of reminders) if (r.status === 'overdue' || r.status === 'soon') due.set(r.taskCode, r.status);
  return [...due.keys(), ...POPULAR]
    .filter((code, i, list) => list.indexOf(code) === i && catalog.includes(code))
    .slice(0, MAX_SUGGESTIONS)
    .map((code) => ({ code, due: due.get(code) ?? null }));
}

/** The shortest question the `estimates` Edge Function takes (it answers `bad_request` below it). */
const QUERY_MIN = 3;

/** Whether «Estimar» can send what was typed. */
export function canAsk(query: string) {
  return query.trim().length >= QUERY_MIN;
}

/** What Estimados asks for: a Maintenance task chip, or what was typed. */
export type EstimateAsk = { taskCode: string } | { query: string };

/** The body of the `estimates` call for one Vehicle. */
export function estimateRequest(vehicleId: string, ask: EstimateAsk) {
  return 'taskCode' in ask ? { vehicleId, taskCode: ask.taskCode } : { vehicleId, query: ask.query.trim() };
}

/** The breakdown under the totals, in the PWA's order. Keys name the es.json labels (`estimates.result.<key>`). */
const BREAKDOWN = [
  ['partsEconomy', 'parts_economy'],
  ['partsOem', 'parts_oem'],
  ['labor', 'labor'],
] as const;

export type PriceRow = { key: (typeof BREAKDOWN)[number][0]; value: string };

/** Economy parts, original parts and labour, each in dollars; a range the sources didn't support is left out. */
export function priceRows(result: EstimateResult): PriceRow[] {
  return BREAKDOWN.flatMap(([key, field]) => {
    const value = formatUsdRange(result[field]);
    return value ? [{ key, value }] : [];
  });
}

/** The two totals, parts plus labour: at an independent shop and at a dealership (null: «Sin datos»). */
export function totals(result: EstimateResult) {
  return { independent: formatUsdRange(result.total_independent), dealership: formatUsdRange(result.total_dealership) };
}

const BARS = { high: 3, medium: 2, low: 1 } as const;

/** How many of the three confidence bars are filled. */
export function confidenceBars(confidence: EstimateResult['confidence']) {
  return BARS[confidence];
}

/** How many past queries «Consultas anteriores» lists. */
const PAST_MAX = 6;

/** The chosen Vehicle's past queries, in the order the history gives them (newest first). */
export function pastQueries(history: readonly Estimate[], vehicleId: string) {
  return history.filter((e) => e.vehicleId === vehicleId).slice(0, PAST_MAX);
}

/** An Estimate's name: the title the research gave, else what was asked. */
export function estimateTitle(estimate: Pick<Estimate, 'query' | 'result'>) {
  return estimate.result.title || estimate.query;
}

/** A past query's second line: the independent shop's total and the day it was asked. */
export function pastQuerySubtitle(estimate: Pick<Estimate, 'createdAt' | 'result'>, t: TFunction) {
  const range = formatUsdRange(estimate.result.total_independent) ?? t('estimates.past.noRange');
  return t('estimates.past.subtitle', { range, day: formatDay(isoDate(new Date(estimate.createdAt))) });
}

/** Where an Estimate prices: «San Salvador, El Salvador», or the country alone. */
export function estimatePlace(city: string, country: Country, t: TFunction) {
  const name = countryName(country, t);
  return city ? t('estimates.result.place', { city, country: name }) : name;
}

/** How long each waiting line stays before the next (the PWA's 4.5 s). */
export const WAITING_STEP_MS = 4500;

/** One of the three waiting lines (`estimates.waiting.step<n>`). */
export type WaitingStep = 0 | 1 | 2;

/** Which of the three waiting lines shows after `elapsed` ms: one every 4.5 s, then the last stays. */
export function waitingStep(elapsed: number): WaitingStep {
  return Math.min(Math.floor(elapsed / WAITING_STEP_MS), 2) as WaitingStep;
}

/** Estimados' two modes: the price form, or the chat (the PWA's «Modo» switch). */
export type EstimatesMode = 'estimate' | 'chat';

/** The mode Estimados opens on, as the PWA's: the price form. */
export const INITIAL_MODE: EstimatesMode = 'estimate';

/** The switch's two options, in the PWA's order. */
export function modeOptions(t: TFunction): { value: EstimatesMode; label: string }[] {
  return [
    { value: 'estimate', label: t('estimates.mode.estimate') },
    { value: 'chat', label: t('estimates.mode.chat') },
  ];
}
