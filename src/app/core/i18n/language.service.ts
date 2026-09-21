import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import {
  DEFAULT_LANG,
  LANG_STORAGE_KEY,
  SUPPORTED_LANGS,
  SupportedLang,
  isSupportedLang,
} from './supported-languages';

/**
 * The interface language (Catalan, Spanish or English).
 *
 * Initial language: the one the user saved, else the browser's (if it is one of the three), else
 * Spanish. Changing it is instant (no reload): translations are fetched on demand, `<html lang>`
 * is updated for screen readers, and the choice is stored in localStorage.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly transloco = inject(TranslocoService);
  private readonly document = inject(DOCUMENT);
  private readonly current = signal<SupportedLang>(DEFAULT_LANG);

  readonly language = this.current.asReadonly();
  readonly languages = SUPPORTED_LANGS;

  /** Picks and activates the initial language. Awaited at startup so the first paint is already translated. */
  async initialize(): Promise<void> {
    await this.activate(this.detectInitialLanguage());
  }

  async setLanguage(lang: string): Promise<void> {
    if (!isSupportedLang(lang)) {
      return;
    }
    this.store(lang);
    await this.activate(lang);
  }

  private async activate(lang: SupportedLang): Promise<void> {
    try {
      // Load first, switch afterwards: if the file cannot be fetched we keep the current language.
      await firstValueFrom(this.transloco.load(lang));
    } catch {
      return;
    }
    this.transloco.setActiveLang(lang);
    this.current.set(lang);
    this.document.documentElement.lang = lang;
  }

  private detectInitialLanguage(): SupportedLang {
    const stored = this.readStored();
    if (stored) {
      return stored;
    }
    const navigator = this.document.defaultView?.navigator;
    const preferred = navigator?.languages?.length ? navigator.languages : [navigator?.language];
    for (const tag of preferred) {
      // "ca-ES" and "en-GB" count as "ca" and "en".
      const primary = tag?.toLowerCase().split('-')[0];
      if (isSupportedLang(primary)) {
        return primary;
      }
    }
    return DEFAULT_LANG;
  }

  // Storage can throw (private mode, blocked site data): language must still work without it.
  private readStored(): SupportedLang | null {
    try {
      const stored = this.document.defaultView?.localStorage.getItem(LANG_STORAGE_KEY);
      return isSupportedLang(stored) ? stored : null;
    } catch {
      return null;
    }
  }

  private store(lang: SupportedLang): void {
    try {
      this.document.defaultView?.localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // Ignored on purpose: the choice just will not persist.
    }
  }
}
