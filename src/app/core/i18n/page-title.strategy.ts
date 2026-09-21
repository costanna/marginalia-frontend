import { Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';

/**
 * The page title is `<translated page name> · Marginalia`.
 *
 * A route's `title` is a translation KEY (for example `nav.history`), so the browser tab is
 * translated too, and it is re-rendered when the language changes.
 */
@Injectable({ providedIn: 'root' })
export class PageTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly transloco = inject(TranslocoService);
  private titleKey: string | undefined;

  constructor() {
    super();
    this.transloco.langChanges$.pipe(takeUntilDestroyed()).subscribe(() => this.render());
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.titleKey = this.buildTitle(snapshot);
    this.render();
  }

  private render(): void {
    const appName = this.transloco.translate('app.name');
    this.title.setTitle(
      this.titleKey ? `${this.transloco.translate(this.titleKey)} · ${appName}` : appName,
    );
  }
}
