import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows a toast', () => {
    const toasts = TestBed.inject(ToastService);

    toasts.show('Saved', 'success');

    expect(toasts.toasts()).toEqual([
      { id: expect.any(Number), kind: 'success', message: 'Saved' },
    ]);
  });

  it('marks errors', () => {
    const toasts = TestBed.inject(ToastService);

    toasts.error('Oops');

    expect(toasts.toasts()[0].kind).toBe('error');
  });

  it('keeps several toasts, each with its own id', () => {
    const toasts = TestBed.inject(ToastService);

    const first = toasts.show('one');
    const second = toasts.show('two');

    expect(first).not.toBe(second);
    expect(toasts.toasts().map((toast) => toast.message)).toEqual(['one', 'two']);
  });

  it('dismisses a toast by hand', () => {
    const toasts = TestBed.inject(ToastService);
    const id = toasts.show('one');
    toasts.show('two');

    toasts.dismiss(id);

    expect(toasts.toasts().map((toast) => toast.message)).toEqual(['two']);
  });

  it('dismisses itself after a while', () => {
    const toasts = TestBed.inject(ToastService);

    toasts.show('bye');
    vi.advanceTimersByTime(5999);
    expect(toasts.toasts()).toHaveLength(1);
    vi.advanceTimersByTime(1);

    expect(toasts.toasts()).toHaveLength(0);
  });

  it('stays until dismissed when the duration is 0', () => {
    const toasts = TestBed.inject(ToastService);

    toasts.show('sticky', 'info', 0);
    vi.advanceTimersByTime(60_000);

    expect(toasts.toasts()).toHaveLength(1);
  });
});
