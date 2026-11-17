// Maestro runScript (account-deleted-elsewhere.yaml): deletes the seibi-dev
// test account the way another device would, with a session of its own and
// the delete-account Edge Function. Only ever points at SUPABASE_URL, which
// verify.sh's doctor has checked is seibi-dev.
if (!/^https:\/\/blirxlxmmrhafomkykmr\.supabase\.co$/.test(SUPABASE_URL)) {
  throw new Error('delete-test-account.js only runs against seibi-dev, got ' + SUPABASE_URL);
}

const signIn = http.post(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
  headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
});
if (!signIn.ok) throw new Error('test account sign-in failed: HTTP ' + signIn.status);

const deleted = http.post(SUPABASE_URL + '/functions/v1/delete-account', {
  headers: {
    apikey: SUPABASE_KEY,
    Authorization: 'Bearer ' + json(signIn.body).access_token,
    'Content-Type': 'application/json',
  },
  body: '{}',
});
if (!deleted.ok) throw new Error('delete-account failed: HTTP ' + deleted.status);
output.deleted = json(deleted.body).deleted;
