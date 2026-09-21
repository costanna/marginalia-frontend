import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats an ISO date for the interface language: `{{ text.created_at | localDate: lang() }}`.
 *
 * The language is an argument, not read from a service, so the pipe stays pure and the template
 * re-renders when the language changes (a signal read in the template drives it). Angular's own
 * DatePipe would need every locale registered in the bundle; `Intl` already ships with the browser.
 */
@Pipe({ name: 'localDate' })
export class LocalDatePipe implements PipeTransform {
  transform(
    value: string | null | undefined,
    lang: string,
    style: 'medium' | 'long' = 'medium',
  ): string {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) {
      return '';
    }
    return new Intl.DateTimeFormat(lang, { dateStyle: style }).format(date);
  }
}
