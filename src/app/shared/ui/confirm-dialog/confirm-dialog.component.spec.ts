import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTestI18n } from '../../../../testing/i18n-testing';
import { LanguageService } from '../../../core/i18n/language.service';
import { ConfirmDialogComponent } from './confirm-dialog.component';

@Component({
  imports: [ConfirmDialogComponent],
  template: `
    <app-confirm-dialog
      title="history.detail.deleteTitle"
      message="history.detail.deleteMessage"
      confirmLabel="history.detail.deleteConfirm"
      [danger]="true"
      [busy]="busy()"
      (confirmed)="confirmed = confirmed + 1"
    />
  `,
})
class Host {
  readonly dialog = viewChild.required(ConfirmDialogComponent);
  readonly busy = signal(false);
  confirmed = 0;
}

async function render() {
  localStorage.clear();
  TestBed.configureTestingModule({ imports: [Host], providers: [provideTestI18n()] });
  await TestBed.inject(LanguageService).setLanguage('es');
  const fixture = TestBed.createComponent(Host);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const dialog = el.querySelector('dialog') as HTMLDialogElement;
  return {
    fixture,
    host: fixture.componentInstance,
    dialog,
    open: async () => {
      fixture.componentInstance.dialog().open();
      await fixture.whenStable();
    },
    buttons: () => Array.from(dialog.querySelectorAll('button')) as HTMLButtonElement[],
  };
}

describe('ConfirmDialogComponent', () => {
  it('is closed until it is opened, and then shows the translated question', async () => {
    const { dialog, open } = await render();
    expect(dialog.open).toBe(false);

    await open();

    expect(dialog.open).toBe(true);
    expect(dialog.querySelector('h2')?.textContent?.trim()).toBe('¿Eliminar este texto?');
    expect(dialog.textContent).toContain('No se puede deshacer.');
  });

  it('is labelled and described for screen readers', async () => {
    const { dialog } = await render();

    const title = dialog.querySelector('h2')!;
    const message = dialog.querySelector('p')!;

    expect(dialog.getAttribute('aria-labelledby')).toBe(title.id);
    expect(dialog.getAttribute('aria-describedby')).toBe(message.id);
  });

  it('offers Cancel first, so the safe choice is the one that gets the focus', async () => {
    const { buttons, open } = await render();
    await open();

    expect(buttons().map((b) => b.textContent?.trim())).toEqual(['Cancelar', 'Eliminar']);
  });

  it('closes on Cancel without confirming', async () => {
    const { dialog, host, buttons, open } = await render();
    await open();

    buttons()[0].click();

    expect(dialog.open).toBe(false);
    expect(host.confirmed).toBe(0);
  });

  it('announces the confirmation, and leaves it to the parent to close', async () => {
    const { dialog, host, buttons, open } = await render();
    await open();

    buttons()[1].click();

    expect(host.confirmed).toBe(1);
    expect(dialog.open).toBe(true);
  });

  it('closes when the backdrop is clicked, but not when its content is', async () => {
    const { dialog, open } = await render();
    await open();

    (dialog.querySelector('.dialog__body') as HTMLElement).click();
    expect(dialog.open).toBe(true);

    dialog.click();
    expect(dialog.open).toBe(false);
  });

  describe('while the action is running', () => {
    async function busy() {
      const context = await render();
      context.host.busy.set(true);
      await context.open();
      await context.fixture.whenStable();
      return context;
    }

    it('cannot be dismissed with the backdrop or with Cancel', async () => {
      const { dialog, buttons } = await busy();

      dialog.click();
      expect(dialog.open).toBe(true);

      expect(buttons()[0].disabled).toBe(true);
    });

    it('cannot be dismissed with Escape', async () => {
      const { dialog } = await busy();

      const escape = new Event('cancel', { cancelable: true });
      dialog.dispatchEvent(escape);

      expect(escape.defaultPrevented).toBe(true);
    });

    it('does not confirm a second time', async () => {
      const { host, buttons } = await busy();

      buttons()[1].click();

      expect(host.confirmed).toBe(0); // the confirm button is disabled while busy
    });
  });

  it('lets Escape close it when nothing is running', async () => {
    const { dialog, open } = await render();
    await open();

    const escape = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(escape);

    expect(escape.defaultPrevented).toBe(false);
  });
});
