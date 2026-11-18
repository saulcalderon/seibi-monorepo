// Maestro runScript (invoice.yaml, at the start): removes what an earlier
// `invoice` run left on the test account — Services whose notes are
// «verify SEI-67», withdrawn the way the app withdraws one (deleted_at), and
// the invoice files in their folders of the `service-invoices` bucket. A
// finished run leaves its Service (with no invoice) for the read-only proof
// query; the next run clears it here. GraalJsHttp has no PATCH, so each
// Service's full row is read and PUT back with deleted_at set. Only ever
// points at SUPABASE_URL, which verify.sh's doctor has checked is seibi-dev.
if (!/^https:\/\/blirxlxmmrhafomkykmr\.supabase\.co$/.test(SUPABASE_URL)) {
  throw new Error('cleanup-sei67.js only runs against seibi-dev, got ' + SUPABASE_URL);
}

const signIn = http.post(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
  headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
});
if (!signIn.ok) throw new Error('test account sign-in failed: HTTP ' + signIn.status);
const session = json(signIn.body);
const auth = {
  apikey: SUPABASE_KEY,
  Authorization: 'Bearer ' + session.access_token,
  'Content-Type': 'application/json',
};

const found = http.get(SUPABASE_URL + '/rest/v1/services?select=*&notes=eq.verify%20SEI-67&deleted_at=is.null', { headers: auth });
if (!found.ok) throw new Error('reading the verify SEI-67 Services failed: HTTP ' + found.status);
const services = json(found.body);
let files = 0;
for (const service of services) {
  // Its folder in the bucket: <user id>/<service id>/ (src/data/service/invoice.ts).
  const listed = http.post(SUPABASE_URL + '/storage/v1/object/list/service-invoices', {
    headers: auth,
    body: JSON.stringify({ prefix: session.user.id + '/' + service.id + '/', limit: 100 }),
  });
  if (!listed.ok) throw new Error('listing the invoices of ' + service.id + ' failed: HTTP ' + listed.status);
  const paths = json(listed.body).map((file) => session.user.id + '/' + service.id + '/' + file.name);
  if (paths.length > 0) {
    const removed = http.delete(SUPABASE_URL + '/storage/v1/object/service-invoices', { headers: auth, body: JSON.stringify({ prefixes: paths }) });
    if (!removed.ok) throw new Error('deleting the invoices of ' + service.id + ' failed: HTTP ' + removed.status);
    files += paths.length;
  }
  service.deleted_at = new Date().toISOString();
  const withdrawn = http.put(SUPABASE_URL + '/rest/v1/services?id=eq.' + service.id, { headers: auth, body: JSON.stringify(service) });
  if (!withdrawn.ok) throw new Error('withdrawing the verify SEI-67 Service ' + service.id + ' failed: HTTP ' + withdrawn.status);
}

output.cleaned = services.length + ' Services withdrawn, ' + files + ' invoice files deleted';
