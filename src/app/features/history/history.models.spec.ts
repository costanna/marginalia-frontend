import { isCefrLevel, pageCount, parsePage } from './history.models';

describe('history models', () => {
  it.each(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])('%s is a level', (level) => {
    expect(isCefrLevel(level)).toBe(true);
  });

  it.each([null, '', 'b1', 'D1', 'A1 ', '<script>'])('%j is not a level', (value) => {
    expect(isCefrLevel(value)).toBe(false);
  });

  it.each([
    ['1', 1],
    ['7', 7],
    [null, 1],
    ['', 1],
    ['0', 1],
    ['-3', 1],
    ['2.5', 1],
    ['abc', 1],
    ['1e3', 1000],
  ])('reads the page %j as %d', (value, expected) => {
    expect(parsePage(value)).toBe(expected);
  });

  it.each([
    [0, 12, 1], // an empty history still has one (empty) page
    [1, 12, 1],
    [12, 12, 1],
    [13, 12, 2],
    [36, 12, 3],
    [37, 12, 4],
  ])('%d texts in pages of %d make %d page(s)', (total, size, expected) => {
    expect(pageCount(total, size)).toBe(expected);
  });
});
