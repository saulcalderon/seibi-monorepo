import { z } from 'zod';

/** `delete-account`: 200 `{ deleted: true }` once the account and everything in it are gone. */
export const deleteAccountResponse = z.object({ deleted: z.literal(true) });
