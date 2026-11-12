// Hand-written Reminders (stored) and the per-task state of derived ones
// (`reminder_states`: «No sé», snoozes, a remembered last time). Derived
// Reminders themselves are computed by the engine, never stored.
import { supabase } from '@/lib/supabase';

import { InputError } from '../errors';
import { useGarageMutation } from '../garage/use-garage';
import { isDay } from '../service/rules';
import { trimmedOrNull } from '../vehicle/rules';

export type ManualReminderInput = {
  /** Set when editing. */
  id?: string;
  vehicleId: string;
  title: string;
  dueOn: string;
  notes: string | null;
};

export function validateManualReminder(input: ManualReminderInput) {
  if (!input.title.trim()) throw new InputError('title', 'reminder_title_required');
  if (!isDay(input.dueOn)) throw new InputError('dueOn', 'date_required');
}

export function useSaveManualReminder() {
  return useGarageMutation(async (input: ManualReminderInput) => {
    validateManualReminder(input);
    const row = {
      vehicle_id: input.vehicleId,
      title: input.title.trim(),
      due_on: input.dueOn,
      notes: trimmedOrNull(input.notes),
    };
    const { error } = input.id
      ? await supabase.from('reminders').update(row).eq('id', input.id)
      : await supabase.from('reminders').insert(row);
    if (error) throw error;
  });
}

export function useCompleteManualReminder() {
  return useGarageMutation(async ({ id, done }: { id: string; done: boolean }) => {
    const { error } = await supabase
      .from('reminders')
      .update({ done_at: done ? new Date().toISOString() : null })
      .eq('id', id);
    if (error) throw error;
  });
}

export function useDeleteManualReminder() {
  return useGarageMutation(async (id: string) => {
    const { error } = await supabase.from('reminders').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  });
}

export type ReminderStatePatch = {
  last_unknown?: boolean;
  snoozed_until?: string | null;
  remembered_on?: string | null;
  remembered_reading?: number | null;
};

/** «No sé», a snooze, or a remembered last time for one task on one Vehicle. */
export function useReminderState() {
  return useGarageMutation(
    async ({ vehicleId, taskCode, patch }: { vehicleId: string; taskCode: string; patch: ReminderStatePatch }) => {
      const { error } = await supabase
        .from('reminder_states')
        .upsert({ vehicle_id: vehicleId, task_code: taskCode, ...patch }, { onConflict: 'vehicle_id,task_code' });
      if (error) throw error;
    },
  );
}

export type RememberedTask = {
  taskCode: string;
  rememberedOn: string | null;
  reading: number | null;
  /** The person doesn't know when it was last done. */
  unknown: boolean;
};

/**
 * The remembered last time for several tasks at once (Onboarding, «¿Cuándo
 * fue?»). Not a Service and no Mileage reading (CONTEXT.md → Reminder).
 * The caller refetches the garage.
 */
export async function rememberTasks(vehicleId: string, answers: RememberedTask[]) {
  if (answers.length === 0) return;
  const { error } = await supabase.from('reminder_states').upsert(
    answers.map((a) => ({
      vehicle_id: vehicleId,
      task_code: a.taskCode,
      last_unknown: a.unknown,
      remembered_on: a.unknown ? null : a.rememberedOn,
      remembered_reading: a.unknown ? null : a.reading,
    })),
    { onConflict: 'vehicle_id,task_code' },
  );
  if (error) throw error;
}
