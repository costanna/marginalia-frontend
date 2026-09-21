import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '../../core/auth/auth.service';

const FEATURES = ['corrections', 'level', 'practice'] as const;

/** Public landing page: value proposition, calls to action and the privacy notice. */
@Component({
  selector: 'app-landing-page',
  imports: [RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing.page.html',
  styleUrl: './landing.page.scss',
})
export class LandingPage {
  protected readonly auth = inject(AuthService);
  protected readonly features = FEATURES;
}
