import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ValidatorFn } from '@angular/forms';

/** Keep visible search text and the submitted relationship consistent. */
export function synchronizeAutocompleteSelection<T extends string | null>({
  search,
  selection,
  emptyValue,
}: {
  search: FormControl<string>;
  selection: FormControl<T>;
  emptyValue: T;
}): void {
  const selectedOptionValidator: ValidatorFn = () =>
    search.value === (selection.value ?? '') ? null : { invalidSelection: true };
  search.addValidators(selectedOptionValidator);
  selection.addValidators(selectedOptionValidator);

  search.valueChanges.pipe(takeUntilDestroyed()).subscribe((text) => {
    if (text !== (selection.value ?? '')) {
      selection.setValue(emptyValue, { emitEvent: false });
    }
    selection.updateValueAndValidity({ emitEvent: false });
    search.updateValueAndValidity({ emitEvent: false });
  });
}
