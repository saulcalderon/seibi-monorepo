import * as WebBrowser from 'expo-web-browser';

/**
 * Seibi's Terms and Privacy Policy: the PWA's public pages (`/legal/terminos`,
 * `/legal/privacidad`), open without a session. One copy of the text, so the
 * native app links to them instead of carrying its own. Perfil (S11) links
 * here too.
 */
export const LEGAL_URLS = {
  terms: 'https://seibiapp.com/legal/terminos',
  privacy: 'https://seibiapp.com/legal/privacidad',
} as const;

export type LegalDocument = keyof typeof LEGAL_URLS;

/**
 * Opens a legal page in the system's in-app browser (SFSafariViewController on
 * iOS, a Custom Tab on Android): the person stays in Seibi and closes it to
 * come back where they were.
 */
export async function openLegal(document: LegalDocument, tint?: string): Promise<void> {
  await WebBrowser.openBrowserAsync(LEGAL_URLS[document], {
    controlsColor: tint,
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
  });
}
