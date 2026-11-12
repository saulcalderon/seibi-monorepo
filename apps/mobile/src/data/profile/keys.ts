export const profileKeys = {
  all: ['profile'] as const,
  user: (userId: string) => ['profile', userId] as const,
};
