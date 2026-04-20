import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogClose } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  const setup = async (data: ConfirmDialogData) => {
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent],
      providers: [{ provide: MAT_DIALOG_DATA, useValue: data }],
    }).compileComponents();

    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    fixture.detectChanges();
    return { fixture };
  };

  it('renders the supplied title and message', async () => {
    const { fixture } = await setup({
      title: 'Delete item?',
      message: 'This cannot be undone.',
    });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h2')?.textContent).toContain('Delete item?');
    expect(el.querySelector('p')?.textContent).toContain('This cannot be undone.');
  });

  it('falls back to default confirm and cancel labels', async () => {
    const { fixture } = await setup({ title: 't', message: 'm' });
    const buttons = fixture.nativeElement.querySelectorAll('button');
    const labels = Array.from(buttons as NodeListOf<HTMLButtonElement>).map((b) =>
      (b.textContent || '').trim(),
    );
    expect(labels).toEqual(expect.arrayContaining(['Cancel', 'Confirm']));
  });

  it('uses provided labels and returns true on confirm click', async () => {
    const { fixture } = await setup({
      title: 't',
      message: 'm',
      confirmLabel: 'Yes, delete',
      cancelLabel: 'Go back',
    });
    const confirmBtn = fixture.debugElement.query(By.css('button[mat-flat-button]'));
    const close = confirmBtn.injector.get(MatDialogClose);
    expect(close.dialogResult).toBe(true);
    expect((confirmBtn.nativeElement as HTMLButtonElement).textContent?.trim()).toBe('Yes, delete');
  });
});
