import { describe, expect, it } from 'vitest';

import type { ChatMessage } from '@/data/chat/messages';
import { t } from '@/data/test-i18n';

import { bubbleSources, bubbleText, canSend, chatRequest, ESTIMATES_MODE, MESSAGE_MAX, modeOptions, replySpoken, starters } from './chat-logic';

describe('canSend', () => {
  it('sends a question of two characters or more, counted without the spaces around it', () => {
    expect(canSend('¿Y?')).toBe(true);
    expect(canSend('ok')).toBe(true);
    expect(canSend(' a ')).toBe(false);
    expect(canSend('   ')).toBe(false);
  });

  it('refuses a question over the 1,000 characters the function takes', () => {
    expect(MESSAGE_MAX).toBe(1000);
    expect(canSend('a'.repeat(1000))).toBe(true);
    expect(canSend('a'.repeat(1001))).toBe(false);
  });
});

describe('chatRequest', () => {
  it('sends the question without its surrounding spaces, and the Vehicle it is about', () => {
    expect(chatRequest('  ¿Cada cuánto cambio el aceite?\n', 'v1')).toEqual({ message: '¿Cada cuánto cambio el aceite?', vehicleId: 'v1' });
  });

  it('keeps the line breaks inside the question', () => {
    expect(chatRequest('Hace ruido.\n¿Es grave?', 'v1').message).toBe('Hace ruido.\n¿Es grave?');
  });
});

describe('the switch', () => {
  it('offers «Estimar precio» then «Chat de Seibi», and Estimados opens on the first', () => {
    expect(modeOptions(t)).toEqual([
      { value: 'estimate', label: 'Estimar precio' },
      { value: 'chat', label: 'Chat de Seibi' },
    ]);
    expect(ESTIMATES_MODE).toBe('estimate');
  });
});

describe('starters', () => {
  it('suggests everyday questions to someone who knows little about cars', () => {
    for (const level of [null, 'none', 'basic'] as const) {
      expect(starters(level, t)).toEqual([
        '¿Qué pasa si no cambio el aceite a tiempo?',
        'Hace un ruido al frenar, ¿es grave?',
        '¿Qué le debo pedir al mecánico en mi próximo Servicio?',
      ]);
    }
  });

  it('suggests specific questions to someone at ease with maintenance', () => {
    for (const level of ['intermediate', 'advanced'] as const) {
      expect(starters(level, t)).toEqual([
        '¿Qué aceite y cuántos litros lleva mi motor?',
        '¿Cuándo toca la banda de distribución en mi modelo?',
        '¿Pastillas cerámicas o semimetálicas para mi uso?',
      ]);
    }
  });
});

const message = (role: ChatMessage['role'], content: string, sources: ChatMessage['sources'] = []): ChatMessage => ({
  id: 'm',
  role,
  content,
  sources,
  createdAt: '2026-11-17T21:00:00Z',
  vehicleId: 'v1',
});

describe('bubbles', () => {
  const sources = [1, 2, 3, 4].map((n) => ({ title: `Fuente ${n}`, url: `https://example.com/${n}` }));

  it('shows the person\'s own words as typed, links and all', () => {
    expect(bubbleText(message('user', 'Vi esto: https://example.com/foro'))).toBe('Vi esto: https://example.com/foro');
  });

  it('shows an answer without the links and URLs the AI left in it (they are in its sources)', () => {
    expect(bubbleText(message('assistant', 'Revisa el [manual](https://example.com/m) del Yaris.'))).toBe('Revisa el manual del Yaris.');
  });

  it('lists at most three of an answer\'s sources, and none under a question', () => {
    expect(bubbleSources(message('assistant', 'x', sources)).map((s) => s.title)).toEqual(['Fuente 1', 'Fuente 2', 'Fuente 3']);
    expect(bubbleSources(message('user', 'x', sources))).toEqual([]);
  });
});

describe('replySpoken', () => {
  it('reads the answer out when it arrives, saying it is Seibi\'s', () => {
    expect(replySpoken(message('assistant', 'Cada [5,000 km](https://example.com).'), t)).toBe('Seibi respondió: Cada 5,000 km.');
  });
});
