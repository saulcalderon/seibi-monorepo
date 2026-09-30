/**
 * Drops Markdown links and bare URLs from AI-written text. Mirrors
 * plainText() in the Edge Functions, for rows saved before that existed.
 */
export function plainText(text: string | null | undefined): string {
  return (text ?? '')
    .replace(/\s*\(\[[^\]]*\]\(https?:[^)]*\)\)/g, '')
    .replace(/\[([^\]]+)\]\(https?:[^)]*\)/g, '$1')
    .replace(/\s*\(?https?:\/\/[^\s)]*[^\s).,;]\)?/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+([.,;])/g, '$1')
    .trim()
}
