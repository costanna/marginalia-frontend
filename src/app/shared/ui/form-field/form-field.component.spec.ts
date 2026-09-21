import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, Validators } from '@angular/forms';
import { provideTestI18n } from '../../../../testing/i18n-testing';
import { LanguageService } from '../../../core/i18n/language.service';
import { FormFieldComponent } from './form-field.component';

@Component({
  imports: [FormFieldComponent],
  template: `<app-form-field
    [control]="control"
    label="auth.fields.password"
    type="password"
    hint="auth.fields.passwordHint"
    autocomplete="new-password"
  />`,
})
class Host {
  control = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(8)],
  });
}

async function render() {
  localStorage.clear();
  TestBed.configureTestingModule({ imports: [Host], providers: [provideTestI18n()] });
  await TestBed.inject(LanguageService).setLanguage('es');
  const fixture = TestBed.createComponent(Host);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    host: fixture.componentInstance,
    input: () => el.querySelector('input')!,
    error: () => el.querySelector('[role="alert"]'),
    el,
  };
}

describe('FormFieldComponent', () => {
  it('ties the label to the input and applies the type and autocomplete', async () => {
    const { el, input } = await render();

    const label = el.querySelector('label')!;

    expect(label.textContent?.trim()).toBe('Contraseña');
    expect(label.getAttribute('for')).toBe(input().id);
    expect(input().type).toBe('password');
    expect(input().getAttribute('autocomplete')).toBe('new-password');
  });

  it('shows no error before the field has been touched', async () => {
    const { error, input } = await render();

    expect(error()).toBeNull();
    expect(input().hasAttribute('aria-invalid')).toBe(false);
  });

  it('shows a translated, announced error once touched and invalid', async () => {
    const { fixture, host, error, input } = await render();

    host.control.markAsTouched();
    fixture.detectChanges();

    expect(error()?.textContent?.trim()).toBe('Este campo es obligatorio.');
    expect(input().getAttribute('aria-invalid')).toBe('true');
  });

  it('shows the error when the form is submitted from OUTSIDE the field (OnPush)', async () => {
    const { fixture, host, error } = await render();

    // What a form does on submit: no event happens inside the field itself.
    host.control.markAsTouched();
    host.control.updateValueAndValidity();
    await fixture.whenStable();

    expect(error()).not.toBeNull();
  });

  it('fills the message with the limit', async () => {
    const { fixture, host, error, input } = await render();

    input().value = 'abc';
    input().dispatchEvent(new Event('input'));
    host.control.markAsTouched();
    fixture.detectChanges();

    expect(error()?.textContent?.trim()).toBe('Debe tener al menos 8 caracteres.');
  });

  it('clears the error once the value is valid', async () => {
    const { fixture, host, error } = await render();
    host.control.markAsTouched();
    fixture.detectChanges();
    expect(error()).not.toBeNull();

    host.control.setValue('long-enough-password');
    fixture.detectChanges();

    expect(error()).toBeNull();
  });

  it('links the hint and the error to the input for screen readers', async () => {
    const { fixture, host, el, input } = await render();
    const hintId = el.querySelector('.hint')!.id;
    expect(input().getAttribute('aria-describedby')).toBe(hintId);

    host.control.markAsTouched();
    fixture.detectChanges();

    const errorId = el.querySelector('[role="alert"]')!.id;
    expect(input().getAttribute('aria-describedby')).toBe(`${hintId} ${errorId}`);
  });

  it('translates the error again when the language changes', async () => {
    const { fixture, host, error } = await render();
    host.control.markAsTouched();
    fixture.detectChanges();

    await TestBed.inject(LanguageService).setLanguage('en');
    fixture.detectChanges();

    expect(error()?.textContent?.trim()).toBe('This field is required.');
  });
});
