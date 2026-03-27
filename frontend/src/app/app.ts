import { Component, ChangeDetectionStrategy } from '@angular/core';
import { AppShellComponent } from '@shared/layout/app-shell.component';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppShellComponent],
  template: `<app-shell />`,
})
export class App {}
