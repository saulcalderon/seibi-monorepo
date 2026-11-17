// Maestro runScript (first-run.yaml, first-run-skip.yaml): puts the test
// account back to before its first run, so the app opens the first-run
// questions on the next launch. It clears the profile fields those
// questions fill — display_name, knowledge_level, country, city — and
// onboarded_at, as on a new account. Vehicles, Routines and Reminders are
// not touched. A sign-in and a PATCH through Supabase's REST API under the
// account's own RLS (these columns are the ones `authenticated` may
// update). Only ever points at SUPABASE_URL, which verify.sh's doctor has
// checked is seibi-dev.
if (!/^https:\/\/blirxlxmmrhafomkykmr\.supabase\.co$/.test(SUPABASE_URL)) {
  throw new Error('reset-first-run.js only runs against seibi-dev, got ' + SUPABASE_URL);
}

const signIn = http.post(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
  headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
});
if (!signIn.ok) throw new Error('test account sign-in failed: HTTP ' + signIn.status);
const session = json(signIn.body);

// GraalJsHttp has no `patch`; `request` takes the method.
const reset = http.request(SUPABASE_URL + '/rest/v1/profiles?user_id=eq.' + session.user.id, {
  method: 'PATCH',
  headers: {
    apikey: SUPABASE_KEY,
    Authorization: 'Bearer ' + session.access_token,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  },
  body: JSON.stringify({ display_name: null, knowledge_level: null, country: null, city: null, onboarded_at: null }),
});
if (!reset.ok) throw new Error('resetting the first run failed: HTTP ' + reset.status);
const rows = json(reset.body);
if (rows.length !== 1 || rows[0].onboarded_at !== null) throw new Error('the test account has no profile to reset');
output.reset = 'first run reset';
