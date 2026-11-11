import { z } from 'zod';

export const SEARCH_QUERY_MAX = 120;
export const SEARCH_DEFAULT_LIMIT = 30;

export const searchInput = z.object({
  query: z.string().trim().min(1, 'Type something to search for.').max(SEARCH_QUERY_MAX),
  limit: z.number().int().min(1).max(50).optional(),
});
export type SearchInput = z.infer<typeof searchInput>;
