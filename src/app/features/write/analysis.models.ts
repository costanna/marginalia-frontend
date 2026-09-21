import { SupportedLang } from '../../core/i18n/supported-languages';

export const CATEGORIES = ['grammar', 'spelling', 'vocabulary', 'punctuation', 'style'] as const;
export type Category = (typeof CATEGORIES)[number];

/** The closed list of rules the API can attach to a correction (`rule_tag`), used for statistics. */
export const RULE_TAGS = [
  'verb_tense',
  'subject_verb_agreement',
  'articles',
  'prepositions',
  'word_order',
  'plural_nouns',
  'pronouns',
  'modal_verbs',
  'conditionals',
  'passive_voice',
  'phrasal_verbs',
  'collocations',
  'false_friends',
  'spelling_common',
  'punctuation_commas',
  'capitalization',
  'register_formal',
  'run_on_sentence',
  'other',
] as const;

export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

/**
 * One correction of the analysed text.
 *
 * `start` and `end` are offsets in Unicode CODE POINTS (end-exclusive), as the API sends them.
 * JavaScript strings count UTF-16 units, so they cannot be used with `slice` directly: use
 * `buildSegments`, which converts them.
 */
export interface Correction {
  /** Present for saved analyses; the anonymous demo does not save, so it has no ids. */
  id?: string;
  start: number;
  end: number;
  original: string;
  suggestion: string;
  category: Category;
  rule_tag: string;
  explanation: string;
}

/** Result of `POST /texts/analyze` (saved) or `POST /demo/analyze` (not saved: no id, no date). */
export interface AnalysisResult {
  id?: string;
  title?: string | null;
  /** The cleaned text the offsets refer to (not necessarily what was typed). */
  original_text: string;
  corrected_text: string;
  cefr_level: CefrLevel;
  word_count: number;
  summary: string;
  ui_language: SupportedLang;
  created_at?: string;
  corrections: Correction[];
}

export interface AnalyzeRequest {
  text: string;
  title?: string | null;
  ui_language: SupportedLang;
}

/** Limits of the API (MAX_TEXT_CHARS defaults to 3000; the minimum is fixed). */
export const MIN_TEXT_CHARS = 20;
export const MAX_TEXT_CHARS = 3000;
export const MAX_TITLE_CHARS = 200;
