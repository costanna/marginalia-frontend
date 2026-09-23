import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective, provideCharts } from 'ng2-charts';
import { forkJoin } from 'rxjs';
import { LanguageService } from '../../core/i18n/language.service';
import { ThemeService } from '../../core/theme/theme.service';
import { cssColor } from '../../shared/format/css-color';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { PROGRESS_CHART_REGISTERABLES } from './chart-setup';
import { ProgressApi } from './progress.api';
import { CategoryCount, OverviewStats, ProgressPoint, RuleCount } from './progress.models';

type Status = 'loading' | 'error' | 'empty' | 'active';

const PROGRESS_WINDOW_DAYS = 90;
const CATEGORY_WINDOW_DAYS = 30;
const TOP_RULES_WINDOW_DAYS = 30;
// Every category the API can send, in the fixed order the donut's colours and legend follow.
const CATEGORY_ORDER = ['grammar', 'spelling', 'vocabulary', 'punctuation', 'style'] as const;

/**
 * KPIs, a streak, and three charts built from the user's own history. The charts read their
 * colours from the page's CSS custom properties (never a fixed palette), so they redraw whenever
 * the theme changes.
 *
 * Chart.js registration lives here, on the component's own providers, rather than on the route in
 * app.routes.ts: a route's providers are evaluated eagerly when the (statically-imported) routes
 * file loads, which would pull ng2-charts and chart.js into the main bundle. Providers declared on
 * a lazy-loaded standalone component are only evaluated once its chunk is fetched.
 */
@Component({
  selector: 'app-progress-page',
  imports: [
    RouterLink,
    TranslocoPipe,
    BaseChartDirective,
    ButtonComponent,
    EmptyStateComponent,
    SkeletonComponent,
  ],
  providers: [provideCharts({ registerables: PROGRESS_CHART_REGISTERABLES })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './progress.page.html',
  styleUrl: './progress.page.scss',
})
export class ProgressPage {
  private readonly progressApi = inject(ProgressApi);
  private readonly theme = inject(ThemeService);
  private readonly document = inject(DOCUMENT);
  private readonly transloco = inject(TranslocoService);
  protected readonly language = inject(LanguageService).language;

  protected readonly status = signal<Status>('loading');
  private readonly overview = signal<OverviewStats | null>(null);
  private readonly progressPoints = signal<ProgressPoint[]>([]);
  private readonly categoryCounts = signal<CategoryCount[]>([]);
  private readonly topRulesData = signal<RuleCount[]>([]);

  protected readonly kpis = computed(() => this.overview());

  /** Re-read whenever the resolved theme changes, so every chart below redraws with it. */
  private readonly colors = computed(() => {
    this.theme.resolved();
    const read = (name: string) => cssColor(this.document, name);
    return {
      text: read('--text'),
      textMuted: read('--text-muted'),
      border: read('--border'),
      primary: read('--primary'),
      primarySoft: read('--primary-soft'),
      surface: read('--surface'),
      categories: CATEGORY_ORDER.map((category) => read(`--cat-${category}`)),
    };
  });

  private readonly dayFormatter = computed(
    () => new Intl.DateTimeFormat(this.language(), { day: 'numeric', month: 'short' }),
  );

  protected readonly lineChartData = computed<ChartConfiguration<'line'>['data']>(() => ({
    labels: this.progressPoints().map((p) => this.dayFormatter().format(new Date(p.day))),
    datasets: [
      {
        data: this.progressPoints().map((p) => p.errors_per_100_words),
        borderColor: this.colors().primary,
        backgroundColor: this.colors().primarySoft,
        pointBackgroundColor: this.colors().primary,
        tension: 0.3,
        fill: true,
      },
    ],
  }));

  protected readonly lineChartOptions = computed<ChartConfiguration<'line'>['options']>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: this.colors().textMuted }, grid: { color: this.colors().border } },
      y: {
        beginAtZero: true,
        ticks: { color: this.colors().textMuted },
        grid: { color: this.colors().border },
      },
    },
  }));

  protected readonly donutChartData = computed<ChartConfiguration<'doughnut'>['data']>(() => ({
    labels: this.categoryCounts().map((c) => this.transloco.translate(`categories.${c.category}`)),
    datasets: [
      {
        data: this.categoryCounts().map((c) => c.count),
        backgroundColor: this.colors().categories,
        borderColor: this.colors().surface,
      },
    ],
  }));

  protected readonly donutChartOptions = computed<ChartConfiguration<'doughnut'>['options']>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: this.colors().text } } },
    }),
  );

  protected readonly noErrorsYet = computed(() =>
    this.categoryCounts().every((c) => c.count === 0),
  );

  protected readonly barChartData = computed<ChartConfiguration<'bar'>['data']>(() => ({
    labels: this.topRulesData().map((r) => this.transloco.translate(`rules.${r.rule_tag}`)),
    datasets: [
      { data: this.topRulesData().map((r) => r.count), backgroundColor: this.colors().primary },
    ],
  }));

  protected readonly barChartOptions = computed<ChartConfiguration<'bar'>['options']>(() => ({
    indexAxis: 'y', // horizontal: rule names read better than tall, rotated x-axis labels
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { color: this.colors().textMuted, precision: 0 },
        grid: { color: this.colors().border },
      },
      y: { ticks: { color: this.colors().text }, grid: { display: false } },
    },
  }));

  constructor() {
    this.load();
  }

  protected load(): void {
    this.status.set('loading');
    forkJoin({
      overview: this.progressApi.overview(),
      progress: this.progressApi.progress(PROGRESS_WINDOW_DAYS),
      categories: this.progressApi.errorsByCategory(CATEGORY_WINDOW_DAYS),
      rules: this.progressApi.topRules(TOP_RULES_WINDOW_DAYS),
    }).subscribe({
      next: ({ overview, progress, categories, rules }) => {
        this.overview.set(overview);
        this.progressPoints.set(progress);
        this.categoryCounts.set(categories);
        this.topRulesData.set(rules);
        this.status.set(overview.texts_count > 0 ? 'active' : 'empty');
      },
      error: () => this.status.set('error'),
    });
  }
}
