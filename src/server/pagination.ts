/** Page-based pagination for admin and account lists. Fetches one extra row to know if there's a next page. */

export const PAGE_SIZE = 50;

export type PageRequest = { page: number; size: number; limit: number; offset: number };
export type Paged<T> = { rows: T[]; page: number; hasNext: boolean };

/** Reads `?page=` safely: anything odd becomes page 1, and very large values are capped. */
export function parsePage(value: string | string[] | undefined): number {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(n) && n >= 1 ? Math.min(n, 10_000) : 1;
}

export function pageRequest(page = 1, size = PAGE_SIZE): PageRequest {
  const p = Number.isInteger(page) && page >= 1 ? page : 1;
  return { page: p, size, limit: size + 1, offset: (p - 1) * size };
}

export function toPaged<T>(rows: T[], request: PageRequest): Paged<T> {
  return { rows: rows.slice(0, request.size), page: request.page, hasNext: rows.length > request.size };
}
