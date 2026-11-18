// Chat de Seibi's decisions as plain functions, ported from the PWA's
// screens/Estimados.tsx (ChatPanel) and lib/chat.ts as of 6e3b818, so they
// run in the unit tests.
import type { TFunction } from 'i18next';

import type { ChatMessage } from '@/data/chat/messages';
import { knowledgeProfile, type KnowledgeLevel } from '@/lib/knowledge';
import { plainText } from '@/lib/text';

/** The shortest question the `chat` Edge Function takes (it answers `bad_request` below it). */
const MESSAGE_MIN = 2;

/** The longest question the `chat` Edge Function takes; the field stops there (the PWA's `maxLength`). */
export const MESSAGE_MAX = 1000;

/** Whether «Enviar» can send what was typed. */
export function canSend(message: string) {
  const length = message.trim().length;
  return length >= MESSAGE_MIN && length <= MESSAGE_MAX;
}

/** The body of the `chat` call: the question, and the Vehicle the answer is about. */
export function chatRequest(message: string, vehicleId: string) {
  return { message: message.trim(), vehicleId };
}

/** Estimados' two modes: the price form, or the chat (the PWA's «Modo» switch). */
export type EstimatesMode = 'estimate' | 'chat';

/** The mode Estimados opens on, as the PWA's: the price form. */
export const ESTIMATES_MODE: EstimatesMode = 'estimate';

/** The switch's two options, in the PWA's order. */
export function modeOptions(t: TFunction): { value: EstimatesMode; label: string }[] {
  return [
    { value: 'estimate', label: t('estimates.mode.estimate') },
    { value: 'chat', label: t('estimates.mode.chat') },
  ];
}

/**
 * The three questions an empty thread offers (the PWA's STARTERS): everyday
 * ones, or specific ones for someone at ease with maintenance (Knowledge
 * level intermediate or advanced).
 */
export function starters(level: KnowledgeLevel | null | undefined, t: TFunction): string[] {
  const kind = knowledgeProfile(level).detailed ? 'expert' : 'guided';
  return [t(`estimates.chat.starters.${kind}.q1`), t(`estimates.chat.starters.${kind}.q2`), t(`estimates.chat.starters.${kind}.q3`)];
}

/** How many of an answer's sources its bubble lists (the PWA's 3). */
const BUBBLE_SOURCES_MAX = 3;

/** A bubble's words: the person's as typed; an answer without the links the AI left in it. */
export function bubbleText(message: ChatMessage) {
  return message.role === 'user' ? message.content : plainText(message.content);
}

/** The sources under an answer, three at most; a question has none. */
export function bubbleSources(message: ChatMessage) {
  return message.role === 'assistant' ? message.sources.slice(0, BUBBLE_SOURCES_MAX) : [];
}

/** What VoiceOver and TalkBack say when an answer arrives. */
export function replySpoken(message: ChatMessage, t: TFunction) {
  return t('estimates.chat.reply', { text: bubbleText(message) });
}
