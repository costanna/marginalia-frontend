import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Rejects a value made only of spaces. `Validators.required` accepts "   " (it is not empty), but
 * the API trims the name and refuses it, so without this the user would get a generic error toast
 * instead of the message under the field. Reported as `required`, so the existing message is used.
 * An empty value is left to `Validators.required`.
 */
export function notBlank(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '');
  return value.length > 0 && value.trim().length === 0 ? { required: true } : null;
}
