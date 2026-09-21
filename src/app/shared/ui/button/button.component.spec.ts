import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ButtonComponent } from './button.component';

@Component({
  imports: [ButtonComponent],
  template: `<app-button
    [variant]="variant"
    [loading]="loading"
    [disabled]="disabled"
    [type]="type"
    [block]="block"
    >Save</app-button
  >`,
})
class Host {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger' = 'primary';
  loading = false;
  disabled = false;
  type: 'button' | 'submit' = 'button';
  block = false;
}

function render(setup: (host: Host) => void = () => undefined) {
  const fixture = TestBed.createComponent(Host);
  setup(fixture.componentInstance);
  fixture.detectChanges();
  return { fixture, button: (fixture.nativeElement as HTMLElement).querySelector('button')! };
}

describe('ButtonComponent', () => {
  it('renders a real button with its content', () => {
    const { button } = render();

    expect(button.textContent?.trim()).toBe('Save');
    expect(button.type).toBe('button');
    expect(button.className).toBe('btn btn--primary');
  });

  it.each(['primary', 'secondary', 'ghost', 'danger'] as const)('has the %s variant', (variant) => {
    const { button } = render((host) => (host.variant = variant));

    expect(button.classList).toContain(`btn--${variant}`);
  });

  it('can be a submit button', () => {
    const { button } = render((host) => (host.type = 'submit'));

    expect(button.type).toBe('submit');
  });

  it('is disabled and announces busy while loading, with a spinner', () => {
    const { button } = render((host) => (host.loading = true));

    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.querySelector('.spinner')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('is not busy when idle', () => {
    const { button } = render();

    expect(button.hasAttribute('aria-busy')).toBe(false);
    expect(button.querySelector('.spinner')).toBeNull();
    expect(button.disabled).toBe(false);
  });

  it('can be disabled', () => {
    const { button } = render((host) => (host.disabled = true));

    expect(button.disabled).toBe(true);
  });

  it('can fill the width of its container', () => {
    const { button } = render((host) => (host.block = true));

    expect(button.classList).toContain('btn--block');
  });
});
