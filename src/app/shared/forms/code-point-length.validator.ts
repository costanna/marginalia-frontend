import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** How many characters the API will count: Unicode code points, after trimming the ends. */
export function codePointLength(value: string): number {
  return [...value.trim()].length;
}

/**
 * Length limits in code points, like the API's. `Validators.minLength` counts UTF-16 units, so an
 * emoji would count twice and the form would disagree with the server.
 *
 * It reports `minlength` / `maxlength` (with `requiredLength`) so the existing translated messages
 * are reused. An empty value is left to `Validators.required`.
 */
export function codePointLengthBetween(min: number, max: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const length = codePointLength(String(control.value ?? ''));
    if (length === 0) {
      return null;
    }
    if (length < min) {
      return { minlength: { requiredLength: min, actualLength: length } };
    }
    if (length > max) {
      return { maxlength: { requiredLength: max, actualLength: length } };
    }
    return null;
  };
}
