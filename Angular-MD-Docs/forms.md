# Angular Forms — Interview Cheatsheet

## 1. Template-driven vs Reactive

| | Template-driven | Reactive |
|---|---|---|
| Setup | `ngModel` in template | `FormGroup`/`FormControl` in class |
| Source of truth | DOM | Component class |
| Testability | Needs DOM/TestBed | Pure objects, easy unit tests |
| Custom validators | Must be a directive (`NG_VALIDATORS`) | Plain function |
| Scalability | Poor for complex forms | Preferred at scale |

## 2. Core building blocks (Reactive)

```ts
const form = new FormGroup({
  name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  address: new FormGroup({ city: new FormControl(''), zip: new FormControl('') }),
  phones: new FormArray([new FormControl('')]),
});
```
- `FormControl` — single value + validation state
- `FormGroup` — object of controls
- `FormArray` — list of controls
- `FormRecord` (v14+) — dynamic key-set, same value type

## 3. Typed Forms (v14+)

```ts
const form = new FormGroup({
  name: new FormControl('', { nonNullable: true }), // form.value.name -> string, not any
});
```
`nonNullable` affects the type only — `.reset()` still needs a default value config to avoid resetting to `null`.

## 4. Validators

```ts
// Sync
function noSpecialChars(c: AbstractControl): ValidationErrors | null {
  return /^[a-zA-Z]+$/.test(c.value) ? null : { specialChars: true };
}

// Parameterized (factory)
function minAgeValidator(min: number): ValidatorFn {
  return (c) => (c.value >= min ? null : { minAge: { required: min, actual: c.value } });
}

// Cross-field — goes on the parent FormGroup
function passwordMatch(g: AbstractControl): ValidationErrors | null {
  return g.get('password')?.value === g.get('confirm')?.value ? null : { mismatch: true };
}

// Async
function uniqueUsername(http: HttpClient): AsyncValidatorFn {
  return (c) => http.get(`/api/check/${c.value}`).pipe(
    map(exists => exists ? { taken: true } : null),
    catchError(() => of(null))
  );
}
```

### Custom validator — Template-driven needs a directive wrapper
```ts
@Directive({
  selector: '[appNoWhitespace]',
  providers: [{ provide: NG_VALIDATORS, useExisting: forwardRef(() => NoWhitespaceDirective), multi: true }],
})
export class NoWhitespaceDirective implements Validator {
  validate(c: AbstractControl) { return noWhitespaceValidator(c); }
}
```
Async version uses `NG_ASYNC_VALIDATORS` + implements `AsyncValidator`.

**Key point**: reactive = one-line array addition; template-driven = new directive class every time.

## 5. Dynamic values, errors, validators

```ts
form.setValue({ name: 'x', email: 'y' });   // strict — all keys required
form.patchValue({ name: 'x' });              // partial, safer for API responses
form.setControl('email', new FormControl()); // replace control instance

form.value;          // excludes disabled controls
form.getRawValue();  // includes disabled controls

control.setErrors({ taken: true });  // manual override, bypasses validators
control.setErrors(null);             // clear manual error

control.addValidators(Validators.required);     // v14+, additive
control.removeValidators(Validators.required);   // v14+
control.setValidators([...]);                    // REPLACES entire set (pre-14 style)
control.clearValidators();
control.updateValueAndValidity();  // REQUIRED after any validator change — doesn't auto-run

form.reset();                 // value -> null/initial, clears touched/dirty/errors
form.reset({ name: 'x' });    // reset with values
form.reset({ name: { value: 'x', disabled: true } }); // + disabled state

control.markAsTouched({ onlySelf: true }); // don't propagate to parent group
form.markAllAsTouched();                    // recursive — use on submit

control.disable({ onlySelf: true, emitEvent: false }); // skip triggering valueChanges
control.enable();
```

### Method cheat-sheet
| Method | Effect |
|---|---|
| `setValue` | full replace, strict shape |
| `patchValue` | partial replace |
| `reset` | value + clears touched/dirty/pristine + errors |
| `setErrors` | manual error, bypasses validators |
| `updateValueAndValidity` | re-run validators (needed after validator changes) |
| `markAsTouched/Dirty/Pristine` | flags only |
| `disable/enable` | excluded/included from `.value`; disabled skips validation |
| `addValidators/removeValidators` | additive (v14+) |
| `setValidators/clearValidators` | replace / remove all |

- `updateOn: 'change' \| 'blur' \| 'submit'` — controls when validators re-run.
- `statusChanges` emits `VALID/INVALID/PENDING/DISABLED`; `PENDING` = async validator running.
- Disabled controls always report `VALID`, excluded from parent aggregate status.

