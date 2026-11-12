import { useAuth } from '@/auth/session';
import { supabase } from '@/lib/supabase';

import { InputError } from './errors';

/** The signed-in person's id, or null. Queries for the person wait for it. */
export function useUserId(): string | null {
  const auth = useAuth();
  return auth.status === 'signed-in' ? auth.session.user.id : null;
}

/** For writes: the session's user id, or the «sesión expiró» error. */
export async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new InputError('session', 'session_expired');
  return id;
}
