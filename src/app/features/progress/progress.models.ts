import { CefrLevel } from '../write/analysis.models';

export interface OverviewStats {
  texts_count: number;
  words_count: number;
  errors_per_100_words: number;
  /** Null until the user has analysed a text. */
  current_level: CefrLevel | null;
  streak_days: number;
}

/** One day that had at least one analysed text (the API omits days with none). */
export interface ProgressPoint {
  /** ISO date, e.g. "2026-09-22". */
  day: string;
  errors_per_100_words: number;
  word_count: number;
}

/** Always one row per category (see analysis.models.ts), zero-filled. */
export interface CategoryCount {
  category: string;
  count: number;
}

/** One of RULE_TAGS (see analysis.models.ts); looked up as `'rules.' + rule_tag`. */
export interface RuleCount {
  rule_tag: string;
  count: number;
}
