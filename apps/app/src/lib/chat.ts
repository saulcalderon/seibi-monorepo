import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthSession } from './authSession'
import { invokeFunction } from './functions'
import { supabase } from './supabase'

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources: Array<{ title: string; url: string }>
  createdAt: string
  vehicleId: string | null
}

function chatKey(userId: string) {
  return ['chat', userId] as const
}

type Row = {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources: unknown
  created_at: string
  vehicle_id: string | null
}

function toMessage(r: Row): ChatMessage {
  return {
    id: r.id,
    role: r.role,
    content: r.content,
    sources: Array.isArray(r.sources) ? (r.sources as ChatMessage['sources']) : [],
    createdAt: r.created_at,
    vehicleId: r.vehicle_id,
  }
}

export function useChat() {
  const { user } = useAuthSession()
  return useQuery({
    queryKey: chatKey(user?.id ?? 'signed-out'),
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id, role, content, sources, created_at, vehicle_id')
        .order('created_at', { ascending: true })
        .limit(100)
      if (error) throw error
      return (data ?? []).map((r) => toMessage(r as Row))
    },
  })
}

export function useSendChat() {
  const { user } = useAuthSession()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { message: string; vehicleId: string | null }) =>
      invokeFunction<{ messages: Row[] }>('chat', input),
    onSuccess: (data) => {
      if (!user) return
      queryClient.setQueryData<ChatMessage[]>(chatKey(user.id), (current) => [
        ...(current ?? []),
        ...data.messages.map(toMessage),
      ])
    },
  })
}
