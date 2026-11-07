## Agent skills

### Issue tracker

Issues and PRDs are tracked in Linear (team Seibi, project App móvil Seibi) via the Linear MCP. All Linear content is written in Spanish. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. Glossary and
schema are English; Linear and UI use the Spanish names in ADR-0002. See
`docs/agents/domain.md`.

### Mobile app skills (Expo / React Native)

Installed from `expo/skills`, `emilkowalski/skills` and `Appllama/appllama-skills` (see `skills-lock.json`). Each source has one job:

- **Appllama, design direction:** `appllama-app-design-skill` sets the bar a screen must meet before it ships: HIG fidelity, navigation semantics, motion, simulator check.
- **Expo, best practices:** start every Expo/EAS task with `expo-overview`. It routes to `expo-router`, `expo-native-ui`, `expo-ui`, `expo-design-system`, `expo-data-fetching`, `expo-web-to-native` and the `eas-*` skills.
- **Emil Kowalski, animation and craft:** `expo-animation` builds motion. It is Emil's `animate-expo`, maintained by Expo. `choreograph`, `find-animation-opportunities`, `improve-animations`, `remove-animations`, `apple-design` and `break-ui` review and refine.

Seibi decisions win over skill defaults:

- **Styling is Unistyles 3.** Where a skill says inline styles, `StyleSheet.create` from `react-native`, NativeWind or Tailwind, use Unistyles' `StyleSheet.create` with theme tokens.
- **Native first.** Prefer system UI and native SDKs, `@expo/ui` included, over web-style or JS-only versions.
- **No local Supabase.** Use the hosted dev project; never run `supabase start`.
