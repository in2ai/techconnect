import { Directive, ElementRef, inject, input } from '@angular/core';
import { NgControl } from '@angular/forms';
import { sanitizeNumericText } from '@shared/forms/numeric-input';

/** Pairs with a text input and reactive forms; strips non-numeric input (including bad pastes). */
@Directive({
  selector: 'input[appNumericInput]',
  host: {
    '(input)': 'onInput()',
  },
})
export class NumericInputDirective {
  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private readonly ngControl = inject(NgControl, { self: true });

  readonly integerOnly = input(false);

  onInput(): void {
    const control = this.ngControl.control;
    if (!control) return;
    const raw = this.el.nativeElement.value;
    const next = sanitizeNumericText(raw, this.integerOnly());
    if (raw !== next) {
      control.setValue(next, { emitEvent: true });
      this.el.nativeElement.value = next;
    }
  }
}
