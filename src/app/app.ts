import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ShellComponent } from './layout/shell/shell.component';

@Component({
  selector: 'app-root',
  imports: [ShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<app-shell />',
  styles: `
    :host {
      display: flex;
      flex: 1 0 auto;
      flex-direction: column;
    }
  `,
})
export class App {}