## 6. FormArray dynamic ops

```ts
const arr = form.get('phones') as FormArray;
arr.push(fb.control(''));
arr.insert(1, fb.control(''));
arr.removeAt(2);
arr.clear();          // v12+
arr.at(0).setValue('9999999999');
```

## 7. ControlValueAccessor (custom form controls)

```ts
@Component({
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => RatingComponent), multi: true }],
})
class RatingComponent implements ControlValueAccessor {
  value = 0;
  onChange: (v: number) => void = () => {};
  onTouched: () => void = () => {};
  writeValue(v: number) { this.value = v; }
  registerOnChange(fn: any) { this.onChange = fn; }
  registerOnTouched(fn: any) { this.onTouched = fn; }
  setDisabledState(d: boolean) { /* bind to disabled */ }
  select(v: number) { this.value = v; this.onChange(v); this.onTouched(); }
}
```
- `forwardRef` needed — class references itself in its own decorator metadata.
- `onChange` fires on user input; `writeValue` fires on programmatic `setValue`/`patchValue`. Never call `onChange` inside `writeValue` (infinite loop).
- Add `NG_VALIDATORS` + implement `Validator` if the component's own state implies validity.
- `OnPush` components: call `markForCheck()` inside `writeValue` if value arrives async (not from a DOM event).

### Angular Material integration (`MatFormFieldControl`)
Needed when your host isn't a native input Material already instruments (unlike `matInput`).
Key members: `stateChanges: Subject<void>` (tell mat-form-field to re-check state), `errorState` getter (drives red outline + `mat-error`), `shouldLabelFloat`, `setDescribedByIds`, `onContainerClick`.
`NgControl` self-injection (`@Self() @Optional()`) is required here (unlike plain CVA) because `errorState` reads `ngControl.invalid`/`touched`.

## 8. Masking directive

```ts
@Directive({ selector: '[usaPhoneMask]', standalone: true })
export class UsaPhoneMaskDirective {
  constructor(private el: ElementRef<HTMLInputElement>, private renderer: Renderer2) {}

  @HostListener('input', ['$event'])
  onInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this.renderer.setProperty(input, 'value', this.mask(input.value.replace(/\D/g, '').slice(0, 10)));
  }

  @HostListener('paste', ['$event'])
  onPaste(e: ClipboardEvent) {
    e.preventDefault();
    const digits = (e.clipboardData?.getData('text') ?? '').replace(/\D/g, '').slice(0, 10);
    this.renderer.setProperty(this.el.nativeElement, 'value', this.mask(digits));
  }

  private mask(d: string): string {
    if (!d) return '';
    if (d.length <= 3) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
}
```
- Emit the **raw/unmasked value** to the form model (`onChange(rawDigits)` if CVA) — masking is presentation-only.
- Use `input` event, not `keyup` (misses paste/autofill/IME).
- Production: prefer `ngx-mask` over hand-rolled — cursor position, paste, IME are a deep rabbit hole.
- Cursor restore: track digit-count-before-cursor, not raw character index, for masks edited mid-string (phone/date). Right-anchored masks (currency) can just re-place cursor at end.

## 9. Copy/paste restriction

```ts
@HostListener('paste', ['$event']) onPaste(e: Event) { e.preventDefault(); }
@HostListener('copy', ['$event'])  onCopy(e: Event)  { e.preventDefault(); }
@HostListener('cut', ['$event'])   onCut(e: Event)   { e.preventDefault(); }
```
- Prefer sanitizing paste (strip/validate then set) over blocking outright — blocking breaks legit paste of OTPs/numbers.
- **Never block paste on password fields** — breaks password managers, OWASP/UX anti-pattern; interviewers want this trade-off mentioned, not just the snippet.

## 10. Rapid-fire Q&A

- **setValue vs patchValue**: strict-all-keys vs partial.
- **markAsTouched vs markAsDirty**: touched = blurred; dirty = value changed from initial.
- **Disabled control + submit**: excluded from `.value`, use `getRawValue()`.
- **NgModel inside Reactive Forms**: anti-pattern, two sources of truth.
- **Why `multi: true` on NG_VALUE_ACCESSOR**: multi-provider token, several accessors coexist without overwriting.
- **Why forwardRef**: decorator metadata evaluated before class identifier exists in scope.
- **statusChanges vs valueChanges**: status = VALID/INVALID/PENDING/DISABLED; value = actual data.
- **Signal-based forms**: not yet standard in Angular core (as of v17/18); `toSignal(form.valueChanges)` bridges into signal components.