// Maestro runScript (app-shell.yaml): reads the test account's first
// Vehicle the way another device would (read-only: a sign-in and a SELECT
// through Supabase's REST API under the account's own RLS), so the flow can
// open it by deep link. Only ever points at SUPABASE_URL, which verify.sh's
// doctor has checked is seibi-dev.
if (!/^https:\/\/blirxlxmmrhafomkykmr\.supabase\.co$/.test(SUPABASE_URL)) {
  throw new Error('first-vehicle.js only runs against seibi-dev, got ' + SUPABASE_URL);
}

const signIn = http.post(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
  headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
});
if (!signIn.ok) throw new Error('test account sign-in failed: HTTP ' + signIn.status);

const found = http.get(
  SUPABASE_URL + '/rest/v1/vehicles?select=id,brand,model&deleted_at=is.null&order=created_at.asc&limit=1',
  { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + json(signIn.body).access_token } },
);
if (!found.ok) throw new Error('reading the Vehicles failed: HTTP ' + found.status);
const vehicles = json(found.body);
if (vehicles.length === 0) throw new Error('the test account has no Vehicle: run the data-layer flow once to create it');
output.vehicleId = vehicles[0].id;
output.vehicleName = vehicles[0].brand + ' ' + vehicles[0].model;
