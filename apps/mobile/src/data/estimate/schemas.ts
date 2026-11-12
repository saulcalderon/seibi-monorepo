import { z } from 'zod';

const usdRange = z.object({ min: z.number(), max: z.number() }).nullable();

const source = z.object({ title: z.string(), url: z.string() });

/** One Estimate as the `estimates` Edge Function stores it (`estimates.result`). */
export const estimateResult = z.object({
  found: z.boolean(),
  title: z.string(),
  summary: z.string(),
  parts_economy: usdRange,
  parts_oem: usdRange,
  labor: usdRange,
  total_independent: usdRange,
  total_dealership: usdRange,
  includes: z.array(z.string()),
  factors: z.array(z.string()),
  confidence: z.enum(['low', 'medium', 'high']),
  sources: z.array(source),
});

/** The `estimates` Edge Function's answer. */
export const estimateResponse = z.object({
  id: z.string(),
  query: z.string(),
  taskCode: z.string().nullable(),
  city: z.string(),
  country: z.enum(['SV', 'US']),
  createdAt: z.string(),
  result: estimateResult,
});

export type UsdRange = z.infer<typeof usdRange>;
export type EstimateResult = z.infer<typeof estimateResult>;
export type EstimateResponse = z.infer<typeof estimateResponse>;
