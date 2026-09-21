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

@Component({
  imports: [FormFieldComponent],
  template: `<app-form-field
    [control]="control"
    label="write.textLabel"
    [multiline]="true"
    placeholder="write.textPlaceholder"
    [counterMax]="20"
  />`,
})
class MultilineHost {
  control = new FormControl('', { nonNullable: true, validators: [Validators.required] });
}

describe('FormFieldComponent (multi-line, with counter)', () => {
  async function renderMultiline() {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [MultilineHost], providers: [provideTestI18n()] });
    await TestBed.inject(LanguageService).setLanguage('es');
    const fixture = TestBed.createComponent(MultilineHost);
    await fixture.whenStable();
    return { fixture, host: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  it('renders a labelled text area with a translated placeholder', async () => {
    const { el } = await renderMultiline();

    const area = el.querySelector('textarea')!;

    expect(el.querySelector('input')).toBeNull();
    expect(el.querySelector('label')?.getAttribute('for')).toBe(area.id);
    expect(area.getAttribute('placeholder')).toBe('Escribe aquí tu texto en inglés…');
  });

  it('counts characters the way the API does: emoji are one', async () => {
    const { fixture, host, el } = await renderMultiline();

    host.control.setValue('😀😀😀 hi');
    fixture.detectChanges();

    expect(el.querySelector('.counter')?.textContent?.trim()).toBe('6 / 20');
  });

  it('warns visually when the limit is exceeded, and hides the counter from screen readers', async () => {
    const { fixture, host, el } = await renderMultiline();

    host.control.setValue('x'.repeat(21));
    fixture.detectChanges();

    expect(el.querySelector('.counter')?.classList).toContain('counter--over');
    expect(el.querySelector('.counter')?.getAttribute('aria-hidden')).toBe('true');
  });
});

@Component({
  imports: [FormFieldComponent],
  template: `<app-form-field [control]="control" label="auth.fields.email" type="email" />`,
})
class EmailHost {
  control = new FormControl('', { nonNullable: true });
}

describe('FormFieldComponent (password reveal)', () => {
  const toggle = (el: HTMLElement) => el.querySelector<HTMLButtonElement>('button.reveal')!;

  it('hides the password by default and offers a button to show it', async () => {
    const { el, input } = await render();

    expect(input().type).toBe('password');
    expect(toggle(el).getAttribute('aria-label')).toBe('Mostrar contraseña');
    expect(toggle(el).getAttribute('aria-pressed')).toBe('false');
    // It is a button inside the form: it must never submit it.
    expect(toggle(el).type).toBe('button');
  });

  it('shows the typed text when the button is pressed, and hides it again on a second press', async () => {
    const { fixture, el, input } = await render();

    toggle(el).click();
    fixture.detectChanges();

    expect(input().type).toBe('text');
    expect(toggle(el).getAttribute('aria-pressed')).toBe('true');

    toggle(el).click();
    fixture.detectChanges();

    expect(input().type).toBe('password');
    expect(toggle(el).getAttribute('aria-pressed')).toBe('false');
  });

  it('keeps what the user typed when switching', async () => {
    const { fixture, host, el, input } = await render();
    input().value = 'my-secret-1';
    input().dispatchEvent(new Event('input'));

    toggle(el).click();
    fixture.detectChanges();

    expect(input().value).toBe('my-secret-1');
    expect(host.control.value).toBe('my-secret-1');
  });

  it('points the button at the input it controls', async () => {
    const { el, input } = await render();

    expect(toggle(el).getAttribute('aria-controls')).toBe(input().id);
  });

  it('translates the button label when the language changes', async () => {
    const { fixture, el } = await render();

    await TestBed.inject(LanguageService).setLanguage('en');
    fixture.detectChanges();

    expect(toggle(el).getAttribute('aria-label')).toBe('Show password');
  });

  it('is not offered on fields that are not passwords', async () => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [EmailHost], providers: [provideTestI18n()] });
    const fixture = TestBed.createComponent(EmailHost);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).querySelector('button')).toBeNull();
  });
});
