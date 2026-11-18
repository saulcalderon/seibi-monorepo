// Maestro runScript (invoice.yaml): reads the run's Service the way another
// device would — the PWA, say — under the test account's own RLS, and checks
// its invoice. Read-only: a sign-in, a SELECT, and a signed link fetched like
// the PWA's «Factura» (lib/mutations.ts invoiceUrl at 6e3b818).
//   EXPECT=photo  the Service points at <user id>/<service id>/factura-<ms>.jpg
//                 and that link serves a JPEG;
//   EXPECT=none   the Service has no invoice, and the file it pointed at
//                 (PREVIOUS, from the photo check) is gone from the bucket.
// Only ever points at SUPABASE_URL, which verify.sh's doctor has checked is
// seibi-dev.
if (!/^https:\/\/blirxlxmmrhafomkykmr\.supabase\.co$/.test(SUPABASE_URL)) {
  throw new Error('invoice-check.js only runs against seibi-dev, got ' + SUPABASE_URL);
}

const signIn = http.post(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
  headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
});
if (!signIn.ok) throw new Error('test account sign-in failed: HTTP ' + signIn.status);
const session = json(signIn.body);
const auth = { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' };

const found = http.get(SUPABASE_URL + '/rest/v1/services?select=id,invoice_path&notes=eq.verify%20SEI-67&deleted_at=is.null', { headers: auth });
if (!found.ok) throw new Error('reading the verify SEI-67 Service failed: HTTP ' + found.status);
const services = json(found.body);
if (services.length !== 1) throw new Error('expected one verify SEI-67 Service, found ' + services.length);
const service = services[0];

function sign(path) {
  return http.post(SUPABASE_URL + '/storage/v1/object/sign/service-invoices/' + path, { headers: auth, body: JSON.stringify({ expiresIn: 60 }) });
}

if (EXPECT === 'photo') {
  const pattern = new RegExp('^' + session.user.id + '/' + service.id + '/factura-[0-9]+\\.jpg$');
  if (!pattern.test(service.invoice_path || '')) throw new Error('unexpected invoice_path: ' + service.invoice_path);
  const signed = sign(service.invoice_path);
  if (!signed.ok) throw new Error('signing the invoice failed: HTTP ' + signed.status);
  const file = http.get(SUPABASE_URL + '/storage/v1' + json(signed.body).signedURL);
  if (!file.ok) throw new Error('downloading the invoice failed: HTTP ' + file.status);
  output.invoicePath = service.invoice_path;
  output.serviceId = service.id;
} else if (EXPECT === 'none') {
  if (service.invoice_path !== null) throw new Error('the Service still has an invoice: ' + service.invoice_path);
  if (PREVIOUS && sign(PREVIOUS).ok) throw new Error('the removed invoice is still in the bucket: ' + PREVIOUS);
} else {
  throw new Error('EXPECT must be photo or none, got ' + EXPECT);
}
