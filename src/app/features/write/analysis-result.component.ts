import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { BreakpointService } from '../../core/layout/breakpoint.service';
import { ToastService } from '../../core/toast/toast.service';
import { AnalysisResult } from './analysis.models';
import { CorrectionSegment, Segment, applyCorrections, buildSegments } from './build-segments';
import { CorrectionCardComponent } from './correction-card.component';

type Tab = 'text' | 'corrections';
const TABS: readonly Tab[] = ['text', 'corrections'];

/**
 * The analysis of a text: estimated level, the teacher's note, the text annotated with one mark per
 * correction, and the list of corrections.
 *
 * Desktop: text (60%) and corrections (40%) side by side. Mobile: two tabs, and a tapped mark opens
 * its correction in a bottom sheet. Corrections can be applied one by one or all at once, and the
 * resulting text copied.
 *
 * Nothing here uses innerHTML: the learner's text and the model's explanations are always rendered
 * as text, so they can never inject markup.
 */
@Component({
  selector: 'app-analysis-result',
  imports: [TranslocoPipe, CorrectionCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './analysis-result.component.html',
  styleUrl: './analysis-result.component.scss',
})
export class AnalysisResultComponent {
  readonly result = input.required<AnalysisResult>();
  /**
   * The level of the section headings ("Teacher's note", "Corrections"). It depends on where the
   * result is shown: under the page's <h1> they are <h2>; inside the landing demo, which has its own
   * <h2>, they are <h3>. Skipping a level would confuse screen-reader navigation by headings.
   */
  readonly headingLevel = input<2 | 3>(2);

  private readonly breakpoint = inject(BreakpointService);
  private readonly toasts = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sheet = viewChild<ElementRef<HTMLDialogElement>>('sheet');

  constructor() {
    afterNextRender(() => {
      // A click on the backdrop lands on the <dialog> itself, not on its content. (Escape and the
      // close button are the keyboard routes; the dialog handles Escape natively.)
      const dialog = this.sheet()?.nativeElement;
      const onBackdropClick = (event: MouseEvent) => event.target === dialog && this.closeSheet();
      dialog?.addEventListener('click', onBackdropClick);
      this.destroyRef.onDestroy(() => dialog?.removeEventListener('click', onBackdropClick));
    });
  }

  protected readonly tabs = TABS;
  protected readonly isDesktop = this.breakpoint.isDesktop;
  protected readonly tab = signal<Tab>('text');

  protected readonly segments = computed<Segment[]>(() =>
    buildSegments(this.result().original_text, this.result().corrections),
  );
  /** The corrections that could be placed in the text, in text order. */
  protected readonly items = computed(() =>
    this.segments().filter((s): s is CorrectionSegment => s.kind === 'correction'),
  );

  // linkedSignal: they start empty again whenever a NEW result arrives.
  protected readonly applied = linkedSignal<AnalysisResult, ReadonlySet<string>>({
    source: this.result,
    computation: () => new Set<string>(),
  });
  protected readonly selectedKey = linkedSignal<AnalysisResult, string | null>({
    source: this.result,
    computation: () => null,
  });

  protected readonly selectedItem = computed(
    () => this.items().find((item) => item.key === this.selectedKey()) ?? null,
  );
  protected readonly allApplied = computed(
    () => this.items().length > 0 && this.applied().size === this.items().length,
  );
  /** The text with the corrections applied so far. */
  readonly currentText = computed(() => applyCorrections(this.segments(), this.applied()));

  /** Moves keyboard and screen-reader focus to the result, after it has been produced. */
  focus(): void {
    this.host.nativeElement.querySelector<HTMLElement>('.result')?.focus();
  }

  protected isApplied(key: string): boolean {
    return this.applied().has(key);
  }

  protected descriptionId(key: string): string {
    return `correction-description-${key}`;
  }

  protected shownText(segment: CorrectionSegment): string {
    return this.isApplied(segment.key) ? segment.correction.suggestion : segment.text;
  }

  protected select(key: string, from: 'text' | 'panel'): void {
    this.selectedKey.set(key);
    if (from === 'text') {
      if (this.isDesktop()) {
        // The list may be long and scroll on its own: bring the matching card into view.
        this.document.getElementById(`correction-${key}`)?.scrollIntoView?.({ block: 'nearest' });
      } else {
        this.openSheet();
      }
    } else {
      this.document.getElementById(`mark-${key}`)?.scrollIntoView?.({ block: 'nearest' });
    }
  }

  protected toggleApplied(key: string): void {
    this.applied.update((current) => {
      const next = new Set(current);
      if (!next.delete(key)) {
        next.add(key);
      }
      return next;
    });
  }

  protected applyAll(): void {
    this.applied.set(new Set(this.items().map((item) => item.key)));
  }

  protected async copy(): Promise<void> {
    try {
      await this.document.defaultView!.navigator.clipboard.writeText(this.currentText());
      this.toasts.show(this.transloco.translate('write.result.copied'), 'success');
    } catch {
      // Clipboard access can be refused (insecure page, permissions): tell the user what to do.
      this.toasts.error(this.transloco.translate('write.result.copyFailed'));
    }
  }

  protected selectTab(tab: Tab): void {
    this.tab.set(tab);
  }

  /** Arrow keys move between tabs, as the ARIA tabs pattern expects. */
  protected onTabKeydown(event: KeyboardEvent): void {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) {
      return;
    }
    event.preventDefault();
    const next = TABS[(TABS.indexOf(this.tab()) + step + TABS.length) % TABS.length];
    this.tab.set(next);
    this.document.getElementById(`result-tab-${next}`)?.focus();
  }

  protected paneHidden(tab: Tab): boolean {
    return !this.isDesktop() && this.tab() !== tab;
  }

  protected openSheet(): void {
    const dialog = this.sheet()?.nativeElement;
    if (!dialog || dialog.open) {
      return;
    }
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }

  protected closeSheet(): void {
    const dialog = this.sheet()?.nativeElement;
    if (!dialog?.open) {
      return;
    }
    if (typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }
  }
}
