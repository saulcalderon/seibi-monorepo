// Inicio drawn from sample Vehicles (SEI-59), in Seibi Dev only:
// `seibi-dev://garage-fixture` (two Vehicles) or `?case=empty`. As the data
// check: in any other variant this folds to `null`, Metro drops the require,
// and the (app) layout keeps the route closed (Stack.Protected).
const GarageFixtureScreen =
  process.env.EXPO_PUBLIC_APP_VARIANT === 'development'
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require('@/home/dev/garage-fixture') as typeof import('@/home/dev/garage-fixture')).GarageFixtureScreen
    : null;

export default function GarageFixtureRoute() {
  return GarageFixtureScreen ? <GarageFixtureScreen /> : null;
}
