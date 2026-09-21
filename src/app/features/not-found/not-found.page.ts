import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="not-found container">
      <h1>{{ 'notFound.title' | transloco }}</h1>
      <p>{{ 'notFound.text' | transloco }}</p>
      <a class="btn btn--primary" routerLink="/">{{ 'notFound.back' | transloco }}</a>
    </section>
  `,
  styles: `
    .not-found {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--sp-16);
      padding-block: var(--sp-64);
      text-align: center;
    }

    p {
      color: var(--text-muted);
    }
  `,
})
export class NotFoundPage {}
