import { Correction } from './analysis.models';

export interface PlainSegment {
  kind: 'text';
  text: string;
}

export interface CorrectionSegment {
  kind: 'correction';
  /** The original fragment, exactly as it appears in the text. */
  text: string;
  /** Identifies the correction across renders (its id, or its position in the API's list). */
  key: string;
  correction: Correction;
}

export type Segment = PlainSegment | CorrectionSegment;

/** A correction's stable key: the saved id, or `c<index>` for the anonymous demo. */
export function correctionKey(correction: Correction, index: number): string {
  return correction.id ?? `c${index}`;
}

/**
 * For each code point index, the UTF-16 index where it starts (one extra entry for the end).
 *
 * "😀" is ONE code point but TWO UTF-16 units, so after an emoji every code-point offset from the API
 * is one lower than the matching JavaScript string index. Converting once here keeps that detail out
 * of every component.
 */
function codePointToUtf16(text: string): number[] {
  const offsets = [0];
  let unit = 0;
  for (const codePoint of text) {
    // for...of walks code points; a character outside the BMP is 2 UTF-16 units long
    unit += codePoint.length;
    offsets.push(unit);
  }
  return offsets;
}

/**
 * Splits `text` into plain and corrected parts, in text order, ready to render with `@for`.
 *
 * Defensive on purpose: corrections that are out of range, empty or that overlap an earlier one are
 * skipped instead of throwing (the API already guarantees they are valid and disjoint, but a wrong
 * highlight is better than a broken page). The pieces always join back into the original text.
 */
export function buildSegments(text: string, corrections: readonly Correction[]): Segment[] {
  const utf16 = codePointToUtf16(text);
  const codePointCount = utf16.length - 1;

  const usable = corrections
    .map((correction, index) => ({ correction, index }))
    .filter(
      ({ correction: c }) =>
        Number.isInteger(c.start) &&
        Number.isInteger(c.end) &&
        c.start >= 0 &&
        c.end <= codePointCount &&
        c.start < c.end,
    )
    .sort((a, b) => a.correction.start - b.correction.start || a.correction.end - b.correction.end);

  const segments: Segment[] = [];
  let cursor = 0; // UTF-16 index up to which the text has been emitted
  let lastEnd = 0; // code point index where the previous correction ended

  for (const { correction, index } of usable) {
    if (correction.start < lastEnd) {
      continue; // overlaps the previous one
    }
    const from = utf16[correction.start];
    const to = utf16[correction.end];
    if (from > cursor) {
      segments.push({ kind: 'text', text: text.slice(cursor, from) });
    }
    segments.push({
      kind: 'correction',
      text: text.slice(from, to),
      key: correctionKey(correction, index),
      correction,
    });
    cursor = to;
    lastEnd = correction.end;
  }

  if (cursor < text.length) {
    segments.push({ kind: 'text', text: text.slice(cursor) });
  }
  return segments;
}

/** The text with only the chosen corrections applied (by key); the rest keep their original wording. */
export function applyCorrections(
  segments: readonly Segment[],
  applied: ReadonlySet<string>,
): string {
  return segments
    .map((segment) =>
      segment.kind === 'correction' && applied.has(segment.key)
        ? segment.correction.suggestion
        : segment.text,
    )
    .join('');
}
