import { CefrLevel } from '../write/analysis.models';

/** Every level a text can be estimated at, in order (the history can be filtered by them). */
export const CEFR_LEVELS: readonly CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/** Texts per page: a multiple of 3, so the three-column grid of a wide screen fills its rows. */
export const HISTORY_PAGE_SIZE = 12;

/** A row of the history (`GET /texts`): no text body and no corrections. */
export interface TextSummary {
  id: string;
  title: string | null;
  cefr_level: CefrLevel;
  word_count: number;
  corrections_count: number;
  created_at: string;
}

/** One page of the history. `total` counts only the texts that match the filter. */
export interface TextPage {
  items: TextSummary[];
  page: number;
  page_size: number;
  total: number;
}

export function isCefrLevel(value: string | null): value is CefrLevel {
  return CEFR_LEVELS.includes(value as CefrLevel);
}

/** A page number from the address bar: anything that is not a positive whole number is page 1. */
export function parsePage(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
