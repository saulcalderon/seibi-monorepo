import { useRouter, type Href } from 'expo-router';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from '@/auth/session';
import type { Country } from '@/data/profile/countries';
import { useProfile } from '@/data/profile/queries';
import { knowledgeProfile, type KnowledgeLevel } from '@/lib/knowledge';
import { identityFromUser } from '@/shell/identity';

import { initialName, nextStep, stepPosition, type Step } from './flow';

/**
 * The answers so far, shared by the steps (each step is its own screen in
 * the first run's stack). They live as long as the questions are open; what
 * each step saves goes to Supabase when it is answered, as in the PWA.
 */
interface FirstRunState {
  name: string;
  setName: (name: string) => void;
  /** The self-assessment («¿Cuánto sabes de carros?»). */
  selfLevel: KnowledgeLevel | null;
  setSelfLevel: (level: KnowledgeLevel) => void;
  /** Whether each check question was answered right; going back and answering again replaces it. */
  picked: readonly boolean[];
  setPicked: (picked: boolean[]) => void;
  /** The saved Knowledge level, after the check questions or «Prefiero otro nivel». */
  level: KnowledgeLevel | null;
  setLevel: (level: KnowledgeLevel) => void;
  country: Country;
  setCountry: (country: Country) => void;
  city: string;
  setCity: (city: string) => void;
}

const FirstRunContext = createContext<FirstRunState | null>(null);

export function FirstRunProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const profile = useProfile();
  const fullName = auth.status === 'signed-in' ? identityFromUser(auth.session.user).fullName : null;

  const [name, setName] = useState(() => initialName(profile.data?.displayName, fullName));
  const [selfLevel, setSelfLevel] = useState<KnowledgeLevel | null>(null);
  const [picked, setPicked] = useState<readonly boolean[]>([]);
  const [level, setLevel] = useState<KnowledgeLevel | null>(null);
  const [country, setCountry] = useState<Country>(profile.data?.country ?? 'SV');
  const [city, setCity] = useState(profile.data?.city ?? '');

  const value = useMemo(
    () => ({ name, setName, selfLevel, setSelfLevel, picked, setPicked, level, setLevel, country, setCountry, city, setCity }),
    [name, selfLevel, picked, level, country, city],
  );
  return <FirstRunContext.Provider value={value}>{children}</FirstRunContext.Provider>;
}

export function useFirstRun() {
  const state = useContext(FirstRunContext);
  if (!state) throw new Error('useFirstRun outside the first run');
  return state;
}

/** Each step's screen in src/app/onboarding/. */
const STEP_HREF: Record<Step | 'done', Href> = {
  name: '/onboarding',
  level: '/onboarding/level',
  check: '/onboarding/check',
  result: '/onboarding/result',
  location: '/onboarding/location',
  vehicle: '/onboarding/vehicle',
  done: '/onboarding/done',
};

/** The step's place («Paso N de M») and a way to the next one, pushed so the system's back returns. */
export function useStep(step: Step) {
  const router = useRouter();
  const advance = useCallback(() => router.push(STEP_HREF[nextStep(step)]), [router, step]);
  return { ...stepPosition(step), advance };
}

/** Whether to explain more (the Knowledge level chosen so far, else the saved one): `knowledgeProfile().explain`. */
export function useExplain() {
  const { level } = useFirstRun();
  const profile = useProfile();
  return knowledgeProfile(level ?? profile.data?.knowledgeLevel).explain;
}
