import { vehicleLinkTarget } from '@/shell/links';

/**
 * Links from outside the app (`seibi-dev://vehicle/<id>`, a notification
 * later) before the router reads them. A Vehicle opens in Mi flota, where a
 * person would have found it, with the list under it. Everything else,
 * the dev client's own links included, passes through unchanged. The
 * routes stay inside the signed-in group: signed out, the link lands on
 * sign-in.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  return vehicleLinkTarget(path) ?? path;
}
