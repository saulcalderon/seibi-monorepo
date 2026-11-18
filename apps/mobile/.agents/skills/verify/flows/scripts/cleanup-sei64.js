// Maestro runScript (reminders.yaml, before and after; reminders-cleanup.yaml):
// removes what a `reminders` run leaves on the test account — hand-written
// Reminders whose title starts «verify SEI-64» (soft-deleted, the way the
// app deletes them), any snooze (`reminder_states.snoozed_until`, which only
// these flows set on the dedicated test account), and the flow's own answer
// to «¿Cuándo fue “Cambio de aceite”?» (the `engine_oil` state, deleted:
// the test Yaris has none otherwise) — so every run starts from the same
// Reminders. GraalJsHttp has no PATCH, so each row is read and PUT back
// whole. Only ever points at SUPABASE_URL, which
// verify.sh's doctor has checked is seibi-dev.
if (!/^https:\/\/blirxlxmmrhafomkykmr\.supabase\.co$/.test(SUPABASE_URL)) {
  throw new Error('cleanup-sei64.js only runs against seibi-dev, got ' + SUPABASE_URL);
}

const signIn = http.post(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
  headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
});
if (!signIn.ok) throw new Error('test account sign-in failed: HTTP ' + signIn.status);
const auth = {
  apikey: SUPABASE_KEY,
  Authorization: 'Bearer ' + json(signIn.body).access_token,
  'Content-Type': 'application/json',
};

const found = http.get(SUPABASE_URL + '/rest/v1/reminders?select=*&title=like.verify%20SEI-64*&deleted_at=is.null', { headers: auth });
if (!found.ok) throw new Error('reading the verify SEI-64 Reminders failed: HTTP ' + found.status);
const reminders = json(found.body);
for (const reminder of reminders) {
  reminder.deleted_at = new Date().toISOString();
  const removed = http.put(SUPABASE_URL + '/rest/v1/reminders?id=eq.' + reminder.id, { headers: auth, body: JSON.stringify(reminder) });
  if (!removed.ok) throw new Error('deleting the verify SEI-64 Reminder ' + reminder.id + ' failed: HTTP ' + removed.status);
}

const snoozed = http.get(SUPABASE_URL + '/rest/v1/reminder_states?select=*&snoozed_until=not.is.null', { headers: auth });
if (!snoozed.ok) throw new Error('reading the snoozed Reminders failed: HTTP ' + snoozed.status);
const states = json(snoozed.body);
for (const state of states) {
  state.snoozed_until = null;
  const restored = http.put(
    SUPABASE_URL + '/rest/v1/reminder_states?vehicle_id=eq.' + state.vehicle_id + '&task_code=eq.' + state.task_code,
    { headers: auth, body: JSON.stringify(state) },
  );
  if (!restored.ok) throw new Error('restoring the snoozed Reminder ' + state.task_code + ' failed: HTTP ' + restored.status);
}

const answered = http.delete(SUPABASE_URL + '/rest/v1/reminder_states?task_code=eq.engine_oil', { headers: auth, body: '{}' });
if (!answered.ok) throw new Error('deleting the engine_oil answer failed: HTTP ' + answered.status);

output.cleaned = reminders.length + ' Reminders deleted, ' + states.length + ' snoozes cleared, engine_oil answer removed';
