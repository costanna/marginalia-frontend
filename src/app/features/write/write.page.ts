import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '../../core/auth/auth.service';

/** Placeholder for the signed-in area: the writing screen itself is built in the next phase. */
@Component({
  selector: 'app-write-page',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="write container">
      <h1>{{ 'write.title' | transloco }}</h1>
      @if (auth.user(); as user) {
        <p class="write__welcome">{{ 'write.welcome' | transloco: { name: user.display_name } }}</p>
      }
      <p class="write__soon">{{ 'write.comingSoon' | transloco }}</p>
    </section>
  `,
  styles: `
    .write {
      display: flex;
      flex-direction: column;
      gap: var(--sp-16);
      padding-block: var(--sp-48);
    }

    .write__soon {
      color: var(--text-muted);
    }
  `,
})
export class WritePage {
  protected readonly auth = inject(AuthService);
}
