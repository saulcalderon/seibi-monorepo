/** NHTSA vPIC's catalog of makes and models, the same for everyone. */
export const vpicKeys = {
  all: ['vpic'] as const,
  makes: () => ['vpic', 'makes'] as const,
  /** The brand as typed in the form; one entry however it is capitalised. */
  models: (make: string, year: number) => ['vpic', 'models', make.trim().toLowerCase(), year] as const,
};
