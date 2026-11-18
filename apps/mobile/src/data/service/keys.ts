export const invoiceKeys = {
  all: ['invoice'] as const,
  /** A signed link to one invoice. Its path starts with the owner's user id. */
  url: (path: string) => ['invoice', 'url', path] as const,
};
