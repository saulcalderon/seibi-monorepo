// Maestro runScript (appointments.yaml, before and after;
// appointments-cleanup.yaml): cancels every open Appointment an
// `appointments` run left on the test account — those whose notes start
// «verify SEI-68» — the way the app cancels one (`canceled_at`; RLS has no
// delete on `appointments`), so each run starts with none of its own in
// Avisos or the Vehicle detail. GraalJsHttp has no PATCH, so each row is
// read and PUT back whole. Only ever points at SUPABASE_URL, which
// verify.sh's doctor has checked is seibi-dev.
if (!/^https:\/\/blirxlxmmrhafomkykmr\.supabase\.co$/.test(SUPABASE_URL)) {
  throw new Error('cleanup-sei68.js only runs against seibi-dev, got ' + SUPABASE_URL);
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

const found = http.get(SUPABASE_URL + '/rest/v1/appointments?select=*&notes=like.verify%20SEI-68*&canceled_at=is.null', { headers: auth });
if (!found.ok) throw new Error('reading the verify SEI-68 Appointments failed: HTTP ' + found.status);
const appointments = json(found.body);
for (const appointment of appointments) {
  appointment.canceled_at = new Date().toISOString();
  const canceled = http.put(SUPABASE_URL + '/rest/v1/appointments?id=eq.' + appointment.id, { headers: auth, body: JSON.stringify(appointment) });
  if (!canceled.ok) throw new Error('canceling the verify SEI-68 Appointment ' + appointment.id + ' failed: HTTP ' + canceled.status);
}

output.cleaned = appointments.length + ' Appointments canceled';
