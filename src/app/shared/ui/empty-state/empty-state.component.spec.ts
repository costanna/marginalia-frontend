import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTestI18n } from '../../../../testing/i18n-testing';
import { LanguageService } from '../../../core/i18n/language.service';
import { EmptyStateComponent } from './empty-state.component';

@Component({
  imports: [EmptyStateComponent],
  template: `
    <app-empty-state title="history.empty.title" [text]="text" [headingLevel]="level">
      @if (withAction) {
        <a href="/write">Escribir</a>
      }
    </app-empty-state>
  `,
})
class Host {
  text: string | null = 'history.empty.text';
  level: 2 | 3 = 2;
  withAction = true;
}

async function render(setup: (host: Host) => void = () => undefined) {
  localStorage.clear();
  TestBed.configureTestingModule({ imports: [Host], providers: [provideTestI18n()] });
  await TestBed.inject(LanguageService).setLanguage('es');
  const fixture = TestBed.createComponent(Host);
  setup(fixture.componentInstance);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  return { q: <T extends Element>(selector: string) => el.querySelector<T>(selector) };
}

describe('EmptyStateComponent', () => {
  it('shows the translated title as a heading and the explanation', async () => {
    const { q } = await render();

    const title = q('.empty__title')!;

    expect(title.getAttribute('role')).toBe('heading');
    expect(title.getAttribute('aria-level')).toBe('2');
    expect(title.textContent?.trim()).toBe('Todavía no has guardado ningún texto');
    expect(q('.empty__text')?.textContent).toContain('Cada texto que corriges');
  });

  it('lets the page choose the heading level', async () => {
    const { q } = await render((host) => (host.level = 3));

    expect(q('.empty__title')?.getAttribute('aria-level')).toBe('3');
  });

  it('shows the projected next step', async () => {
    const { q } = await render();

    expect(q('.empty__actions a')?.textContent).toBe('Escribir');
  });

  it('omits the explanation when there is none', async () => {
    const { q } = await render((host) => (host.text = null));

    expect(q('.empty__text')).toBeNull();
  });
});
