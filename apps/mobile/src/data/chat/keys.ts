/** The person's thread with Seibi (Estimados → Chat de Seibi). */
export const chatKeys = {
  all: ['chat'] as const,
  user: (userId: string) => ['chat', userId] as const,
  /** The question on its way (a mutation key), so a screen that mounts again still sees it. */
  send: ['chat', 'send'] as const,
};
