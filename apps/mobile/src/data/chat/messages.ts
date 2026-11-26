// The thread's messages, from the rows the `chat` Edge Function saves (the
// PWA's lib/chat.ts as of 6e3b818). Plain functions, so they run in the unit
// tests.
import type { ChatRow } from './schemas';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: { title: string; url: string }[];
  createdAt: string;
  vehicleId: string | null;
};

function toMessage(row: ChatRow): ChatMessage {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    sources: row.sources,
    createdAt: row.created_at,
    vehicleId: row.vehicle_id,
  };
}

/** The thread, oldest first, from a page of rows read newest first. */
export function chronological(newestFirst: readonly ChatRow[]): ChatMessage[] {
  return newestFirst.map(toMessage).reverse();
}

/** The question and the answer the `chat` function saved, the question first (by when each was saved). */
export function replyMessages(saved: readonly ChatRow[]): ChatMessage[] {
  return saved.map(toMessage).sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

/**
 * The thread with the question and the reply the function just saved at its
 * end. A message already there (a refetch got it first) is not added twice.
 */
export function withReply(thread: readonly ChatMessage[] | undefined, saved: readonly ChatMessage[]): ChatMessage[] {
  const current = thread ?? [];
  const known = new Set(current.map((m) => m.id));
  return [...current, ...saved.filter((m) => !known.has(m.id))];
}
