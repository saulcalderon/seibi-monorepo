import { z } from 'zod';

const source = z.object({ title: z.string(), url: z.string() });

/** One saved message, as the `chat` Edge Function returns it and `chat_messages` stores it. */
export const chatRow = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  sources: z.array(source),
  created_at: z.string(),
  vehicle_id: z.string().nullable(),
});

/**
 * A row read back from `chat_messages`. `sources` is JSON the Edge Function
 * wrote: one that doesn't parse shows the answer with no sources, as the PWA
 * did, rather than hiding the message from the thread.
 */
export const storedChatRow = chatRow.extend({ sources: z.array(source).catch([]) });

/** The `chat` Edge Function's answer: the question and the reply it saved, in that order. */
export const chatResponse = z.object({ messages: z.array(chatRow) });

export type ChatRow = z.infer<typeof chatRow>;
export type ChatResponse = z.infer<typeof chatResponse>;
