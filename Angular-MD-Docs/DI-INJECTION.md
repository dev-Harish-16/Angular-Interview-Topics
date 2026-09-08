# Angular Dependency Injection — Cheatsheet

## 1. Provider-side: HOW the value is created

| Syntax                           | Behavior                                                                 | Creates new instance? |
| -------------------------------- | ------------------------------------------------------------------------ | --------------------- |
| `{ provide: X, useClass: Y }`    | Instantiates `Y`, returns it for `X`                                     | ✅ Yes                |
| `{ provide: X, useExisting: Y }` | Aliases — resolves `Y` (must already be provided), returns SAME instance | ❌ No — reuses        |
| `{ provide: X, useValue: obj }`  | Returns the literal value/object as-is                                   | ❌ No instantiation   |
| `{ provide: X, useFactory: fn }` | Calls `fn()`, returns whatever it returns                                | Depends on factory    |

```typescript
// useClass — Dog created fresh
{ provide: Animal, useClass: Dog }

// useExisting — Dog must ALREADY be provided; Animal aliases to same instance
providers: [Dog, { provide: Animal, useExisting: Dog }]
// ⚠️ If Dog isn't registered anywhere → NullInjectorError, NOT auto-created

// useValue — static config object
{ provide: APP_VERSION, useValue: '1.0.0' }

// useFactory — computed/conditional instance
{ provide: Logger, useFactory: () => isProd ? new ProdLogger() : new DevLogger() }
```

**Rule of thumb:** `useClass` constructs. `useExisting` just points to something that must already exist.

---

## 2. InjectionToken — token for non-class dependencies

Classes are tokens by default. Interfaces (erased at runtime) and primitives need `InjectionToken`.

```typescript
export interface AppConfig { apiUrl: string; timeout: number; }
export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');

// register
{ provide: APP_CONFIG, useValue: { apiUrl: 'https://api.x.com', timeout: 5000 } }

// consume
constructor(@Inject(APP_CONFIG) private config: AppConfig) {}
// or
private config = inject(APP_CONFIG);
```

Why not a plain string token? → collision risk. Two `InjectionToken('config')` instances are never `===`, even with identical description strings.

**Real Angular examples:** `HTTP_INTERCEPTORS`, `NG_VALUE_ACCESSOR` — both are `InjectionToken`s.

---

## 3. Injector — the lookup mechanism

```
Root Injector (app singletons)
   └── Module Injector
         └── Parent Component Injector
               └── Host Component Injector
                     └── Self (Child) Injector
```

Default walk: **start at self → walk up → first match wins → cached (singleton per injector node)**.

```typescript
constructor(private injector: Injector) {}
ngOnInit() {
  const svc = this.injector.get(SomeService); // manual — same as constructor DI does automatically
}
```

---

## 4. Constructor Injection vs `inject()`

|                 | Constructor Injection      | `inject()`                                                                                                |
| --------------- | -------------------------- | --------------------------------------------------------------------------------------------------------- |
| Where valid     | Constructor params only    | Field initializers, constructor body, functional guards/resolvers/interceptors, `runInInjectionContext()` |
| Plain functions | ❌ No                      | ✅ Yes                                                                                                    |
| Inheritance     | Must forward via `super()` | No forwarding needed                                                                                      |
| Timing          | Anytime in constructor     | **Synchronous, injection context only** — NOT in `ngOnInit`, `setTimeout`, promises, event handlers       |
| Angular version | Always                     | 14+                                                                                                       |

```typescript
// OLD
constructor(private http: HttpClient, @Inject(APP_CONFIG) private config: AppConfig) {}

// NEW
private http = inject(HttpClient);
private config = inject(APP_CONFIG);

// Functional guard — only possible with inject()
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn();
};
```

---

## 5. Consumer-side resolution modifiers

These change **the search path**, not the value.

| Decorator     | Search behavior                                  | `inject()` equivalent           |
| ------------- | ------------------------------------------------ | ------------------------------- |
| `@Optional()` | Don't throw if missing → return `null`           | `inject(X, { optional: true })` |
| `@Self()`     | Only check **this** injector — no walking up     | `inject(X, { self: true })`     |
| `@SkipSelf()` | Skip this injector, start from **parent**        | `inject(X, { skipSelf: true })` |
| `@Host()`     | Walk up, but **stop at host** component boundary | `inject(X, { host: true })`     |

```typescript
constructor(
  @Optional() private analytics: AnalyticsService,           // null if not provided anywhere
  @Optional() @Self() private local: X,                      // null unless provided on THIS component
  @Optional() @SkipSelf() private parent: CounterService,     // null unless found starting from parent
  @Optional() @Host() private tabGroup: TabGroupComponent     // null unless found by host boundary
) {}
```

### When to use each

- **`@Optional()`** — feature is nice-to-have (analytics, optional parent context). Always pair with `?.`
- **`@Self()`** — enforce "must be provided right on this component," prevent silently inheriting parent's instance
- **`@SkipSelf()`** — parent-child shared state (e.g. nested form groups, shared counters)
- **`@Host()`** — content-projected components needing their specific container (tabs, accordions, custom `ControlValueAccessor`s)

---

## 6. Real-world patterns

### Custom form control (`NG_VALUE_ACCESSOR`) — uses `useExisting`

```typescript
providers: [
  {
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => StarRatingComponent),
    multi: true,
  },
];
```

Why `useExisting`: forms API must talk to the SAME component instance on screen, not a disconnected duplicate `useClass` would create.

### Service migration/alias — uses `useExisting`

```typescript
providers: [AuthService, { provide: OldAuthService, useExisting: AuthService }];
```

Legacy code injecting `OldAuthService` shares state with new `AuthService` — one instance, two names.

### Nested form group — uses `@SkipSelf()`

```typescript
constructor(@SkipSelf() private parentContainer: ControlContainer) {}
```

### Tab inside TabGroup — uses `@Host()` + `@Optional()`

```typescript
constructor(@Optional() @Host() private tabGroup: TabGroupComponent) {}
```

---

## 7. The one-sentence summary

> **Provider config** (`useClass`/`useExisting`/`useValue`/`useFactory`) decides **what value** gets created.
> **Resolution modifiers** (`@Self`/`@SkipSelf`/`@Host`/`@Optional`) decide **where in the injector tree** Angular looks for it.
> `inject()` is just a more flexible **calling convention** for the same lookup — usable outside constructors.
