import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

import { INVOICE_BUCKET } from './invoice';
import { invoiceKeys } from './keys';

/** A link to the invoice that works for five minutes, as the PWA's. */
export async function invoiceUrl(path: string) {
  const { data, error } = await supabase.storage.from(INVOICE_BUCKET).createSignedUrl(path, 300);
  if (error) throw error;
  return data.signedUrl;
}

/**
 * A signed link to show an invoice (`null` path: none). Links last five
 * minutes, so one is reused for four and then asked for again.
 */
export function useInvoiceUrl(path: string | null) {
  return useQuery({
    queryKey: invoiceKeys.url(path ?? ''),
    queryFn: () => invoiceUrl(path ?? ''),
    enabled: Boolean(path),
    staleTime: 4 * 60_000,
    gcTime: 4 * 60_000,
  });
}
