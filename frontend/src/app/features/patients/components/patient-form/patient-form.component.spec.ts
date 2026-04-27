import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MAT_DIALOG_DATA, MatDialogClose } from '@angular/material/dialog';
import { PatientFormComponent, PatientFormData } from './patient-form.component';

describe('PatientFormComponent', () => {
  const setup = async (data: PatientFormData) => {
    await TestBed.configureTestingModule({
      imports: [PatientFormComponent],
      providers: [{ provide: MAT_DIALOG_DATA, useValue: data }],
    }).compileComponents();

    const fixture = TestBed.createComponent(PatientFormComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  };

  it('initializes create mode with empty required nhc and disabled submit', async () => {
    const { fixture, component } = await setup({ mode: 'create' });

    expect(component.form.getRawValue()).toEqual({ nhc: '', sex: null, age: null });
    expect(component.form.invalid).toBe(true);

    const submitButton = fixture.debugElement.query(By.css('button[mat-flat-button]'));
    expect((submitButton.nativeElement as HTMLButtonElement).disabled).toBe(true);
  });

  it('initializes edit mode values and keeps nhc readonly', async () => {
    const { fixture, component } = await setup({
      mode: 'edit',
      patient: { nhc: 'NHC-100', sex: 'F', age: 36 },
    });

    expect(component.form.getRawValue()).toEqual({
      nhc: 'NHC-100',
      sex: 'F',
      age: 36,
    });

    const nhcInput = fixture.debugElement.query(By.css('input[formcontrolname="nhc"]'))
      .nativeElement as HTMLInputElement;
    expect(nhcInput.readOnly).toBe(true);
  });

  it('binds submit dialog payload to form raw value', async () => {
    const { fixture, component } = await setup({ mode: 'create' });

    component.form.patchValue({ nhc: 'NHC-201', sex: 'M', age: 43 });
    fixture.detectChanges();

    const submitButton = fixture.debugElement.query(By.css('button[mat-flat-button]'));
    const closeDirective = submitButton.injector.get(MatDialogClose);

    expect(closeDirective.dialogResult).toEqual({
      nhc: 'NHC-201',
      sex: 'M',
      age: 43,
    });
  });
});
