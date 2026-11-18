/** The person's thread with Seibi (Estimados → Chat de Seibi). */
export const chatKeys = {
  all: ['chat'] as const,
  user: (userId: string) => ['chat', userId] as const,
};
