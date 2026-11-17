// Maestro runScript (vehicle-detail-cleanup.yaml): removes what a failed
// `vehicle-detail` run left on the test account — Services whose notes are
// «verify SEI-61» (soft-deleted, the way the app withdraws) and Routines
// whose name starts «verify SEI-61» (deleted). Only ever points at
// SUPABASE_URL, which verify.sh's doctor has checked is seibi-dev.
if (!/^https:\/\/blirxlxmmrhafomkykmr\.supabase\.co$/.test(SUPABASE_URL)) {
  throw new Error('cleanup-sei61.js only runs against seibi-dev, got ' + SUPABASE_URL);
}

const signIn = http.post(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
  headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
});
if (!signIn.ok) throw new Error('test account sign-in failed: HTTP ' + signIn.status);
const auth = { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + json(signIn.body).access_token, 'Content-Type': 'application/json' };

const services = http.patch(SUPABASE_URL + '/rest/v1/services?notes=eq.verify%20SEI-61&deleted_at=is.null', {
  headers: auth,
  body: JSON.stringify({ deleted_at: new Date().toISOString() }),
});
if (!services.ok) throw new Error('withdrawing the verify SEI-61 Services failed: HTTP ' + services.status);

const routines = http.delete(SUPABASE_URL + '/rest/v1/routines?name=like.verify%20SEI-61*', {
  headers: auth,
});
if (!routines.ok) throw new Error('deleting the verify SEI-61 Routines failed: HTTP ' + routines.status);

output.cleaned = 'verify SEI-61 data removed';
