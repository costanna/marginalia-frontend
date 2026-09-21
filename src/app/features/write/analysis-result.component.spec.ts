import { TestBed } from '@angular/core/testing';
import { provideTestI18n } from '../../../testing/i18n-testing';
import { LanguageService } from '../../core/i18n/language.service';
import { ToastService } from '../../core/toast/toast.service';
import { AnalysisResult, Correction } from './analysis.models';
import { AnalysisResultComponent } from './analysis-result.component';

const TEXT = 'Yesterday I go to the cinema with my friends. I has teh tickets.';

/** A correction of `needle` inside `text` (ASCII, so string indices are code points). */
function fix(
  text: string,
  needle: string,
  suggestion: string,
  category: Correction['category'] = 'grammar',
  id?: string,
): Correction {
  const start = text.indexOf(needle);
  return {
    id,
    start,
    end: start + needle.length,
    original: needle,
    suggestion,
    category,
    rule_tag: 'verb_tense',
    explanation: `Because ${needle} is wrong.`,
  };
}

function resultWith(corrections: Correction[], text = TEXT): AnalysisResult {
  return {
    original_text: text,
    corrected_text: text,
    cefr_level: 'A2',
    word_count: 13,
    summary: 'Good start, keep going.',
    ui_language: 'es',
    corrections,
  };
}

const THREE = () => [
  fix(TEXT, 'go', 'went'),
  fix(TEXT, 'I has', 'I have', 'grammar'),
  fix(TEXT, 'teh', 'the', 'spelling'),
];

function mockScreen(desktop: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: desktop, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
}

async function render(result: AnalysisResult, options: { desktop?: boolean } = {}) {
  localStorage.clear();
  mockScreen(options.desktop ?? true);
  TestBed.configureTestingModule({
    imports: [AnalysisResultComponent],
    providers: [provideTestI18n()],
  });
  await TestBed.inject(LanguageService).setLanguage('es');
  const fixture = TestBed.createComponent(AnalysisResultComponent);
  fixture.componentRef.setInput('result', result);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const q = <T extends Element>(selector: string) => el.querySelector<T>(selector)!;
  const all = <T extends Element>(selector: string) => [...el.querySelectorAll<T>(selector)];
  return {
    fixture,
    el,
    q,
    all,
    marks: () => all<HTMLButtonElement>('.mark'),
    cards: () => all<HTMLElement>('.panel app-correction-card article'),
    toasts: TestBed.inject(ToastService),
    async update(next: AnalysisResult) {
      fixture.componentRef.setInput('result', next);
      await fixture.whenStable();
    },
    async settle() {
      fixture.detectChanges();
      await fixture.whenStable();
    },
  };
}

