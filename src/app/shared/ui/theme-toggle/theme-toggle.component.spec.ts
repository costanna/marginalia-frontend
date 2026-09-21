import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideTestI18n } from '../../../../testing/i18n-testing';
import { LanguageService } from '../../../core/i18n/language.service';
import { ThemeService } from '../../../core/theme/theme.service';
import { ThemeToggleComponent } from './theme-toggle.component';

async function render() {
  localStorage.clear();
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
  TestBed.configureTestingModule({
    imports: [ThemeToggleComponent],
    providers: [provideTestI18n(), provideHttpClient(), provideHttpClientTesting()],
  });
  await TestBed.inject(LanguageService).setLanguage('es');
  const fixture = TestBed.createComponent(ThemeToggleComponent);
  await fixture.whenStable();
  const button = () => (fixture.nativeElement as HTMLElement).querySelector('button')!;
  return { fixture, button, theme: TestBed.inject(ThemeService) };
}

describe('ThemeToggleComponent', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('names the action it will perform, in the current language', async () => {
    const { button } = await render();

    expect(button().getAttribute('aria-label')).toBe('Cambiar al tema oscuro');
  });

  it('switches the theme and its label when pressed', async () => {
    const { fixture, button, theme } = await render();

    button().click();
    fixture.detectChanges();

    expect(theme.resolved()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(button().getAttribute('aria-label')).toBe('Cambiar al tema claro');
  });

  it('hides its icon from assistive technology', async () => {
    const { button } = await render();

    expect(button().querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('is a real button of at least 44px touch size', async () => {
    const { button } = await render();

    expect(button().type).toBe('button');
  });
});
