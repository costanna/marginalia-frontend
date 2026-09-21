import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTestI18n } from '../../../testing/i18n-testing';
import { AUTHOR_HANDLE, AUTHOR_URL } from '../../core/config/site.config';
import { LanguageService } from '../../core/i18n/language.service';
import { FooterComponent } from './footer.component';

async function render(
  lang = 'es',
): Promise<{ fixture: ComponentFixture<FooterComponent>; el: HTMLElement }> {
  localStorage.clear();
  TestBed.configureTestingModule({ imports: [FooterComponent], providers: [provideTestI18n()] });
  await TestBed.inject(LanguageService).setLanguage(lang);
  const fixture = TestBed.createComponent(FooterComponent);
  await fixture.whenStable();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('FooterComponent', () => {
  afterEach(() => vi.useRealTimers());

  it('shows the current year, calculated and not written by hand', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2031-05-04T10:00:00Z'));

    const { el } = await render();

    expect(el.textContent).toContain('© 2031 Marginalia.');
  });

  it.each([
    ['es', 'Todos los derechos reservados.'],
    ['ca', 'Tots els drets reservats.'],
    ['en', 'All rights reserved.'],
  ])('shows the copyright notice in %s', async (lang, text) => {
    const { el } = await render(lang);

    expect(el.textContent).toContain(text);
  });

  it('follows the language when it changes', async () => {
    const { fixture, el } = await render('es');

    await TestBed.inject(LanguageService).setLanguage('en');
    fixture.detectChanges();

    expect(el.textContent).toContain('All rights reserved.');
    expect(el.textContent).not.toContain('Todos los derechos');
  });

  it('links to the author safely', async () => {
    const { el } = await render();

    const link = el.querySelector('a') as HTMLAnchorElement;

    expect(link.textContent?.trim()).toBe('@costanna');
    expect(link.textContent?.trim()).toBe(AUTHOR_HANDLE);
    expect(link.getAttribute('href')).toBe(AUTHOR_URL);
    expect(link.target).toBe('_blank');
    expect(link.rel).toContain('noopener');
    expect(link.rel).toContain('noreferrer');
  });

  it('is a <footer> landmark', async () => {
    const { el } = await render();

    expect(el.querySelector('footer')).not.toBeNull();
  });
});
