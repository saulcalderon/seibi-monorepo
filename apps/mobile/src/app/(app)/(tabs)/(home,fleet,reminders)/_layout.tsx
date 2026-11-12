import { useTranslation } from 'react-i18next';

import { TabStack } from '@/shell/tab-stack';

/**
 * A Vehicle or Perfil opened from a link still has its tab's first screen
 * under it, so there is always a way back (Paradero's pattern). Keys are the
 * groups without parentheses; the bare `anchor` is Inicio's.
 */
export const unstable_settings = {
  anchor: 'index',
  fleet: { anchor: 'fleet' },
  reminders: { anchor: 'reminders' },
};

/**
 * One folder, three stacks: Expo Router gives each group in the name its own
 * copy of these routes, so every tab has its own stack and a detail screen
 * opens inside the tab you are in, under its tab bar. Paradero learned this
 * the hard way: detail screens as top-level routes hid the bar (its commit
 * dbf4fc5).
 */
export default function TabStackLayout({ segment }: { segment: string }) {
  const { t } = useTranslation();
  if (segment === '(fleet)') return <TabStack root="fleet" title={t('tabs.fleet')} />;
  if (segment === '(reminders)') return <TabStack root="reminders" title={t('tabs.reminders')} />;
  return <TabStack root="index" title={t('tabs.home')} />;
}
