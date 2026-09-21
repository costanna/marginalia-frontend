import { downloadJson } from './download-json';

describe('downloadJson', () => {
  let created: Blob[];
  let revoked: string[];
  let clicked: { download: string; href: string; hidden: boolean | string }[];

  beforeEach(() => {
    vi.useFakeTimers();
    created = [];
    revoked = [];
    clicked = [];
    // jsdom has no object URLs: stand-ins that record what the browser would have been given.
    URL.createObjectURL = vi.fn((blob: Blob) => {
      created.push(blob);
      return `blob:test/${created.length}`;
    });
    URL.revokeObjectURL = vi.fn((url: string) => {
      revoked.push(url);
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push({ download: this.download, href: this.href, hidden: this.hidden });
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('saves the data as a JSON file with the name given', () => {
    downloadJson(document, 'export.json', { a: 1 });

    expect(clicked).toEqual([{ download: 'export.json', href: 'blob:test/1', hidden: true }]);
    expect(created[0].type).toBe('application/json');
  });

  it('writes readable JSON that reads back to the same data', async () => {
    const data = { name: 'Ana', texts: [{ id: 1, text: 'héllo 😀' }] };

    downloadJson(document, 'export.json', data);

    const written = await created[0].text();
    expect(written).toContain('\n  '); // indented, so a person can read it
    expect(JSON.parse(written)).toEqual(data);
  });

  it('leaves no link behind in the page', () => {
    downloadJson(document, 'export.json', {});

    expect(document.querySelector('a[download]')).toBeNull();
  });

  it('releases the temporary address later, not at once', () => {
    downloadJson(document, 'export.json', {});
    expect(revoked).toEqual([]);

    vi.advanceTimersByTime(10_000);

    expect(revoked).toEqual(['blob:test/1']);
  });
});
