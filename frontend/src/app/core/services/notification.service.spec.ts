import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { vi } from 'vitest';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let snackBarMock: { open: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    snackBarMock = { open: vi.fn() };
    TestBed.configureTestingModule({
      providers: [NotificationService, { provide: MatSnackBar, useValue: snackBarMock }],
    });
    service = TestBed.inject(NotificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should show success notification', () => {
    service.success('Saved!');
    expect(snackBarMock.open).toHaveBeenCalledWith(
      'Saved!',
      'Close',
      expect.objectContaining({ duration: 4000 }),
    );
  });

  it('should show error notification', () => {
    service.error('Failed!');
    expect(snackBarMock.open).toHaveBeenCalledWith(
      'Failed!',
      'Close',
      expect.objectContaining({ duration: 6000 }),
    );
  });

  it('should show info notification without a success/error panel class', () => {
    service.info('FYI');
    expect(snackBarMock.open).toHaveBeenCalledWith(
      'FYI',
      'Close',
      expect.objectContaining({ duration: 4000 }),
    );
    const config = snackBarMock.open.mock.calls.at(-1)?.[2];
    expect(config?.panelClass).toBeUndefined();
  });
});
