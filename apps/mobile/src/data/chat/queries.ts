import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { supabase } from '@/lib/supabase';

import { parseResponse } from '../errors';
import { invokeFunction } from '../functions';
import { useUserId } from '../user';

import { chatKeys } from './keys';
import { chronological, replyMessages, withReply, type ChatMessage } from './messages';
import { chatResponse, storedChatRow } from './schemas';

/** How many messages the thread shows: the latest 100, as many as the PWA read. */
const THREAD_LIMIT = 100;

async function fetchThread(): Promise<ChatMessage[]> {
  // Newest first, so the thread is the latest 100 (the PWA read the oldest 100, so a long thread stopped growing).
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, role, content, sources, created_at, vehicle_id')
    .order('created_at', { ascending: false })
    .limit(THREAD_LIMIT);
  if (error) throw error;
  return chronological(parseResponse('chat_messages', z.array(storedChatRow), data ?? []));
}

/** The person's thread with Seibi, oldest first. One thread for every Vehicle, as in the PWA. */
export function useChat() {
  const userId = useUserId();
  return useQuery({
    queryKey: chatKeys.user(userId ?? 'signed-out'),
    queryFn: fetchThread,
    enabled: userId !== null,
  });
}

/**
 * Sends a question to the `chat` Edge Function, which answers about the
 * person's Vehicle and saves both messages; they join the thread's end. Each
 * question spends one of the day's AI calls (`ai_limit` at the limit, shared
 * with Estimados).
 */
export function useSendChat() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { message: string; vehicleId: string }) => invokeFunction('chat', input, chatResponse),
    onSuccess: (data) => {
      if (!userId) return;
      queryClient.setQueryData<ChatMessage[]>(chatKeys.user(userId), (thread) => withReply(thread, replyMessages(data.messages)));
    },
  });
}