describe('AnalysisResultComponent', () => {
  afterEach(() => vi.unstubAllGlobals());

  describe('summary', () => {
    it('shows the estimated level, the word count and the teachers note', async () => {
      const { el } = await render(resultWith(THREE()));

      expect(el.textContent).toContain('Nivel estimado: A2');
      expect(el.textContent).toContain('13 palabras');
      expect(el.querySelector('.note h3')?.textContent?.trim()).toBe('Nota del profesor');
      expect(el.querySelector('.note p')?.textContent?.trim()).toBe('Good start, keep going.');
    });

    it('is a labelled region that can receive focus', async () => {
      const { q } = await render(resultWith(THREE()));

      expect(q('.result').getAttribute('aria-label')).toBe('Resultado del análisis');
      expect(q('.result').getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('annotated text', () => {
    it('shows the text with one mark per correction, and the text is unchanged', async () => {
      const { q, marks } = await render(resultWith(THREE()));

      expect(marks().map((m) => m.textContent)).toEqual(['go', 'I has', 'teh']);
      expect(q('.annotated').textContent).toBe(TEXT);
    });

    it('marks the English text as English for screen readers', async () => {
      const { q } = await render(resultWith(THREE()));

      expect(q('.annotated').getAttribute('lang')).toBe('en');
    });

    it('gives each mark the data-category of its correction', async () => {
      const categories = ['grammar', 'spelling', 'vocabulary', 'punctuation', 'style'] as const;
      const text = 'aa bb cc dd ee';
      const corrections = ['aa', 'bb', 'cc', 'dd', 'ee'].map((word, i) =>
        fix(text, word, 'x', categories[i]),
      );

      const { marks } = await render(resultWith(corrections, text));

      expect(marks().map((m) => m.getAttribute('data-category'))).toEqual([...categories]);
    });

    it('makes every mark a real, keyboard-focusable button described by its explanation', async () => {
      const { el, marks } = await render(resultWith(THREE()));

      for (const mark of marks()) {
        expect(mark.type).toBe('button');
        const description = el.querySelector(`#${mark.getAttribute('aria-describedby')}`);
        expect(description?.textContent).toContain(`Because ${mark.textContent} is wrong.`);
        expect(description?.textContent).toContain('Casi. Mejor así:');
      }
    });

    it('places marks correctly after emoji (code-point offsets converted)', async () => {
      const text = '😀😀 Yesterday I go home';
      const start = [...'😀😀 Yesterday I '].length;
      const correction: Correction = { ...fix('x go', 'go', 'went'), start, end: start + 2 };

      const { marks, q } = await render(resultWith([correction], text));

      expect(marks().map((m) => m.textContent)).toEqual(['go']);
      expect(q('.annotated').textContent).toBe(text);
    });

    it('renders the text and the explanations as text, never as HTML', async () => {
      const text = 'Hello <img src=x onerror="window.pwned=1"> and <b>bold</b> go now';
      const correction = { ...fix(text, 'go', 'went'), explanation: '<script>alert(1)</script>' };

      const { el } = await render(resultWith([correction], text));

      expect(el.querySelector('.annotated img')).toBeNull();
      expect(el.querySelector('.annotated b')).toBeNull();
      expect(el.querySelector('script')).toBeNull();
      expect(el.querySelector('.annotated')?.textContent).toContain('<img src=x onerror=');
      expect((window as unknown as { pwned?: number }).pwned).toBeUndefined();
    });

    it('keeps line breaks of the original text', async () => {
      const text = 'First line go\nSecond line';

      const { q } = await render(resultWith([fix(text, 'go', 'went')], text));

      expect(q('.annotated').textContent).toBe(text);
      expect(getComputedStyle(q('.annotated')).whiteSpace).toBe('pre-wrap');
    });
  });

  describe('corrections panel', () => {
    it('lists each correction with its category, rule, original, suggestion and reason', async () => {
      const { cards } = await render(resultWith([fix(TEXT, 'teh', 'the', 'spelling')]));

      const [card] = cards();

      expect(card.querySelector('.category')?.textContent?.trim()).toBe('Ortografía');
      expect(card.querySelector('.rule')?.textContent?.trim()).toBe('Tiempo verbal');
      expect(card.querySelector('del')?.textContent?.trim()).toBe('teh');
      expect(card.querySelector('ins')?.textContent?.trim()).toBe('the');
      expect(card.querySelector('.why')?.textContent?.trim()).toBe('Because teh is wrong.');
    });

    it('shows the number of corrections', async () => {
      const { q } = await render(resultWith(THREE()));

      expect(q('.panel__title').textContent?.trim()).toBe('Correcciones (3)');
    });

    it('is translated into the other languages', async () => {
      const { fixture, q, settle } = await render(resultWith(THREE()));

      await TestBed.inject(LanguageService).setLanguage('en');
      await settle();

      expect(q('.panel__title').textContent?.trim()).toBe('Corrections (3)');
      expect(fixture.nativeElement.textContent).toContain('Estimated level: A2');
    });
  });

  describe('selecting a correction (desktop)', () => {
    it('highlights the matching card when a mark is pressed', async () => {
      const { marks, cards, settle } = await render(resultWith(THREE()));

      marks()[1].click();
      await settle();

      expect(marks()[1].classList).toContain('mark--selected');
      expect(cards().map((c) => c.getAttribute('aria-current'))).toEqual([null, 'true', null]);
    });

    it('highlights the matching mark when a card is pressed', async () => {
      const { marks, cards, settle } = await render(resultWith(THREE()));

      (cards()[2].querySelector('.head') as HTMLButtonElement).click();
      await settle();

      expect(marks()[2].classList).toContain('mark--selected');
    });

    it('does not open the bottom sheet on a wide screen', async () => {
      const { marks, q, settle } = await render(resultWith(THREE()));

      marks()[0].click();
      await settle();

      expect(q<HTMLDialogElement>('dialog').open).toBe(false);
    });
  });

  describe('applying corrections', () => {
    it('applies one correction: the mark shows the new wording and the button becomes Undo', async () => {
      const { marks, cards, settle } = await render(resultWith(THREE()));

      (cards()[0].querySelector('.apply') as HTMLButtonElement).click();
      await settle();

      expect(marks()[0].textContent).toBe('went');
      expect(marks()[0].classList).toContain('mark--applied');
      expect(marks()[1].textContent).toBe('I has'); // the others are untouched
      const button = cards()[0].querySelector('.apply') as HTMLButtonElement;
      expect(button.textContent?.trim()).toBe('Deshacer');
      expect(button.getAttribute('aria-pressed')).toBe('true');
    });

    it('undoes an applied correction', async () => {
      const { marks, cards, settle } = await render(resultWith(THREE()));
      const apply = () => (cards()[0].querySelector('.apply') as HTMLButtonElement).click();

      apply();
      await settle();
      apply();
      await settle();

      expect(marks()[0].textContent).toBe('go');
      expect(marks()[0].classList).not.toContain('mark--applied');
    });

    it('applies all corrections at once, and the button is then disabled', async () => {
      const { q, marks, settle } = await render(resultWith(THREE()));

      (q('.actions .btn--secondary') as HTMLButtonElement).click();
      await settle();

      expect(marks().map((m) => m.textContent)).toEqual(['went', 'I have', 'the']);
      expect((q('.actions .btn--secondary') as HTMLButtonElement).disabled).toBe(true);
    });

    it('forgets what was applied when a new result arrives', async () => {
      const { q, marks, settle, update } = await render(resultWith(THREE()));
      (q('.actions .btn--secondary') as HTMLButtonElement).click();
      await settle();

      await update(resultWith([fix(TEXT, 'teh', 'the')]));

      expect(marks().map((m) => m.textContent)).toEqual(['teh']);
    });
  });

  describe('copying', () => {
    function stubClipboard(behaviour: 'works' | 'refused') {
      const writeText = vi.fn(() =>
        behaviour === 'works' ? Promise.resolve() : Promise.reject(new Error('denied')),
      );
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
      return writeText;
    }

    it('copies the text as it is now, with the applied corrections', async () => {
      const writeText = stubClipboard('works');
      const { q, cards, toasts, settle } = await render(resultWith(THREE()));
      (cards()[0].querySelector('.apply') as HTMLButtonElement).click();
      await settle();

      (q('.actions .btn--primary') as HTMLButtonElement).click();
      await vi.waitFor(() => expect(writeText).toHaveBeenCalled());

      expect(writeText).toHaveBeenCalledWith(
        'Yesterday I went to the cinema with my friends. I has teh tickets.',
      );
      await vi.waitFor(() =>
        expect(toasts.toasts().map((t) => [t.kind, t.message])).toEqual([
          ['success', 'Texto copiado.'],
        ]),
      );
    });

    it('copies the corrected text after applying everything', async () => {
      const writeText = stubClipboard('works');
      const { q, settle } = await render(resultWith(THREE()));
      (q('.actions .btn--secondary') as HTMLButtonElement).click();
      await settle();

      (q('.actions .btn--primary') as HTMLButtonElement).click();
      await vi.waitFor(() => expect(writeText).toHaveBeenCalled());

      expect(writeText).toHaveBeenCalledWith(
        'Yesterday I went to the cinema with my friends. I have the tickets.',
      );
    });

    it('tells the user what to do when the browser refuses', async () => {
      stubClipboard('refused');
      const { q, toasts } = await render(resultWith(THREE()));

      (q('.actions .btn--primary') as HTMLButtonElement).click();

      await vi.waitFor(() => expect(toasts.toasts()).toHaveLength(1));
      expect(toasts.toasts()[0].kind).toBe('error');
      expect(toasts.toasts()[0].message).toContain('No se ha podido copiar');
    });
  });

  describe('a text without corrections', () => {
    it('congratulates the learner and offers no panel, tabs or apply-all', async () => {
      const { el, q, marks } = await render(resultWith([]));

      expect(q('.all-good').textContent?.trim()).toBe('¡Sin correcciones! Tu texto está muy bien.');
      expect(marks()).toHaveLength(0);
      expect(el.querySelector('.panel')).toBeNull();
      expect(el.querySelector('[role="tablist"]')).toBeNull();
      expect((q('.actions .btn--secondary') as HTMLButtonElement).disabled).toBe(true);
    });

    it('still copies the text', async () => {
      const writeText = vi.fn(() => Promise.resolve());
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
      const { q } = await render(resultWith([]));

      (q('.actions .btn--primary') as HTMLButtonElement).click();

      await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith(TEXT));
    });
  });

  describe('on a phone', () => {
    it('shows tabs, with the number of corrections, and starts on the text', async () => {
      const { all, q } = await render(resultWith(THREE()), { desktop: false });

      expect(all('[role="tab"]').map((t) => t.textContent?.trim())).toEqual([
        'Texto',
        'Correcciones (3)',
      ]);
      expect(all('[role="tab"]').map((t) => t.getAttribute('aria-selected'))).toEqual([
        'true',
        'false',
      ]);
      expect(q('#result-pane-text').hasAttribute('hidden')).toBe(false);
      expect(q('#result-pane-corrections').hasAttribute('hidden')).toBe(true);
    });

    it('switches between the text and the corrections', async () => {
      const { all, q, settle } = await render(resultWith(THREE()), { desktop: false });

      all<HTMLButtonElement>('[role="tab"]')[1].click();
      await settle();

      expect(q('#result-pane-text').hasAttribute('hidden')).toBe(true);
      expect(q('#result-pane-corrections').hasAttribute('hidden')).toBe(false);
    });

    it('moves between tabs with the arrow keys, keeping only the active tab in the tab order', async () => {
      const { all, settle } = await render(resultWith(THREE()), { desktop: false });
      const tabs = () => all<HTMLButtonElement>('[role="tab"]');
      expect(tabs().map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1']);

      tabs()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await settle();

      expect(tabs().map((t) => t.getAttribute('aria-selected'))).toEqual(['false', 'true']);
      expect(tabs().map((t) => t.getAttribute('tabindex'))).toEqual(['-1', '0']);

      tabs()[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      await settle();

      expect(tabs().map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false']);
    });

    it('opens the tapped correction in a bottom sheet', async () => {
      const { marks, q, settle } = await render(resultWith(THREE()), { desktop: false });

      marks()[2].click();
      await settle();

      const dialog = q<HTMLDialogElement>('dialog');
      expect(dialog.open).toBe(true);
      expect(dialog.querySelector('article .why')?.textContent?.trim()).toBe(
        'Because teh is wrong.',
      );
      expect(dialog.getAttribute('aria-label')).toBe('Corrección');
    });

    it('can apply from the sheet, and close it', async () => {
      const { marks, q, settle } = await render(resultWith(THREE()), { desktop: false });
      marks()[2].click();
      await settle();
      const dialog = q<HTMLDialogElement>('dialog');

      (dialog.querySelector('.apply') as HTMLButtonElement).click();
      await settle();
      expect(marks()[2].textContent).toBe('the');

      (dialog.querySelector('.sheet__close') as HTMLButtonElement).click();
      expect(dialog.open).toBe(false);
    });

    it('closes the sheet when the backdrop is clicked, but not when its content is', async () => {
      const { marks, q, settle } = await render(resultWith(THREE()), { desktop: false });
      marks()[0].click();
      await settle();
      const dialog = q<HTMLDialogElement>('dialog');

      (dialog.querySelector('article') as HTMLElement).click();
      expect(dialog.open).toBe(true);

      dialog.click();
      expect(dialog.open).toBe(false);
    });
  });

  it('can move focus to the result once it is shown', async () => {
    const { fixture, q } = await render(resultWith(THREE()));

    fixture.componentInstance.focus();

    expect(document.activeElement).toBe(q('.result'));
  });
});
