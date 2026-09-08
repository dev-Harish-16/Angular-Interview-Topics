# Angular Pipes — Cheatsheet

## 1. Syntax

```html
{{ value | pipeName:arg1:arg2 }} {{ value | pipe1 | pipe2 }}
<!-- chainable, left to right -->
```

## 2. Built-in Pipes

| Pipe                                | Example                             | Output              |
| ----------------------------------- | ----------------------------------- | ------------------- |
| `date`                              | `{{ d \| date:'yyyy-MM-dd' }}`      | `2026-09-08`        |
| `currency`                          | `{{ 5000 \| currency:'INR' }}`      | `₹5,000.00`         |
| `number`                            | `{{ 3.14159 \| number:'1.2-2' }}`   | `3.14`              |
| `percent`                           | `{{ 0.75 \| percent }}`             | `75%`               |
| `uppercase`/`lowercase`/`titlecase` | `{{ 'abc' \| uppercase }}`          | `ABC`               |
| `json`                              | `{{ obj \| json }}`                 | pretty JSON (debug) |
| `slice`                             | `{{ arr \| slice:0:3 }}`            | first 3 items       |
| `keyvalue`                          | `*ngFor="let e of obj \| keyvalue"` | iterate object      |
| `async`                             | `{{ obs$ \| async }}`               | auto sub/unsub      |

## 3. Pure vs Impure

|                            | Pure (default)             | Impure             |
| -------------------------- | -------------------------- | ------------------ |
| Re-runs on                 | Input **reference** change | **Every** CD cycle |
| Detects `.push()`/mutation | ❌ No                      | ✅ Yes             |
| Perf                       | Fast, memoized             | Expensive          |
| Examples                   | `date`, `uppercase`        | `async`, `json`    |

```typescript
@Pipe({ name: 'x', pure: true })   // default — fast
@Pipe({ name: 'y', pure: false })  // opt-in, use sparingly
```

Fix for pure pipe not updating on array mutation:

```typescript
this.items.push(x); // ❌ same reference, pure pipe won't re-run
this.items = [...this.items, x]; // ✅ new reference
```

## 4. Custom Pipe Skeleton

```typescript
@Pipe({ name: "truncate", standalone: true })
export class TruncatePipe implements PipeTransform {
  transform(value: string, limit = 20, suffix = "..."): string {
    return value.length > limit ? value.slice(0, limit) + suffix : value;
  }
}
```

With DI:

```typescript
@Pipe({ name: "translate", standalone: true, pure: false })
export class TranslatePipe implements PipeTransform {
  private i18n = inject(I18nService);
  transform(key: string) {
    return this.i18n.get(key);
  }
}
```

## 5. `async` Pipe — what it does internally

1. Subscribes on first bind
2. `markForCheck()` on new value
3. Auto `unsubscribe()` in `ngOnDestroy`

```html
<div *ngIf="user$ | async as user">{{ user.name }}</div>
<div *ngIf="{ u: user$ | async, p: posts$ | async } as vm">
  {{ vm.u?.name }} — {{ vm.p?.length }}
</div>
```

## 6. Signals vs async pipe (16+)

```typescript
count = signal(0); // template: {{ count() }} — no pipe needed
user = toSignal(user$, { initialValue: null }); // RxJS → signal
```

## 7. Perf: Pipe vs method call

```html
{{ calculateTotal() }}
<!-- ❌ runs every CD cycle -->
{{ items | total }}
<!-- ✅ pure pipe, memoized on reference -->
```

## 8. Override Patterns

### a) Default args (per-call override)

```typescript
transform(value: string, limit = 20) {...}
```

```html
{{ text | truncate }}
<!-- default -->
{{ text | truncate:50 }}
<!-- overridden -->
```

### b) DI-based global default, still per-call overridable

```typescript
const DEFAULTS = new InjectionToken<{symbol:string}>('DEFAULTS');

transform(value: number, symbol?: string) {
  const sym = symbol ?? this.defaults.symbol; // per-call wins
  ...
}
```

```typescript
{ provide: DEFAULTS, useValue: { symbol: '₹' } } // app-wide default
```

### c) Override transform logic via subclass

```typescript
export class PercentFormatPipe extends BaseFormatPipe {
  override transform(v: number) {
    return `${super.transform(v)}%`;
  }
}
```

### d) Override pipe class via DI (for injected pipes, not template `| pipe`)

```typescript
{ provide: DatePipe, useClass: CustomDatePipe }
```

⚠️ Does NOT affect `| date` in templates — template pipes resolve by name via `imports`/`declarations`, not DI tokens.

### e) Override which pipe a template uses (standalone)

```typescript
@Component({
  standalone: true,
  imports: [OverriddenDatePipe], // shadows built-in, scoped to this component only
})
```

No true global override for `| pipeName` — always scoped to what's imported.

### f) Per-instance override via component `@Input()`

```typescript
@Input() currencySymbol = '$';
```

```html
<app-price-list [currencySymbol]="'₹'"></app-price-list>
```

## 9. Rules / Gotchas

- Only **pure** pipes are memoized — impure pipes run constantly, avoid heavy logic (filter/sort large lists) in them.
- Filtering/sorting lists → prefer computed value in component/signal, not a pipe.
- Template `| pipeName` resolution is **not** DI-based — no global override token exists.
- `async` pipe handles subscription lifecycle — never manually subscribe in template-bound Observables.
- Pipes are the easiest thing to unit test — plain class, no `TestBed` needed:

```typescript
const pipe = new TruncatePipe();
expect(pipe.transform("Hello World", 5)).toBe("Hello...");
```

## 10. Decision Table

| Need                                   | Use                                        |
| -------------------------------------- | ------------------------------------------ |
| Format display value                   | Built-in pipe                              |
| Reusable transform, multi-template     | Custom pure pipe                           |
| Auto-subscribe Observable              | `async` pipe                               |
| Filter/sort list                       | Computed/signal in component, not pipe     |
| Live external data (i18n, auth)        | Impure pipe or signal `computed()`         |
| Use transform in TS code               | `inject(PipeClass)` directly               |
| Override default arg                   | Template arg or `??` fallback              |
| Override transform logic               | `extends` + `override transform()`         |
| Override injected pipe instance        | `useClass`/`useExisting`                   |
| Override template `\| pipe` resolution | Swap `imports` per component (scoped only) |
