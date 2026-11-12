/** The person's past Estimates (Estimados → past queries). */
export const estimateKeys = {
  all: ['estimates'] as const,
  user: (userId: string) => ['estimates', userId] as const,
};
