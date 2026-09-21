import { Correction } from './analysis.models';
import { Segment, applyCorrections, buildSegments, correctionKey } from './build-segments';

function fix(
  start: number,
  end: number,
  original: string,
  suggestion: string,
  id?: string,
): Correction {
  return {
    id,
    start,
    end,
    original,
    suggestion,
    category: 'grammar',
    rule_tag: 'other',
    explanation: 'because',
  };
}

const describe_ = (segments: Segment[]) =>
  segments.map((s) => (s.kind === 'text' ? `text:${s.text}` : `fix:${s.text}`));
const joined = (segments: Segment[]) => segments.map((s) => s.text).join('');

describe('buildSegments', () => {
  it('returns one plain segment when there are no corrections', () => {
    expect(describe_(buildSegments('Hello world', []))).toEqual(['text:Hello world']);
  });

  it('returns nothing for an empty text', () => {
    expect(buildSegments('', [])).toEqual([]);
  });

  it('splits around a correction in the middle', () => {
    const text = 'Yesterday I go to the cinema.';

    const segments = buildSegments(text, [fix(12, 14, 'go', 'went')]);

    expect(describe_(segments)).toEqual(['text:Yesterday I ', 'fix:go', 'text: to the cinema.']);
    expect(joined(segments)).toBe(text);
  });

  it('handles a correction at the very start', () => {
    const segments = buildSegments('teh book', [fix(0, 3, 'teh', 'the')]);

    expect(describe_(segments)).toEqual(['fix:teh', 'text: book']);
  });

  it('handles a correction at the very end', () => {
    const segments = buildSegments('I like teh', [fix(7, 10, 'teh', 'the')]);

    expect(describe_(segments)).toEqual(['text:I like ', 'fix:teh']);
  });

  it('handles a correction covering the whole text', () => {
    expect(describe_(buildSegments('teh', [fix(0, 3, 'teh', 'the')]))).toEqual(['fix:teh']);
  });

  it('keeps adjacent corrections separate, with no empty plain segment between them', () => {
    const segments = buildSegments('I has a apple', [
      fix(2, 5, 'has', 'have'),
      fix(5, 6, ' ', ' '),
    ]);

    expect(describe_(segments)).toEqual(['text:I ', 'fix:has', 'fix: ', 'text:a apple']);
  });

  it('orders corrections by position whatever the order they arrive in', () => {
    const text = 'I has teh book';
    const corrections = [fix(6, 9, 'teh', 'the'), fix(2, 5, 'has', 'have')];

    const segments = buildSegments(text, corrections);

    expect(describe_(segments)).toEqual(['text:I ', 'fix:has', 'text: ', 'fix:teh', 'text: book']);
  });

  it('gives keys that follow the API order, not the sorted order', () => {
    const corrections = [fix(6, 9, 'teh', 'the'), fix(2, 5, 'has', 'have')];

    const keys = buildSegments('I has teh book', corrections)
      .filter((s) => s.kind === 'correction')
      .map((s) => s.key);

    expect(keys).toEqual(['c1', 'c0']); // "has" was the second one sent, "teh" the first
  });

  it('uses the saved id as the key when there is one', () => {
    expect(correctionKey(fix(0, 1, 'a', 'b', 'abc-123'), 4)).toBe('abc-123');
    expect(correctionKey(fix(0, 1, 'a', 'b'), 4)).toBe('c4');
  });

  it('skips a correction that overlaps an earlier one', () => {
    const text = 'She dont likes it';
    const corrections = [fix(4, 14, 'dont likes', 'does not like'), fix(9, 14, 'likes', 'like')];

    const segments = buildSegments(text, corrections);

    expect(describe_(segments)).toEqual(['text:She ', 'fix:dont likes', 'text: it']);
  });

  it.each([
    ['negative start', fix(-1, 3, 'x', 'y')],
    ['end past the text', fix(2, 99, 'x', 'y')],
    ['empty range', fix(3, 3, 'x', 'y')],
    ['reversed range', fix(5, 2, 'x', 'y')],
    ['fractional offsets', fix(1.5, 3, 'x', 'y')],
  ])('ignores an invalid correction (%s) instead of throwing', (_name, correction) => {
    const text = 'Hello there';

    expect(describe_(buildSegments(text, [correction]))).toEqual([`text:${text}`]);
  });

  describe('Unicode', () => {
    it('converts code-point offsets to UTF-16: an emoji is one code point but two units', () => {
      // Python sees "😀😀 Yesterday I go home" with `go` at code points 15..17.
      const text = '😀😀 Yesterday I go home';
      const start = [...'😀😀 Yesterday I '].length;
      expect(start).toBe(15);
      expect(text.indexOf('go')).toBe(17); // the JavaScript index is 2 higher

      const segments = buildSegments(text, [fix(start, start + 2, 'go', 'went')]);

      expect(describe_(segments)).toEqual(['text:😀😀 Yesterday I ', 'fix:go', 'text: home']);
    });

    it('would cut the text in the wrong place if the offsets were used as they come', () => {
      const text = '😀😀 I go';
      const naive = text.slice(5, 7); // what a direct slice with code-point offsets gives

      expect(naive).not.toBe('go');
      const [, correction] = buildSegments(text, [fix(5, 7, 'go', 'went')]);
      expect(correction.text).toBe('go');
    });

    it('counts a multi-code-point emoji (a family) as several code points', () => {
      const family = '👨‍👩‍👧'; // 5 code points: man, ZWJ, woman, ZWJ, girl
      expect([...family]).toHaveLength(5);
      const text = `${family} I go`;
      const start = [...`${family} I `].length; // 8

      const segments = buildSegments(text, [fix(start, start + 2, 'go', 'went')]);

      expect(describe_(segments)).toEqual([`text:${family} I `, 'fix:go']);
    });

    it('works with accented letters and non-Latin scripts', () => {
      const text = 'Él dice que yo go a 你好 la escuela';
      const start = [...'Él dice que yo '].length;

      const segments = buildSegments(text, [fix(start, start + 2, 'go', 'went')]);

      expect(describe_(segments)).toEqual([
        'text:Él dice que yo ',
        'fix:go',
        'text: a 你好 la escuela',
      ]);
    });

    it('handles a correction that itself contains emoji', () => {
      const text = 'I love 😀😀 it';
      const start = [...'I love '].length;

      const segments = buildSegments(text, [fix(start, start + 2, '😀😀', '😀')]);

      expect(describe_(segments)).toEqual(['text:I love ', 'fix:😀😀', 'text: it']);
    });
  });

  it('always joins back into the original text (many pseudo-random cases)', () => {
    // A small deterministic generator, so the test is repeatable.
    let seed = 12345;
    const random = (max: number) => (seed = (seed * 1103515245 + 12345) % 2147483648) % max;
    const alphabet = ['a', 'b', ' ', 'é', '😀', '你', '.', '👨‍👩‍👧'];

    for (let round = 0; round < 200; round++) {
      const characters = Array.from(
        { length: 5 + random(40) },
        () => alphabet[random(alphabet.length)],
      );
      const text = characters.join('');
      const codePoints = [...text];
      const corrections: Correction[] = [];
      for (let k = 0; k < random(5); k++) {
        const start = random(codePoints.length);
        const end = Math.min(codePoints.length, start + 1 + random(4));
        corrections.push(fix(start, end, codePoints.slice(start, end).join(''), 'X'));
      }

      const segments = buildSegments(text, corrections);

      expect(joined(segments)).toBe(text);
      for (const segment of segments) {
        if (segment.kind === 'correction') {
          expect(segment.text).toBe(segment.correction.original);
        }
      }
    }
  });
});

describe('applyCorrections', () => {
  const text = 'I has a apple and teh book.';
  const corrections = [
    fix(2, 5, 'has', 'have', 'a'),
    fix(6, 7, 'a', 'an', 'b'),
    fix(18, 21, 'teh', 'the', 'c'),
  ];
  const segments = buildSegments(text, corrections);

  it('leaves the text untouched when nothing is applied', () => {
    expect(applyCorrections(segments, new Set())).toBe(text);
  });

  it('applies every correction', () => {
    expect(applyCorrections(segments, new Set(['a', 'b', 'c']))).toBe(
      'I have an apple and the book.',
    );
  });

  it('applies only the chosen ones', () => {
    expect(applyCorrections(segments, new Set(['b']))).toBe('I has an apple and teh book.');
  });

  it('ignores keys that do not exist', () => {
    expect(applyCorrections(segments, new Set(['nope']))).toBe(text);
  });

  it('works with Unicode before the correction', () => {
    const emojiText = '😀 I go home';
    const start = [...'😀 I '].length;
    const emojiSegments = buildSegments(emojiText, [fix(start, start + 2, 'go', 'went', 'x')]);

    expect(applyCorrections(emojiSegments, new Set(['x']))).toBe('😀 I went home');
  });
});
