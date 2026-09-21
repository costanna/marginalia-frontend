import { TestBed } from '@angular/core/testing';
import { provideTestI18n } from '../../../testing/i18n-testing';
import { LanguageService } from '../../core/i18n/language.service';
import { CorrectionSegment } from './build-segments';
import { CorrectionCardComponent } from './correction-card.component';

const ITEM: CorrectionSegment = {
  kind: 'correction',
  text: 'go',
  key: 'c0',
  correction: {
    start: 12,
    end: 14,
    original: 'go',
    suggestion: 'went',
    category: 'grammar',
    rule_tag: 'verb_tense',
    explanation: 'Use the past simple.',
  },
};

async function render(
  inputs: Partial<{ item: CorrectionSegment; applied: boolean; selected: boolean }> = {},
) {
  localStorage.clear();
  TestBed.configureTestingModule({
    imports: [CorrectionCardComponent],
    providers: [provideTestI18n()],
  });
  await TestBed.inject(LanguageService).setLanguage('ca');
  const fixture = TestBed.createComponent(CorrectionCardComponent);
  fixture.componentRef.setInput('item', inputs.item ?? ITEM);
  fixture.componentRef.setInput('applied', inputs.applied ?? false);
  fixture.componentRef.setInput('selected', inputs.selected ?? false);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    el,
    text: (selector: string) => el.querySelector(selector)?.textContent?.trim(),
  };
}

describe('CorrectionCardComponent', () => {
  it('explains the correction in the interface language', async () => {
    const { text } = await render();

    expect(text('.category')).toBe('Gramàtica');
    expect(text('.rule')).toBe('Temps verbal');
    expect(text('.was')).toContain('Original');
    expect(text('del')).toBe('go');
    expect(text('.better')).toContain('Gairebé. Millor així:');
    expect(text('ins')).toBe('went');
    expect(text('.why')).toBe('Use the past simple.');
  });

  it('exposes the category so it can be styled, as well as named', async () => {
    const { el } = await render();

    expect(el.querySelector('.category')?.getAttribute('data-category')).toBe('grammar');
  });

  it('shows a dash when the suggestion is to delete the text', async () => {
    const { text } = await render({
      item: { ...ITEM, correction: { ...ITEM.correction, suggestion: '' } },
    });

    expect(text('ins')).toBe('—');
  });

  it('offers to apply, and to undo once applied', async () => {
    const idle = await render({ applied: false });
    expect(idle.text('.apply')).toBe('Aplica');
    expect(idle.el.querySelector('.apply')?.getAttribute('aria-pressed')).toBe('false');
    TestBed.resetTestingModule();

    const done = await render({ applied: true });
    expect(done.text('.apply')).toBe('Desfés');
    expect(done.el.querySelector('.apply')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('flags the selected card for assistive technology', async () => {
    const { el } = await render({ selected: true });

    expect(el.querySelector('article')?.getAttribute('aria-current')).toBe('true');
    expect(el.querySelector('article')?.classList).toContain('card--selected');
  });

  it('emits when it is selected and when apply is pressed', async () => {
    const { fixture, el } = await render();
    const selected = vi.fn();
    const toggled = vi.fn();
    fixture.componentInstance.selectRequested.subscribe(selected);
    fixture.componentInstance.applyToggled.subscribe(toggled);

    (el.querySelector('.head') as HTMLButtonElement).click();
    (el.querySelector('.apply') as HTMLButtonElement).click();

    expect(selected).toHaveBeenCalledTimes(1);
    expect(toggled).toHaveBeenCalledTimes(1);
  });
});
