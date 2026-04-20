import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { NumericInputDirective } from './numeric-input.directive';

@Component({
  imports: [ReactiveFormsModule, NumericInputDirective],
  template: `<input appNumericInput [integerOnly]="integerOnly" [formControl]="control" />`,
})
class HostComponent {
  control = new FormControl('');
  integerOnly = false;
}

describe('NumericInputDirective', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents(),
  );

  it('sanitises decimal input by default, keeping a single dot', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const input = fixture.debugElement.query(By.css('input')).nativeElement as HTMLInputElement;

    input.value = 'abc12.3.4xx';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(input.value).toBe('12.34');
    expect(fixture.componentInstance.control.value).toBe('12.34');
  });

  it('strips decimal separator when integerOnly is true', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.integerOnly = true;
    fixture.detectChanges();
    const input = fixture.debugElement.query(By.css('input')).nativeElement as HTMLInputElement;

    input.value = '12.5';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(input.value).toBe('125');
    expect(fixture.componentInstance.control.value).toBe('125');
  });

  it('keeps clean input unchanged', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const input = fixture.debugElement.query(By.css('input')).nativeElement as HTMLInputElement;

    input.value = '12.5';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(input.value).toBe('12.5');
  });
});
