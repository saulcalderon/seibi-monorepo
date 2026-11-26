import { describe, expect, it } from 'vitest';

import { chronological, replyMessages, withReply, type ChatMessage } from './messages';

const row = (id: string, role: 'user' | 'assistant', createdAt: string, sources: { title: string; url: string }[] = []) => ({
  id,
  role,
  content: `${role} ${id}`,
  sources,
  created_at: createdAt,
  vehicle_id: 'v1',
});

describe('chronological', () => {
  it('turns the newest-first page the history query reads into the thread, oldest first', () => {
    const page = [row('4', 'assistant', '2026-11-17T10:00:01Z'), row('3', 'user', '2026-11-17T10:00:00Z'), row('2', 'assistant', '2026-11-16T09:00:01Z')];
    expect(chronological(page).map((m) => m.id)).toEqual(['2', '3', '4']);
  });

  it('reads a row into a message: role, words, sources, day and Vehicle', () => {
    const [message] = chronological([row('1', 'assistant', '2026-11-17T10:00:01Z', [{ title: 'Manual Yaris', url: 'https://example.com/yaris' }])]);
    expect(message).toEqual<ChatMessage>({
      id: '1',
      role: 'assistant',
      content: 'assistant 1',
      sources: [{ title: 'Manual Yaris', url: 'https://example.com/yaris' }],
      createdAt: '2026-11-17T10:00:01Z',
      vehicleId: 'v1',
    });
  });
});

describe('withReply', () => {
  const thread = chronological([row('2', 'assistant', '2026-11-16T09:00:01Z'), row('1', 'user', '2026-11-16T09:00:00Z')]);
  const reply = chronological([row('4', 'assistant', '2026-11-17T10:00:01Z'), row('3', 'user', '2026-11-17T10:00:00Z')]);

  it('adds the question and its answer the function saved after the thread', () => {
    expect(withReply(thread, reply).map((m) => m.id)).toEqual(['1', '2', '3', '4']);
  });

  it('starts the thread when there was none yet', () => {
    expect(withReply(undefined, reply).map((m) => m.id)).toEqual(['3', '4']);
  });

  it('does not repeat messages a refetch already brought', () => {
    expect(withReply([...thread, ...reply], reply).map((m) => m.id)).toEqual(['1', '2', '3', '4']);
  });
});

describe('replyMessages', () => {
  it('puts the question before the answer, by when the function saved them, whatever order they came back in', () => {
    // Postgres answers in its own format: the question is saved a millisecond before the answer.
    const saved = [row('b', 'assistant', '2026-11-17T10:00:00+00:00'), row('a', 'user', '2026-11-17T09:59:59.999+00:00')];
    expect(replyMessages(saved).map((m) => m.role)).toEqual(['user', 'assistant']);
  });
});
